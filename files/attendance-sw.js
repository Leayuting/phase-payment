// 最小化 service worker：只為了讓瀏覽器認定這是可安裝的 PWA，
// 不做任何離線快取（這個工具完全依賴 Supabase 即時連線，離線快取沒有意義）。
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
