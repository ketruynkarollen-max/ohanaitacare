"use client"

/**
 * DRE — Demonstração do Resultado do Exercício
 * Mostra: Receita Bruta → Descontos → Receita Líquida → Despesas → Resultado
 */
import { useEffect, useState, useCallback } from "react"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  BarChart3,
  CalendarDays,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

// ── Tipos ────────────────────────────────────────────────────────────────────
type DreData = {
  period: { from: string; to: string; label: string }
  revenue: {
    gross: number
    discounts: number
    net: number
    paid: number
    pending: number
    orderCount: number
    avgTicket: number
  }
  expenses: {
    total: number
    byCategory: {
      FOOD: number
      SALARY: number
      RENT: number
      UTILITIES: number
      OTHER: number
    }
  }
  result: {
    operational: number
    margin: number
  }
  byDay: Array<{ date: string; revenue: number; expenses: number; profit: number }>
}

type Period = "this_month" | "last_month" | "last_7" | "last_30" | "custom"

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês passado" },
  { value: "last_30",    label: "Últimos 30 dias" },
  { value: "last_7",     label: "Últimos 7 dias" },
  { value: "custom",     label: "Personalizado" },
]

const CATEGORY_LABELS: Record<string, string> = {
  FOOD:      "Alimentação / Insumos",
  SALARY:    "Salários",
  RENT:      "Aluguel",
  UTILITIES: "Contas (luz, água, gás)",
  OTHER:     "Outros",
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function pct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`
}

function ResultBadge({ value }: { value: number }) {
  if (value > 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        <ArrowUp className="h-3 w-3" />
        Lucro
      </span>
    )
  if (value < 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
        <ArrowDown className="h-3 w-3" />
        Prejuízo
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
      <Minus className="h-3 w-3" />
      Equilíbrio
    </span>
  )
}

// ── Linha da DRE ──────────────────────────────────────────────────────────────
function DreRow({
  label,
  value,
  bold,
  indent,
  color,
  subtitle,
}: {
  label: string
  value: number
  bold?: boolean
  indent?: boolean
  color?: "green" | "red" | "amber" | "slate"
  subtitle?: string
}) {
  const colorClass =
    color === "green"
      ? "text-emerald-700"
      : color === "red"
      ? "text-red-600"
      : color === "amber"
      ? "text-amber-600"
      : "text-slate-900"

  return (
    <tr className={`border-b border-slate-100 ${bold ? "bg-slate-50" : "bg-white hover:bg-slate-50/60"}`}>
      <td className={`py-2.5 pr-4 text-sm ${indent ? "pl-8" : "pl-4"} ${bold ? "font-semibold text-slate-900" : "text-slate-700"}`}>
        {label}
        {subtitle && <span className="ml-2 text-xs text-slate-400">{subtitle}</span>}
      </td>
      <td className={`py-2.5 pr-4 text-right text-sm ${bold ? "font-bold" : "font-medium"} ${colorClass}`}>
        {fmt(value)}
      </td>
      <td className="py-2.5 pr-4 text-right text-xs text-slate-400">
        {/* espaço para % futura */}
      </td>
    </tr>
  )
}

function DreDivider({ label }: { label: string }) {
  return (
    <tr>
      <td
        colSpan={3}
        className="bg-slate-100 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500"
      >
        {label}
      </td>
    </tr>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function DrePage() {
  const [data, setData]         = useState<DreData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod]     = useState<Period>("this_month")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo]     = useState("")

  const loadDre = useCallback(async () => {
    setLoading(true)
    let url = `/api/reports/dre?period=${period}`
    if (period === "custom" && customFrom && customTo) {
      url = `/api/reports/dre?from=${customFrom}&to=${customTo}`
    }
    const res = await fetch(url)
    if (res.ok) {
      const d = await res.json()
      setData(d)
    }
    setLoading(false)
  }, [period, customFrom, customTo])

  useEffect(() => {
    if (period !== "custom") loadDre()
  }, [period, loadDre])

  const handleCustomApply = () => {
    if (customFrom && customTo) loadDre()
  }

  const chartData = data?.byDay
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      name: format(new Date(d.date + "T12:00:00"), "dd/MM", { locale: ptBR }),
      Receita:  parseFloat(d.revenue.toFixed(2)),
      Despesas: parseFloat(d.expenses.toFixed(2)),
      Resultado: parseFloat(d.profit.toFixed(2)),
    }))

  const hasData = data && !loading

  return (
    <div className="page-body">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">DRE — Resultado do Exercício</h1>
          <p className="page-subtitle">
            Receitas, despesas e lucro líquido do período selecionado.
          </p>
        </div>
        <div className="page-header-actions flex-wrap gap-2">
          <div className="flex flex-wrap gap-1">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`filter-pill ${period === p.value ? "filter-pill-active" : "filter-pill-inactive"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-primary focus:outline-none"
              />
              <span className="text-slate-400">até</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-primary focus:outline-none"
              />
              <button
                onClick={handleCustomApply}
                className="btn-primary"
                disabled={!customFrom || !customTo}
              >
                Aplicar
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={async () => {
              setRefreshing(true)
              await loadDre()
              setRefreshing(false)
            }}
            className="btn-refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="panel p-8 text-center text-slate-500">
          Calculando resultado do período...
        </div>
      ) : !data ? (
        <div className="panel rounded-xl border-dashed py-12 text-center text-slate-500">
          Erro ao carregar dados financeiros.
        </div>
      ) : (
        <>
          {/* ── Cards de KPIs ──────────────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Receita Líquida */}
            <div className="card-metric">
              <div className="flex items-center justify-between">
                <span className="card-metric-label">Receita líquida</span>
                <div className="rounded-full bg-emerald-100 p-1.5">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <p className="card-metric-value">{fmt(data.revenue.net)}</p>
              <p className="mt-1 text-[11px] text-slate-500">
                {data.revenue.orderCount} pedidos • ticket médio {fmt(data.revenue.avgTicket)}
              </p>
            </div>

            {/* Total Despesas */}
            <div className="card-metric">
              <div className="flex items-center justify-between">
                <span className="card-metric-label">Total despesas</span>
                <div className="rounded-full bg-red-100 p-1.5">
                  <Receipt className="h-4 w-4 text-red-500" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-semibold text-red-600">
                {fmt(data.expenses.total)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {data.revenue.net > 0
                  ? `${((data.expenses.total / data.revenue.net) * 100).toFixed(1)}% da receita`
                  : "—"}
              </p>
            </div>

            {/* Resultado */}
            <div className="card-metric">
              <div className="flex items-center justify-between">
                <span className="card-metric-label">Resultado operacional</span>
                <div
                  className={`rounded-full p-1.5 ${data.result.operational >= 0 ? "bg-emerald-100" : "bg-red-100"}`}
                >
                  {data.result.operational >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
              <p
                className={`mt-3 text-2xl font-semibold ${data.result.operational >= 0 ? "text-emerald-700" : "text-red-600"}`}
              >
                {fmt(data.result.operational)}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <ResultBadge value={data.result.operational} />
              </div>
            </div>

            {/* Margem */}
            <div className="card-metric">
              <div className="flex items-center justify-between">
                <span className="card-metric-label">Margem de lucro</span>
                <div className="rounded-full bg-slate-100 p-1.5">
                  <BarChart3 className="h-4 w-4 text-slate-600" />
                </div>
              </div>
              <p
                className={`mt-3 text-2xl font-semibold ${
                  data.result.margin > 0
                    ? data.result.margin >= 5
                      ? "text-emerald-700"
                      : "text-amber-600"
                    : "text-red-600"
                }`}
              >
                {pct(data.result.margin)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Meta ideal: 5–15% para restaurantes
              </p>
            </div>
          </div>

          {/* ── Status de recebimento ──────────────────────────────────────── */}
          <div className="panel flex flex-wrap items-center gap-6">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">{data.period.label}</span>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-600">Recebido:</span>
              <span className="font-semibold text-emerald-700">{fmt(data.revenue.paid)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="text-slate-600">A receber:</span>
              <span className="font-semibold text-amber-700">{fmt(data.revenue.pending)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="text-slate-600">Despesas pagas:</span>
              <span className="font-semibold text-red-600">{fmt(data.expenses.total)}</span>
            </div>
          </div>

          {/* ── DRE Estruturada ────────────────────────────────────────────── */}
          <div className="panel p-0 overflow-hidden">
            <div className="border-b border-slate-200 bg-white px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Demonstração do Resultado — {data.period.label}
              </h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="table-header-row">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Descrição
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Valor
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    &nbsp;
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Receitas */}
                <DreDivider label="Receitas" />
                <DreRow
                  label="(+) Receita bruta de vendas"
                  value={data.revenue.gross}
                  color="green"
                />
                <DreRow
                  label="(−) Descontos concedidos"
                  indent
                  value={-data.revenue.discounts}
                  color={data.revenue.discounts > 0 ? "red" : "slate"}
                />
                <DreRow
                  label="(=) Receita líquida"
                  value={data.revenue.net}
                  bold
                  color="green"
                />

                {/* Despesas */}
                <DreDivider label="Despesas" />
                <DreRow
                  label="(−) Alimentação / Insumos"
                  indent
                  value={-data.expenses.byCategory.FOOD}
                  color={data.expenses.byCategory.FOOD > 0 ? "red" : "slate"}
                  subtitle={
                    data.revenue.net > 0
                      ? `${((data.expenses.byCategory.FOOD / data.revenue.net) * 100).toFixed(1)}% da receita`
                      : undefined
                  }
                />
                <DreRow
                  label="(−) Salários"
                  indent
                  value={-data.expenses.byCategory.SALARY}
                  color={data.expenses.byCategory.SALARY > 0 ? "red" : "slate"}
                  subtitle={
                    data.revenue.net > 0
                      ? `${((data.expenses.byCategory.SALARY / data.revenue.net) * 100).toFixed(1)}% da receita`
                      : undefined
                  }
                />
                <DreRow
                  label="(−) Aluguel"
                  indent
                  value={-data.expenses.byCategory.RENT}
                  color={data.expenses.byCategory.RENT > 0 ? "red" : "slate"}
                />
                <DreRow
                  label="(−) Contas (luz, água, gás)"
                  indent
                  value={-data.expenses.byCategory.UTILITIES}
                  color={data.expenses.byCategory.UTILITIES > 0 ? "red" : "slate"}
                />
                <DreRow
                  label="(−) Outros"
                  indent
                  value={-data.expenses.byCategory.OTHER}
                  color={data.expenses.byCategory.OTHER > 0 ? "red" : "slate"}
                />
                <DreRow
                  label="(=) Total de despesas"
                  value={-data.expenses.total}
                  bold
                  color="red"
                />

                {/* Resultado */}
                <DreDivider label="Resultado" />
                <DreRow
                  label="(=) Resultado operacional"
                  value={data.result.operational}
                  bold
                  color={
                    data.result.operational > 0
                      ? "green"
                      : data.result.operational < 0
                      ? "red"
                      : "slate"
                  }
                  subtitle={pct(data.result.margin)}
                />
              </tbody>
            </table>
          </div>

          {/* ── Gráfico Receita vs Despesas ───────────────────────────────── */}
          {chartData && chartData.length > 1 && (
            <div className="panel">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Receita × Despesas por dia
                </h3>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                    barCategoryGap="25%"
                    barGap={2}
                  >
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                      fontSize={11}
                      tickMargin={8}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickFormatter={(v) => `R$${v}`}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        fmt(typeof value === "number" ? value : Number(value)),
                        name,
                      ]}
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,.08)",
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                    />
                    <Bar dataKey="Receita"   fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Despesas"  fill="#f87171" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Resultado" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Distribuição de despesas ──────────────────────────────────── */}
          {data.expenses.total > 0 && (
            <div className="panel">
              <h3 className="mb-4 text-sm font-semibold text-slate-900">
                Distribuição das despesas
              </h3>
              <div className="space-y-3">
                {Object.entries(data.expenses.byCategory)
                  .filter(([, v]) => v > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, value]) => {
                    const pctVal = (value / data.expenses.total) * 100
                    return (
                      <div key={cat}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-slate-700">
                            {CATEGORY_LABELS[cat] || cat}
                          </span>
                          <span className="font-medium text-slate-900">
                            {fmt(value)}
                            <span className="ml-1.5 text-xs text-slate-400">
                              ({pctVal.toFixed(0)}%)
                            </span>
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-red-400 transition-all"
                            style={{ width: `${pctVal}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* ── Aviso se sem despesas ────────────────────────────────────── */}
          {data.expenses.total === 0 && (
            <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-5 py-4">
              <p className="text-sm font-medium text-amber-800">
                ⚠️ Nenhuma despesa lançada neste período
              </p>
              <p className="mt-0.5 text-sm text-amber-700">
                A margem de lucro pode estar superestimada. Registre salários, aluguel e insumos na tela de{" "}
                <a href="/expenses" className="underline">
                  Despesas
                </a>{" "}
                para ter um resultado real.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
