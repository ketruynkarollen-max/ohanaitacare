"use client"

import { useEffect, useRef, useState } from "react"
import { CalendarDays, DollarSign, CreditCard, Wallet, AlertCircle } from "lucide-react"

type CashData = {
  date: string
  totalPaid: number
  totalUnpaid: number
  cash: number
  pix: number
  card: number
  other: number
  paidCount: number
  unpaidCount: number
  orders: Array<{
    id: string
    number: number
    total: number
    paymentStatus?: "PENDING" | "PAID"
    paymentMethod?: "CASH" | "PIX" | "CARD" | null
    createdAt: string
  }>
}

export default function CashPage() {
  const [data, setData] = useState<CashData | null>(null)
  const [date, setDate] = useState<string>("")
  const [loading, setLoading] = useState(true)

  const loadCash = async (d?: string) => {
    setLoading(true)
    const qs = d ? `?date=${d}` : ""
    const res = await fetch(`/api/reports/cash${qs}`)
    if (res.ok) {
      const json = await res.json()
      setData(json)
      if (!d) {
        const iso = json.date.slice(0, 10)
        setDate(iso)
      }
    }
    setLoading(false)
  }

  const dateRef = useRef(date)
  dateRef.current = date

  useEffect(() => {
    loadCash()
    const interval = setInterval(() => loadCash(dateRef.current || undefined), 30000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0)

  return (
    <div className="page-body">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Caixa do dia</h1>
          <p className="page-subtitle">
            Resumo financeiro dos pedidos do dia, separado por forma de pagamento.
          </p>
        </div>
        <div className="page-header-actions">
          <div className="panel flex items-center gap-2 px-3 py-2">
            <CalendarDays className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                loadCash(e.target.value)
              }}
              className="border-none bg-transparent text-sm font-medium outline-none"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
        </div>
      </div>

      {loading || !data ? (
        <div className="panel p-6 text-center text-slate-500">
          Carregando informações do caixa...
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card-metric">
              <div className="flex items-center justify-between">
                <span className="card-metric-label">Total recebido</span>
                <div className="rounded-full bg-emerald-100 p-1.5">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <p className="card-metric-value">{formatPrice(data.totalPaid)}</p>
              <p className="mt-1 text-[11px] text-slate-500">
                {data.paidCount} {data.paidCount === 1 ? "pedido pago" : "pedidos pagos"}
              </p>
            </div>

            <div className="card-metric">
              <div className="flex items-center justify-between">
                <span className="card-metric-label">A receber</span>
                <div className="rounded-full bg-amber-100 p-1.5">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-semibold text-amber-600">
                {formatPrice(data.totalUnpaid)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {data.unpaidCount} {data.unpaidCount === 1 ? "pedido em aberto" : "pedidos em aberto"}
              </p>
            </div>

            <div className="card-metric">
              <div className="flex items-center justify-between">
                <span className="card-metric-label">Dinheiro + PIX</span>
                <div className="rounded-full bg-sky-100 p-1.5">
                  <Wallet className="h-4 w-4 text-sky-600" />
                </div>
              </div>
              <p className="mt-3 text-lg font-semibold text-slate-900">
                {formatPrice(data.cash + data.pix)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Dinheiro: {formatPrice(data.cash)} • PIX: {formatPrice(data.pix)}
              </p>
            </div>

            <div className="card-metric">
              <div className="flex items-center justify-between">
                <span className="card-metric-label">Cartões</span>
                <div className="rounded-full bg-indigo-100 p-1.5">
                  <CreditCard className="h-4 w-4 text-indigo-600" />
                </div>
              </div>
              <p className="mt-3 text-lg font-semibold text-slate-900">
                {formatPrice(data.card)}
              </p>
              {data.other > 0 && (
                <p className="mt-1 text-[11px] text-slate-500">
                  Outras formas: {formatPrice(data.other)}
                </p>
              )}
            </div>
          </div>

          <div className="panel">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">
              Pedidos do dia
            </h2>
            {data.orders.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhum pedido encontrado para esta data.
              </p>
            ) : (
              <div className="max-h-[360px] overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="table-header-row">
                      <th className="px-3 py-2.5">Hora</th>
                      <th className="px-3 py-2.5">Pedido</th>
                      <th className="px-3 py-2.5">Pagamento</th>
                      <th className="px-3 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.orders.map((o) => (
                      <tr
                        key={o.id}
                        className="bg-white text-slate-700 hover:bg-slate-50/80"
                      >
                        <td className="px-3 py-2 text-xs text-slate-600">
                          {new Date(o.createdAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-medium text-slate-900">#{o.number}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              o.paymentStatus === "PAID"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {o.paymentStatus === "PAID" ? "Pago" : "Em aberto"} •{" "}
                            {o.paymentMethod === "CASH"
                              ? "Dinheiro"
                              : o.paymentMethod === "PIX"
                                ? "PIX"
                                : o.paymentMethod === "CARD"
                                  ? "Cartão"
                                  : "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-semibold text-slate-900">
                          {formatPrice(o.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td colSpan={3} className="px-3 py-2.5 text-sm font-semibold text-slate-700">
                        Total — {data.orders.length} {data.orders.length === 1 ? "pedido" : "pedidos"}
                      </td>
                      <td className="px-3 py-2.5 text-right text-sm font-bold text-slate-900">
                        {formatPrice(data.orders.reduce((sum, o) => sum + o.total, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

