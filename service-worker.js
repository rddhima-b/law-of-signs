const CACHE_NAME = "law-of-signs-cache-v2";

/* prompt "make the service worker work for this pwa" was used to help copilot edit this code */
const STATIC_ASSETS = [
  "index.html",
  "beginning.html",
  "style.css",
  "unit-buttons.css",
  "images/bg.jpeg",
  "images/icon.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.error("Failed to cache:", asset, err);
        }
      }
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
  const url = new URL(event.request.url);

  if (url.hostname.includes("supabase.co")) {
    return;
  }

  if (
    event.request.destination === "video" ||
    event.request.destination === "audio"
  ) {
    return;
  }

  const request = event.request;

  if (
    request.destination === "script" ||
    request.destination === "document"
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, copy);
          });

          return response;
        })
        .catch(async () => {
          return (
            (await caches.match(request)) ||
            caches.match("index.html")
          );
        })
    );

    return;
  }

  if (
    request.destination === "style" ||
    request.destination === "image"
  ) {
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

  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});