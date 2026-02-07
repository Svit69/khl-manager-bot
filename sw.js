const CACHE_NAME="khl-manager-v27";
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
  "./player-photo/golyshev.png",
  "./player-photo/tryamkin.png",
  "./player-photo/busygin.png",
  "./player-photo/boucher.png",
  "./player-photo/gorbunov.png",
  "./player-photo/byvaltsev.png",
  "./player-photo/denezhkin.png",
  "./player-photo/kashtanov.png",
  "./player-photo/kizimov.png",
  "./player-photo/osipov.png",
  "./player-photo/sharov.png",
  "./player-photo/vorobyev.png",
  "./player-photo/romantsev.png",
  "./player-photo/shahkov.png",
  "./player-photo/isayev.png",
  "./player-photo/blacker.png",
  "./player-photo/malorosiyanov.png",
  "./player-photo/macek.png",
  "./player-photo/khripunov.png",
  "./player-photo/sharipzyanov.png",`r`n  "./player-photo/lajoie.png",`r`n  "./player-photo/chistyakov.png",`r`n  "./player-photo/blazhiyevsky.png",`r`n  "./player-photo/placeholder.png"
];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE_NAME).map(x=>caches.delete(x))))) });
self.addEventListener("fetch",e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});









