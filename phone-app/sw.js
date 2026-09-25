// sw.js - lets the Rangefinder page open with no phone signal.
//
// A "service worker" is a small script the browser keeps on the phone. It
// sits between the page and the internet:
//   - With signal: it fetches the page as normal (so a new version you upload
//     to GitHub shows up), and keeps a copy.
//   - No signal (or the signal is so weak the page doesn't arrive within
//     3 seconds): it hands back the saved copy instead.
// Example: you open the page at home once, then drive to a range with no
// service. Bluefy asks for the page, the network fails, and this script
// answers with the copy from home. Bluetooth doesn't need the internet, so
// everything else works.
//
// Only this site's own files are saved. Weather from open-meteo.com always
// goes to the internet (it's live data, so an old copy would be wrong).

const CACHE = "rangefinder-app";
const FILES = ["./", "./index.html"];
const NETWORK_WAIT_MS = 3000;

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
  self.skipWaiting();              // start working straight away, not after the next visit
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(networkThenCache(request));
});

async function networkThenCache(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error("slow")), NETWORK_WAIT_MS)),
    ]);
    if (response.ok) cache.put(request, response.clone());   // keep the newest copy
    return response;
  } catch (e) {
    const saved = await cache.match(request, { ignoreSearch: true }) || await cache.match("./index.html");
    if (saved) return saved;
    throw e;
  }
}
