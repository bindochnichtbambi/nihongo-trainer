// Offline-Cache. Bei Änderungen an der App VERSION erhöhen.
const VERSION = "v30";
const FILES = [
  "./", "index.html", "css/style.css", "js/vocab.js", "js/kana.js", "js/counters.js", "js/kanji.js", "js/dialogs.js", "js/tadoku.js", "js/games-data.js", "js/grammar.js", "js/app.js",
  "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png",
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Erst Netz, bei Offline den Cache – so kommen Updates sofort an.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(VERSION).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
