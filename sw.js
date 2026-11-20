const release = '05419eef5207a031';
const scope = new URL(self.registration.scope);
const home = new URL('index.html', scope);
const cachePrefix = 'cavy-pages:' + scope.href + ':';
const cacheName = cachePrefix + release;
const versioned = ['app.js', 'icons.js', 'style.css', 'weather.js'].map(name => `${name}?v=${release}`);
const resources = [
  ...versioned, 'assets/blink.webp', 'assets/frost.webp', 'assets/mascot.webp', 'assets/neutral.webp',
  'assets/skies.webp', 'assets/xian.webp', 'icon-512.png', 'icon.png', 'manifest.webmanifest'
].map(name => new URL(name, scope).href);

async function installRelease() {
  const releaseUrl = new URL(home);
  releaseUrl.searchParams.set('release', release);
  const response = await fetch(releaseUrl, { cache: 'reload' });
  const marker = '<meta name="weather-release" content="' + release + '">';
  if (!response.ok || !(await response.clone().text()).includes(marker)) {
    throw new Error('The new weather page is not ready on this server.');
  }

  const cache = await caches.open(cacheName);
  await cache.addAll(resources.map(url => new Request(url, { cache: 'reload' })));
  await cache.put(home.href, response);
  await self.skipWaiting();
}

self.addEventListener('install', event => event.waitUntil(installRelease()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const names = await caches.keys();
  const obsolete = names.filter(name => name.startsWith(cachePrefix) && name !== cacheName);
  await Promise.all(obsolete.map(name => caches.delete(name)));
  await self.clients.claim();
})()));

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scope.origin) return;

  const opensApp = request.mode === 'navigate'
    && (url.pathname === scope.pathname || url.pathname === home.pathname);
  const key = opensApp ? home.href : url.href;
  if (!opensApp && !resources.includes(key)) return;

  event.respondWith(caches.open(cacheName).then(async cache => {
    return await cache.match(key) || fetch(request);
  }));
});
