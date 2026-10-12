// sw.js
const CACHE_NAME = 'isustopra-v2.2';

// Lista de recursos a guardar en caché.
// Incluye tu HTML y las librerías CDN que usas para que funcione offline.
const ASSETS_TO_CACHE = [
  '/isustopra/',
  '/isustopra/index.html',
  '/isustopra/manifest.json',
  '/isustopra/icons/icon-192.png',
  '/isustopra/icons/icon-512.png',
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
      console.log('[SW] Cacheando app shell y dependencias externas — versión:', CACHE_NAME);
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
    }).then(() => {
      // Avisa a todas las pestañas abiertas de que ya está activa la nueva versión
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'SW_ACTIVATED', version: CACHE_NAME });
      });
    })
  );
  return self.clients.claim();
});

// Mensajería: responde con la versión al cliente que la pida
// La página hace: navigator.serviceWorker.controller.postMessage({ type: 'GET_VERSION' })
// y recibe:       { type: 'SW_VERSION', version: 'isustopra-v2.1' }
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'GET_VERSION') {
    const respond = (version) => {
      // Responde al cliente que preguntó (por si hay varias pestañas)
      if (event.source && typeof event.source.postMessage === 'function') {
        event.source.postMessage({ type: 'SW_VERSION', version });
      }
      // Y a todos los clientes controlados por si acaso
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_VERSION', version });
        });
      });
    };
    respond(CACHE_NAME);
  }
});

// Intercepción de red: Estrategia Cache First, falling back to Network
self.addEventListener('fetch', (event) => {
  // Solo procesar peticiones GET (evitar errores con POST o chrome-extensions)
  if (event.request.method !== 'GET') return;

  // Nunca cachear el propio sw.js: así el chip de versión siempre lee el archivo vivo
  // cuando la página hace fetch('/isustopra/sw.js', { cache: 'no-store' })
  try {
    const url = new URL(event.request.url);
    if (url.pathname.endsWith('/sw.js')) {
      return; // deja que vaya a red normalmente
    }
  } catch (_) { /* noop */ }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Si está en caché, devuélvelo
      if (response) {
        return response;
      }

      // Si no, búscalo en la red
      return fetch(event.request).then((networkResponse) => {
        return networkResponse;
      }).catch(() => {
        // Aquí podrías mostrar una página de "Offline" personalizada si quisieras
        console.log('[SW] Fallo de red y recurso no en caché:', event.request.url);
      });
    })
  );
});