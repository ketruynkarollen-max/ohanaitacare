"use client"

/**
 * Cozinha - Painel de pedidos
 * Exibe pedidos por status: Pendentes, Em preparo, Prontos
 * Atualiza automaticamente a cada 5 segundos
 * Destaca e notifica visualmente novos pedidos
 */
import { useEffect, useRef, useState } from "react"
import { useOrderNotifications } from "@/hooks/useOrderNotifications"
import { Clock, ChefHat, CheckCircle, UtensilsCrossed } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

type OrderItem = {
  id: string
  quantity: number
  notes: string | null
  product: { name: string }
}

type Order = {
  id: string
  number: number
  type: string
  source?: string
  status: string
  total?: number
  notes: string | null
  address: string | null
  createdAt: string
  items: OrderItem[]
  table: { number: number } | null
  customer: { name: string; phone: string } | null
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  PREPARING: "Em preparo",
  READY: "Pronto",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
}

const TYPE_LABELS: Record<string, string> = {
  TABLE: "Mesa",
  PICKUP: "Balcão",
  DELIVERY: "Delivery",
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [lastNewOrder, setLastNewOrder] = useState<Order | null>(null)
  const previousOrderIdsRef = useRef<Set<string>>(new Set())
  const [now, setNow] = useState(Date.now())

  useOrderNotifications()

  const playBeep = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return

      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "sine"
      osc.frequency.value = 880
      osc.connect(gain)
      gain.connect(ctx.destination)

      const now = ctx.currentTime
      gain.gain.setValueAtTime(0.001, now)
      gain.gain.exponentialRampToValueAtTime(0.3, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)

      osc.start(now)
      osc.stop(now + 0.45)
    } catch {
      // Ignora falhas de áudio (ex: bloqueio do navegador)
    }
  }

  const loadOrders = async () => {
    const res = await fetch("/api/orders?limit=100", { cache: "no-store" })
    if (res.ok) {
      const data: Order[] = await res.json()

      setOrders((prev) => {
        const prevIds = previousOrderIdsRef.current
        const newOrders = data.filter((o) => !prevIds.has(o.id))

        if (prev.length > 0 && newOrders.length > 0) {
          const newest = newOrders.reduce(
            (acc, cur) => (cur.number > acc.number ? cur : acc),
            newOrders[0]
          )
          setLastNewOrder(newest)
          if (!document.hidden) {
            playBeep()
          }
        }

        previousOrderIdsRef.current = new Set(data.map((o) => o.id))
        return data
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    loadOrders()
    const interval = setInterval(loadOrders, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now())
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) await loadOrders()
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const pending = orders.filter((o) => o.status === "PENDING" || o.status === "CONFIRMED")
  const preparing = orders.filter((o) => o.status === "PREPARING")
  const ready = orders.filter((o) => o.status === "READY")

  const OrderCard = ({ order }: { order: Order }) => {
    const info =
      order.type === "TABLE"
        ? `Mesa ${order.table?.number ?? "?"}`
        : order.type === "DELIVERY"
          ? "Delivery"
          : "Balcão"
    const typeColor =
      order.type === "DELIVERY"
        ? "bg-[#f3f4f6] text-[#111111]"
        : order.type === "PICKUP"
          ? "bg-[#f3f4f6] text-[#111111]"
          : "bg-[#f3f4f6] text-[#111111]"

    const elapsedMin = Math.floor(
      (now - new Date(order.createdAt).getTime()) / 60000,
    )

    const isPendingOrConfirmed =
      order.status === "PENDING" || order.status === "CONFIRMED"
    const isPreparing = order.status === "PREPARING"

    const timerIsLate =
      (isPendingOrConfirmed && elapsedMin > 30) ||
      (isPreparing && elapsedMin > 20)

    const statusClasses =
      order.status === "PENDING" || order.status === "CONFIRMED"
        ? "bg-[#fef3c7] text-[#f59e0b]"
        : order.status === "PREPARING"
          ? "bg-[#dbeafe] text-[#2563eb]"
          : order.status === "READY"
            ? "bg-[#dcfce7] text-[#16a34a]"
            : order.status === "DELIVERED"
              ? "bg-[#f3f4f6] text-[#6b7280]"
              : order.status === "CANCELLED"
                ? "bg-[#fee2e2] text-[#dc2626]"
                : "bg-[#f3f4f6] text-[#6b7280]"

    return (
      <div className="overflow-hidden rounded-xl border border-[#e8e8e5] bg-white px-3 py-3 shadow-sm">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold tabular-nums text-[#111111]">
              #{order.number}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${typeColor}`}>
              {TYPE_LABELS[order.type] || order.type}
            </span>
            <span className="text-[12px] font-normal text-[#6b7280]">{info}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                order.source === "ONLINE"
                  ? "bg-[#dbeafe] text-[#2563eb]"
                  : "bg-[#f3f4f6] text-[#6b7280]"
              }`}
            >
              {order.source === "ONLINE" ? "WEB" : "PDV"}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1 text-right">
            <span
              className={`text-[12px] font-semibold ${
                timerIsLate ? "timer-warning" : "text-[#111111]"
              }`}
            >
              {elapsedMin} min
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClasses}`}
            >
              <span className="h-2 w-2 rounded-full bg-current/40" />
              {STATUS_LABELS[order.status] || order.status}
            </span>
            {typeof order.total === "number" && (
              <span className="text-[13px] font-semibold text-[#15803d]">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(order.total)}
              </span>
            )}
          </div>
        </div>

        {order.type === "DELIVERY" && order.address && (
          <p
            className="mb-2 truncate text-[11px] text-[#6b7280]"
            title={order.address}
          >
            {order.address}
          </p>
        )}

        <ul className="mb-2 space-y-1.5">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-baseline gap-2 text-[13px]">
              <span className="min-w-[2rem] text-[13px] font-semibold tabular-nums text-[#111111]">
                {item.quantity}x
              </span>
              <span className="flex-1 text-[13px] font-normal text-[#111111]">
                {item.product.name}
              </span>
              {item.notes && (
                <span className="text-[11px] font-normal text-[#6b7280]">
                  ({item.notes})
                </span>
              )}
            </li>
          ))}
        </ul>

        {order.notes && (
          <p className="mb-2 rounded-md border border-[#e8e8e5] bg-[#f8f8f6] px-2.5 py-2 text-[11px] font-normal text-[#6b7280]">
            Obs: {order.notes}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 text-[11px] text-[#6b7280]">
          <span>
            {formatDistanceToNow(new Date(order.createdAt), {
              addSuffix: true,
              locale: ptBR,
            })}
          </span>
        </div>

        <div className="mt-3 flex gap-2">
            {(order.status === "PENDING" || order.status === "CONFIRMED") && (
              <button
                type="button"
                disabled={updatingOrderId === order.id}
                onClick={() => updateStatus(order.id, "PREPARING")}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-transparent bg-[#111111] py-2 text-[13px] font-semibold text-white transition hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ChefHat className="h-4 w-4" />
                {updatingOrderId === order.id ? "Atualizando..." : "Iniciar"}
              </button>
            )}
            {order.status === "PREPARING" && (
              <button
                type="button"
                disabled={updatingOrderId === order.id}
                onClick={() => updateStatus(order.id, "READY")}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-transparent bg-[#15803d] py-2 text-[13px] font-semibold text-white transition hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle className="h-4 w-4" />
                {updatingOrderId === order.id ? "Atualizando..." : "Pronto"}
              </button>
            )}
          </div>
        </div>
    )
  }

  return (
    <div className="page-body">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Cozinha</h1>
          <p className="page-subtitle">Painel de pedidos · atualiza a cada 5 segundos</p>
        </div>
        {!loading && (
          <div className="page-header-actions">
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Ao vivo
            </div>
          </div>
        )}
      </div>

      {lastNewOrder && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 to-emerald-100/80 px-4 py-3 text-sm text-emerald-800 shadow-lg dark:from-emerald-950/50 dark:to-emerald-900/30 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5" />
            <span className="font-bold">Novo pedido #{lastNewOrder.number}</span>
            <span className="text-xs opacity-90">
              {TYPE_LABELS[lastNewOrder.type] || lastNewOrder.type}
              {lastNewOrder.table?.number ? ` · Mesa ${lastNewOrder.table.number}` : ""}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setLastNewOrder(null)}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700"
          >
            Ok
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-16 dark:border-slate-700 dark:bg-slate-800/30">
          <Clock className="h-5 w-5 animate-spin text-slate-400" />
          <p className="font-medium text-slate-500">Carregando pedidos...</p>
        </div>
      ) : (
      <div className="grid gap-4 lg:grid-cols-3">
          <div className="flex flex-col rounded-xl border border-[#e8e8e5] bg-white p-3">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f3f4f6]">
                <Clock className="h-4 w-4 text-[#6b7280]" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm font-semibold text-[#111111]">Pendentes</h2>
                <p className="text-[11px] font-normal text-[#6b7280]">Aguardando início</p>
              </div>
              <span className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#e8e8e5] bg-[#f8f8f6] text-xs font-semibold tabular-nums text-[#111111]">
                {pending.length}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-3 overflow-auto">
              {pending.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-12 text-center dark:border-slate-600">
                  <Clock className="mb-2 h-10 w-10 text-slate-300 dark:text-slate-500" />
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nenhum pedido pendente</p>
                </div>
              ) : (
                pending.map((order) => <OrderCard key={order.id} order={order} />)
              )}
            </div>
          </div>

          <div className="flex flex-col rounded-xl border border-[#e8e8e5] bg-white p-3">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f3f4f6]">
                <ChefHat className="h-4 w-4 text-[#6b7280]" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm font-semibold text-[#111111]">Em preparo</h2>
                <p className="text-[11px] font-normal text-[#6b7280]">Cozinha em ação</p>
              </div>
              <span className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#e8e8e5] bg-[#f8f8f6] text-xs font-semibold tabular-nums text-[#111111]">
                {preparing.length}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-3 overflow-auto">
              {preparing.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-200 py-12 text-center dark:border-amber-800">
                  <ChefHat className="mb-2 h-10 w-10 text-amber-300 dark:text-amber-600" />
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nenhum pedido em preparo</p>
                </div>
              ) : (
                preparing.map((order) => <OrderCard key={order.id} order={order} />)
              )}
            </div>
          </div>

          <div className="flex flex-col rounded-xl border border-[#e8e8e5] bg-white p-3">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f3f4f6]">
                <CheckCircle className="h-4 w-4 text-[#6b7280]" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm font-semibold text-[#111111]">Prontos</h2>
                <p className="text-[11px] font-normal text-[#6b7280]">Retirada / entrega</p>
              </div>
              <span className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#e8e8e5] bg-[#f8f8f6] text-xs font-semibold tabular-nums text-[#111111]">
                {ready.length}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-3 overflow-auto">
              {ready.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-200 py-12 text-center dark:border-emerald-800">
                  <CheckCircle className="mb-2 h-10 w-10 text-emerald-300 dark:text-emerald-600" />
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nenhum pedido pronto</p>
                </div>
              ) : (
                ready.map((order) => <OrderCard key={order.id} order={order} />)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
