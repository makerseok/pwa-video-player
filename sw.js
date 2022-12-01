const STATIC_CACHE_NAME = 'site-static-v33';
const DYNAMIC_CACHE_NAME = 'site-dynamic-v42';
const VIDEO_CACHE_NAME = 'site-video-v4';
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
    caches.open(STATIC_CACHE_NAME).then(cache => {
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
          .filter(
            key =>
              key !== STATIC_CACHE_NAME &&
              key !== DYNAMIC_CACHE_NAME &&
              key !== VIDEO_CACHE_NAME,
          )
          .map(key => caches.delete(key)),
      );
    }),
  );
});

// fetch event
self.addEventListener('fetch', event => {
  // console.log('fetch event', event);
  if (event.request.method !== 'GET') return;
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }

      if (event.request.url.indexOf('.mp4') > -1) {
        return fetchVideo(event.request);
      }
      if (
        event.request.url.indexOf('hivestack.com') === -1 &&
        event.request.url.indexOf('ords/podo') === -1
      ) {
        return fetchDynamic(event.request);
      }
      return fetch(event.request);
    })(),
  );
});

const fetchDynamic = async request => {
  const response = await fetch(request);
  await cacheDynamic(request.url, response.clone());
  return response;
};

const cacheDynamic = async (url, response) => {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  await cache.put(url, response);
  limitCacheSize(DYNAMIC_CACHE_NAME, 15);
};

const cacheVideo = async (url, response) => {
  const cache = await caches.open(VIDEO_CACHE_NAME);
  await cache.put(url, response);
};

const fetchVideo = async request => {
  const response = await fetch(request);
  if (response.status !== 206) {
    await cacheVideo(request.url, response.clone());
    console.log('video cached', request.url);
  }
  return response;
};
