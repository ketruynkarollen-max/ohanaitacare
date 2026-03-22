"use client"

/**
 * Caixa do dia — Abertura, movimento e fechamento de caixa
 *
 * Estados:
 *   loading      → buscando sessão do dia
 *   no_session   → nenhum caixa aberto: exibe formulário de abertura
 *   open         → caixa aberto: pedidos do dia + botão "Fechar Caixa"
 *   closing      → formulário de fechamento (contagem física)
 *   closed       → resumo do fechamento com diferença
 */
import { useEffect, useRef, useState, useCallback } from "react"
import {
  DollarSign, CreditCard, Wallet, AlertCircle,
  CalendarDays, Lock, Unlock, RefreshCw,
  CheckCircle2, XCircle, ChevronDown, ChevronUp,
  TrendingUp, Receipt,
} from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

// ── Tipos ─────────────────────────────────────────────────────────────────────
type CashSession = {
  id:             string
  date:           string
  status:         "OPEN" | "CLOSED"
  openedAt:       string
  closedAt?:      string | null
  openingBalance: number
  totalCash?:     number | null
  totalPix?:      number | null
  totalCard?:     number | null
  totalOther?:    number | null
  totalOrders?:   number | null
  expectedCash?:  number | null
  closingBalance?: number | null
  difference?:    number | null
  notes?:         string | null
}

type CashData = {
  date:        string
  totalPaid:   number
  totalUnpaid: number
  cash:        number
  pix:         number
  card:        number
  other:       number
  paidCount:   number
  unpaidCount: number
  orders: Array<{
    id:            string
    number:        number
    total:         number
    paymentStatus: "PENDING" | "PAID"
    paymentMethod: "CASH" | "PIX" | "CARD" | null
    createdAt:     string
  }>
}

