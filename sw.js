const CACHE='super-sense-v1.2';
const ASSETS=['./','index.html','styles.css','app.js','audio.js','data.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
// Wait for all old app windows to close before activating a consistent new version.
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('super-sense-v')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 e.respondWith(caches.open(CACHE).then(async c=>{
  const cached=await c.match(e.request);if(cached)return cached;
  try{const res=await fetch(e.request);if(res.ok)await c.put(e.request,res.clone());return res}
  catch(err){if(e.request.mode==='navigate')return c.match('index.html');throw err}
 }));
});
