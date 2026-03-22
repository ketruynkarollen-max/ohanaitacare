"use client"

/**
 * Relatórios - Vendas e métricas
 * Layout inspirado no dashboard OlaClick:
 * cards com indicadores, gráfico em destaque e blocos de marketing.
 */
import { useEffect, useState } from "react"
import { BarChart3, TrendingUp, ShoppingCart, DollarSign, RefreshCw } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { format } from "date-fns"

type ReportData = {
  total: number
  orderCount: number
  avgOrder: number
  byDay: { date: string; value: number }[]
  topProducts: { id: string; name: string; qty: number; total: number }[]
  recentOrders: Array<{
    id: string
    number: number
    total: number
    status: string
    type: string
    createdAt: string
    table: { number: number } | null
  }>
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  // Deixa "Últimos 7 dias" como período padrão para o gráfico ficar mais parecido com o exemplo
  const [period, setPeriod] = useState<"today" | "week" | "month">("week")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadReport = async () => {
    setLoading(true)
    const res = await fetch(`/api/reports/sales?period=${period}`)
    if (res.ok) {
      const d = await res.json()
      setData(d)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadReport()
  }, [period])

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)

  const chartData = data?.byDay
    ?.slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((d) => ({
      name: format(new Date(d.date), "dd/MM"),
      vendas: d.value,
    }))

  return (
    <div className="page-body">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Relatórios</h1>
          <p className="page-subtitle">
            Acompanhe o progresso de vendas, ticket médio e produtos mais vendidos.
          </p>
        </div>
        <div className="page-header-actions">
          <div className="flex flex-wrap gap-1">
            {(["today", "week", "month"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`filter-pill ${period === p ? "filter-pill-active" : "filter-pill-inactive"}`}
              >
                {p === "today" ? "Hoje" : p === "week" ? "Últimos 7 dias" : "Últimos 30 dias"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={async () => {
              setRefreshing(true)
              await loadReport()
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
        <div className="panel p-6 text-center text-slate-500">
          Carregando dados do relatório...
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card-metric">
              <div className="flex items-center justify-between">
                <div className="card-metric-label">Total de vendas</div>
                <div className="rounded-full bg-emerald-100 p-1.5">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <p className="card-metric-value">{formatPrice(data.total)}</p>
            </div>
            <div className="card-metric">
              <div className="flex items-center justify-between">
                <div className="card-metric-label">Quantidade de pedidos</div>
                <div className="rounded-full bg-sky-100 p-1.5">
                  <ShoppingCart className="h-4 w-4 text-sky-600" />
                </div>
              </div>
              <p className="card-metric-value">{data.orderCount}</p>
            </div>
            <div className="card-metric">
              <div className="flex items-center justify-between">
                <div className="card-metric-label">Ticket médio</div>
                <div className="rounded-full bg-amber-100 p-1.5">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                </div>
              </div>
              <p className="card-metric-value">{formatPrice(data.avgOrder)}</p>
            </div>
            <div className="card-metric">
              <div className="flex items-center justify-between">
                <div className="card-metric-label">Período analisado</div>
                <div className="rounded-full bg-slate-100 p-1.5">
                  <BarChart3 className="h-4 w-4 text-slate-600" />
                </div>
              </div>
              <p className="mt-3 text-lg font-semibold text-slate-900">
                {period === "today" ? "Hoje" : period === "week" ? "Últimos 7 dias" : "Últimos 30 dias"}
              </p>
            </div>
          </div>

          {chartData && chartData.length > 0 && (
            <div className="panel">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Progresso de vendas
                </h3>
                <span className="text-xs text-slate-500">
                  {period === "today"
                    ? "Hoje"
                    : period === "week"
                    ? "Últimos 7 dias"
                    : "Últimos 30 dias"}
                </span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                      fontSize={11}
                      tickMargin={8}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickFormatter={(v) => `R$ ${v}`}
                    />
                    <Tooltip
                      formatter={(value) =>
                        [
                          formatPrice(
                            typeof value === "number"
                              ? value
                              : Number(value ?? 0),
                          ),
                          "Vendas",
                        ] as any
                      }
                      labelFormatter={(label) => `Dia ${label}`}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        boxShadow:
                          "0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -4px rgba(15, 23, 42, 0.1)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="vendas"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, stroke: "#ffffff" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="panel">
              <h3 className="mb-4 text-sm font-semibold text-slate-900">
                Produtos mais vendidos
              </h3>
              {data.topProducts.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma venda no período</p>
              ) : (
                <ul className="space-y-2">
                  {data.topProducts.map((p, i) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span className="truncate">
                      <span className="mr-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                        #{i + 1}
                      </span>
                      {p.name}
                    </span>
                    <span className="whitespace-nowrap font-medium text-slate-900">
                      {formatPrice(p.total)}
                    </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="panel">
              <h3 className="mb-4 text-sm font-semibold text-slate-900">Últimos pedidos</h3>
              {data.recentOrders.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum pedido no período</p>
              ) : (
                <ul className="space-y-2">
                  {data.recentOrders.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                    >
                      <span className="truncate">
                        <span className="font-medium text-slate-900">#{o.number}</span>{" "}
                        <span className="text-slate-500">
                          • {o.table ? `Mesa ${o.table.number}` : o.type}
                        </span>
                      </span>
                      <span className="whitespace-nowrap font-medium text-slate-900">
                        {formatPrice(o.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : (
            <div className="panel rounded-xl border-dashed py-12 text-center text-slate-500">
          Erro ao carregar relatórios
        </div>
      )}
    </div>
  )
}
