/* Service worker MINIMO da area membri "Il tuo programma" (v3).
   - HTML: rede primeiro (cache so como reserva se a rede falhar).
   - app.css, fontes, icones, posters, manifest: cache primeiro (preenche no 1o uso).
   - mp4 e PDF e qualquer pedido com Range: NUNCA passam por aqui (o navegador cuida sozinho, faixa por faixa).
   - Cache versionado: toda republicacao troca o token 20260925 (aqui e no app.css?v= dos HTML); no activate os caches
     antigos sao apagados. Registro feito pelo index.html so se 'serviceWorker' existir, em try/catch. */
var VERSION = 'v3-20260925';
var CACHE = 'programma-' + VERSION;
var PRECACHE = ['app.css?v=20260925', 'fonts/fraunces-var-latin.woff2', 'fonts/manrope-var-latin.woff2'];
var STATIC_RE = /\.(css|woff2|png|jpg|jpeg|svg|webmanifest)$/i;
var NEVER_RE = /\.(mp4|m4v|webm|pdf)$/i;
var HTML_RE = /(\/|\.html?)$/i;

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(PRECACHE).catch(function () {}); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') { return; }
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) { return; }
  if (NEVER_RE.test(url.pathname) || req.headers.has('range')) { return; }          /* video e PDF: direto pro navegador */

  if (req.mode === 'navigate' || req.destination === 'document' || HTML_RE.test(url.pathname)) {
    e.respondWith(
      fetch(req).then(function (r) {
        if (r && r.ok) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
        return r;
      }).catch(function () {
        return caches.match(req).then(function (hit) { if (hit) { return hit; } throw new Error('offline'); });
      })
    );
    return;
  }

  if (STATIC_RE.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        if (hit) { return hit; }
        return fetch(req).then(function (r) {
          if (r && r.ok) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
          return r;
        });
      })
    );
  }
  /* resto: sem respondWith = comportamento normal do navegador */
});
