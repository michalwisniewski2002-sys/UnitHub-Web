// Keeps UnitHub working offline. Files are served from the cache straight away and refreshed in the background,
// so an update you push reaches the app the next time it's opened. Bump VERSION when files are added or removed.
const VERSION = "unithub-3.4.0";
const FILES = ["./", "index.html", "styles.css", "manifest.webmanifest", "js/app.js", "js/data.js", "js/skins.js", "js/palettes.js",
               "js/sound.js", "js/effects.js", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Only this site's own files; GitHub API calls always go to the network.
  if (event.request.method !== "GET" || url.origin !== location.origin) return;
  // "Check for updates" asks past the cache.
  if (event.request.cache === "no-store" || event.request.cache === "reload") return event.respondWith(fetch(event.request));
  event.respondWith(caches.open(VERSION).then(async (cache) => {
    const cached = await cache.match(event.request, { ignoreSearch: true });
    const fresh = fetch(event.request).then((response) => {
      if (response.ok) cache.put(event.request, response.clone());
      return response;
    }).catch(() => cached);
    return cached ?? fresh;
  }));
});
