// 暫用：接收 LINE webhook 事件，寫進 line_capture_log 表方便查詢 groupId／userId。
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
  const body = await req.text();
  let json: unknown = null;
  try {
    json = JSON.parse(body);
  } catch (_e) {
    json = { raw: body };
  }

  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/line_capture_log`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SERVICE_ROLE_KEY ?? "",
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      "Prefer": "return=representation",
    },
    body: JSON.stringify([{ raw: json }]),
  });
  const insertText = await insertRes.text();

  const debug = {
    hasUrl: !!SUPABASE_URL,
    hasKey: !!SERVICE_ROLE_KEY,
    insertStatus: insertRes.status,
    insertBody: insertText,
  };
  console.log("debug:", JSON.stringify(debug));

  return new Response(JSON.stringify(debug), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
