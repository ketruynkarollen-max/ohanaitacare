"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"

type SimpleOrder = {
  id: string
  number: number
  total: number
  createdAt: string
}

export function NewOrderNotifier() {
  const [order, setOrder] = useState<SimpleOrder | null>(null)
  const lastSeenOrderId = useRef<string | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null
    if (order) {
      timeout = setTimeout(() => setOrder(null), 15000)
    }
    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [order])

  useEffect(() => {
    let cancelled = false

    const checkNewOrder = async () => {
      try {
        const res = await fetch("/api/orders?limit=1", { cache: "no-store" })
        if (!res.ok) return
        const list = (await res.json()) as SimpleOrder[]
        const newest = list[0]
        if (!newest) return

        if (!initialized.current) {
          initialized.current = true
          lastSeenOrderId.current = newest.id
          const created = new Date(newest.createdAt).getTime()
          if (Date.now() - created <= 2 * 60 * 1000) {
            if (!cancelled) setOrder(newest)
          }
          return
        }

        if (lastSeenOrderId.current !== newest.id) {
          lastSeenOrderId.current = newest.id
          if (!cancelled) setOrder(newest)
        }
      } catch {
        // silencioso
      }
    }

    checkNewOrder()
    const interval = setInterval(checkNewOrder, 7000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0)

  if (!order) return null

  return (
    <div className="fixed bottom-4 right-4 z-40 w-full max-w-sm animate-fade-in rounded-2xl border-2 border-cyan-400 bg-white p-4 shadow-panel-lg ring-4 ring-cyan-400/20">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-3 w-3 shrink-0 rounded-full bg-cyan-500 animate-pulse shadow-lg shadow-cyan-500/50" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="text-xs font-bold uppercase tracking-wider text-cyan-600">
            Novo pedido recebido
          </div>
          <div className="text-lg font-bold text-slate-900">
            Pedido #{order.number}
          </div>
          <div className="text-sm font-medium text-slate-600">
            Total {formatPrice(order.total)} •{" "}
            {new Date(order.createdAt).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <Link
              href="/orders"
              className="btn-game-action inline-flex flex-1 items-center justify-center rounded-xl bg-cyan-500 px-3 py-2.5 text-sm font-bold text-white shadow-md hover:bg-cyan-600 hover:shadow-glow-progress"
              onClick={() => setOrder(null)}
            >
              Ver pedidos PDV
            </Link>
            <button
              type="button"
              onClick={() => setOrder(null)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

