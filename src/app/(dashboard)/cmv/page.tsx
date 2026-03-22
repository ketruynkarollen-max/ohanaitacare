"use client"

/**
 * CMV — Custo de Mercadoria Vendida + Engenharia de Cardápio
 * Mostra o custo de cada prato (via ficha técnica), o CMV% e a classificação
 * Menu Engineering: Star ⭐, Plowhorse 🐂, Puzzle ❓, Dog 🐕
 */
import { useEffect, useState, useCallback } from "react"
import {
  Star, TrendingDown, HelpCircle, Dog, RefreshCw,
  FlaskConical, ChevronDown, ChevronUp, AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import { RecipeModal } from "@/components/cmv/recipe-modal"

// ── Tipos ─────────────────────────────────────────────────────────────────────
type RecipeIngredient = {
  ingredientId:   string
  ingredientName: string
  unit:           string
  unitCost:       number
  quantity:       number
  lineCost:       number
}

type CmvItem = {
  id:          string
  name:        string
  price:       number
  category:    { id: string; name: string }
  recipeCost:  number
  cmvPercent:  number
  grossMargin: number
  salesQty:    number
  hasRecipe:   boolean
  menuClass:   "star" | "plowhorse" | "puzzle" | "dog" | "none"
  recipeItems: RecipeIngredient[]
}

type CmvData = {
  items:   CmvItem[]
  summary: {
    totalProducts:  number
    withRecipe:     number
    withoutRecipe:  number
    avgCmv:         number
    stars:      number
    plowhorses: number
    puzzles:    number
    dogs:       number
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}

const CLASS_CONFIG = {
  star:      { icon: Star,         label: "⭐ Star",      color: "bg-amber-100 text-amber-700",   tip: "Alta margem + alta venda. Promova!" },
  plowhorse: { icon: TrendingDown,  label: "🐂 Vaca",      color: "bg-blue-100 text-blue-700",     tip: "Alta venda, baixa margem. Aumente o preço." },
  puzzle:    { icon: HelpCircle,    label: "❓ Puzzle",    color: "bg-violet-100 text-violet-700", tip: "Boa margem, pouca venda. Melhore a visibilidade." },
  dog:       { icon: Dog,           label: "🐕 Dog",       color: "bg-slate-100 text-slate-500",   tip: "Baixa margem + baixa venda. Reformule ou retire." },
  none:      { icon: FlaskConical,  label: "Sem ficha",    color: "bg-slate-100 text-slate-400",   tip: "Cadastre a ficha técnica para calcular o CMV." },
}

const CMV_IDEAL_MIN = 28
const CMV_IDEAL_MAX = 35

function CmvBadge({ pct }: { pct: number }) {
  if (pct === 0)
    return <span className="text-xs text-slate-400">—</span>
  const color =
    pct <= CMV_IDEAL_MAX
      ? pct >= CMV_IDEAL_MIN
        ? "text-emerald-600 font-semibold"
        : "text-blue-600"
      : "text-red-600 font-semibold"
  return <span className={`text-sm ${color}`}>{pct.toFixed(1)}%</span>
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function CmvPage() {
  const [data, setData]           = useState<CmvData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [recipeProduct, setRecipeProduct] = useState<CmvItem | null>(null)
  const [classFilter, setClassFilter]     = useState<string>("ALL")
  const [search, setSearch]       = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/reports/cmv")
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = data?.items.filter((item) => {
    const matchClass = classFilter === "ALL" || item.menuClass === classFilter
    const matchSearch =
      !search.trim() ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.name.toLowerCase().includes(search.toLowerCase())
    return matchClass && matchSearch
  }) ?? []

  const groupedByCategory = filtered.reduce<Record<string, CmvItem[]>>((acc, item) => {
    const cat = item.category.name
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const s = data?.summary

  return (
    <div className="page-body">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">CMV — Custo de Mercadoria Vendida</h1>
          <p className="page-subtitle">
            Custo de cada prato via ficha técnica e análise de engenharia de cardápio.
          </p>
        </div>
        <div className="page-header-actions">
          <Link href="/ingredients" className="btn-secondary">
            <FlaskConical className="h-4 w-4" />
            Ingredientes
          </Link>
          <button
            onClick={async () => { setRefreshing(true); await load(); setRefreshing(false) }}
            className="btn-refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="panel p-8 text-center text-slate-500">Calculando CMV...</div>
      ) : !data ? (
        <div className="panel rounded-xl border-dashed py-12 text-center text-slate-500">
          Erro ao carregar dados.
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card-metric">
              <span className="card-metric-label">CMV médio</span>
              <p className={`mt-3 text-2xl font-semibold ${
                s!.avgCmv === 0
                  ? "text-slate-400"
                  : s!.avgCmv <= CMV_IDEAL_MAX
                  ? "text-emerald-600"
                  : "text-red-600"
              }`}>
                {s!.avgCmv > 0 ? `${s!.avgCmv.toFixed(1)}%` : "—"}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Meta ideal: {CMV_IDEAL_MIN}–{CMV_IDEAL_MAX}%
              </p>
            </div>
            <div className="card-metric">
              <span className="card-metric-label">Pratos com ficha</span>
              <p className="card-metric-value">{s!.withRecipe}</p>
              <p className="mt-1 text-[11px] text-slate-500">
                {s!.withoutRecipe} sem ficha técnica
              </p>
            </div>
            <div className="card-metric col-span-2">
              <span className="card-metric-label">Menu Engineering (últimos 30 dias)</span>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { key: "star",      count: s!.stars,      icon: "⭐", color: "bg-amber-100 text-amber-700" },
                  { key: "plowhorse", count: s!.plowhorses, icon: "🐂", color: "bg-blue-100 text-blue-700" },
                  { key: "puzzle",    count: s!.puzzles,    icon: "❓", color: "bg-violet-100 text-violet-700" },
                  { key: "dog",       count: s!.dogs,       icon: "🐕", color: "bg-slate-100 text-slate-500" },
                ].map(({ key, count, icon, color }) => (
                  <span key={key} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>
                    {icon} {count}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Alerta: pratos sem ficha */}
          {s!.withoutRecipe > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
              <p className="text-sm text-amber-800">
                <strong>{s!.withoutRecipe} prato{s!.withoutRecipe > 1 ? "s" : ""}</strong> sem ficha técnica — o CMV deles não é calculado.
                Clique em <strong>"Editar ficha"</strong> na tabela para cadastrar os ingredientes.
                {" "}Se você ainda não tem ingredientes,{" "}
                <Link href="/ingredients" className="underline font-medium">
                  cadastre-os primeiro
                </Link>
                .
              </p>
            </div>
          )}

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar prato..."
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-primary focus:outline-none"
            />
            {[
              { value: "ALL",      label: "Todos" },
              { value: "star",     label: "⭐ Stars" },
              { value: "plowhorse",label: "🐂 Vacas" },
              { value: "puzzle",   label: "❓ Puzzles" },
              { value: "dog",      label: "🐕 Dogs" },
              { value: "none",     label: "Sem ficha" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setClassFilter(f.value)}
                className={`filter-pill ${classFilter === f.value ? "filter-pill-active" : "filter-pill-inactive"}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Tabela agrupada por categoria */}
          {Object.keys(groupedByCategory).length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center text-slate-500">
              Nenhum produto encontrado.
            </div>
          ) : (
            <div className="space-y-1 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              {/* Cabeçalho */}
              <div className="grid grid-cols-[1fr,100px,100px,90px,90px,110px,110px] gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <span>Prato</span>
                <span className="text-right">Preço</span>
                <span className="text-right">Custo</span>
                <span className="text-right">CMV%</span>
                <span className="text-right">Margem</span>
                <span className="text-center">Classificação</span>
                <span className="text-center">Ações</span>
              </div>

              {Object.entries(groupedByCategory).map(([catName, items]) => (
                <div key={catName}>
                  <div className="bg-slate-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-100">
                    {catName}
                  </div>
                  {items.map((item) => {
                    const cls = CLASS_CONFIG[item.menuClass]
                    const isExpanded = expandedId === item.id
                    return (
                      <div key={item.id} className="border-b border-slate-100 last:border-0">
                        <div className="grid grid-cols-[1fr,100px,100px,90px,90px,110px,110px] items-center gap-2 px-4 py-3 hover:bg-slate-50/60">
                          {/* Nome */}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-400">
                              {item.salesQty > 0 ? `${item.salesQty} vendas/30d` : "sem vendas"}
                            </p>
                          </div>
                          {/* Preço */}
                          <p className="text-right text-sm text-slate-700">{fmt(item.price)}</p>
                          {/* Custo */}
                          <p className="text-right text-sm text-slate-700">
                            {item.hasRecipe ? fmt(item.recipeCost) : <span className="text-slate-400">—</span>}
                          </p>
                          {/* CMV% */}
                          <div className="text-right">
                            <CmvBadge pct={item.cmvPercent} />
                          </div>
                          {/* Margem */}
                          <p className={`text-right text-sm ${item.hasRecipe ? (item.grossMargin >= 0 ? "text-emerald-600 font-medium" : "text-red-600") : "text-slate-400"}`}>
                            {item.hasRecipe ? fmt(item.grossMargin) : "—"}
                          </p>
                          {/* Classificação */}
                          <div className="flex justify-center">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls.color}`}
                              title={cls.tip}
                            >
                              {cls.label}
                            </span>
                          </div>
                          {/* Ações */}
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setRecipeProduct(item)}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                            >
                              Editar ficha
                            </button>
                            {item.hasRecipe && (
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100"
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Detalhes da ficha técnica (expandido) */}
                        {isExpanded && item.hasRecipe && (
                          <div className="border-t border-slate-100 bg-slate-50 px-8 py-3">
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Ingredientes da ficha
                            </p>
                            <div className="space-y-1">
                              {item.recipeItems.map((ri) => (
                                <div
                                  key={ri.ingredientId}
                                  className="flex items-center justify-between rounded px-2 py-1 text-sm"
                                >
                                  <span className="text-slate-700">{ri.ingredientName}</span>
                                  <span className="text-slate-500">
                                    {ri.quantity} {ri.unit} × {fmt(ri.unitCost)} =
                                    <span className="ml-1 font-medium text-slate-900">
                                      {fmt(ri.lineCost)}
                                    </span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Legenda Menu Engineering */}
          <div className="panel">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Legenda — Menu Engineering
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(["star", "plowhorse", "puzzle", "dog"] as const).map((key) => {
                const cfg = CLASS_CONFIG[key]
                return (
                  <div key={key} className={`rounded-lg px-3 py-2.5 ${cfg.color}`}>
                    <p className="text-sm font-semibold">{cfg.label}</p>
                    <p className="mt-0.5 text-xs opacity-80">{cfg.tip}</p>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Classificação baseada em popularidade (vendas dos últimos 30 dias) vs. margem bruta (preço − custo de receita). Requer ficha técnica cadastrada.
            </p>
          </div>
        </>
      )}

      {/* Modal de ficha técnica */}
      {recipeProduct && (
        <RecipeModal
          productId={recipeProduct.id}
          productName={recipeProduct.name}
          productPrice={recipeProduct.price}
          onClose={() => setRecipeProduct(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
