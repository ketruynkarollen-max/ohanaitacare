"use client"

import { useEffect, useRef, useCallback } from "react"
import toast from "react-hot-toast"

const POLL_INTERVAL = 15_000
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const beep = (start: number, freq: number, dur: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = "sine"
      gain.gain.setValueAtTime(0.4, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur)
      osc.start(start)
      osc.stop(start + dur)
    }
    beep(ctx.currentTime, 880, 0.15)
    beep(ctx.currentTime + 0.2, 880, 0.15)
    beep(ctx.currentTime + 0.4, 1100, 0.25)
  } catch {}
}

async function setupPush(): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
  if (!VAPID_PUBLIC_KEY) {
    console.warn("[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY não definida — push desativado")
    return
  }

  try {
    const reg = await navigator.serviceWorker.register("/sw.js")
    const permission = await Notification.requestPermission()
    if (permission !== "granted") return

    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    await fetch("/api/push?action=subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub),
    })
  } catch (err) {
    console.error("[Push] Erro ao configurar:", err)
  }
}

export function useOrderNotifications() {
  const lastOrderNumberRef = useRef<number | null>(null)
  const initializedRef = useRef(false)

  const checkNewOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders?limit=1&status=PENDING&source=ONLINE")
      if (!res.ok) return
      const orders = await res.json()
      if (!Array.isArray(orders) || orders.length === 0) return

      const latest = orders[0]
      const latestNumber = latest.number

      if (lastOrderNumberRef.current === null) {
        lastOrderNumberRef.current = latestNumber
        return
      }

      if (latestNumber > lastOrderNumberRef.current) {
        lastOrderNumberRef.current = latestNumber
        playAlertSound()

        toast(
          `Novo pedido #${latest.number} — ${new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(Number(latest.total))}`,
          {
            duration: 5000,
          },
        )
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    setupPush()
    checkNewOrders()

    const interval = setInterval(checkNewOrders, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [checkNewOrders])
}

