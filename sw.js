const CACHE = 'xianying-v1';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first for navigation (so updates land), cache-first for assets.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch the API

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
        return r;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});

// Fired by the page when today's moment arrives.
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type === 'moment') {
    self.registration.showNotification('現在。', {
      body: '有兩分鐘。拍下你現在看到的。',
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: 'moment-' + (d.day || ''),
      renotify: false,
      requireInteraction: false,
      data: { url: './' }
    });
  }
});

// Real push, if a server is ever added.
self.addEventListener('push', e => {
  let p = { title: '現在。', body: '有兩分鐘。拍下你現在看到的。' };
  try { if (e.data) p = Object.assign(p, e.data.json()); } catch (_) {}
  e.waitUntil(self.registration.showNotification(p.title, {
    body: p.body, icon: './icon-192.png', badge: './icon-192.png',
    tag: 'moment-push', data: { url: './' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    if (clients.openWindow) return clients.openWindow('./');
  }));
});
