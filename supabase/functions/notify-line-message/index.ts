// 通用的 LINE 推播函式：接收 { text } 就推送到指定群組。
// 給前端在特定操作完成後（例如發票電子檔上傳）直接呼叫，不用另外接資料庫 trigger。
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
const LINE_GROUP_ID = Deno.env.get("LINE_GROUP_ID");

Deno.serve(async (req) => {
  let body: { text?: string };
  try {
    body = await req.json();
  } catch (_e) {
    return new Response("invalid json", { status: 400 });
  }
  if (!body.text) {
    return new Response("missing text", { status: 400 });
  }

  const lineRes = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: LINE_GROUP_ID,
      messages: [{ type: "text", text: body.text }],
    }),
  });
  const lineBody = await lineRes.text();
  console.log("line push status:", lineRes.status, lineBody);

  return new Response(JSON.stringify({ lineStatus: lineRes.status }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
