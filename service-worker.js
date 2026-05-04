const CACHE_NAME = "law-of-signs-cache";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/beginning.html",
  "/style.css",
  "/unit-buttons.css",
  "/images/bg.jpeg",
  "/images/icon.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.destination === "script" || request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, copy);
          });
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  if (request.destination === "style" || request.destination === "image") {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, copy);
            });
            return response;
          })
        );
      })
    );
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
