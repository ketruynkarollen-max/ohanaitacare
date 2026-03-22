"use client"
/**
 * /menu-engineering  — Engenharia de Cardápio
 * Classifica os pratos em Stars ⭐ · Plowhorses 🐂 · Puzzles ❓ · Dogs 🐕
 * com gráfico de quadrante (Margem × Popularidade)
 */
import { useEffect, useState, useCallback } from "react"
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts"
import { Star, TrendingDown, HelpCircle, AlertTriangle, ChevronDown, ChevronUp, Download } from "lucide-react"
import toast from "react-hot-toast"

// ─── Types ────────────────────────────────────────────────────────────────────
type MenuClass = "star" | "plowhorse" | "puzzle" | "dog" | "none"

interface RecipeItem {
  name: string
  unit: string
  quantity: number
  cost: number
}

interface Product {
  id: string
  name: string
  price: number
  category: { id: string; name: string }
  recipeCost: number
  cmvPercent: number
  grossMargin: number
  marginPct: number
  salesQty: number
  revenue: number
  totalMargin: number
  hasRecipe: boolean
  recipeItems: RecipeItem[]
  menuClass: MenuClass
  recommendation: {
    action: string
    detail: string
    color: string
  }
}

interface Summary {
  totalProducts: number
  withRecipe: number
  withoutRecipe: number
  avgCmv: number
  overallMarginPct: number
  totalRevenue: number
  totalMarginSum: number
  avgMarginThreshold: number
  avgSalesThreshold: number
  stars: number
  plowhorses: number
  puzzles: number
  dogs: number
  days: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const fmtPct = (v: number) => `${v.toFixed(1)}%`

const CLASS_CONFIG: Record<
  MenuClass,
  { label: string; emoji: string; color: string; bg: string; border: string; description: string }
> = {
  star: {
    label: "Stars",
    emoji: "⭐",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#86efac",
    description: "Alta margem + muito vendido. São os campeões do cardápio.",
  },
  plowhorse: {
    label: "Plowhorses",
    emoji: "🐂",
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#93c5fd",
    description: "Muito vendido mas margem baixa. Reajuste de preço necessário.",
  },
  puzzle: {
    label: "Puzzles",
    emoji: "❓",
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fcd34d",
    description: "Alta margem mas pouco vendido. Invista em visibilidade.",
  },
  dog: {
    label: "Dogs",
    emoji: "🐕",
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fca5a5",
    description: "Baixa margem + pouco vendido. Retire ou reformule.",
  },
  none: {
    label: "Sem ficha",
    emoji: "📋",
    color: "#6b7280",
    bg: "#f9fafb",
    border: "#d1d5db",
    description: "Sem ficha técnica. Não é possível calcular margem.",
  },
}

const PERIOD_OPTIONS = [
  { label: "7 dias", value: 7 },
  { label: "30 dias", value: 30 },
  { label: "60 dias", value: 60 },
  { label: "90 dias", value: 90 },
]

// ─── Custom Tooltip for Scatter ───────────────────────────────────────────────
function QuadrantTooltip({ active, payload }: { active?: boolean; payload?: { payload: Product }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const cfg = CLASS_CONFIG[d.menuClass]
  return (
    <div
      style={{
        background: "white",
        border: `1px solid ${cfg.border}`,
        borderRadius: 10,
        padding: "10px 14px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
        minWidth: 180,
      }}
    >
      <p style={{ fontWeight: 700, marginBottom: 4 }}>{d.name}</p>
      <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{d.category.name}</p>
      <div style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 2 }}>
        <span>{cfg.emoji} <strong>{cfg.label}</strong></span>
        <span>Vendas: <strong>{d.salesQty} un.</strong></span>
        <span>Margem: <strong>{fmtBRL(d.grossMargin)}</strong></span>
        <span>CMV: <strong>{fmtPct(d.cmvPercent)}</strong></span>
        <span>Receita: <strong>{fmtBRL(d.revenue)}</strong></span>
      </div>
    </div>
  )
}

