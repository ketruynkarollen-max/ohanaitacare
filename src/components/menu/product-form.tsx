"use client"

/**
 * Formulário de Produto (criar ou editar)
 */
import { useState, useEffect } from "react"
import { X } from "lucide-react"

type Category = {
  id: string
  name: string
  _count?: { products: number }
}

type Product = {
  id: string
  name: string
  description: string | null
  price: number
  image: string | null
  position: number
  active: boolean
  featured: boolean
  category: { id: string; name: string }
  trackStock?: boolean
  stockQty?: number
  alertQty?: number
  preparationTime?: number
}

type Props = {
  product?: Product | null
  categories: Category[]
  categoryId?: string
  onClose: () => void
  onSuccess: () => void
}

export function ProductForm({
  product,
  categories,
  categoryId,
  onClose,
  onSuccess,
}: Props) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [image, setImage] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId || "")
  const [featured, setFeatured] = useState(false)
  const [active, setActive] = useState(true)
  const [trackStock, setTrackStock] = useState(false)
  const [stockQty, setStockQty] = useState("0")
  const [alertQty, setAlertQty] = useState("5")
  const [preparationTime, setPreparationTime] = useState("15")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const isEditing = !!product

  useEffect(() => {
    if (product) {
      setName(product.name)
      setDescription(product.description || "")
      setPrice(String(product.price))
      setImage(product.image || "")
      setSelectedCategoryId(product.category.id)
      setFeatured(product.featured)
      setActive(product.active)
      setTrackStock(product.trackStock ?? false)
      setStockQty(String(product.stockQty ?? 0))
      setAlertQty(String(product.alertQty ?? 5))
      setPreparationTime(String(product.preparationTime ?? 15))
    } else if (categoryId) {
      setSelectedCategoryId(categoryId)
    } else if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id)
    }
  }, [product, categoryId, categories])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const priceNum = parseFloat(price.replace(",", "."))
    if (isNaN(priceNum) || priceNum < 0) {
      setError("Preço inválido")
      setLoading(false)
      return
    }

    try {
      const url = isEditing ? `/api/products/${product!.id}` : "/api/products"
      const method = isEditing ? "PATCH" : "POST"
      const body = isEditing
        ? {
            name: name.trim(),
            description: description.trim() || null,
            price: priceNum,
            image: image.trim() || null,
            categoryId: selectedCategoryId,
            featured,
            active,
            trackStock,
            stockQty: parseInt(stockQty, 10) || 0,
            alertQty: parseInt(alertQty, 10) || 5,
            preparationTime: parseInt(preparationTime, 10) || 15,
          }
        : {
            name: name.trim(),
            description: description.trim() || null,
            price: priceNum,
            image: image.trim() || null,
            categoryId: selectedCategoryId,
            featured,
            active,
            trackStock,
            stockQty: parseInt(stockQty, 10) || 0,
            alertQty: parseInt(alertQty, 10) || 5,
            preparationTime: parseInt(preparationTime, 10) || 15,
          }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erro ao salvar")
      } else {
        onSuccess()
      }
    } catch {
      setError("Erro de conexão")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4">
      <div className="my-8 w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isEditing ? "Editar produto" : "Novo produto"}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-900/30 p-3 text-sm text-red-400">{error}</div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Nome do produto *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Salmão Teriyaki"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição do prato"
              rows={2}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Preço (R$) *
              </label>
              <input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Categoria *
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              >
                <option value="">Selecione</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr,120px] sm:items-end">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                URL da imagem (opcional)
              </label>
              <input
                type="url"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-medium text-slate-400">
                Pré-visualização
              </span>
              <div className="h-20 w-20 overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
                {image ? (
                  <img
                    src={image}
                    alt={name || "Pré-visualização"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                    sem foto
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-primary focus:ring-primary"
              />
              <span className="text-sm text-slate-300">Destaque</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-primary focus:ring-primary"
              />
              <span className="text-sm text-slate-300">Ativo</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={trackStock}
                onChange={(e) => setTrackStock(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-primary focus:ring-primary"
              />
              <span className="text-sm text-slate-300">Controlar estoque</span>
            </label>
          </div>

          {trackStock && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">
                  Quantidade em estoque
                </label>
                <input
                  type="number"
                  min={0}
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">
                  Alerta (estoque mínimo)
                </label>
                <input
                  type="number"
                  min={0}
                  value={alertQty}
                  onChange={(e) => setAlertQty(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Tempo de preparo (minutos)
            </label>
            <input
              type="number"
              min={1}
              value={preparationTime}
              onChange={(e) => setPreparationTime(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
