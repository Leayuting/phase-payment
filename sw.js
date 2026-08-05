// 不快取任何內容的 service worker，只是為了讓瀏覽器判定這個網頁「可以安裝成 App」。
// 完全不攔截 fetch，確保永遠讀到 Supabase 最新資料，不會有舊資料被快取住的問題。
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
