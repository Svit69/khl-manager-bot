const CACHE_NAME="khl-manager-v4";
const ASSETS=[
  "./",
  "./index.html",
  "./styles.css",
  "./src/app.js",
  "./src/data/teams.js",
  "./manifest.json",
  "./khl-logo/avangard.png",
  "./khl-logo/avtomobilist.png",
  "./khl-logo/salavat-yulaev.png",
  "./khl-logo/traktor.png",
  "./player-photo/da-costa.png",
  "./player-photo/golyshev.png"
];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE_NAME).map(x=>caches.delete(x))))) });
self.addEventListener("fetch",e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
