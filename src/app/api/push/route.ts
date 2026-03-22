/**
 * API de Push Notifications
 *
 * POST /api/push/subscribe   → salva a subscription do dispositivo
 * POST /api/push/send        → envia push para todas as subscriptions (uso interno)
 */
import { NextResponse } from "next/server"
import webpush from "web-push"
import { prisma } from "@/lib/prisma"
import { withErrorHandler } from "@/lib/api-handler"

/** web-push exige "subject" como URL (ex.: mailto: ou https://) */
function vapidSubject(): string {
  const raw = (process.env.VAPID_EMAIL ?? "mailto:contato@ohana.com").trim()
  if (!raw) return "mailto:contato@ohana.com"
  if (/^https?:\/\//i.test(raw) || raw.startsWith("mailto:")) return raw
  if (raw.includes("@")) return `mailto:${raw.replace(/^mailto:/i, "")}`
  return raw
}

// Configura o web-push com as chaves VAPID do .env
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    vapidSubject(),
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )
}

// POST /api/push?action=subscribe — salva subscription do dispositivo no banco
export const POST = withErrorHandler(async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")

  if (action === "subscribe") {
    const subscription = await request.json()
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Subscription inválida" }, { status: 400 })
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: { subscription: JSON.stringify(subscription), updatedAt: new Date() },
      create: {
        endpoint: subscription.endpoint,
        subscription: JSON.stringify(subscription),
      },
    })

    return NextResponse.json({ ok: true })
  }

  if (action === "send") {
    const { title, body, orderId } = await request.json()

    const subs = await prisma.pushSubscription.findMany()
    const payload = JSON.stringify({ title, body, orderId })

    const results = await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(JSON.parse(sub.subscription), payload)
        } catch (err: any) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } })
          }
          throw err
        }
      }),
    )

    const sent = results.filter((r) => r.status === "fulfilled").length
    return NextResponse.json({ sent, total: subs.length })
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
})

