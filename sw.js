/* Офлайн-кэш: игра целиком работает без интернета после первого запуска. */
const V='kot-v14';
const CORE=['./','index.html','manifest.webmanifest','vendor/three.min.js','js/data.js','js/levels.js','js/core.js','js/audio.js','js/render.js','js/ui.js','js/main.js','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const url=new URL(r.url);
  const local=url.origin===location.origin;
  if(!local&&!/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname))return;
  // свои файлы: сначала сеть (чтобы обновления доходили), при офлайне — кэш; шрифты: сначала кэш
  if(local){e.respondWith(fetch(r,{cache:'no-store'}).then(res=>{const c=res.clone();caches.open(V).then(ca=>ca.put(r,c));return res}).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('index.html'))));return}
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{const c=res.clone();caches.open(V).then(ca=>ca.put(r,c));return res})));
});
