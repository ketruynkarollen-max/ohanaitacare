"use client"

/**
 * Gestão de Despesas
 */
import { useEffect, useState } from "react"
import { Plus, Receipt } from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

type Expense = {
  id: string
  description: string
  amount: number
  category: string
  date: string
  notes: string | null
}

const CATEGORIES = [
  { value: "FOOD", label: "Alimentação" },
  { value: "SALARY", label: "Salários" },
  { value: "RENT", label: "Aluguel" },
  { value: "UTILITIES", label: "Contas" },
  { value: "OTHER", label: "Outros" },
]

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ description: "", amount: "", category: "OTHER", notes: "" })

  const loadExpenses = async () => {
    const res = await fetch("/api/expenses")
    if (res.ok) {
      const data = await res.json()
      setExpenses(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadExpenses()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(form.amount.replace(",", "."))
    if (!form.description.trim() || isNaN(amount) || amount <= 0) {
      toast.error("Preencha descrição e valor")
      return
    }
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: form.description.trim(),
        amount,
        category: form.category,
        notes: form.notes.trim() || null,
      }),
    })
    if (res.ok) {
      toast.success("Despesa registrada")
      setShowForm(false)
      setForm({ description: "", amount: "", category: "OTHER", notes: "" })
      loadExpenses()
    } else {
      toast.error("Erro ao registrar")
    }
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const formatPrice = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

  return (
    <div className="page-body">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Despesas</h1>
          <p className="page-subtitle">Registro e acompanhamento de despesas.</p>
        </div>
        <div className="page-header-actions">
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" />
            Nova despesa
          </button>
        </div>
      </div>

      <div className="card-metric">
        <span className="card-metric-label">Total no período</span>
        <div className="card-metric-value">{formatPrice(total)}</div>
      </div>

      {showForm && (
        <div className="panel p-6">
          <h2 className="mb-4 font-semibold text-slate-900">Nova despesa</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Descrição</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Valor (R$)</label>
                <input
                  type="text"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0,00"
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Categoria</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Observações</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-blue-600"
              >
                Registrar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="panel p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="table-header-row">
              <th className="px-4 py-3 text-left">Data</th>
              <th className="px-4 py-3 text-left">Descrição</th>
              <th className="px-4 py-3 text-left">Categoria</th>
              <th className="px-4 py-3 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Carregando...
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                  Nenhuma despesa registrada
                </td>
              </tr>
            ) : (
              expenses.map((e) => (
                <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {format(new Date(e.date), "dd/MM/yyyy", { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{e.description}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {CATEGORIES.find((c) => c.value === e.category)?.label || e.category}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">
                    -{formatPrice(e.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
