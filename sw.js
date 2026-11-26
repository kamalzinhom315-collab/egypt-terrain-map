/* Service Worker — تضاريس مصر. يُولَّد رقم الإصدار والقائمة تلقائيًا من build.py */
const VERSION = 'sv360a1';
const CACHE = 'egypt-terrain-' + VERSION;
const CORE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/fonts.css",
  "css/style.css",
  "js/app.js",
  "vendor/leaflet.js",
  "vendor/pannellum.js",
  "data/features.json",
  "data/egypt-ring.json",
  "assets/relief.webp",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "assets/fonts/cairo-arabic.woff2",
  "assets/fonts/cairo-latin.woff2"
];
const MEDIA = [
  "assets/img/delta.webp",
  "assets/img/eastern.webp",
  "assets/img/nile.webp",
  "assets/img/qattara.webp",
  "assets/img/redsea.webp",
  "assets/img/sinai.webp",
  "assets/img/siwa.webp",
  "assets/img/white.webp",
  "assets/audio/delta-salma.mp3",
  "assets/audio/delta-shakir.mp3",
  "assets/audio/eastern-salma.mp3",
  "assets/audio/eastern-shakir.mp3",
  "assets/audio/nile-salma.mp3",
  "assets/audio/nile-shakir.mp3",
  "assets/audio/qattara-salma.mp3",
  "assets/audio/qattara-shakir.mp3",
  "assets/audio/redsea-salma.mp3",
  "assets/audio/redsea-shakir.mp3",
  "assets/audio/sinai-salma.mp3",
  "assets/audio/sinai-shakir.mp3",
  "assets/audio/siwa-salma.mp3",
  "assets/audio/white-salma.mp3",
  "assets/audio/white-shakir.mp3"
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);                                   // الأساسيات: فشلها يفشل التثبيت
    await Promise.allSettled(MEDIA.map(u => c.add(u)));     // الصور والصوت: محاولة لكل ملف على حدة
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('egypt-terrain-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

// iOS Safari لا يشغّل الصوت من الكاش إلا بدعم Range (استجابة 206)
async function rangeFromCache(req) {
  const cached = await caches.match(req.url);
  if (!cached) return fetch(req);
  const buf = await cached.arrayBuffer(), size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  if (!m) return cached;
  let start, end;
  if (m[1] === '') { start = Math.max(0, size - parseInt(m[2], 10)); end = size - 1; }
  else { start = parseInt(m[1], 10); end = m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1; }
  if (!(start <= end) || start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
  return new Response(buf.slice(start, end + 1), {
    status: 206, statusText: 'Partial Content',
    headers: {
      'Content-Type': cached.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes'
    }
  });
}

// الصفحة والكود والبيانات: الشبكة أولًا (لتصل التحديثات) مع مهلة 4 ثوانٍ ثم الكاش
async function networkFirst(req) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req, { ignoreSearch: true });
  const net = fetch(req).then(res => { if (res && res.ok) c.put(req, res.clone()); return res; });
  if (!hit) {
    try { return await net; } catch (err) {
      if (req.mode === 'navigate') {
        const home = await c.match(new URL('index.html', self.registration.scope).href);
        if (home) return home;
      }
      throw err;
    }
  }
  return Promise.race([net, new Promise(r => setTimeout(() => r(hit), 4000))]).catch(() => hit);
}

// الصور والصوت والخطوط والمكتبات: الكاش أولًا
async function cacheFirst(req) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok) c.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;               // بلاطات Esri وغيرها تذهب للشبكة مباشرة
  if (req.headers.has('range')) { e.respondWith(rangeFromCache(req)); return; }
  const p = url.pathname;
  const dynamic = req.mode === 'navigate' || /\.(?:html|js|css|json|webmanifest)$/.test(p) || p.endsWith('/');
  e.respondWith(dynamic && !p.includes('/vendor/') ? networkFirst(req) : cacheFirst(req));
});
