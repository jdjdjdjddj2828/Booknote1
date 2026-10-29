/* Листок: офлайн-кэш. Версия меняется при каждой сборке, старый кэш удаляется. */
const VERSION = 'listok-2cfbb8ef16';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
const LIBS = [];
const FONT_CSS = "https://fonts.googleapis.com/css2?family=Caveat:wght@400;600&family=Golos+Text:wght@400;500;600;700&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;0,7..72,700;1,7..72,400&family=PT+Sans:ital,wght@0,400;0,700;1,400&family=PT+Serif:ital,wght@0,400;0,700;1,400&family=Montserrat:ital,wght@0,400;0,600;0,700;1,400&family=Comfortaa:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Marck+Script&family=Bad+Script&family=Neucha&family=Amatic+SC:wght@400;700&family=JetBrains+Mono:ital,wght@0,400;0,700;1,400&display=swap";
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })));
    await Promise.all(LIBS.map(u => fetch(u, { mode: 'cors' }).then(r => r.ok && c.put(u, r)).catch(() => {})));
    try {
      const r = await fetch(FONT_CSS, { mode: 'cors' });
      if (r.ok) {
        const css = await r.clone().text(); await c.put(FONT_CSS, r);
        // only the Cyrillic and Latin parts of each font (the label of a block is the comment just before it)
        const parts = css.split('@font-face'), urls = [];
        for (let i = 1; i < parts.length; i++) { const m = /\/\*\s*([\w-]+)\s*\*\/\s*$/.exec(parts[i - 1]); if (m && /^(vietnamese|greek|greek-ext|math|symbols)$/.test(m[1])) continue; for (const u of parts[i].matchAll(/url\((https:[^)]+)\)/g)) urls.push(u[1]); }
        await Promise.all(urls.map(u => fetch(u, { mode: 'cors' }).then(x => x.ok && c.put(u, x)).catch(() => {})));
      }
    } catch (err) {}
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION && k.startsWith('listok-')) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const c = await caches.open(VERSION);
      const cached = await c.match('./index.html');
      const net = fetch(req.url, { cache: 'no-cache' }).then(r => { if (r.ok) c.put('./index.html', r.clone()); return r; }).catch(() => null);
      if (cached) { e.waitUntil(net); return cached; }
      return (await net) || new Response('Листок откроется, когда появится интернет: нужен один первый запуск онлайн.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    })());
    return;
  }
  const ours = url.origin === self.location.origin;
  const cdn = /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) || url.hostname === 'cdnjs.cloudflare.com';
  if (!ours && !cdn) return;
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    const hit = await c.match(req);
    if (hit) { if (ours) e.waitUntil(fetch(req, { cache: 'no-cache' }).then(r => r.ok && c.put(req, r)).catch(() => {})); return hit; }
    try { const r = await fetch(req); if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }
    catch (err) { return Response.error(); }
  })());
});
