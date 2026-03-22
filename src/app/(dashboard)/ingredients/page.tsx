"use client"

/**
 * Ingredientes — Despensa / base de insumos
 * Cadastro de todos os ingredientes com unidade de medida e custo unitário.
 * São usados nas fichas técnicas dos produtos para calcular o CMV.
 */
import { useEffect, useState } from "react"
import {
  Plus, Search, Pencil, Trash2, FlaskConical, X, Check,
} from "lucide-react"
import toast from "react-hot-toast"

type Ingredient = {
  id: string
  name: string
  unit: string
  unitCost: number
  category: string
  _count?: { recipeItems: number }
}

const UNITS = [
  { value: "kg",  label: "kg  — quilograma" },
  { value: "g",   label: "g   — grama" },
  { value: "L",   label: "L   — litro" },
  { value: "ml",  label: "ml  — mililitro" },
  { value: "un",  label: "un  — unidade" },
  { value: "pct", label: "pct — pacote" },
  { value: "cx",  label: "cx  — caixa" },
  { value: "pç",  label: "pç  — porção" },
]

const ING_CATEGORIES: { value: string; label: string }[] = [
  { value: "MEAT",       label: "Carnes e proteínas" },
  { value: "VEGETABLE",  label: "Hortifruti" },
  { value: "DAIRY",      label: "Laticínios" },
  { value: "GRAIN",      label: "Grãos e massas" },
  { value: "BEVERAGE",   label: "Bebidas" },
  { value: "SEASONING",  label: "Temperos e condimentos" },
  { value: "PACKAGING",  label: "Embalagens" },
  { value: "OTHER",      label: "Outros" },
]

const CAT_COLORS: Record<string, string> = {
  MEAT:      "bg-red-100 text-red-700",
  VEGETABLE: "bg-emerald-100 text-emerald-700",
  DAIRY:     "bg-blue-100 text-blue-700",
  GRAIN:     "bg-amber-100 text-amber-700",
  BEVERAGE:  "bg-cyan-100 text-cyan-700",
  SEASONING: "bg-violet-100 text-violet-700",
  PACKAGING: "bg-slate-100 text-slate-600",
  OTHER:     "bg-slate-100 text-slate-600",
}

