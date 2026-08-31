const CACHE_NAME = 'quizblitz-v3';

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(key) {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    })
  );
  self.clients.claim();
});

// Stratégie "Réseau d'abord" : on prend toujours la version du serveur si dispo
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request).then(function(response) {
      // On met en cache la nouvelle version
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, copy);
        });
      }
      return response;
    }).catch(function() {
      // Si pas de réseau, on sert le cache
      return caches.match(event.request);
    })
  );
});
