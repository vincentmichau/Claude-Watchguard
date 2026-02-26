// frontend/src/serviceWorker.js - PWA Service Worker

const CACHE_NAME = 'night-watch-v1.4.0';
const RUNTIME_CACHE = 'night-watch-runtime';

// Assets à mettre en cache immédiatement
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json',
  '/favicon.ico'
];

// Installation - mise en cache des assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activation - nettoyage ancien cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie de cache
const cacheStrategies = {
  // Network first, fallback to cache (pour API)
  networkFirst: async (request) => {
    try {
      const response = await fetch(request);
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
      return response;
    } catch (error) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      // Retourner page offline si disponible
      return caches.match('/offline.html');
    }
  },

  // Cache first, fallback to network (pour assets)
  cacheFirst: async (request) => {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    try {
      const response = await fetch(request);
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
      return response;
    } catch (error) {
      return new Response('Offline', { status: 503 });
    }
  }
};

// Fetch - interception des requêtes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorer les requêtes vers d'autres origines (sauf API)
  if (url.origin !== location.origin && !url.href.includes('/api/')) {
    return;
  }

  // Stratégie API: Network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(cacheStrategies.networkFirst(request));
    return;
  }

  // Stratégie Assets: Cache first
  event.respondWith(cacheStrategies.cacheFirst(request));
});

// Background Sync - pour synchroniser les données offline
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reports') {
    event.waitUntil(syncOfflineReports());
  }
});

// Fonction de synchronisation des rapports créés offline
async function syncOfflineReports() {
  const db = await openIndexedDB();
  const offlineReports = await getOfflineReports(db);

  for (const report of offlineReports) {
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${report.token}`
        },
        body: JSON.stringify(report.data)
      });

      if (response.ok) {
        await deleteOfflineReport(db, report.id);
        // Notifier l'utilisateur du succès
        self.registration.showNotification('Rapport synchronisé', {
          body: 'Votre rapport créé hors ligne a été envoyé avec succès.',
          icon: '/icon-192.png'
        });
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}

// IndexedDB pour stocker données offline
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('NightWatchDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offlineReports')) {
        db.createObjectStore('offlineReports', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function getOfflineReports(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['offlineReports'], 'readonly');
    const store = transaction.objectStore('offlineReports');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function deleteOfflineReport(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['offlineReports'], 'readwrite');
    const store = transaction.objectStore('offlineReports');
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'Nouvelle notification',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200],
    data: data.url || '/',
    actions: [
      { action: 'open', title: 'Ouvrir' },
      { action: 'close', title: 'Fermer' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Night Watch', options)
  );
});

// Gestion des clics sur notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data || '/')
    );
  }
});