const BLANK = { name: "", unit: "un", unitCost: "", category: "OTHER" }

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState("")
  const [catFilter, setCatFilter]     = useState("ALL")
  const [showForm, setShowForm]       = useState(false)
  const [editId, setEditId]           = useState<string | null>(null)
  const [form, setForm]               = useState(BLANK)
  const [saving, setSaving]           = useState(false)
  const [deleteId, setDeleteId]       = useState<string | null>(null)

  const load = async () => {
    const res = await fetch("/api/ingredients")
    if (res.ok) setIngredients(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = ingredients.filter((ing) => {
    const matchSearch =
      !search.trim() ||
      ing.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === "ALL" || ing.category === catFilter
    return matchSearch && matchCat
  })

  const grouped = filtered.reduce<Record<string, Ingredient[]>>((acc, ing) => {
    const cat = ing.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(ing)
    return acc
  }, {})

  const openNew = () => {
    setEditId(null)
    setForm(BLANK)
    setShowForm(true)
  }

  const openEdit = (ing: Ingredient) => {
    setEditId(ing.id)
    setForm({
      name:     ing.name,
      unit:     ing.unit,
      unitCost: String(ing.unitCost).replace(".", ","),
      category: ing.category,
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditId(null)
    setForm(BLANK)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cost = parseFloat(String(form.unitCost).replace(",", "."))
    if (!form.name.trim() || isNaN(cost) || cost < 0) {
      toast.error("Preencha nome e custo corretamente")
      return
    }
    setSaving(true)
    const url    = editId ? `/api/ingredients/${editId}` : "/api/ingredients"
    const method = editId ? "PATCH" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, unit: form.unit, unitCost: cost, category: form.category }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success(editId ? "Ingrediente atualizado" : "Ingrediente criado")
      closeForm()
      load()
    } else {
      const err = await res.json()
      toast.error(err.error || "Erro ao salvar")
    }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/ingredients/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Ingrediente removido")
      setDeleteId(null)
      load()
    } else {
      toast.error("Erro ao remover")
    }
  }

  const inUseCount = ingredients.filter((i) => (i._count?.recipeItems ?? 0) > 0).length

  return (
    <div className="page-body">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Ingredientes</h1>
          <p className="page-subtitle">
            Base de insumos com custo unitário — usados nas fichas técnicas dos pratos.
          </p>
        </div>
        <div className="page-header-actions">
          <button onClick={openNew} className="btn-primary">
            <Plus className="h-4 w-4" />
            Novo ingrediente
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-4">
        <div className="card-metric flex-1 min-w-[140px]">
          <span className="card-metric-label">Total cadastrado</span>
          <p className="card-metric-value">{ingredients.length}</p>
        </div>
        <div className="card-metric flex-1 min-w-[140px]">
          <span className="card-metric-label">Usados em receitas</span>
          <p className="mt-3 text-2xl font-semibold text-emerald-700">{inUseCount}</p>
        </div>
        <div className="card-metric flex-1 min-w-[140px]">
          <span className="card-metric-label">Sem uso em receitas</span>
          <p className="mt-3 text-2xl font-semibold text-amber-600">
            {ingredients.length - inUseCount}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="panel flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCatFilter("ALL")}
          className={`filter-pill ${catFilter === "ALL" ? "filter-pill-active" : "filter-pill-inactive"}`}
        >
          Todos
        </button>
        {ING_CATEGORIES.map((c) => {
          const count = ingredients.filter((i) => i.category === c.value).length
          if (count === 0) return null
          return (
            <button
              key={c.value}
              onClick={() => setCatFilter(c.value)}
              className={`filter-pill ${catFilter === c.value ? "filter-pill-active" : "filter-pill-inactive"}`}
            >
              {c.label.split(" — ")[0]}
              <span className="ml-1 opacity-70">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ingrediente..."
          className="input-search"
        />
      </div>

      {/* Tabela agrupada por categoria */}
      {loading ? (
        <div className="panel p-8 text-center text-slate-500">Carregando ingredientes...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <FlaskConical className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-slate-500">Nenhum ingrediente encontrado.</p>
          {ingredients.length === 0 && (
            <p className="mt-1 text-sm text-slate-400">
              Cadastre seus insumos para calcular o CMV dos pratos.
            </p>
          )}
        </div>
      ) : (
        <div className="panel p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="table-header-row border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Ingrediente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Unidade</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Custo unitário</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Em receitas</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([cat, ings]) => (
                <>
                  <tr key={cat} className="bg-slate-50">
                    <td colSpan={5} className="px-4 py-2 text-xs font-semibold uppercase text-slate-600">
                      {ING_CATEGORIES.find((c) => c.value === cat)?.label || cat}
                    </td>
                  </tr>
                  {ings.map((ing) => (
                    <tr key={ing.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{ing.name}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {ing.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {fmt(ing.unitCost)}
                        <span className="ml-1 text-xs text-slate-400">/{ing.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {ing._count?.recipeItems
                          ? <span className="text-emerald-600">{ing._count.recipeItems} prato{ing._count.recipeItems > 1 ? "s" : ""}</span>
                          : <span className="text-slate-400">nenhum</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(ing)}
                            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {deleteId === ing.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(ing.id)}
                                className="rounded p-1.5 text-red-600 hover:bg-red-50"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleteId(null)}
                                className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteId(ing.id)}
                              className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                {editId ? "Editar ingrediente" : "Novo ingrediente"}
              </h2>
              <button onClick={closeForm} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Filé de frango"
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:border-primary focus:outline-none"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Unidade de medida *</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:border-primary focus:outline-none"
                  >
                    {UNITS.map((u) => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Custo por {form.unit} (R$) *
                  </label>
                  <input
                    type="text"
                    value={form.unitCost}
                    onChange={(e) => setForm((f) => ({ ...f, unitCost: e.target.value }))}
                    placeholder="0,00"
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
                  {ING_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeForm} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? "Salvando..." : editId ? "Salvar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
