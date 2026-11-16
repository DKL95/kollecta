/* Service worker de KollectA: permite instalar la app y abrirla aunque la red falle.
   - Nunca guarda respuestas de /api, /socket.io ni /uploads (datos siempre frescos).
   - Páginas: primero la red; sin conexión, la última versión guardada de la app.
   - Archivos de /assets (con hash en el nombre) e íconos: se guardan la primera vez. */

const CACHE = "kollecta-v1";
const APP = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/favicon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (/^\/(api|socket\.io|uploads)\//.test(url.pathname)) return;

  // Navegación (abrir una pantalla): red primero, y si no hay conexión la app guardada.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((respuesta) => {
          const copia = respuesta.clone();
          caches.open(CACHE).then((cache) => cache.put("/", copia));
          return respuesta;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  // Archivos estáticos: de la caché si ya están; si no, de la red y se guardan.
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (guardada) =>
          guardada ||
          fetch(request).then((respuesta) => {
            if (respuesta.ok) {
              const copia = respuesta.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copia));
            }
            return respuesta;
          })
      )
    );
  }
});
