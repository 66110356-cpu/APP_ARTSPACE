const CACHE_NAME = 'artspace-shell-v4'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/app-icon-192.png', '/app-icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL).then(() => cache))
      .then(async (cache) => {
        const response = await cache.match('/index.html')
        const html = await response.text()
        const assetPaths = Array.from(
          html.matchAll(/(?:src|href)="([^"]+)"/g),
          (match) => match[1]
        ).filter((path) => path.startsWith('/assets/'))

        await cache.addAll(assetPaths)
      })
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('artspace-shell-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') return

  const requestUrl = new URL(request.url)
  if (requestUrl.origin !== self.location.origin || requestUrl.pathname.startsWith('/api/')) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseCopy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', responseCopy))
          return response
        })
        .catch(async () => (
          await caches.match('/index.html') ||
          Response.error()
        ))
    )
    return
  }

  if (['script', 'style', 'image', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse

        return fetch(request).then((response) => {
          if (response.ok) {
            const responseCopy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy))
          }
          return response
        })
      })
    )
  }
})
