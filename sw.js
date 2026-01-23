const CACHE_NAME = 'radyo-offline-v1';
const urlsToCache = [
  './',
  './index.html',
  './channels.txt'
];

// Yükleme (Install) Olayı: Dosyaları önbelleğe al
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Önbellek açıldı');
        return cache.addAll(urlsToCache);
      })
  );
});

// İstek (Fetch) Olayı: İnternet yoksa önbellekten göster
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Önbellekte varsa onu döndür (Offline erişim)
        if (response) {
          return response;
        }
        // Yoksa internetten çekmeye çalış
        return fetch(event.request);
      })
  );
});

// Güncelleme (Activate) Olayı: Eski önbellekleri temizle
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
