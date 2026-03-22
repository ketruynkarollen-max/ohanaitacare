"use client"

/**
 * RecipeModal — Editor de Ficha Técnica de um produto
 * Permite selecionar ingredientes e definir a quantidade por porção.
 */
import { useEffect, useState } from "react"
import { X, Plus, Trash2, FlaskConical, AlertTriangle } from "lucide-react"
import toast from "react-hot-toast"
import Link from "next/link"

type Ingredient = {
  id: string
  name: string
  unit: string
  unitCost: number
  category: string
}

type RecipeRow = {
  ingredientId: string
  quantity: string  // string para input controlado
}

type RecipeItemData = {
  ingredientId: string
  ingredientName: string
  unit: string
  unitCost: number
  quantity: number
  lineCost: number
}

type Props = {
  productId:   string
  productName: string
  productPrice: number
  onClose:     () => void
  onSaved?:    () => void
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}

const CMV_IDEAL_MIN = 28
const CMV_IDEAL_MAX = 35

export function RecipeModal({ productId, productName, productPrice, onClose, onSaved }: Props) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [rows, setRows]               = useState<RecipeRow[]>([])
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [ingSearch, setIngSearch]     = useState("")

  // Carrega lista global de ingredientes + receita atual do produto
  useEffect(() => {
    async function init() {
      const [ingRes, recipeRes] = await Promise.all([
        fetch("/api/ingredients"),
        fetch(`/api/products/${productId}/recipe`),
      ])
      const ingData: Ingredient[] = ingRes.ok ? await ingRes.json() : []
      const recipeData: { items: RecipeItemData[] } = recipeRes.ok ? await recipeRes.json() : { items: [] }

      setIngredients(ingData)
      setRows(
        recipeData.items.map((item) => ({
          ingredientId: item.ingredientId,
          quantity:     String(item.quantity).replace(".", ","),
        })),
      )
      setLoading(false)
    }
    init()
  }, [productId])

  // Ingredientes disponíveis (não adicionados ainda)
  const usedIds = new Set(rows.map((r) => r.ingredientId))
  const available = ingredients.filter(
    (ing) =>
      !usedIds.has(ing.id) &&
      (!ingSearch.trim() || ing.name.toLowerCase().includes(ingSearch.toLowerCase())),
  )

  const addIngredient = (ingId: string) => {
    setRows((prev) => [...prev, { ingredientId: ingId, quantity: "" }])
    setIngSearch("")
  }

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateQty = (idx: number, val: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, quantity: val } : r)))
  }

  // Calculo inline do custo total
  const totalCost = rows.reduce((sum, row) => {
    const ing = ingredients.find((i) => i.id === row.ingredientId)
    const qty = parseFloat(String(row.quantity).replace(",", "."))
    if (!ing || isNaN(qty)) return sum
    return sum + qty * ing.unitCost
  }, 0)

  const cmvPercent = productPrice > 0 ? (totalCost / productPrice) * 100 : 0

  const cmvColor =
    cmvPercent === 0
      ? "text-slate-400"
      : cmvPercent <= CMV_IDEAL_MAX
      ? cmvPercent >= CMV_IDEAL_MIN
        ? "text-emerald-600"
        : "text-blue-600"
      : "text-red-600"

  const handleSave = async () => {
    // Valida quantidades
    for (const row of rows) {
      const qty = parseFloat(String(row.quantity).replace(",", "."))
      if (isNaN(qty) || qty <= 0) {
        toast.error("Preencha todas as quantidades com valores válidos")
        return
      }
    }
    setSaving(true)
    const res = await fetch(`/api/products/${productId}/recipe`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: rows.map((r) => ({
          ingredientId: r.ingredientId,
          quantity: parseFloat(String(r.quantity).replace(",", ".")),
        })),
      }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success("Ficha técnica salva!")
      onSaved?.()
      onClose()
    } else {
      const err = await res.json()
      toast.error(err.error || "Erro ao salvar")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Ficha técnica — {productName}
            </h2>
            <p className="text-xs text-slate-500">
              Preço de venda: {fmt(productPrice)}
            </p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-12 text-slate-500">
            Carregando...
          </div>
        ) : (
          <>
            {/* Custo em tempo real */}
            <div className="grid grid-cols-3 gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Custo da receita</p>
                <p className="text-lg font-bold text-slate-900">{fmt(totalCost)}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">CMV</p>
                <p className={`text-lg font-bold ${cmvColor}`}>
                  {cmvPercent > 0 ? `${cmvPercent.toFixed(1)}%` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Margem bruta</p>
                <p className="text-lg font-bold text-slate-900">
                  {totalCost > 0 ? fmt(productPrice - totalCost) : "—"}
                </p>
              </div>
            </div>

            {cmvPercent > CMV_IDEAL_MAX && totalCost > 0 && (
              <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-2 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                CMV acima de {CMV_IDEAL_MAX}% — considere revisar o preço ou as quantidades.
                Meta ideal: {CMV_IDEAL_MIN}–{CMV_IDEAL_MAX}%.
              </div>
            )}

            {/* Ingredientes da receita */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {rows.length === 0 ? (
                <div className="py-6 text-center text-slate-400">
                  <FlaskConical className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  <p className="text-sm">Nenhum ingrediente na ficha ainda.</p>
                  <p className="text-xs">Use o campo abaixo para adicionar.</p>
                </div>
              ) : (
                <div className="mb-4 space-y-1">
                  <div className="grid grid-cols-[1fr,100px,100px,36px] gap-2 px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <span>Ingrediente</span>
                    <span className="text-right">Qtd / porção</span>
                    <span className="text-right">Custo linha</span>
                    <span />
                  </div>
                  {rows.map((row, idx) => {
                    const ing = ingredients.find((i) => i.id === row.ingredientId)
                    const qty = parseFloat(String(row.quantity).replace(",", "."))
                    const lineCost = ing && !isNaN(qty) ? qty * ing.unitCost : 0
                    return (
                      <div
                        key={row.ingredientId}
                        className="grid grid-cols-[1fr,100px,100px,36px] items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">{ing?.name}</p>
                          <p className="text-xs text-slate-400">
                            {fmt(ing?.unitCost ?? 0)}/{ing?.unit}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={row.quantity}
                            onChange={(e) => updateQty(idx, e.target.value)}
                            placeholder="0"
                            className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-right text-sm focus:border-primary focus:outline-none"
                          />
                          <span className="text-xs text-slate-400">{ing?.unit}</span>
                        </div>
                        <p className="text-right text-sm font-medium text-slate-700">
                          {lineCost > 0 ? fmt(lineCost) : "—"}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Adicionar ingrediente */}
              {ingredients.length === 0 ? (
                <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
                  Nenhum ingrediente cadastrado ainda.{" "}
                  <Link href="/ingredients" className="font-medium underline" onClick={onClose}>
                    Cadastre na página de Ingredientes
                  </Link>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-medium text-slate-500">
                    <Plus className="mr-1 inline h-3 w-3" />
                    Adicionar ingrediente
                  </p>
                  <input
                    type="text"
                    value={ingSearch}
                    onChange={(e) => setIngSearch(e.target.value)}
                    placeholder="Buscar ingrediente..."
                    className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-primary focus:outline-none"
                  />
                  {ingSearch.trim() && available.length === 0 && (
                    <p className="text-xs text-slate-400">Nenhum ingrediente encontrado.</p>
                  )}
                  {ingSearch.trim() && available.length > 0 && (
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {available.map((ing) => (
                        <button
                          key={ing.id}
                          type="button"
                          onClick={() => addIngredient(ing.id)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-white hover:shadow-sm"
                        >
                          <span className="font-medium text-slate-900">{ing.name}</span>
                          <span className="text-xs text-slate-400">
                            {fmt(ing.unitCost)}/{ing.unit}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? "Salvando..." : "Salvar ficha técnica"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
