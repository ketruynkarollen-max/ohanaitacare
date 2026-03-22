"use client"

/**
 * Gestão de Despesas — com filtros de período, categoria e exportação
 */
import { useEffect, useState, useCallback, useRef } from "react"
import {
  Plus, Receipt, Download, Printer, Pencil,
  Trash2, X, Check, CalendarDays, Filter,
} from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

// ── Tipos ─────────────────────────────────────────────────────────────────────
type Expense = {
  id:          string
  description: string
  amount:      number
  category:    string
  date:        string
  notes:       string | null
}

type Period = "this_month" | "last_month" | "last_30" | "last_7" | "custom"

// ── Constantes ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: "FOOD",      label: "Alimentação / Insumos" },
  { value: "SALARY",    label: "Salários" },
  { value: "RENT",      label: "Aluguel" },
  { value: "UTILITIES", label: "Contas (luz, água, gás)" },
  { value: "OTHER",     label: "Outros" },
]

const CAT_COLORS: Record<string, string> = {
  FOOD:      "bg-orange-100 text-orange-700",
  SALARY:    "bg-blue-100 text-blue-700",
  RENT:      "bg-violet-100 text-violet-700",
  UTILITIES: "bg-cyan-100 text-cyan-700",
  OTHER:     "bg-slate-100 text-slate-600",
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "this_month",  label: "Este mês" },
  { value: "last_month",  label: "Mês passado" },
  { value: "last_30",     label: "Últimos 30 dias" },
  { value: "last_7",      label: "Últimos 7 dias" },
  { value: "custom",      label: "Personalizado" },
]

