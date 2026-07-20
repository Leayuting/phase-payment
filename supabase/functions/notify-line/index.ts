// 有人新增請款申請時，由 Supabase Database Webhook 觸發本函式，推播訊息到指定的 LINE 群組。
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
const LINE_GROUP_ID = Deno.env.get("LINE_GROUP_ID");

function fmtAmount(n: number | null | undefined) {
  return "NT$ " + Math.round(n || 0).toLocaleString();
}

Deno.serve(async (req) => {
  const payload = await req.json();

  if (payload.type !== "INSERT" || payload.table !== "requests") {
    return new Response("ignored", { status: 200 });
  }

  const r = payload.record ?? {};
  const text = [
    "📋 新的請款申請",
    `門店：${r.store || "—"}`,
    `申請人：${r.applicant || "—"}`,
    `廠商：${r.vendor || "—"}`,
    `品項：${r.purpose || "—"}`,
    `金額：${fmtAmount(r.amount_total)}`,
    "",
    "前往審核：https://leayuting.github.io/phase-payment/files/request.html",
  ].join("\n");

  const lineRes = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: LINE_GROUP_ID,
      messages: [{ type: "text", text }],
    }),
  });

  const lineBody = await lineRes.text();
  console.log("line push status:", lineRes.status, lineBody);

  return new Response(JSON.stringify({ lineStatus: lineRes.status, lineBody }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
