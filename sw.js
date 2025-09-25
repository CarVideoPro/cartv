const CACHE_NAME = 'carvideopro-cache-v1';
// Önbelleğe alınacak kritik dosyaların listesi
const urlsToCache = [
  '/', // index(2).html'nin ana dizin olduğunu varsayar
  'index(2).html', // HTML dosyanızın adı
  'https://cdn.jsdelivr.net/npm/hls.js@latest', // HLS kütüphanesi
  // Kanalların logoları gibi görselleri buraya ekleyebilirsiniz (zorunlu değil)
];

self.addEventListener('install', event => {
  // Yükleme sırasında temel dosyaları önbelleğe al
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Önbelleğe alma tamamlandı');
        // Başarısız olursa cache.addAll işlemi başarısız olur ve SW yüklenmez.
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // Önbellekteki dosyaları sun, yoksa ağdan dene
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 1. Önbellekte varsa hemen onu dön
        if (response) {
          return response;
        }
        
        // 2. Önbellekte yoksa (veya kanal listesi gibi dinamik bir URL ise) ağı dene
        return fetch(event.request).catch(error => {
            // Ağdan çekilemezse (internetsizlik) ve isteği karşılayacak
            // önbellekte bir karşılığı yoksa hata döner.
            console.log('Ağ isteği başarısız oldu:', event.request.url, error);
            // Burada kullanıcıya özel bir 'offline' sayfası da gösterilebilir.
        });
      })
  );
});

self.addEventListener('activate', event => {
  // Eski önbellekleri temizle (yeni bir sürüm yüklenirken)
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Eski önbellek siliniyor:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});