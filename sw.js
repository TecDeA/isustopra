const CACHE_NAME = 'isustopra-v2.1';

// Lista de recursos a guardar en caché.
// Incluye tu HTML y las librerías CDN que usas para que funcione offline.
const ASSETS_TO_CACHE = [
  '/ISUStoPRA/',
  '/ISUStoPRA/index.html',
  '/ISUStoPRA/manifest.json',
  '/ISUStoPRA/icons/icon-192.png',
  '/ISUStoPRA/icons/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap'
];

// Instalación: Guarda los archivos esenciales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cacheando app shell y dependencias externas');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activación: Limpia cachés antiguas si actualizas la versión
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Eliminando caché antigua', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Intercepción de red: Estrategia Cache First, falling back to Network
self.addEventListener('fetch', (event) => {
  // Solo procesar peticiones GET (evitar errores con POST o chrome-extensions)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Si está en caché, devuélvelo
      if (response) {
        return response;
      }
      
      // Si no, búscalo en la red
      return fetch(event.request).then((networkResponse) => {
        // Opcional: Podríamos guardar dinámicamente nuevas peticiones aquí,
        // pero por seguridad nos limitamos a lo definido en ASSETS_TO_CACHE
        // o permitimos que pase tal cual.
        return networkResponse;
      }).catch(() => {
        // Aquí podrías mostrar una página de "Offline" personalizada si quisieras
        console.log('[SW] Fallo de red y recurso no en caché:', event.request.url);
      });
    })
  );
});