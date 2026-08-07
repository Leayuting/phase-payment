// 通用的 LINE 推播函式：接收 { text } 就推送到指定群組。
// 給前端在特定操作完成後（例如發票電子檔上傳）直接從瀏覽器呼叫，不用另外接資料庫 trigger。
// 因為是瀏覽器直接呼叫（跨網域），一定要處理 CORS，否則瀏覽器會在送出前就把請求擋掉，
// 而且前端的 fetch(...).catch() 會把這個錯誤吃掉，完全看不出來哪裡失敗。
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
const LINE_GROUP_ID = Deno.env.get("LINE_GROUP_ID");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS_HEADERS });
  }

  let body: { text?: string };
  try {
    body = await req.json();
  } catch (_e) {
    return new Response("invalid json", { status: 400, headers: CORS_HEADERS });
  }
  if (!body.text) {
    return new Response("missing text", { status: 400, headers: CORS_HEADERS });
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
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
});