// ─── Expandable product row ───────────────────────────────────────────────────
function ProductRow({ product, rank }: { product: Product; rank: number }) {
  const [open, setOpen] = useState(false)
  const cfg = CLASS_CONFIG[product.menuClass]

  return (
    <div
      style={{
        border: `1px solid ${open ? cfg.border : "#e5e7eb"}`,
        borderRadius: 10,
        marginBottom: 8,
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          background: open ? cfg.bg : "white",
          border: "none",
          padding: "12px 16px",
          cursor: "pointer",
          textAlign: "left",
          display: "grid",
          gridTemplateColumns: "32px 1fr 90px 90px 80px 80px 28px",
          alignItems: "center",
          gap: 8,
          transition: "background 0.2s",
        }}
      >
        <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>#{rank}</span>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{product.name}</span>
        <span style={{ fontSize: 13, color: "#374151" }}>{fmtBRL(product.grossMargin)}</span>
        <span
          style={{
            fontSize: 13,
            color: product.cmvPercent > 35 ? "#dc2626" : "#16a34a",
            fontWeight: 600,
          }}
        >
          {product.hasRecipe ? fmtPct(product.cmvPercent) : "—"}
        </span>
        <span style={{ fontSize: 13, color: "#374151" }}>{product.salesQty} un.</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
            fontWeight: 600,
            color: cfg.color,
          }}
        >
          {cfg.emoji} {cfg.label}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4" style={{ color: "#9ca3af" }} />
        ) : (
          <ChevronDown className="h-4 w-4" style={{ color: "#9ca3af" }} />
        )}
      </button>

      {open && (
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${cfg.border}`, background: cfg.bg }}>
          {/* Recomendação */}
          <div
            style={{
              background: "white",
              border: `1px solid ${cfg.border}`,
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 12,
            }}
          >
            <p style={{ fontWeight: 700, color: cfg.color, marginBottom: 4 }}>
              💡 {product.recommendation.action}
            </p>
            <p style={{ fontSize: 13, color: "#374151" }}>{product.recommendation.detail}</p>
          </div>

          {/* Números */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8,
              marginBottom: 12,
            }}
          >
            {[
              { label: "Preço venda", value: fmtBRL(product.price) },
              { label: "Custo ficha", value: product.hasRecipe ? fmtBRL(product.recipeCost) : "—" },
              { label: "Margem total", value: fmtBRL(product.totalMargin) },
              { label: "Receita total", value: fmtBRL(product.revenue) },
            ].map((m) => (
              <div
                key={m.label}
                style={{
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: "8px 10px",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: 11, color: "#6b7280" }}>{m.label}</p>
                <p style={{ fontWeight: 700, fontSize: 14 }}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Ficha técnica */}
          {product.recipeItems.length > 0 && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>
                FICHA TÉCNICA
              </p>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    {["Ingrediente", "Qtd", "Custo"].map((h) => (
                      <th
                        key={h}
                        style={{ textAlign: "left", padding: "4px 8px", color: "#6b7280", fontWeight: 600 }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {product.recipeItems.map((ri) => (
                    <tr key={ri.name} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "4px 8px" }}>{ri.name}</td>
                      <td style={{ padding: "4px 8px", color: "#6b7280" }}>
                        {ri.quantity} {ri.unit}
                      </td>
                      <td style={{ padding: "4px 8px", fontWeight: 600 }}>{fmtBRL(ri.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MenuEngineeringPage() {
  const [days, setDays] = useState(30)
  const [items, setItems] = useState<Product[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<MenuClass | "all">("all")
  const [sortBy, setSortBy] = useState<"totalMargin" | "marginPct" | "salesQty" | "revenue">(
    "totalMargin",
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/menu-engineering?days=${days}`)
      const data = await res.json()
      setItems(data.items ?? [])
      setSummary(data.summary ?? null)
    } catch {
      toast.error("Erro ao carregar dados")
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    load()
  }, [load])

  // Filtered + sorted list
  const filtered = items
    .filter((i) => activeFilter === "all" || i.menuClass === activeFilter)
    .sort((a, b) => b[sortBy] - a[sortBy])

  // Scatter data (only products with recipe)
  const scatterData = items.filter((i) => i.hasRecipe)

  // Export CSV
  const exportCSV = () => {
    if (!summary) return
    const rows = [
      ["Engenharia de Cardápio", `Últimos ${days} dias`],
      [],
      ["Produto", "Categoria", "Classe", "Preço", "Custo Ficha", "Margem Unit.", "CMV%", "Vendas", "Receita", "Margem Total", "Recomendação"],
      ...items.map((i) => [
        i.name,
        i.category.name,
        CLASS_CONFIG[i.menuClass].label,
        i.price.toFixed(2).replace(".", ","),
        i.hasRecipe ? i.recipeCost.toFixed(2).replace(".", ",") : "",
        i.grossMargin.toFixed(2).replace(".", ","),
        i.hasRecipe ? i.cmvPercent.toFixed(1).replace(".", ",") + "%" : "",
        i.salesQty,
        i.revenue.toFixed(2).replace(".", ","),
        i.totalMargin.toFixed(2).replace(".", ","),
        i.recommendation.action,
      ]),
    ]
    const csv =
      "\uFEFF" +
      rows
        .map((r) =>
          r.map((c) => {
            const s = String(c ?? "")
            return s.includes(";") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
          }).join(";"),
        )
        .join("\r\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `menu-engineering-${days}dias.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("CSV exportado!")
  }

  return (
    <div className="panel" style={{ maxWidth: 1100 }}>
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>
            Engenharia de Cardápio
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Stars ⭐ · Plowhorses 🐂 · Puzzles ❓ · Dogs 🐕
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.value}
                className={`filter-pill ${days === p.value ? "active" : ""}`}
                onClick={() => setDays(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={exportCSV}
            className="btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px" }}
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
          Calculando margens e classificações…
        </div>
      ) : (
        <>
          {/* ── KPI Cards ── */}
          {summary && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 14,
                marginBottom: 28,
              }}
            >
              {[
                {
                  label: "Stars ⭐",
                  value: summary.stars,
                  sub: "Alta margem + popular",
                  color: "#16a34a",
                  bg: "#f0fdf4",
                },
                {
                  label: "Plowhorses 🐂",
                  value: summary.plowhorses,
                  sub: "Popular, margem baixa",
                  color: "#2563eb",
                  bg: "#eff6ff",
                },
                {
                  label: "Puzzles ❓",
                  value: summary.puzzles,
                  sub: "Boa margem, pouco vendido",
                  color: "#d97706",
                  bg: "#fffbeb",
                },
                {
                  label: "Dogs 🐕",
                  value: summary.dogs,
                  sub: "Baixa margem + impopular",
                  color: "#dc2626",
                  bg: "#fef2f2",
                },
              ].map((k) => (
                <button
                  key={k.label}
                  onClick={() =>
                    setActiveFilter(
                      (prev) =>
                        prev === (k.label.split(" ")[1].toLowerCase() as MenuClass)
                          ? "all"
                          : (k.label.split(" ")[1].toLowerCase() as MenuClass),
                    )
                  }
                  style={{
                    background: k.bg,
                    border: `2px solid ${
                      activeFilter === k.label.split(" ")[1].toLowerCase() ? k.color : "transparent"
                    }`,
                    borderRadius: 12,
                    padding: "16px 18px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "border-color 0.2s",
                  }}
                >
                  <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>{k.label}</p>
                  <p style={{ fontSize: 28, fontWeight: 800, color: k.color, lineHeight: 1 }}>
                    {k.value}
                  </p>
                  <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{k.sub}</p>
                </button>
              ))}

              <div className="card-metric">
                <p className="card-metric-label">Margem geral</p>
                <p
                  className="card-metric-value"
                  style={{
                    color:
                      summary.overallMarginPct >= 65
                        ? "#16a34a"
                        : summary.overallMarginPct >= 50
                        ? "#d97706"
                        : "#dc2626",
                  }}
                >
                  {fmtPct(summary.overallMarginPct)}
                </p>
                <p className="card-metric-sub">CMV médio: {fmtPct(summary.avgCmv)}</p>
              </div>

              <div className="card-metric">
                <p className="card-metric-label">Receita total</p>
                <p className="card-metric-value">{fmtBRL(summary.totalRevenue)}</p>
                <p className="card-metric-sub">Últimos {summary.days} dias</p>
              </div>
            </div>
          )}

          {/* ── Warning: sem fichas ── */}
          {summary && summary.withoutRecipe > 0 && (
            <div
              style={{
                background: "#fffbeb",
                border: "1px solid #fcd34d",
                borderRadius: 10,
                padding: "12px 16px",
                marginBottom: 20,
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <AlertTriangle className="h-5 w-5 flex-shrink-0" style={{ color: "#d97706", marginTop: 1 }} />
              <p style={{ fontSize: 14, color: "#92400e" }}>
                <strong>{summary.withoutRecipe} produto(s)</strong> sem ficha técnica cadastrada.
                Vá em <strong>CMV / Fichas</strong> para cadastrar os ingredientes e ter a análise completa.
              </p>
            </div>
          )}

          {/* ── Quadrant Chart ── */}
          {scatterData.length > 0 && summary && (
            <div
              style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: "20px 16px",
                marginBottom: 28,
              }}
            >
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                Mapa de Quadrante — Margem × Popularidade
              </h2>
              <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
                Cada ponto é um produto. Eixo X = vendas no período · Eixo Y = margem bruta unitária (R$)
              </p>

              <div style={{ position: "relative" }}>
                {/* Quadrant labels */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    right: 0,
                    bottom: "50%",
                    background: "rgba(240,253,244,0.4)",
                    borderBottom: "1px dashed #d1d5db",
                    borderLeft: "1px dashed #d1d5db",
                    pointerEvents: "none",
                    zIndex: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: 13, color: "#16a34a", fontWeight: 700, opacity: 0.6 }}>⭐ Stars</span>
                </div>
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: "50%",
                    bottom: "50%",
                    background: "rgba(255,251,235,0.4)",
                    borderBottom: "1px dashed #d1d5db",
                    pointerEvents: "none",
                    zIndex: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: 13, color: "#d97706", fontWeight: 700, opacity: 0.6 }}>❓ Puzzles</span>
                </div>
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    right: 0,
                    bottom: 0,
                    background: "rgba(239,246,255,0.4)",
                    borderTop: "1px dashed #d1d5db",
                    borderLeft: "1px dashed #d1d5db",
                    pointerEvents: "none",
                    zIndex: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: 13, color: "#2563eb", fontWeight: 700, opacity: 0.6 }}>🐂 Plowhorses</span>
                </div>
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: 0,
                    right: "50%",
                    bottom: 0,
                    background: "rgba(254,242,242,0.4)",
                    borderTop: "1px dashed #d1d5db",
                    pointerEvents: "none",
                    zIndex: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: 13, color: "#dc2626", fontWeight: 700, opacity: 0.6 }}>🐕 Dogs</span>
                </div>

                <ResponsiveContainer width="100%" height={320}>
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis
                      dataKey="salesQty"
                      name="Vendas"
                      type="number"
                      label={{ value: "Vendas (un.)", position: "insideBottom", offset: -4, fontSize: 12 }}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      dataKey="grossMargin"
                      name="Margem"
                      type="number"
                      label={{
                        value: "Margem (R$)",
                        angle: -90,
                        position: "insideLeft",
                        offset: 10,
                        fontSize: 12,
                      }}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip content={<QuadrantTooltip />} />
                    <ReferenceLine
                      x={summary.avgSalesThreshold}
                      stroke="#6b7280"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                    />
                    <ReferenceLine
                      y={summary.avgMarginThreshold}
                      stroke="#6b7280"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                    />
                    <Scatter data={scatterData} isAnimationActive={false}>
                      {scatterData.map((entry) => (
                        <Cell
                          key={entry.id}
                          fill={CLASS_CONFIG[entry.menuClass].color}
                          fillOpacity={0.75}
                          stroke={CLASS_CONFIG[entry.menuClass].color}
                          strokeWidth={1.5}
                          r={8}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Filter pills ── */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <button
              className={`filter-pill ${activeFilter === "all" ? "active" : ""}`}
              onClick={() => setActiveFilter("all")}
            >
              Todos ({items.length})
            </button>
            {(["star", "plowhorse", "puzzle", "dog", "none"] as MenuClass[]).map((cls) => {
              const cfg = CLASS_CONFIG[cls]
              const count = items.filter((i) => i.menuClass === cls).length
              if (count === 0) return null
              return (
                <button
                  key={cls}
                  className={`filter-pill ${activeFilter === cls ? "active" : ""}`}
                  onClick={() => setActiveFilter((p) => (p === cls ? "all" : cls))}
                >
                  {cfg.emoji} {cfg.label} ({count})
                </button>
              )
            })}
            <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#6b7280" }}>Ordenar:</span>
              {[
                { key: "totalMargin", label: "Margem Total" },
                { key: "marginPct", label: "Margem %" },
                { key: "salesQty", label: "Vendas" },
                { key: "revenue", label: "Receita" },
              ].map((s) => (
                <button
                  key={s.key}
                  className={`filter-pill ${sortBy === s.key ? "active" : ""}`}
                  onClick={() => setSortBy(s.key as typeof sortBy)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Table header ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "32px 1fr 90px 90px 80px 80px 28px",
              gap: 8,
              padding: "6px 16px",
              fontSize: 11,
              fontWeight: 700,
              color: "#9ca3af",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 4,
            }}
          >
            <span>#</span>
            <span>Produto</span>
            <span>Margem unit.</span>
            <span>CMV%</span>
            <span>Vendas</span>
            <span>Classe</span>
            <span />
          </div>

          {/* ── Product list ── */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
              Nenhum produto nesta categoria.
            </div>
          ) : (
            filtered.map((product, idx) => (
              <ProductRow key={product.id} product={product} rank={idx + 1} />
            ))
          )}

          {/* ── Legend ── */}
          <div
            style={{
              marginTop: 28,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {(["star", "plowhorse", "puzzle", "dog"] as MenuClass[]).map((cls) => {
              const cfg = CLASS_CONFIG[cls]
              const Icon = cls === "star" ? Star : cls === "plowhorse" ? TrendingDown : cls === "puzzle" ? HelpCircle : AlertTriangle
              return (
                <div
                  key={cls}
                  style={{
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    borderRadius: 10,
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <Icon className="h-4 w-4" style={{ color: cfg.color }} />
                    <span style={{ fontWeight: 700, color: cfg.color }}>
                      {cfg.emoji} {cfg.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>{cfg.description}</p>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