type PageState = "loading" | "no_session" | "open" | "closing" | "closed"

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0)
}
function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function CashPage() {
  const [pageState, setPageState]     = useState<PageState>("loading")
  const [session, setSession]         = useState<CashSession | null>(null)
  const [cashData, setCashData]       = useState<CashData | null>(null)
  const [date, setDate]               = useState(todayISO())
  const [refreshing, setRefreshing]   = useState(false)
  const [showOrders, setShowOrders]   = useState(true)

  // Abertura
  const [openingBalance, setOpeningBalance] = useState("")
  const [openingSaving, setOpeningSaving]   = useState(false)

  // Fechamento
  const [closingBalance, setClosingBalance] = useState("")
  const [closingNotes, setClosingNotes]     = useState("")
  const [closingSaving, setClosingSaving]   = useState(false)

  // ── Busca sessão + pedidos ─────────────────────────────────────────────────
  const loadAll = useCallback(async (d: string) => {
    const [sessionRes, cashRes] = await Promise.all([
      fetch(`/api/cash-sessions?date=${d}`),
      fetch(`/api/reports/cash?date=${d}`),
    ])

    const sessionData: CashSession | null = sessionRes.ok ? await sessionRes.json() : null
    const cash: CashData | null           = cashRes.ok   ? await cashRes.json()    : null

    setSession(sessionData)
    setCashData(cash)

    if (!sessionData) {
      setPageState("no_session")
    } else {
      setPageState(sessionData.status === "OPEN" ? "open" : "closed")
    }
  }, [])

  const dateRef = useRef(date)
  dateRef.current = date

  useEffect(() => {
    setPageState("loading")
    loadAll(date)
  }, [date, loadAll])

  // Auto-refresh a cada 30s quando caixa está aberto
  useEffect(() => {
    if (pageState !== "open") return
    const t = setInterval(() => loadAll(dateRef.current), 30_000)
    return () => clearInterval(t)
  }, [pageState, loadAll])

  // ── Abrir caixa ────────────────────────────────────────────────────────────
  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault()
    const balance = parseFloat(openingBalance.replace(",", "."))
    if (isNaN(balance) || balance < 0) {
      toast.error("Informe um saldo inicial válido (pode ser 0)")
      return
    }
    setOpeningSaving(true)
    const res = await fetch("/api/cash-sessions", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ openingBalance: balance, date }),
    })
    setOpeningSaving(false)
    if (res.ok) {
      toast.success("Caixa aberto!")
      await loadAll(date)
    } else {
      const err = await res.json()
      toast.error(err.error || "Erro ao abrir caixa")
    }
  }

  // ── Fechar caixa ───────────────────────────────────────────────────────────
  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault()
    const balance = parseFloat(closingBalance.replace(",", "."))
    if (isNaN(balance) || balance < 0) {
      toast.error("Informe o valor contado na gaveta")
      return
    }
    setClosingSaving(true)
    const res = await fetch(`/api/cash-sessions/${session!.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ closingBalance: balance, notes: closingNotes }),
    })
    setClosingSaving(false)
    if (res.ok) {
      toast.success("Caixa fechado!")
      await loadAll(date)
    } else {
      const err = await res.json()
      toast.error(err.error || "Erro ao fechar caixa")
    }
  }

  // ── Status badge ───────────────────────────────────────────────────────────
  const StatusBadge = () => {
    if (pageState === "open")
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Caixa aberto
        </span>
      )
    if (pageState === "closed")
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          <Lock className="h-3 w-3" />
          Caixa fechado
        </span>
      )
    return null
  }

  return (
    <div className="page-body">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="flex items-center gap-3">
            <h1 className="page-title">Caixa do dia</h1>
            <StatusBadge />
          </div>
          <p className="page-subtitle">
            Abertura, movimento e fechamento de caixa com conferência de valores.
          </p>
        </div>
        <div className="page-header-actions">
          <div className="panel flex items-center gap-2 px-3 py-2">
            <CalendarDays className="h-4 w-4 text-slate-500" />
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                setPageState("loading")
              }}
              className="border-none bg-transparent text-sm font-medium text-slate-900 outline-none"
            />
          </div>
          {(pageState === "open" || pageState === "closed") && (
            <button
              onClick={async () => {
                setRefreshing(true)
                await loadAll(date)
                setRefreshing(false)
              }}
              className="btn-refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* LOADING                                                             */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {pageState === "loading" && (
        <div className="panel p-8 text-center text-slate-500">
          Verificando caixa...
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SEM SESSÃO — Formulário de abertura                                */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {pageState === "no_session" && (
        <div className="mx-auto max-w-md">
          <div className="panel p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <Unlock className="h-7 w-7 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Abrir caixa</h2>
              <p className="mt-1 text-sm text-slate-500">
                Informe o troco inicial antes de começar as operações do dia.
              </p>
            </div>

            <form onSubmit={handleOpen} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Data de operação
                </label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900">
                  {format(new Date(date + "T12:00:00"), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Saldo inicial (troco na gaveta) — R$
                </label>
                <input
                  type="text"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="0,00"
                  autoFocus
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-lg font-semibold text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Digite 0 caso não haja troco inicial.
                </p>
              </div>

              <button
                type="submit"
                disabled={openingSaving}
                className="btn-primary w-full justify-center py-3 text-base"
              >
                {openingSaving ? "Abrindo..." : "Abrir caixa"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* CAIXA ABERTO                                                        */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {(pageState === "open" || pageState === "closing") && session && cashData && (
        <>
          {/* Banner de abertura */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Caixa aberto às {format(new Date(session.openedAt), "HH:mm")}
                </p>
                <p className="text-xs text-emerald-700">
                  Saldo inicial: <strong>{fmt(session.openingBalance)}</strong>
                  {" · "}
                  Saldo esperado na gaveta agora:{" "}
                  <strong>{fmt(session.openingBalance + cashData.cash)}</strong>
                </p>
              </div>
            </div>
            {pageState === "open" && (
              <button
                onClick={() => setPageState("closing")}
                className="flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <Lock className="h-4 w-4" />
                Fechar caixa
              </button>
            )}
          </div>

          {/* Formulário de fechamento (inline) */}
          {pageState === "closing" && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
                <Lock className="h-4 w-4" />
                Fechamento de caixa
              </h2>

              {/* Resumo do sistema */}
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Troco inicial</p>
                  <p className="text-lg font-bold text-slate-900">{fmt(session.openingBalance)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Dinheiro recebido</p>
                  <p className="text-lg font-bold text-slate-900">{fmt(cashData.cash)}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Esperado na gaveta</p>
                  <p className="text-lg font-bold text-emerald-700">
                    {fmt(session.openingBalance + cashData.cash)}
                  </p>
                </div>
              </div>

              <form onSubmit={handleClose} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Valor contado fisicamente na gaveta — R$
                  </label>
                  <input
                    type="text"
                    value={closingBalance}
                    onChange={(e) => setClosingBalance(e.target.value)}
                    placeholder="0,00"
                    autoFocus
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-lg font-semibold text-slate-900 focus:border-primary focus:outline-none"
                    required
                  />
                  {/* Pré-visualização da diferença */}
                  {closingBalance.trim() && (() => {
                    const counted  = parseFloat(closingBalance.replace(",", "."))
                    const expected = session.openingBalance + cashData.cash
                    if (isNaN(counted)) return null
                    const diff = counted - expected
                    return (
                      <div className={`mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                        Math.abs(diff) < 0.01
                          ? "bg-emerald-50 text-emerald-700"
                          : diff > 0
                          ? "bg-blue-50 text-blue-700"
                          : "bg-red-50 text-red-700"
                      }`}>
                        {Math.abs(diff) < 0.01
                          ? <CheckCircle2 className="h-4 w-4" />
                          : <AlertCircle className="h-4 w-4" />
                        }
                        <span>
                          {Math.abs(diff) < 0.01
                            ? "Caixa conferido — sem diferença"
                            : diff > 0
                            ? `Sobra de ${fmt(Math.abs(diff))}`
                            : `Falta de ${fmt(Math.abs(diff))}`}
                        </span>
                      </div>
                    )
                  })()}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Observações (opcional)
                  </label>
                  <textarea
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    rows={2}
                    placeholder="Ex: quebra de R$ 5,00 — identificado troco errado..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPageState("open")}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={closingSaving}
                    className="btn-primary"
                  >
                    {closingSaving ? "Fechando..." : "Confirmar fechamento"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Cards de KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card-metric">
              <div className="flex items-center justify-between">
                <span className="card-metric-label">Total recebido</span>
                <div className="rounded-full bg-emerald-100 p-1.5">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <p className="card-metric-value">{fmt(cashData.totalPaid)}</p>
              <p className="mt-1 text-[11px] text-slate-500">
                {cashData.paidCount} {cashData.paidCount === 1 ? "pedido pago" : "pedidos pagos"}
              </p>
            </div>
            <div className="card-metric">
              <div className="flex items-center justify-between">
                <span className="card-metric-label">A receber</span>
                <div className="rounded-full bg-amber-100 p-1.5">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-semibold text-amber-600">{fmt(cashData.totalUnpaid)}</p>
              <p className="mt-1 text-[11px] text-slate-500">
                {cashData.unpaidCount} {cashData.unpaidCount === 1 ? "pedido em aberto" : "pedidos em aberto"}
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
                {fmt(cashData.cash + cashData.pix)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Dinheiro: {fmt(cashData.cash)} · PIX: {fmt(cashData.pix)}
              </p>
            </div>
            <div className="card-metric">
              <div className="flex items-center justify-between">
                <span className="card-metric-label">Cartões</span>
                <div className="rounded-full bg-indigo-100 p-1.5">
                  <CreditCard className="h-4 w-4 text-indigo-600" />
                </div>
              </div>
              <p className="mt-3 text-lg font-semibold text-slate-900">{fmt(cashData.card)}</p>
              {cashData.other > 0 && (
                <p className="mt-1 text-[11px] text-slate-500">
                  Outras formas: {fmt(cashData.other)}
                </p>
              )}
            </div>
          </div>

          {/* Lista de pedidos */}
          <div className="panel">
            <button
              type="button"
              onClick={() => setShowOrders((v) => !v)}
              className="flex w-full items-center justify-between"
            >
              <h2 className="text-sm font-semibold text-slate-900">
                Pedidos do dia
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {cashData.orders.length}
                </span>
              </h2>
              {showOrders
                ? <ChevronUp className="h-4 w-4 text-slate-400" />
                : <ChevronDown className="h-4 w-4 text-slate-400" />
              }
            </button>

            {showOrders && (
              cashData.orders.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  Nenhum pedido registrado ainda.
                </p>
              ) : (
                <div className="mt-3 max-h-[400px] overflow-y-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="table-header-row">
                        <th className="px-3 py-2.5 text-left">Hora</th>
                        <th className="px-3 py-2.5 text-left">Pedido</th>
                        <th className="px-3 py-2.5 text-left">Pagamento</th>
                        <th className="px-3 py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cashData.orders.map((o) => (
                        <tr key={o.id} className="bg-white text-slate-700 hover:bg-slate-50/80">
                          <td className="px-3 py-2 text-xs text-slate-500">
                            {new Date(o.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-900">#{o.number}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              o.paymentStatus === "PAID"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}>
                              {o.paymentStatus === "PAID" ? "Pago" : "Em aberto"}{" "}
                              {o.paymentMethod
                                ? `· ${o.paymentMethod === "CASH" ? "Dinheiro" : o.paymentMethod === "PIX" ? "PIX" : "Cartão"}`
                                : ""}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900">
                            {fmt(o.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-50">
                        <td colSpan={3} className="px-3 py-2.5 text-sm font-semibold text-slate-700">
                          Total — {cashData.orders.length} {cashData.orders.length === 1 ? "pedido" : "pedidos"}
                        </td>
                        <td className="px-3 py-2.5 text-right text-sm font-bold text-slate-900">
                          {fmt(cashData.orders.reduce((s, o) => s + o.total, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )
            )}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* CAIXA FECHADO — Resumo do fechamento                               */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {pageState === "closed" && session && (
        <>
          {/* Banner de fechamento */}
          <div className={`flex flex-wrap items-center gap-3 rounded-xl border px-5 py-3 ${
            Math.abs(session.difference ?? 0) < 0.01
              ? "border-emerald-200 bg-emerald-50"
              : (session.difference ?? 0) < 0
              ? "border-red-200 bg-red-50"
              : "border-blue-200 bg-blue-50"
          }`}>
            {Math.abs(session.difference ?? 0) < 0.01 ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <div>
              <p className={`text-sm font-semibold ${
                Math.abs(session.difference ?? 0) < 0.01
                  ? "text-emerald-800"
                  : (session.difference ?? 0) < 0
                  ? "text-red-800"
                  : "text-blue-800"
              }`}>
                {Math.abs(session.difference ?? 0) < 0.01
                  ? "Caixa fechado sem diferença"
                  : (session.difference ?? 0) < 0
                  ? `Caixa fechado com falta de ${fmt(Math.abs(session.difference ?? 0))}`
                  : `Caixa fechado com sobra de ${fmt(Math.abs(session.difference ?? 0))}`}
              </p>
              <p className="text-xs text-slate-600">
                Aberto às {format(new Date(session.openedAt), "HH:mm")} · Fechado às{" "}
                {session.closedAt ? format(new Date(session.closedAt), "HH:mm") : "—"}
              </p>
            </div>
          </div>

          {/* Cards do fechamento */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card-metric">
              <span className="card-metric-label">Troco inicial</span>
              <p className="card-metric-value">{fmt(session.openingBalance)}</p>
            </div>
            <div className="card-metric">
              <span className="card-metric-label">Total recebido</span>
              <p className="card-metric-value">{fmt(session.totalOrders ?? 0)}</p>
              <p className="mt-1 text-[11px] text-slate-500">Apenas pedidos pagos</p>
            </div>
            <div className="card-metric">
              <span className="card-metric-label">Esperado na gaveta</span>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{fmt(session.expectedCash ?? 0)}</p>
              <p className="mt-1 text-[11px] text-slate-500">Troco + dinheiro recebido</p>
            </div>
            <div className="card-metric">
              <span className="card-metric-label">Contagem física</span>
              <p className={`mt-3 text-2xl font-semibold ${
                Math.abs(session.difference ?? 0) < 0.01
                  ? "text-emerald-700"
                  : (session.difference ?? 0) < 0
                  ? "text-red-600"
                  : "text-blue-600"
              }`}>
                {fmt(session.closingBalance ?? 0)}
              </p>
            </div>
          </div>

          {/* Tabela DRE do dia */}
          <div className="panel p-0 overflow-hidden">
            <div className="border-b border-slate-200 bg-white px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Resumo financeiro do fechamento</h2>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                <tr className="bg-white hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 text-slate-700">(+) Troco inicial</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-900">{fmt(session.openingBalance)}</td>
                </tr>
                <tr className="bg-white hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 text-slate-700 pl-8">(+) Dinheiro (pedidos)</td>
                  <td className="px-4 py-2.5 text-right font-medium text-emerald-700">{fmt(session.totalCash ?? 0)}</td>
                </tr>
                <tr className="bg-white hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 text-slate-700 pl-8">PIX</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-900">{fmt(session.totalPix ?? 0)}</td>
                </tr>
                <tr className="bg-white hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 text-slate-700 pl-8">Cartão</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-900">{fmt(session.totalCard ?? 0)}</td>
                </tr>
                {(session.totalOther ?? 0) > 0 && (
                  <tr className="bg-white hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 text-slate-700 pl-8">Outras formas</td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-900">{fmt(session.totalOther ?? 0)}</td>
                  </tr>
                )}
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-4 py-2.5 text-slate-900">(=) Total faturado</td>
                  <td className="px-4 py-2.5 text-right font-bold text-slate-900">{fmt(session.totalOrders ?? 0)}</td>
                </tr>
                <tr className="bg-white hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 text-slate-700">(=) Esperado na gaveta</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{fmt(session.expectedCash ?? 0)}</td>
                </tr>
                <tr className="bg-white hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 text-slate-700">(−) Contagem física</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{fmt(session.closingBalance ?? 0)}</td>
                </tr>
                <tr className={`font-bold ${
                  Math.abs(session.difference ?? 0) < 0.01
                    ? "bg-emerald-50"
                    : (session.difference ?? 0) < 0
                    ? "bg-red-50"
                    : "bg-blue-50"
                }`}>
                  <td className="px-4 py-3 text-slate-900">
                    {Math.abs(session.difference ?? 0) < 0.01
                      ? "✅ Sem diferença"
                      : (session.difference ?? 0) < 0
                      ? "⚠️ Diferença (falta)"
                      : "ℹ️ Diferença (sobra)"}
                  </td>
                  <td className={`px-4 py-3 text-right text-base font-bold ${
                    Math.abs(session.difference ?? 0) < 0.01
                      ? "text-emerald-700"
                      : (session.difference ?? 0) < 0
                      ? "text-red-700"
                      : "text-blue-700"
                  }`}>
                    {(session.difference ?? 0) >= 0 ? "+" : ""}{fmt(session.difference ?? 0)}
                  </td>
                </tr>
              </tbody>
            </table>
            {session.notes && (
              <div className="border-t border-slate-100 bg-amber-50 px-4 py-3">
                <p className="text-xs font-medium text-amber-700">Observação: {session.notes}</p>
              </div>
            )}
          </div>

          {/* Pedidos do dia (colapsável) */}
          {cashData && (
            <div className="panel">
              <button
                type="button"
                onClick={() => setShowOrders((v) => !v)}
                className="flex w-full items-center justify-between"
              >
                <h2 className="text-sm font-semibold text-slate-900">
                  Pedidos do dia
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {cashData.orders.length}
                  </span>
                </h2>
                {showOrders
                  ? <ChevronUp className="h-4 w-4 text-slate-400" />
                  : <ChevronDown className="h-4 w-4 text-slate-400" />
                }
              </button>
              {showOrders && cashData.orders.length > 0 && (
                <div className="mt-3 max-h-[320px] overflow-y-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="table-header-row">
                        <th className="px-3 py-2 text-left">Hora</th>
                        <th className="px-3 py-2 text-left">Pedido</th>
                        <th className="px-3 py-2 text-left">Pagamento</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cashData.orders.map((o) => (
                        <tr key={o.id} className="bg-white hover:bg-slate-50">
                          <td className="px-3 py-2 text-xs text-slate-500">
                            {new Date(o.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-3 py-2 font-medium">#{o.number}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              o.paymentStatus === "PAID"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}>
                              {o.paymentStatus === "PAID" ? "Pago" : "Em aberto"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-semibold">{fmt(o.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
