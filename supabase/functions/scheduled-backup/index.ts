// 排程自動備份：每天由 pg_cron 觸發，把 9 張表打包成一份 JSON 存進 Storage 的 backups bucket，
// 並寫一筆驗證紀錄到 backup_log；失敗時透過既有的 LINE 通知管道發警告。
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
const LINE_GROUP_ID = Deno.env.get("LINE_GROUP_ID");

const TABLES = [
  "records", "vendors", "requests",
  "taobao_orders", "taobao_items", "taobao_batches", "taobao_settings",
  "beans", "cost_settings",
];

async function notifyLineFailure(msg: string) {
  if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_GROUP_ID) return;
  try {
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ to: LINE_GROUP_ID, messages: [{ type: "text", text: msg }] }),
    });
  } catch (_e) {
    // best effort，通知失敗不影響備份流程本身
  }
}

Deno.serve(async (_req) => {
  const dump: { exported_at: string; tables: Record<string, unknown[]> } = {
    exported_at: new Date().toISOString(),
    tables: {},
  };
  const counts: Record<string, number> = {};
  let tableErrors = "";

  for (const t of TABLES) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=*`, {
        headers: {
          apikey: SERVICE_ROLE_KEY ?? "",
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = await res.json();
      dump.tables[t] = rows;
      counts[t] = Array.isArray(rows) ? rows.length : 0;
    } catch (e) {
      tableErrors += `${t}: ${(e as Error).message}; `;
    }
  }

  const fileName = `backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const fileBody = JSON.stringify(dump, null, 2);
  let uploadErr = "";

  try {
    const upRes = await fetch(`${SUPABASE_URL}/storage/v1/object/backups/${fileName}`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_KEY ?? "",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: fileBody,
    });
    if (!upRes.ok) throw new Error(`HTTP ${upRes.status}: ${await upRes.text()}`);
  } catch (e) {
    uploadErr = (e as Error).message;
  }

  const hasError = !!(tableErrors || uploadErr);
  const status = hasError ? "failed" : "success";

  await fetch(`${SUPABASE_URL}/rest/v1/backup_log`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_ROLE_KEY ?? "",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify([{
      status,
      table_counts: counts,
      file_path: hasError ? null : `backups/${fileName}`,
      file_size: fileBody.length,
      error_message: hasError ? (tableErrors + uploadErr) : null,
    }]),
  });

  if (hasError) {
    await notifyLineFailure("⚠️ 自動備份失敗\n" + (tableErrors + uploadErr));
  }

  return new Response(JSON.stringify({ status, counts, file: fileName }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
