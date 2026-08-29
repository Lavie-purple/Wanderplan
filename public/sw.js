// WanderPlan 图片离线缓存：Cache-First + 后台 stale-while-revalidate
const VERSION = 'wanderplan-images-v1'
const IMG_HOSTS = [
  'images.pexels.com',
  'upload.wikimedia.org',
]

self.addEventListener('install', (e) => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET') return
  if (!IMG_HOSTS.includes(url.hostname)) return
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(e.request)
      const fetched = fetch(e.request)
        .then((res) => {
          if (res.ok) cache.put(e.request, res.clone())
          return res
        })
        .catch(() => cached)
      return cached || fetched
    })
  )
})
