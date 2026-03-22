"use client"

/**
 * Pedidos PDV - Lista de pedidos em tempo real
 * Layout inspirado na tela de pedidos do OlaClick:
 * filtros por canal/status e tabela com ações rápidas.
 */
import { useEffect, useState } from "react"
import {
  RefreshCw,
  Search,
  ShoppingCart,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
} from "lucide-react"

type Order = {
  id: string
  number: number
  type: "TABLE" | "PICKUP" | "DELIVERY"
  source?: "PDV" | "ONLINE"
  status: "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED"
  total: number
  createdAt: string
  table?: { number: number } | null
  customer?: { name?: string | null; phone?: string | null } | null
  paymentStatus?: "PENDING" | "PAID"
  paymentMethod?: "CASH" | "PIX" | "CARD" | null
}

const TYPE_LABEL: Record<Order["type"], string> = {
  TABLE: "Balcão/Mesa",
  PICKUP: "Retirada",
  DELIVERY: "Delivery",
}

const STATUS_LABEL: Record<Order["status"], string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  PREPARING: "Em curso",
  READY: "Pronto",
  DELIVERED: "Finalizado",
  CANCELLED: "Cancelado",
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [channelFilter, setChannelFilter] = useState<"ALL" | "PICKUP" | "DELIVERY" | "TABLE" | "ONLINE">("ALL")
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PENDING" | "PREPARING" | "READY" | "DELIVERED"
  >("ALL")
  const [search, setSearch] = useState("")
  const [statusMenuOpenId, setStatusMenuOpenId] = useState<string | null>(null)
  const [detailOrder, setDetailOrder] = useState<any | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailSaving, setDetailSaving] = useState(false)
  const [productsForAdd, setProductsForAdd] = useState<any[]>([])
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [addItemProductId, setAddItemProductId] = useState<string>("")
  const [addItemQty, setAddItemQty] = useState<string>("1")
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "PIX" | "CARD">("PIX")
  const [paymentValue, setPaymentValue] = useState<string>("")

  const loadOrders = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/orders?limit=100", { cache: "no-store" })
      if (res.ok) {
        const data = (await res.json()) as Order[]
        setOrders(data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
    const interval = setInterval(loadOrders, 8000)
    return () => clearInterval(interval)
  }, [])

  // Atualiza o tempo decorrido a cada minuto
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60000)
    return () => clearInterval(t)
  }, [])

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0)

  /** Tempo decorrido desde o pedido */
  const getElapsed = (createdAt: string) => {
    const diffMs = Math.max(0, Date.now() - new Date(createdAt).getTime())
    const totalMin = Math.floor(diffMs / 60000)
    const seconds = Math.floor((diffMs % 60000) / 1000)
    if (totalMin >= 60) {
      const h = Math.floor(totalMin / 60)
      const m = totalMin % 60
      return `${h}h ${String(m).padStart(2, "0")}min`
    }
    return `${String(totalMin).padStart(2, "0")}:${String(seconds).padStart(2, "0")} min`
  }

  /** Tipo curto para a coluna Data: Delivery, Retirada ou Mesa X */
  const getTypeShort = (o: Order) => {
    if (o.type === "DELIVERY") return "Delivery"
    if (o.type === "PICKUP") return "Retirada"
    return o.table?.number != null ? `Mesa ${o.table.number}` : "Mesa"
  }

  /** Cor do tipo (gamificado): Delivery=ciano, Retirada=violeta, Mesa=âmbar */
  const getTypeColor = (o: Order) => {
    if (o.type === "DELIVERY") return "text-[#111111] font-semibold"
    if (o.type === "PICKUP") return "text-[#111111] font-semibold"
    return "text-[#111111] font-semibold"
  }

  const filtered = orders.filter((o) => {
    if (channelFilter === "ONLINE") {
      if (o.source !== "ONLINE") return false
    } else if (channelFilter !== "ALL" && o.type !== channelFilter) {
      return false
    }
    if (statusFilter !== "ALL" && o.status !== statusFilter) return false
    if (!search.trim()) return true
    const term = search.trim().toLowerCase()
    return (
      String(o.number).includes(term) ||
      o.customer?.name?.toLowerCase().includes(term) ||
      o.customer?.phone?.toLowerCase().includes(term)
    )
  })

  // Contagens por tipo (canal) e por status para exibir nos filtros
  const countByChannel = {
    ALL: orders.length,
    PICKUP: orders.filter((o) => o.type === "PICKUP").length,
    DELIVERY: orders.filter((o) => o.type === "DELIVERY").length,
    TABLE: orders.filter((o) => o.type === "TABLE").length,
    ONLINE: orders.filter((o) => o.source === "ONLINE").length,
  }
  const countByStatus = {
    ALL: orders.length,
    PENDING: orders.filter((o) => o.status === "PENDING").length,
    PREPARING: orders.filter((o) => o.status === "PREPARING").length,
    READY: orders.filter((o) => o.status === "READY").length,
    DELIVERED: orders.filter((o) => o.status === "DELIVERED").length,
  }

  const openDetailDrawer = async (orderId: string) => {
    setDetailLoading(true)
    if (productsForAdd.length === 0) {
      try {
        const resProd = await fetch("/api/products")
        if (resProd.ok) {
          const data = await resProd.json()
          setProductsForAdd(
            (data as any[]).filter((p) => p.active !== false),
          )
        }
      } catch {
        // silencioso
      }
    }
    const res = await fetch(`/api/orders/${orderId}`)
    if (!res.ok) {
      setDetailLoading(false)
      return
    }
    const full = await res.json()
    setDetailOrder(full)
    setDetailLoading(false)
  }

  const updateStatus = async (orderId: string, status: Order["status"]) => {
    setStatusMenuOpenId(null)
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    loadOrders()
  }

  return (
    <>
    <div className="page-body">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Pedidos</h1>
          <p className="page-subtitle">
            Acompanhe em tempo real os pedidos feitos pelo PDV e pela loja.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            onClick={async () => {
              setRefreshing(true)
              await loadOrders()
              setRefreshing(false)
            }}
            className="btn-refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="panel">
        <div className="mb-3 flex flex-col gap-2">
          {/* Canal */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-12 text-xs font-medium uppercase tracking-wide text-slate-400">Canal</span>
            <div className="flex flex-wrap gap-1">
              {[
                { key: "ALL", label: "Todos" },
                { key: "PICKUP", label: "Balcão" },
                { key: "DELIVERY", label: "Delivery" },
                { key: "TABLE", label: "Mesas" },
                { key: "ONLINE", label: "Loja" },
              ].map((c) => {
                const count = countByChannel[c.key as keyof typeof countByChannel]
                return (
                  <button
                    key={c.key}
                    onClick={() => setChannelFilter(c.key as typeof channelFilter)}
                    className={`filter-pill ${channelFilter === c.key ? "filter-pill-active" : "filter-pill-inactive"}`}
                  >
                    {c.label} <span className="opacity-90">({count})</span>
                  </button>
                )
              })}
            </div>
          </div>
          {/* Status */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-12 text-xs font-medium uppercase tracking-wide text-slate-400">Status</span>
            <div className="flex flex-wrap gap-1">
              {[
                { key: "ALL", label: "Todos" },
                { key: "PENDING", label: "Pendente" },
                { key: "PREPARING", label: "Em curso" },
                { key: "READY", label: "Prontos" },
                { key: "DELIVERED", label: "Finalizados" },
              ].map((s) => {
                const count = countByStatus[s.key as keyof typeof countByStatus]
                return (
                  <button
                    key={s.key}
                    onClick={() => setStatusFilter(s.key as typeof statusFilter)}
                    className={`filter-pill ${statusFilter === s.key ? "filter-pill-active-alt" : "filter-pill-inactive"}`}
                  >
                    {s.label} <span className="opacity-90">({count})</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar número, nome ou telefone..."
              className="input-search"
            />
          </div>
          <div className="text-right">
            <div className="text-xs font-medium text-slate-500">Total filtrado</div>
            <div className="text-lg font-semibold text-slate-900">
              {formatPrice(filtered.reduce((sum, o) => sum + (o.total || 0), 0))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de pedidos */}
      <div className="panel-table">
          {loading ? (
            <p className="py-6 text-center text-xs text-slate-400">
              Carregando pedidos...
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">
              Nenhum pedido encontrado para os filtros selecionados.
            </p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="table-header-row">
              <th className="px-3 py-2 text-xs font-semibold text-[#6b7280]">Pedido</th>
              <th className="px-3 py-2 text-xs font-semibold text-[#6b7280]">Canal</th>
              <th className="px-3 py-2 text-xs font-semibold text-[#6b7280]">Cliente</th>
              <th className="px-3 py-2 text-xs font-semibold text-[#6b7280]">Status</th>
              <th className="px-3 py-2 text-xs font-semibold text-[#6b7280]">Valor</th>
              <th className="px-3 py-2 text-xs font-semibold text-[#6b7280]">Tempo</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-[#6b7280]">
                Ações
              </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filtered.map((o) => {
                  return (
                    <tr
                      key={o.id}
                      className="bg-white text-[#111111] transition-colors hover:bg-[#f5f5f2]"
                    >
                      <td className="px-3 py-2 align-middle">
                        <button
                          type="button"
                          onClick={() => openDetailDrawer(o.id)}
                          className="flex flex-col text-left"
                        >
                          <span className={`text-[13px] ${getTypeColor(o)}`}>
                            #{o.number} · {getTypeShort(o)}
                          </span>
                          <span className="text-[11px] text-[#6b7280]">
                            {new Date(o.createdAt).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            o.source === "ONLINE"
                              ? "bg-[#dbeafe] text-[#2563eb]"
                              : "bg-[#f3f4f6] text-[#6b7280]"
                          }`}
                        >
                          {o.source === "ONLINE" ? "WEB" : "PDV"}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <div className="flex flex-col gap-0.5">
                          <span className="truncate text-[13px] font-normal text-[#111111]">
                            {o.customer?.name || "—"}
                          </span>
                          {o.customer?.phone && (
                            <span className="truncate text-[11px] text-[#6b7280]">
                              {o.customer.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <span
                          className={`badge-pill ${
                            o.status === "PREPARING"
                              ? "bg-[#dbeafe] text-[#2563eb]"
                              : o.status === "READY"
                                ? "bg-[#dcfce7] text-[#16a34a]"
                                : o.status === "PENDING" || o.status === "CONFIRMED"
                                  ? "bg-[#fef3c7] text-[#f59e0b]"
                                  : o.status === "CANCELLED"
                                    ? "bg-[#fee2e2] text-[#dc2626]"
                                    : o.status === "DELIVERED"
                                      ? "bg-[#f3f4f6] text-[#6b7280]"
                                      : "bg-[#f3f4f6] text-[#6b7280]"
                          }`}
                        >
                          {o.status === "PREPARING" && <Clock className="h-3 w-3" />}
                          {o.status === "READY" && <CheckCircle2 className="h-3 w-3" />}
                          {o.status === "CANCELLED" && <XCircle className="h-3 w-3" />}
                          {STATUS_LABEL[o.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[13px] font-semibold text-[#15803d]">
                            {formatPrice(o.total)}
                          </span>
                          <span
                            className={`text-[11px] font-normal ${
                              o.paymentStatus === "PAID" ? "text-[#16a34a]" : "text-[#6b7280]"
                            }`}
                          >
                            {o.paymentStatus === "PAID" ? "Pago" : "Não pago"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <span className="flex items-center gap-1 text-[12px] text-[#6b7280]">
                          <Clock className="h-3 w-3" />
                          {getElapsed(o.createdAt)}
                        </span>
                      </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex justify-end gap-2">
                        {/* Etapa 1: aceitar ou cancelar pedido quando ainda está pendente */}
                        {o.status === "PENDING" || o.status === "CONFIRMED" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Cancelar o pedido #${o.number}? Esta ação não pode ser desfeita.`,
                                  )
                                ) {
                                  updateStatus(o.id, "CANCELLED")
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#e8e8e5] bg-white px-3 py-1.5 text-[11px] font-normal text-[#dc2626] hover:bg-[#f5f5f2]"
                            >
                              X Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStatus(o.id, "PREPARING")}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#e8e8e5] bg-white px-3 py-1.5 text-[11px] font-normal text-[#15803d] hover:bg-[#f5f5f2]"
                            >
                              ✓ Aceitar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={async () => {
                                // Carrega os detalhes completos e abre ticket simples para impressão
                                const res = await fetch(`/api/orders/${o.id}`)
                                if (!res.ok) return
                                const full = await res.json()
                                const win = window.open("", "_blank")
                                if (!win) return
                                const formatPriceLocal = (v: number) =>
                                  new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  }).format(v || 0)
                                const createdAt = new Date(full.createdAt)
                                const lines = full.items
                                  ?.map(
                                    (it: any) =>
                                      `${it.quantity}x ${it.product?.name ?? ""} - ${formatPriceLocal(
                                        (it.variation?.price ?? it.product?.price ?? 0) *
                                          it.quantity,
                                      )}`,
                                  )
                                  .join("<br/>")
                                win.document.write(`
                                  <html>
                                    <head>
                                      <meta charSet="utf-8" />
                                      <title>Pedido #${full.number}</title>
                                      <style>
                                        body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 12px; padding: 8px; }
                                        h1 { font-size: 16px; margin: 0 0 4px; }
                                        .line { border-top: 1px dashed #000; margin: 4px 0; }
                                        .right { text-align: right; }
                                      </style>
                                    </head>
                                    <body>
                                      <h1>Pedido #${full.number}</h1>
                                      <div>${createdAt.toLocaleString("pt-BR")}</div>
                                      <div>Canal: ${TYPE_LABEL[full.type as Order["type"]]}</div>
                                      ${
                                        full.table?.number
                                          ? `<div>Mesa: ${full.table.number}</div>`
                                          : ""
                                      }
                                      ${
                                        full.customer?.name
                                          ? `<div>Cliente: ${full.customer.name}</div>`
                                          : ""
                                      }
                                      <div class="line"></div>
                                      <div>${lines || ""}</div>
                                      <div class="line"></div>
                                      <div class="right">Subtotal: ${formatPriceLocal(
                                        full.subtotal ?? full.total,
                                      )}</div>
                                      ${
                                        full.discount
                                          ? `<div class="right">Desconto: -${formatPriceLocal(
                                              full.discount,
                                            )}</div>`
                                          : ""
                                      }
                                      ${
                                        full.deliveryFee
                                          ? `<div class="right">Entrega: ${formatPriceLocal(
                                              full.deliveryFee,
                                            )}</div>`
                                          : ""
                                      }
                                      <div class="right"><strong>Total: ${formatPriceLocal(
                                        full.total,
                                      )}</strong></div>
                                    </body>
                                  </html>
                                `)
                                win.document.close()
                                win.focus()
                                win.print()
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#e8e8e5] bg-white px-3 py-1.5 text-[11px] font-normal text-[#111111] hover:bg-[#f5f5f2]"
                            >
                              Ticket
                            </button>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setStatusMenuOpenId((prev) =>
                                    prev === o.id ? null : o.id,
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-[#e8e8e5] bg-white px-2.5 py-1 text-[11px] font-normal text-[#111111] hover:bg-[#f5f5f2]"
                              >
                                <Clock className="h-3 w-3" />
                                Status
                                <ChevronDown className="h-3 w-3" />
                              </button>
                              {statusMenuOpenId === o.id && (
                                <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-[#e8e8e5] bg-white py-1 text-[11px] shadow-xl">
                                  {(
                                    [
                                      "PREPARING",
                                      "READY",
                                      "DELIVERED",
                                      "CANCELLED",
                                    ] as Order["status"][]
                                  ).map((s) => (
                                    <button
                                      key={s}
                                      type="button"
                                      onClick={() => updateStatus(o.id, s)}
                                      className={`flex w-full items-center gap-1 px-3 py-1.5 text-left hover:bg-[#f5f5f2] ${
                                        o.status === s
                                          ? "text-sky-600 font-medium"
                                          : "text-slate-700"
                                      }`}
                                    >
                                      <span className={`inline-block h-2 w-2 rounded-full ${o.status === s ? "bg-[#2563eb]" : "bg-[#e5e7eb]"}`} />
                                      {STATUS_LABEL[s]}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (o.paymentStatus === "PAID") {
                                  alert("Este pedido já está marcado como pago.")
                                  return
                                }
                                setPaymentOrder(o)
                                setPaymentMethod("PIX")
                                setPaymentValue(
                                  String(o.total.toFixed(2)).replace(".", ","),
                                )
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8e8e5] bg-white px-3.5 py-2 text-[11px] font-normal text-[#111111] hover:bg-[#f5f5f2]"
                            >
                              R$ Pagar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (o.paymentStatus !== "PAID") {
                                  alert(
                                    "Registre o pagamento antes de finalizar o pedido.",
                                  )
                                  return
                                }
                                updateStatus(o.id, "DELIVERED")
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8e8e5] bg-white px-3.5 py-2 text-[11px] font-normal text-[#111111] hover:bg-[#f5f5f2]"
                            >
                              ✓ Finalizar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Painel lateral de comanda / detalhes do pedido */}
      {detailOrder && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
          <div className="animate-slide-in flex h-full w-full max-w-md flex-col bg-white shadow-panel-lg">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Comanda #{detailOrder.number}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    <ShoppingCart className="h-3 w-3" />
                    {TYPE_LABEL[detailOrder.type as Order["type"]]}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                    {formatPrice(detailOrder.total)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      detailOrder.paymentStatus === "PAID"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                    }`}
                  >
                    {detailOrder.paymentStatus === "PAID" ? "Pago" : "Não pago"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailOrder(null)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Status</span>
                  <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    {STATUS_LABEL[detailOrder.status as Order["status"]]}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>Criado em</span>
                  <span>
                    {new Date(detailOrder.createdAt).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {detailOrder.table?.number != null && (
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>Mesa</span>
                    <span>{detailOrder.table.number}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Cliente</div>
                <div className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
                  <div>{detailOrder.customer?.name || "—"}</div>
                  {detailOrder.customer?.phone && (
                    <div className="text-primary dark:text-sky-400">{detailOrder.customer.phone}</div>
                  )}
                  {detailOrder.customer?.address && (
                    <div className="text-slate-600 dark:text-slate-300">{detailOrder.customer.address}</div>
                  )}
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Produtos</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAddItemProductId("")
                      setAddItemQty("1")
                      setAddItemOpen(true)
                    }}
                    className="rounded-lg border border-primary bg-white px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/5 dark:border-primary dark:bg-transparent dark:text-sky-400 dark:hover:bg-sky-500/10"
                  >
                    + Adicionar item
                  </button>
                </div>
                <div className="space-y-2">
                  {detailOrder.items?.map((it: any) => (
                    <div
                      key={it.id}
                      className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2"
                    >
                      <div className="flex flex-1 items-center gap-2">
                        <div className="flex flex-col flex-1">
                          <span className="text-[11px] font-medium text-slate-100">
                            {it.product?.name ?? ""}
                          </span>
                          {it.variation?.name && (
                            <span className="text-[10px] text-slate-400">
                              {it.variation.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setDetailOrder((prev: any) => {
                                if (!prev) return prev
                                const items = prev.items.map((item: any) => {
                                  if (item.id !== it.id) return item
                                  const newQty = Math.max(1, item.quantity - 1)
                                  return { ...item, quantity: newQty }
                                })
                                return { ...prev, items }
                              })
                            }}
                            className="h-6 w-6 rounded border border-slate-300 bg-white text-xs text-slate-700 hover:bg-slate-100"
                          >
                            -
                          </button>
                          <span className="min-w-[24px] text-center text-[11px] font-medium text-slate-900">
                            {it.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setDetailOrder((prev: any) => {
                                if (!prev) return prev
                                const items = prev.items.map((item: any) => {
                                  if (item.id !== it.id) return item
                                  const newQty = item.quantity + 1
                                  return { ...item, quantity: newQty }
                                })
                                return { ...prev, items }
                              })
                            }}
                            className="h-6 w-6 rounded border border-slate-300 bg-white text-xs text-slate-700 hover:bg-slate-100"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-[11px] font-medium text-slate-900">
                          {formatPrice(
                            (it.unitPrice || it.product?.price || 0) *
                              it.quantity,
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>
                    {formatPrice(
                      detailOrder.subtotal ??
                        detailOrder.items?.reduce(
                          (sum: number, it: any) =>
                            sum + (it.unitPrice || 0) * it.quantity,
                          0,
                        ) ??
                        detailOrder.total,
                    )}
                  </span>
                </div>
                {detailOrder.discount ? (
                  <div className="flex items-center justify-between text-[11px] text-amber-300">
                    <span>Desconto</span>
                    <span>-{formatPrice(detailOrder.discount)}</span>
                  </div>
                ) : null}
                {detailOrder.deliveryFee ? (
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span>Entrega</span>
                    <span>{formatPrice(detailOrder.deliveryFee)}</span>
                  </div>
                ) : null}
                <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
                  <span>Total</span>
                  <span>{formatPrice(detailOrder.total)}</span>
                </div>
              </div>

              <div className="space-y-2">
                {addItemOpen && (
                  <div className="space-y-2 rounded-xl border border-sky-200 bg-sky-50/50 p-3 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sky-700">
                        Adicionar item ao pedido
                      </span>
                      <button
                        type="button"
                        onClick={() => setAddItemOpen(false)}
                        className="text-[10px] text-slate-500 hover:text-slate-900"
                      >
                        Fechar
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <span className="font-medium text-slate-600">Produto</span>
                        <select
                          value={addItemProductId}
                          onChange={(e) => setAddItemProductId(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="">Selecione...</option>
                          {productsForAdd.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <span className="font-medium text-slate-600">Quantidade</span>
                        <input
                          type="number"
                          min={1}
                          value={addItemQty}
                          onChange={(e) => setAddItemQty(e.target.value)}
                          className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={!addItemProductId}
                        onClick={async () => {
                          if (!detailOrder || !addItemProductId) return
                          const qty = Math.max(1, parseInt(addItemQty || "1", 10) || 1)
                          setDetailSaving(true)
                          try {
                            const res = await fetch(
                              `/api/orders/${detailOrder.id}/items`,
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  productId: addItemProductId,
                                  quantity: qty,
                                }),
                              },
                            )
                            if (res.ok) {
                              const updated = await res.json()
                              setDetailOrder(updated)
                              await loadOrders()
                              setAddItemOpen(false)
                            } else {
                              const err = await res.json().catch(() => null)
                              alert(err?.error || "Erro ao adicionar item")
                            }
                          } finally {
                            setDetailSaving(false)
                          }
                        }}
                        className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                      >
                        Incluir no pedido
                      </button>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  disabled={detailSaving}
                  onClick={async () => {
                    if (!detailOrder) return
                    setDetailSaving(true)
                    try {
                      const itemsQuantities =
                        detailOrder.items?.map((it: any) => ({
                          id: it.id,
                          quantity: it.quantity,
                        })) ?? []
                      const res = await fetch(`/api/orders/${detailOrder.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ itemsQuantities }),
                      })
                      if (res.ok) {
                        const updated = await res.json()
                        setDetailOrder(updated)
                        await loadOrders()
                      }
                    } finally {
                      setDetailSaving(false)
                    }
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {detailSaving ? "Salvando comanda..." : "Salvar alterações da comanda"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (detailOrder.paymentStatus === "PAID") {
                      alert("Este pedido já está marcado como pago.")
                      return
                    }
                    setPaymentOrder(detailOrder)
                    setPaymentMethod("PIX")
                    setPaymentValue(
                      String(detailOrder.total.toFixed(2)).replace(".", ","),
                    )
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-95"
                >
                  Registrar pagamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Painel lateral de pagamento */}
      {paymentOrder && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
          <div className="animate-slide-in flex h-full w-full max-w-md flex-col bg-white shadow-panel-lg">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Registrar pagamento | #{paymentOrder.number} • {TYPE_LABEL[paymentOrder.type]}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                    {formatPrice(paymentOrder.total)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      paymentOrder.paymentStatus === "PAID"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                    }`}
                  >
                    {paymentOrder.paymentStatus === "PAID" ? "Pago" : "Não pago"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentOrder(null)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Cliente</span>
                  <span className="truncate text-right font-medium text-slate-900 dark:text-slate-100">
                    {paymentOrder.customer?.name || "—"}
                  </span>
                </div>
                {paymentOrder.customer?.phone && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Telefone</span>
                    <span className="truncate text-right text-primary dark:text-sky-400">
                      {paymentOrder.customer.phone}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Forma de pagamento</div>
                <div className="flex gap-2">
                  {(["CASH", "PIX", "CARD"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        paymentMethod === m
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {m === "CASH" ? "Dinheiro" : m === "PIX" ? "PIX" : "Cartão"}
                    </button>
                  ))}
                </div>

                <div className="mt-3 space-y-1">
                  <label className="text-slate-400">Valor a receber</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentValue((prev) => {
                          const num =
                            (parseFloat(prev.replace(",", ".")) || 0) - 1
                          return num <= 0
                            ? "0,00"
                            : String(num.toFixed(2)).replace(".", ",")
                        })
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      -
                    </button>
                    <input
                      type="text"
                      value={paymentValue}
                      onChange={(e) => setPaymentValue(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentValue((prev) => {
                          const num =
                            (parseFloat(prev.replace(",", ".")) || 0) + 1
                          return String(num.toFixed(2)).replace(".", ",")
                        })
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-200 bg-white px-4 py-3">
              <button
                type="button"
                onClick={async () => {
                  await fetch(`/api/orders/${paymentOrder.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      paymentStatus: "PAID",
                      paymentMethod,
                    }),
                  })
                  await loadOrders()
                  setDetailOrder((prev: any) =>
                    prev && prev.id === paymentOrder.id
                      ? { ...prev, paymentStatus: "PAID", paymentMethod }
                      : prev,
                  )
                  setPaymentOrder(null)
                }}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-95"
              >
                Registrar pagamento
              </button>
              <button
                type="button"
                onClick={async () => {
                  await fetch(`/api/orders/${paymentOrder.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      paymentStatus: "PAID",
                      paymentMethod,
                      status: "DELIVERED",
                    }),
                  })
                  await loadOrders()
                  setDetailOrder((prev: any) =>
                    prev && prev.id === paymentOrder.id
                      ? {
                          ...prev,
                          paymentStatus: "PAID",
                          paymentMethod,
                          status: "DELIVERED",
                        }
                      : prev,
                  )
                  setPaymentOrder(null)
                }}
                className="w-full rounded-lg border border-primary bg-white py-2.5 text-sm font-medium text-primary hover:bg-primary/5 dark:border-primary dark:bg-transparent dark:text-sky-400 dark:hover:bg-sky-500/10"
              >
                Registrar pagamento e finalizar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

