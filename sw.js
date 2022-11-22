const staticCashName = 'site-static-v10';
const dynamicCasheName = 'site-dynamic-v10';
const assets = [
  '/pwa-video-player/',
  '/pwa-video-player/index.html',
  '/pwa-video-player/js/app.js',
  '/pwa-video-player/js/ui.js',
  '/pwa-video-player/js/materialize.min.js',
  '/pwa-video-player/css/styles.css',
  '/pwa-video-player/css/materialize.min.css',
  '/pwa-video-player/img/dish.png',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://fonts.gstatic.com/s/materialicons/v139/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2',
  '/pwa-video-player/pages/fallback.html',
  '/pwa-video-player/css/video-js.min.css',
  '/pwa-video-player/js/video.min.js',
  '/pwa-video-player/js/videojs-playlist.min.js',
];

// cache size limit function
const limitCacheSize = (name, size) => {
  caches.open(name).then(cache => {
    cache.keys().then(keys => {
      if (keys.length > size) {
        cache.delete(keys[0]).then(limitCacheSize(name, size));
      }
    });
  });
};

// install event
self.addEventListener('install', event => {
  console.log('service worker has been installed');
  event.waitUntil(
    caches.open(staticCashName).then(cache => {
      console.log('caching shell assets');
      cache.addAll(assets);
    }),
  );
});

// activate event
self.addEventListener('activate', event => {
  console.log('service worker has been activated');
  event.waitUntil(
    caches.keys().then(keys => {
      // console.log(keys);
      return Promise.all(
        keys
          .filter(key => key !== staticCashName && key !== dynamicCasheName)
          .map(key => caches.delete(key)),
      );
    }),
  );
});

// fetch event
self.addEventListener('fetch', event => {
  // console.log('fetch event', event);
  if (event.request.method != 'GET') return;
  event.respondWith(
    caches
      .match(event.request)
      .then(cacheRes => {
        return (
          cacheRes ||
          fetch(event.request).then(async fetchRes => {
            if (
              event.request.destination !== 'video' &&
              event.request.url.indexOf('hivestack.com') > -1 &&
              event.request.url.indexOf('ords/podo') > -1
            ) {
              const cache = await caches.open(dynamicCasheName);
              await cache.put(event.request.url, fetchRes.clone());
              limitCacheSize(dynamicCasheName, 15);
            }
            return fetchRes;
          })
        );
      })
      .catch(() => {
        // if (event.request.url.indexOf('.html') > -1) {
        if (event.request.destination === 'document') {
          return caches.match('/pwa-video-player/pages/fallback.html');
        }
      }),
  );
});
