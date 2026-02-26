// frontend/public/service-worker.js - PWA Service Worker

const CACHE_NAME = 'night-watch-v2.0';
const STATIC_CACHE = 'static-v2.0';
const DYNAMIC_CACHE = 'dynamic-v2.0';
const IMAGE_CACHE = 'images-v2.0';

// Files to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json',
  '/offline.html'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== IMAGE_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // API requests - Network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response
          const responseClone = response.clone();
          
          // Cache successful GET requests
          if (request.method === 'GET' && response.ok) {
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          
          return response;
        })
        .catch(() => {
          // Fallback to cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            
            return new Response('Offline - no cached data', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
        })
    );
    return;
  }
  
  // Images - Cache first, network fallback
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request).then((response) => {
          const responseClone = response.clone();
          
          caches.open(IMAGE_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          
          return response;
        });
      })
    );
    return;
  }
  
  // Other requests - Cache first, network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return cachedResponse || fetch(request).then((response) => {
        const responseClone = response.clone();
        
        if (request.method === 'GET') {
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        
        return response;
      });
    })
  );
});

// Background Sync - sync data when back online
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync', event.tag);
  
  if (event.tag === 'sync-reports') {
    event.waitUntil(syncReports());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received', event);
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Night Watch';
  const options = {
    body: data.body || 'Nouvelle notification',
    icon: '/logo192.png',
    badge: '/logo192.png',
    data: data.data,
    actions: [
      { action: 'view', title: 'Voir' },
      { action: 'close', title: 'Fermer' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view' && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Helper: Sync pending reports
async function syncReports() {
  try {
    // Get pending reports from IndexedDB
    const db = await openDB();
    const pendingReports = await db.getAll('pending-reports');
    
    for (const report of pendingReports) {
      try {
        // Send to server
        const response = await fetch('/api/reports', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${report.token}`
          },
          body: JSON.stringify(report.data)
        });
        
        if (response.ok) {
          // Remove from pending
          await db.delete('pending-reports', report.id);
          console.log('[SW] Report synced:', report.id);
        }
      } catch (error) {
        console.error('[SW] Sync failed for report:', report.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync reports failed:', error);
  }
}

// Helper: Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('night-watch-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pending-reports')) {
        db.createObjectStore('pending-reports', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}
