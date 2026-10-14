/* TSC NOTE service worker
 * 전략: 같은 출처(origin) 요청은 "네트워크 우선, 실패 시 캐시".
 * - 온라인이면 항상 최신 파일을 받아오고 캐시를 갱신한다 (재배포 즉시 반영).
 * - 오프라인이면 마지막으로 성공한 캐시를 쓴다.
 * 사용자 데이터(localStorage)는 이 파일과 무관하게 브라우저에 그대로 남는다.
 */
const CACHE = 'tsc-note-v1';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 외부 링크(네이버 사전 등)는 관여하지 않음

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req, { ignoreSearch: true });
        if (cached) return cached;
        if (req.mode === 'navigate') {
          return (await caches.match('./index.html')) || Response.error();
        }
        return Response.error();
      })
  );
});