const BLANK_FORM = { description: "", amount: "", category: "OTHER", notes: "", date: "" }

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function getPeriodDates(period: Period, customFrom: string, customTo: string) {
  const now = new Date()
  let from: string, to: string

  if (period === "this_month") {
    from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
    to   = todayISO()
  } else if (period === "last_month") {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const last = new Date(now.getFullYear(), now.getMonth(), 0)
    from = d.toISOString().slice(0, 10)
    to   = last.toISOString().slice(0, 10)
  } else if (period === "last_30") {
    const d = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)
    from = d.toISOString().slice(0, 10)
    to   = todayISO()
  } else if (period === "last_7") {
    const d = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
    from = d.toISOString().slice(0, 10)
    to   = todayISO()
  } else {
    from = customFrom || todayISO()
    to   = customTo   || todayISO()
  }
  return { from, to }
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function ExpensesPage() {
  const [expenses, setExpenses]     = useState<Expense[]>([])
  const [loading, setLoading]       = useState(true)
  const [period, setPeriod]         = useState<Period>("this_month")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo]     = useState("")
  const [catFilter, setCatFilter]   = useState("ALL")

  // Form nova / edição
  const [showForm, setShowForm]     = useState(false)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [form, setForm]             = useState(BLANK_FORM)
  const [saving, setSaving]         = useState(false)

  // Confirmação de delete
  const [deleteId, setDeleteId]     = useState<string | null>(null)
  const [exporting, setExporting]   = useState(false)

  // ── Carregamento ───────────────────────────────────────────────────────────
  const { from, to } = getPeriodDates(period, customFrom, customTo)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ from, to })
    if (catFilter !== "ALL") params.set("category", catFilter)
    const res = await fetch(`/api/expenses?${params}`)
    if (res.ok) setExpenses(await res.json())
    setLoading(false)
  }, [from, to, catFilter])

  useEffect(() => {
    if (period !== "custom" || (customFrom && customTo)) load()
  }, [period, customFrom, customTo, catFilter, load])

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const openNew = () => {
    setEditingId(null)
    setForm({ ...BLANK_FORM, date: todayISO() })
    setShowForm(true)
  }

  const openEdit = (e: Expense) => {
    setEditingId(e.id)
    setForm({
      description: e.description,
      amount:      String(e.amount).replace(".", ","),
      category:    e.category,
      notes:       e.notes ?? "",
      date:        e.date.slice(0, 10),
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(BLANK_FORM)
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    const amount = parseFloat(String(form.amount).replace(",", "."))
    if (!form.description.trim() || isNaN(amount) || amount <= 0) {
      toast.error("Preencha descrição e valor")
      return
    }
    setSaving(true)
    const url    = editingId ? `/api/expenses/${editingId}` : "/api/expenses"
    const method = editingId ? "PATCH" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: form.description.trim(),
        amount,
        category: form.category,
        notes:    form.notes.trim() || null,
        date:     form.date || todayISO(),
      }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success(editingId ? "Despesa atualizada" : "Despesa registrada")
      closeForm()
      load()
    } else {
      const err = await res.json()
      toast.error(err.error || "Erro ao salvar")
    }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Despesa removida")
      setDeleteId(null)
      load()
    } else {
      toast.error("Erro ao remover")
    }
  }

  // ── Exportação ─────────────────────────────────────────────────────────────
  const handleExportCSV = async () => {
    setExporting(true)
    const params = new URLSearchParams({ from, to })
    if (catFilter !== "ALL") params.set("category", catFilter)
    try {
      const res = await fetch(`/api/expenses/export?${params}`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href     = url
      a.download = `despesas_${from}_${to}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Arquivo gerado — abre no Excel")
    } catch {
      toast.error("Erro ao exportar")
    }
    setExporting(false)
  }

  const handlePrint = () => window.print()

  // ── Totais ─────────────────────────────────────────────────────────────────
  const total = expenses.reduce((s, e) => s + e.amount, 0)

  const byCategory = CATEGORIES.map((c) => ({
    ...c,
    total: expenses.filter((e) => e.category === c.value).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.total > 0)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Estilos de impressão */}
      <style>{`
        @media print {
          aside, .page-header-actions, button, .no-print { display: none !important; }
          body { background: white !important; }
          .panel { box-shadow: none !important; border: 1px solid #ddd !important; }
        }
      `}</style>

      <div className="page-body">
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Despesas</h1>
            <p className="page-subtitle">Registro, filtros por período e exportação para Excel/PDF.</p>
          </div>
          <div className="page-header-actions no-print">
            <button onClick={handleExportCSV} disabled={exporting || expenses.length === 0} className="btn-secondary">
              <Download className="h-4 w-4" />
              {exporting ? "Exportando..." : "Excel (CSV)"}
            </button>
            <button onClick={handlePrint} disabled={expenses.length === 0} className="btn-secondary">
              <Printer className="h-4 w-4" />
              Imprimir / PDF
            </button>
            <button onClick={openNew} className="btn-primary">
              <Plus className="h-4 w-4" />
              Nova despesa
            </button>
          </div>
        </div>

        {/* ── Filtros de período ──────────────────────────────────────────── */}
        <div className="panel space-y-3 no-print">
          <div className="flex flex-wrap items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-500" />
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
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">De</span>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-primary focus:outline-none"
                />
                <span className="text-sm text-slate-600">até</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Filtro de categoria */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <button
              onClick={() => setCatFilter("ALL")}
              className={`filter-pill ${catFilter === "ALL" ? "filter-pill-active" : "filter-pill-inactive"}`}
            >
              Todas as categorias
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCatFilter(c.value)}
                className={`filter-pill ${catFilter === c.value ? "filter-pill-active" : "filter-pill-inactive"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Cards de KPIs ─────────────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total do período */}
          <div className="card-metric">
            <div className="flex items-center justify-between">
              <span className="card-metric-label">Total no período</span>
              <div className="rounded-full bg-red-100 p-1.5">
                <Receipt className="h-4 w-4 text-red-500" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-semibold text-red-600">{fmt(total)}</p>
            <p className="mt-1 text-[11px] text-slate-500">
              {expenses.length} {expenses.length === 1 ? "despesa" : "despesas"}
              {" · "}
              {period === "this_month" ? "Este mês"
                : period === "last_month" ? "Mês passado"
                : period === "last_30" ? "Últimos 30 dias"
                : period === "last_7" ? "Últimos 7 dias"
                : `${from} a ${to}`}
            </p>
          </div>

          {/* Subtotais por categoria (até 3) */}
          {byCategory.slice(0, 3).map((c) => (
            <div key={c.value} className="card-metric">
              <span className="card-metric-label">{c.label}</span>
              <p className="mt-3 text-xl font-semibold text-slate-900">{fmt(c.total)}</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-red-300 transition-all"
                  style={{ width: total > 0 ? `${(c.total / total) * 100}%` : "0%" }}
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                {total > 0 ? `${((c.total / total) * 100).toFixed(0)}% do total` : "—"}
              </p>
            </div>
          ))}
        </div>

        {/* ── Tabela de despesas ─────────────────────────────────────────────── */}
        <div className="panel p-0 overflow-hidden">
          {/* Cabeçalho da tabela */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Despesas
              {" "}
              <span className="text-slate-400 font-normal">
                ({from === to ? format(new Date(from + "T12:00"), "dd/MM/yyyy") : `${format(new Date(from + "T12:00"), "dd/MM")} a ${format(new Date(to + "T12:00"), "dd/MM/yyyy")}`})
              </span>
            </h2>
          </div>

          <table className="w-full">
            <thead>
              <tr className="table-header-row">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Data</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Descrição</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Categoria</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 no-print">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">Carregando...</td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    Nenhuma despesa encontrada no período.
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {format(new Date(e.date + (e.date.length === 10 ? "T12:00" : "")), "dd/MM/yyyy", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{e.description}</p>
                      {e.notes && <p className="text-xs text-slate-400">{e.notes}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${CAT_COLORS[e.category] ?? "bg-slate-100 text-slate-600"}`}>
                        {CATEGORIES.find((c) => c.value === e.category)?.label ?? e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">
                      -{fmt(e.amount)}
                    </td>
                    <td className="px-4 py-3 no-print">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(e)}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {deleteId === e.id ? (
                          <>
                            <button onClick={() => handleDelete(e.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50">
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setDeleteId(null)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <button onClick={() => setDeleteId(e.id)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {expenses.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-slate-700">
                    Total — {expenses.length} {expenses.length === 1 ? "despesa" : "despesas"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-red-600">
                    -{fmt(total)}
                  </td>
                  <td className="no-print" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* ── Resumo por categoria (visível na impressão) ───────────────────── */}
        {byCategory.length > 0 && (
          <div className="panel">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Resumo por categoria</h3>
            <div className="space-y-2">
              {byCategory.sort((a, b) => b.total - a.total).map((c) => (
                <div key={c.value} className="flex items-center gap-3">
                  <div className="w-40 shrink-0">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${CAT_COLORS[c.value] ?? ""}`}>
                      {c.label}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-red-400 transition-all"
                          style={{ width: `${(c.total / total) * 100}%` }}
                        />
                      </div>
                      <span className="w-16 text-right text-sm font-semibold text-slate-900">{fmt(c.total)}</span>
                      <span className="w-10 text-right text-xs text-slate-400">
                        {((c.total / total) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal de formulário ────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                {editingId ? "Editar despesa" : "Nova despesa"}
              </h2>
              <button onClick={closeForm} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Descrição *</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Ex: Compra de carne — açougue Central"
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:border-primary focus:outline-none"
                  required
                  autoFocus
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Valor (R$) *</label>
                  <input
                    type="text"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="0,00"
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Data *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:border-primary focus:outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Categoria</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:border-primary focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Observações</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Fornecedor, nota fiscal, etc."
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:border-primary focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeForm} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? "Salvando..." : editingId ? "Salvar" : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
