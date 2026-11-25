// 버들 국어사전: 한 번 열면 와이파이 없이도 쓸 수 있게 저장해 둔다
const V = 'buddle-v5';
const CORE = ['./', 'index.html', 'app.js?v=5', 'words.json', 'games.json', 'qrcode.js', 'Pretendard-Regular.woff2', 'Pretendard-Bold.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // 먼저 인터넷에서 새것을 받고, 안 되면 저장해 둔 것을 쓴다
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: false }).then(m => m || caches.match(e.request, { ignoreSearch: true }))));
});
