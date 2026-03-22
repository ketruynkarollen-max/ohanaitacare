// Service Worker — Push Notifications + PWA offline básico
const CACHE_NAME = "ohana-v1"
const PRECACHE = ["/", "/kitchen", "/orders"]

self.addEventListener("install", (event) => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  let data = { title: "Novo pedido!", body: "Um novo pedido chegou.", orderId: null }

  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {}

  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-72.png",
    vibrate: [200, 100, 200, 100, 200],
    tag: `order-${data.orderId ?? Date.now()}`,
    renotify: true,
    requireInteraction: true,
    data: { orderId: data.orderId, url: "/kitchen" },
    actions: [
      { action: "open", title: "Ver cozinha" },
      { action: "dismiss", title: "Fechar" },
    ],
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  if (event.action === "dismiss") return

  const targetUrl = event.notification.data?.url ?? "/kitchen"

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(targetUrl))
      if (existing) return existing.focus()
      return self.clients.openWindow(targetUrl)
    }),
  )
})

