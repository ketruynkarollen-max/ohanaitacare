"use client"

import { Fragment } from "react"

/**
 * Inventário - Controle de estoque por produto
 * Similar ao OlaClick: filtros por status, toggle de controle, ajuste de quantidade
 * e seleção rápida de disponibilidade (Disponível / Fora de estoque).
 */
import { useEffect, useState } from "react"
import { Search, Filter, Package, AlertTriangle, ChevronDown } from "lucide-react"
import { StockAdjustModal } from "@/components/inventory/stock-adjust-modal"

type Product = {
  id: string
  name: string
  active: boolean
  trackStock: boolean
  stockQty: number
  alertQty: number
  category: { id: string; name: string }
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "available" | "alert" | "out">("all")
  const [loading, setLoading] = useState(true)
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null)
  const [availabilityOpenId, setAvailabilityOpenId] = useState<string | null>(null)

  const loadProducts = async () => {
    const res = await fetch("/api/products")
    if (res.ok) {
      const data = await res.json()
      setProducts(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const toggleTrackStock = async (product: Product) => {
    const res = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackStock: !product.trackStock }),
    })
    if (res.ok) loadProducts()
  }

  const changeAvailability = async (product: Product, active: boolean) => {
    // Atualiza flag "active" do produto e, opcionalmente, zera estoque ao marcar como fora de estoque
    const body: Record<string, unknown> = { active }
    if (!active && product.trackStock) {
      body.stockQty = 0
    }

    const res = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setAvailabilityOpenId(null)
      loadProducts()
    }
  }

  const filtered = products.filter((p) => {
    const matchSearch =
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase())
    if (!matchSearch) return false

    if (!p.trackStock) return filter === "all"

    if (filter === "available") return p.stockQty > p.alertQty
    if (filter === "alert") return p.stockQty > 0 && p.stockQty <= p.alertQty
    if (filter === "out") return p.stockQty === 0

    return true
  })

  const groupedByCategory = filtered.reduce<Record<string, Product[]>>((acc, p) => {
    const cat = p.category.name
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})

  const stats = {
    available: products.filter((p) => p.trackStock && p.stockQty > p.alertQty).length,
    alert: products.filter((p) => p.trackStock && p.stockQty > 0 && p.stockQty <= p.alertQty).length,
    out: products.filter((p) => p.trackStock && p.stockQty === 0).length,
  }

  return (
    <div className="page-body">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Inventário</h1>
          <p className="page-subtitle">Controle de estoque por produto e alertas.</p>
        </div>
      </div>

      <div className="panel flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-slate-500" />
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Filtros</span>
        <button
          onClick={() => setFilter("available")}
          className={`filter-pill ${filter === "available" ? "bg-emerald-600 text-white" : "filter-pill-inactive"}`}
        >
          {stats.available} Disponível
          {stats.alert > 0 && (
            <span className="ml-1 opacity-90">({stats.alert} Alerta)</span>
          )}
        </button>
        <button
          onClick={() => setFilter("alert")}
          className={`filter-pill ${filter === "alert" ? "bg-amber-600 text-white" : "filter-pill-inactive"}`}
        >
          {stats.alert} Alerta
        </button>
        <button
          onClick={() => setFilter("out")}
          className={`filter-pill ${filter === "out" ? "bg-red-600 text-white" : "filter-pill-inactive"}`}
        >
          {stats.out} Esgotado
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`filter-pill ${filter === "all" ? "filter-pill-active" : "filter-pill-inactive"}`}
        >
          Todos
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Procure um produto"
          className="input-search"
        />
      </div>

      <div className="panel p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="table-header-row border-b border-slate-200">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Produtos
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Controle de estoque
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Disponibilidade
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Carregando...
                </td>
              </tr>
            ) : (
              Object.entries(groupedByCategory).map(([category, prods]) => (
                <Fragment key={category}>
                  <tr className="bg-slate-50">
                    <td colSpan={4} className="px-4 py-2 text-xs font-semibold uppercase text-slate-600">
                      {category}
                    </td>
                  </tr>
                  {prods.map((prod) => (
                    <tr
                      key={prod.id}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-slate-500" />
                          <span className="font-medium">{prod.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleTrackStock(prod)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                            prod.trackStock ? "bg-primary" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                              prod.trackStock ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative inline-flex">
                          <button
                            type="button"
                            onClick={() =>
                              setAvailabilityOpenId((prev) => (prev === prod.id ? null : prod.id))
                            }
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium border ${
                              prod.active
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                : "border-slate-300 bg-slate-100 text-slate-600"
                            }`}
                          >
                            <span>{prod.active ? "Disponível" : "Fora de estoque"}</span>
                            <ChevronDown className="h-3 w-3" />
                          </button>

                          {availabilityOpenId === prod.id && (
                            <div className="absolute z-10 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg">
                              <button
                                type="button"
                                onClick={() => changeAvailability(prod, true)}
                                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-emerald-700 hover:bg-emerald-50"
                              >
                                <span>Disponível</span>
                                {prod.trackStock && prod.stockQty > 0 && (
                                  <span className="text-xs text-emerald-600">
                                    {prod.stockQty}
                                  </span>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => changeAvailability(prod, false)}
                                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50"
                              >
                                <span>Fora de estoque</span>
                                {prod.trackStock && prod.stockQty > 0 && (
                                  <span className="text-xs text-slate-500">
                                    zera estoque
                                  </span>
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        {prod.trackStock && (
                          <div className="mt-1 text-xs text-slate-500">
                            {prod.stockQty === 0 ? (
                              <span className="text-red-600">Esgotado</span>
                            ) : prod.stockQty <= prod.alertQty ? (
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <AlertTriangle className="h-3 w-3" />
                                {prod.stockQty} em estoque (alerta)
                              </span>
                            ) : (
                              <span>{prod.stockQty} em estoque</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {prod.trackStock && (
                          <button
                            onClick={() => setAdjustingProduct(prod)}
                            className="text-sm text-primary hover:underline"
                          >
                            Ajustar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {Object.keys(groupedByCategory).length === 0 && !loading && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center text-slate-500 shadow-sm">
          Nenhum produto encontrado. Ative o controle de estoque nos produtos do cardápio.
        </div>
      )}

      {adjustingProduct && (
        <StockAdjustModal
          product={adjustingProduct}
          onClose={() => setAdjustingProduct(null)}
          onSuccess={() => {
            setAdjustingProduct(null)
            loadProducts()
          }}
        />
      )}
    </div>
  )
}
