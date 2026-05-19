/* FIREcomendations Service Worker
 * Estrategia:
 *  - HTML/JS/CSS: network-first (siempre intenta lo último; si falla, usa caché)
 *  - Imágenes locales (img/...): cache-first (no se descargan 100 veces)
 *  - APIs externas (TMDb, Spotify, Apps Script, etc): pasan directo, no cachear
 *
 * Versionado: cuando cambia CACHE_VERSION, se invalidan TODOS los caches viejos.
 * El cliente recibe un 'controllerchange' y muestra el toast de "nueva versión".
 */

const CACHE_VERSION = 'firecomendations-v0.2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const IMAGES_CACHE = `${CACHE_VERSION}-images`;

/* En 'install' precacheamos solo lo mínimo para que la app abra offline */
const PRECACHE_URLS = [
  '/firecomendations/',
  '/firecomendations/index.html',
  '/firecomendations/manifest.json',
];

self.addEventListener('install', (event) => {
  // Skip waiting: activamos inmediatamente la nueva versión
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {/* si falla la precarga no importa, seguimos */})
  );
});

self.addEventListener('activate', (event) => {
  // Limpiar caches viejos de versiones anteriores
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* Helper: ¿es una imagen local del repo? */
function isLocalImage(url) {
  return url.pathname.startsWith('/firecomendations/img/');
}

/* Helper: ¿es nuestra app (HTML/JS/CSS, no externa)? */
function isAppShell(url) {
  if (url.origin !== self.location.origin) return false;
  if (!url.pathname.startsWith('/firecomendations/')) return false;
  // Excluir imágenes
  if (isLocalImage(url)) return false;
  return true;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Solo manejamos GETs
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Imágenes locales: stale-while-revalidate
  if (isLocalImage(url)) {
    event.respondWith(
      caches.open(IMAGES_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          const fetchPromise = fetch(req).then((res) => {
            if (res && res.status === 200) {
              cache.put(req, res.clone());
            }
            return res;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // App shell (HTML/JS/CSS de nuestro origen): network-first
  if (isAppShell(url)) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(req, clone));
        }
        return res;
      }).catch(() => caches.match(req).then((cached) => cached || caches.match('/firecomendations/index.html')))
    );
    return;
  }

  // Resto (APIs externas, fonts, etc): pasar al network sin tocar
});

/* Mensajes desde la app (para skipWaiting on demand) */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
