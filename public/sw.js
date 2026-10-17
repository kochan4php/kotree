const CACHE_NAME = 'kotree-offline-cache-v5';
const OFFLINE_URL = '/offline';

const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/icon.svg',
  '/apple-touch-icon.png',
  '/icons/icon-192x192.png',
];

// Precache the offline page AND the hashed CSS/JS chunks its HTML references,
// so the fallback renders fully styled even on a first-ever offline visit.
async function precacheOfflinePage() {
  const cache = await caches.open(CACHE_NAME);
  const res = await fetch(OFFLINE_URL, { cache: 'reload' });
  if (!res.ok) return;
  await cache.put(OFFLINE_URL, res.clone());
  const html = await res.text();
  const assets = [...html.matchAll(/(?:href|src)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]);
  await Promise.all(
    assets.map((url) =>
      fetch(url)
        .then((r) => (r.ok ? cache.put(url, r) : undefined))
        .catch(() => undefined)
    )
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(precacheOfflinePage)
      .catch(() => {
        // Network hiccup during install: keep the old shell, the next
        // navigation re-triggers an update anyway.
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Never cache API responses (live data) or cross-origin requests
  const url = new URL(event.request.url);
  if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;

  // Navigations are network-first so a deploy's new HTML (and its new chunk
  // references) always wins. Offline: the cached page, else the cached
  // /offline shell, else the cached home page.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return networkResponse;
        })
        .catch(async () => {
          const cached =
            (await caches.match(event.request)) ||
            (await caches.match(OFFLINE_URL)) ||
            (await caches.match('/'));
          return cached || Response.error();
        })
    );
    return;
  }

  // Hashed build assets are immutable: cache-first, never revalidate —
  // repeat visits (and offline) are instant. Everything else: stale-while-revalidate.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((networkResponse) => {
            if (networkResponse.ok) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
            return networkResponse;
          })
      )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse.ok) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => {
        // Return offline fallback if network fails and no cache exists
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// ---------- Background Sync: flush the offline queues ----------
// Progressive enhancement on top of the page's own 'online' handler. The SW
// replays whatever idb-keyval holds; it needs the CSRF token the page stashed
// next to the queue, and gives up quietly if that is missing or stale.
const IDB_NAME = 'keyval-store';
const IDB_STORE = 'keyval';
const TOKEN_MAX_AGE_MS = 90 * 60_000;

function idbGet(key) {
  return new Promise((resolve) => {
    const open = indexedDB.open(IDB_NAME);
    open.onerror = () => resolve(null);
    open.onsuccess = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) return resolve(null);
      const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    };
  });
}

function idbSet(key, value) {
  return new Promise((resolve) => {
    const open = indexedDB.open(IDB_NAME);
    open.onerror = () => resolve(false);
    open.onsuccess = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) return resolve(false);
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    };
  });
}

async function flushQueue(key, url, makeBody, token) {
  const queue = await idbGet(key);
  if (!Array.isArray(queue) || queue.length === 0) return;
  // Claim the queue before posting — the page's online handler may race us
  await idbSet(key, []);
  const remaining = [];
  for (const item of queue) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makeBody(item, token)),
      });
      if (!res.ok) remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }
  if (remaining.length > 0) await idbSet(key, remaining);
}

self.addEventListener('sync', (event) => {
  if (event.tag !== 'kotree-sync-queues') return;
  event.waitUntil(
    (async () => {
      const meta = await idbGet('csrf-token');
      const fresh = meta && typeof meta.token === 'string' && Date.now() - meta.at < TOKEN_MAX_AGE_MS;
      // Stale or absent token: leave the queues for the page to flush with a
      // freshly generated one.
      if (!fresh) return;
      const token = meta.token;
      await flushQueue('offline-clicks', '/api/click-link-counter', (name, t) => ({
        name: String(name).toLowerCase(),
        count: 1,
        _token: t,
      }), token);
      await flushQueue('offline-guestbook', '/api/guestbook', (message, t) => ({
        message,
        _token: t,
      }), token);
    })()
  );
});
