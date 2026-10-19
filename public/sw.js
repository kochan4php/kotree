const CACHE_NAME = 'kotree-offline-cache-v6';
const OFFLINE_URL = '/offline';
// Kept across SW updates: the warm-cache that periodicsync refreshes (K13)
const DATA_CACHE = 'kotree-data-cache';
const KEEP_CACHES = [CACHE_NAME, DATA_CACHE];

const ASSETS_TO_CACHE = [
  '/manifest.json',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/icon.svg',
  '/apple-touch-icon.png',
  '/icons/icon-192x192.png',
];

// Precache a page's HTML *and* the hashed build assets it references, so the
// fallback and the content indexes render fully styled even on a first-ever
// offline visit (K9).
async function precachePage(url) {
  const cache = await caches.open(CACHE_NAME);
  const res = await fetch(url, { cache: 'reload' });
  if (!res.ok) return;
  await cache.put(url, res.clone());
  const html = await res.text();
  const assets = [...html.matchAll(/(?:href|src)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]);
  await Promise.allSettled(
    assets.map((asset) =>
      fetch(asset).then((r) => (r.ok ? cache.put(asset, r) : undefined))
    )
  );
}

const PRECACHE_PAGES = ['/', OFFLINE_URL, '/projects', '/notes'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Network hiccups must never fail the install; whatever is reachable
      // gets cached and the rest arrives on first online visit.
      await cache.addAll(ASSETS_TO_CACHE).catch(() => {});
      await Promise.allSettled(PRECACHE_PAGES.map(precachePage));
    })()
  );
  // No skipWaiting on purpose: a waiting worker is what powers the
  // "new version — refresh?" prompt (K8). The page posts SKIP_WAITING
  // after the user accepts, and only then does the new worker take over.
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !KEEP_CACHES.includes(name))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// K11: a share from Android lands as a POST navigation. Stash the text for
// the guestbook and bounce the visitor straight there.
async function handleShare(request) {
  try {
    const formData = await request.formData();
    const shared = ['title', 'text', 'url']
      .map((key) => formData.get(key))
      .filter((value) => typeof value === 'string' && value.length > 0)
      .join(' ')
      .trim()
      .slice(0, 100);
    if (shared) await idbSet('share-draft', shared);
  } catch {
    // Unparsable share (or idb blocked): land on the guestbook anyway
  }
  return Response.redirect('/guestbook?shared=1', 303);
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  if (event.request.method === 'POST' && url.pathname === '/share') {
    event.respondWith(handleShare(event.request));
    return;
  }

  if (event.request.method !== 'GET') return;

  // API responses stay live; the sole exception is the click counter, which
  // periodicsync keeps warm so offline visits show last-known numbers (K13).
  if (url.pathname.startsWith('/api/')) {
    if (url.pathname === '/api/click-link-counter') {
      event.respondWith(
        fetch(event.request).catch(async () => (await caches.match(event.request)) || Response.error())
      );
    }
    return;
  }

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
        // Offline fallback: the cached copy if there is one, otherwise a plain
        // network error — returning undefined here would be a TypeError.
        return cachedResponse || Response.error();
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
    open.onupgradeneeded = () => open.result.createObjectStore(IDB_STORE);
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
    open.onupgradeneeded = () => open.result.createObjectStore(IDB_STORE);
    open.onsuccess = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) return resolve(false);
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(value, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    };
  });
}

async function flushQueue(key, url, makeBody, token) {
  const queue = await idbGet(key);
  if (!Array.isArray(queue) || queue.length === 0) return 0;
  // Claim the queue before posting — the page's online handler may race us
  await idbSet(key, []);
  const remaining = [];
  let delivered = 0;
  for (const item of queue) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makeBody(item, token)),
      });
      if (res.ok) delivered++;
      else remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }
  if (remaining.length > 0) await idbSet(key, remaining);
  return delivered;
}

// G9: a message that reached the wall while the tab was closed is worth one
// notification. The visitor's choice is the mirrored switch (a worker cannot
// read localStorage); showNotification itself refuses when permission is gone,
// so a denial lands in the catch rather than in the visitor's face.
async function announceDelivery(count) {
  if (count <= 0 || (await idbGet('notify-on')) !== true) return;
  try {
    await self.registration.showNotification(count === 1 ? 'Your secret made it' : `${count} secrets made it`, {
      body: 'What you left while offline is on the wall now.',
      icon: '/icons/icon-192x192.png',
      badge: '/favicon-32x32.png',
      tag: 'kotree-delivery',
      data: { url: '/guestbook' },
    });
  } catch {
    // permission revoked — the delivery itself already succeeded
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/guestbook';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const open = clients.find((client) => new URL(client.url).pathname === target);
      return open ? open.focus() : self.clients.openWindow(target);
    })
  );
});

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
      const delivered = await flushQueue('offline-guestbook', '/api/guestbook', (message, t) => ({
        message,
        _token: t,
      }), token);
      await announceDelivery(delivered);
    })()
  );
});

// ---------- Periodic background sync: keep the offline copy fresh ----------
// Chrome-only, and Chrome only fires it for sites it trusts enough; the tag
// registration itself is feature-detected on the page side (K13). Daily it
// re-warms the precached pages and the last-known click counts.
self.addEventListener('periodicsync', (event) => {
  if (event.tag !== 'kotree-refresh') return;
  event.waitUntil(
    (async () => {
      await Promise.allSettled(PRECACHE_PAGES.map(precachePage));
      const cache = await caches.open(DATA_CACHE);
      await Promise.allSettled(
        ['/api/click-link-counter', '/rss.xml'].map(async (url) => {
          const res = await fetch(url);
          if (res.ok) await cache.put(url, res);
        })
      );
    })()
  );
});
