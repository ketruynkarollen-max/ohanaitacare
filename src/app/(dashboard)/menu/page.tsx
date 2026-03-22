"use client"

/**
 * Página do Cardápio
 * Layout inspirado no painel do OlaClick:
 * - Abas horizontais de categorias
 * - Lista de produtos com fotos; ao clicar abre painel tipo comanda com informações do produto
 */
import { useEffect, useState } from "react"
import { Plus, GripVertical, Pencil, Trash2, Star, Eye, EyeOff, X, Camera, MoreVertical, ChevronDown } from "lucide-react"
import toast from "react-hot-toast"
import { CategoryForm } from "@/components/menu/category-form"
import { ProductForm } from "@/components/menu/product-form"
import { ConfirmModal } from "@/components/ui/confirm-modal"

const DEFAULT_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80"

type Category = {
  id: string
  name: string
  description: string | null
  position: number
  active: boolean
  _count: { products: number }
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
}

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null)
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null)
  const [showOnlyActive, setShowOnlyActive] = useState(true)
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null)

  const getProductImage = (prod: Product) => prod.image?.trim() || DEFAULT_PRODUCT_IMAGE

  const loadCategories = async () => {
    const res = await fetch("/api/categories")
    if (res.ok) {
      const data = await res.json()
      setCategories(data)
      if (data.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(data[0].id)
      }
    }
  }

  const loadProducts = async () => {
    const url = selectedCategoryId
      ? `/api/products?categoryId=${selectedCategoryId}`
      : "/api/products"
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      setProducts(data)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    loadProducts()
  }, [selectedCategoryId])

  useEffect(() => {
    setLoading(false)
  }, [])

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId)

  const handleCategoryCreated = () => {
    setShowCategoryForm(false)
    loadCategories()
  }

  const handleCategoryUpdated = () => {
    setEditingCategory(null)
    loadCategories()
  }

  const handleCategoryDeleted = async (id: string) => {
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Categoria excluída")
      setDeleteCategoryId(null)
      if (selectedCategoryId === id) setSelectedCategoryId(null)
      loadCategories()
      loadProducts()
    } else {
      toast.error("Erro ao excluir categoria")
    }
  }

  const handleProductCreated = () => {
    setShowProductForm(false)
    loadProducts()
  }

  const handleProductUpdated = () => {
    setEditingProduct(null)
    loadProducts()
  }

  const handleProductDeleted = async (id: string) => {
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Produto excluído")
      setDeleteProductId(null)
      loadProducts()
    } else {
      toast.error("Erro ao excluir produto")
    }
  }

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)

  const visibleProducts = showOnlyActive
    ? products.filter((p) => p.active)
    : products

  return (
    <div className="page-body">
      {/* Topo */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Cardápio</h1>
          <p className="page-subtitle">
            Organize categorias, produtos, destaque e visibilidade do menu PDV.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            onClick={() => setShowOnlyActive((prev) => !prev)}
            className="btn-secondary"
          >
            {showOnlyActive ? (
              <>
                <Eye className="h-4 w-4" />
                Apenas ativos
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4" />
                Mostrando todos
              </>
            )}
          </button>
          <button
            onClick={() => {
              setEditingCategory(null)
              setShowCategoryForm(true)
            }}
            className="btn-secondary"
          >
            <Plus className="h-4 w-4" />
            Nova categoria
          </button>
          <button
            onClick={() => {
              setEditingProduct(null)
              setShowProductForm(true)
            }}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" />
            Novo produto
          </button>
        </div>
      </div>

      {/* Abas horizontais de categorias (estilo OlaClick) */}
      <div className="overflow-x-auto panel">
        <div className="flex min-w-max items-center gap-2 px-4 py-2">
          {categories.map((cat) => {
            const isActive = selectedCategoryId === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`relative flex flex-col items-start rounded-lg px-3 py-2 text-xs font-medium transition ${
                  isActive ? "bg-primary text-white shadow-sm" : "bg-transparent text-slate-600 hover:bg-accent-light"
                }`}
              >
                <span className="truncate max-w-[140px]">{cat.name}</span>
                <span className={`text-[10px] ${isActive ? "text-white/70" : "text-slate-400"}`}>
                  {cat._count.products} produto{cat._count.products !== 1 && "s"}
                </span>
                {isActive && (
                  <span className="absolute inset-x-1 -bottom-1 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Cabeçalho da categoria selecionada */}
      {selectedCategory && (
        <div className="panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Categoria em destaque</span>
                {selectedCategory.active ? (
                  <span className="badge-pill badge-success">Visível</span>
                ) : (
                  <span className="badge-pill badge-neutral">Oculta</span>
                )}
              </div>
              <h2 className="text-lg font-semibold text-slate-900">{selectedCategory.name}</h2>
              {selectedCategory.description && (
                <p className="text-xs text-slate-500">{selectedCategory.description}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">
                {selectedCategory._count.products} itens nesta categoria
              </span>
              <button
                onClick={() => setEditingCategory(selectedCategory)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </button>
              <button
                onClick={() => setDeleteCategoryId(selectedCategory.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600 hover:bg-red-100 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de produtos estilo tabela */}
      <div className="panel p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <div className="flex items-center gap-3">
            <span className="w-4" />
            <span className="w-20">Foto</span>
            <span className="flex-1">Nome do produto</span>
          </div>
          <div className="flex items-center gap-8">
            <span className="w-24 text-right">Preço</span>
            <span className="w-20 text-center">Destaque</span>
            <span className="w-20 text-center">Status</span>
            <span className="w-24 text-right">Ações</span>
          </div>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">Carregando...</div>
        ) : visibleProducts.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            Nenhum produto para os filtros selecionados. Clique em &quot;Novo produto&quot; para
            adicionar.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {visibleProducts.map((prod) => (
              <li
                key={prod.id}
                role="button"
                tabIndex={0}
                onClick={() => setViewingProduct(prod)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setViewingProduct(prod)
                  }
                }}
                className="flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-accent-light/40 focus:bg-accent-light/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
              >
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-400" aria-hidden />
                <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 shadow-sm">
                  <img
                    src={getProductImage(prod)}
                    alt={prod.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-900">
                      {prod.name}
                    </span>
                    {prod.featured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        Destaque
                      </span>
                    )}
                  </div>
                  {prod.description && (
                    <p className="truncate text-xs text-slate-500">{prod.description}</p>
                  )}
                </div>

                <div className="w-24 shrink-0 text-right text-sm font-medium text-slate-900">
                  {formatPrice(prod.price)}
                </div>

                <div className="w-20 shrink-0 text-center text-xs text-slate-500">
                  {prod.featured ? "Sim" : "—"}
                </div>

                <div className="w-20 shrink-0 text-center text-xs">
                  {prod.active ? (
                    <span className="badge-pill badge-success">Ativo</span>
                  ) : (
                    <span className="badge-pill badge-neutral">Oculto</span>
                  )}
                </div>

                <div className="flex w-24 shrink-0 justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setEditingProduct(prod)}
                    className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteProductId(prod.id)}
                    className="rounded bg-red-50 p-1.5 text-red-600 hover:bg-red-100 hover:text-red-700"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Painel Editar produto – visual OlaClick (comanda) */}
      {viewingProduct && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/60"
            aria-hidden
            onClick={() => setViewingProduct(null)}
          />
          <div
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="comanda-title"
          >
            {/* Cabeçalho: título + ícones */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 id="comanda-title" className="text-lg font-semibold text-slate-900">
                Editar produto
              </h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Favorito"
                >
                  <Star className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Mais opções"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewingProduct(null)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Foto grande com ícone de câmera */}
              <div className="relative w-full shrink-0 bg-slate-100">
                <div className="aspect-square w-full overflow-hidden">
                  <img
                    src={getProductImage(viewingProduct)}
                    alt={viewingProduct.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md">
                  <Camera className="h-5 w-5 text-slate-600" />
                </div>
              </div>

              <div className="space-y-5 p-5">
                {/* Nome */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">
                    Nome
                  </label>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-900">
                    {viewingProduct.name}
                  </div>
                </div>

                {/* Descrição */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">
                    Descrição
                  </label>
                  <div className="min-h-[72px] rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-700">
                    {viewingProduct.description || "—"}
                  </div>
                </div>

                {/* Preço: abas Simples / Variantes + valor + Disponível */}
                <div>
                  <div className="mb-2 flex gap-1 rounded-lg bg-slate-100 p-1">
                    <span className="flex-1 rounded-md bg-white py-1.5 text-center text-xs font-medium text-slate-900 shadow-sm">
                      Simples
                    </span>
                    <span className="flex-1 py-1.5 text-center text-xs font-medium text-slate-500">
                      Variantes
                    </span>
                  </div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">
                    Preço
                  </label>
                  <div className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-lg font-semibold text-slate-900">
                    {formatPrice(viewingProduct.price)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium ${
                        viewingProduct.active
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {viewingProduct.active ? "Disponível" : "Indisponível"}
                      <ChevronDown className="h-3.5 w-3.5" />
                    </span>
                    <span className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500">
                      + Desconto
                    </span>
                    <span className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500">
                      + Custo
                    </span>
                    <span className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500">
                      + Embalagem
                    </span>
                    <span className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500">
                      + SKU
                    </span>
                  </div>
                </div>

                {/* Controle de estoque */}
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/30 px-4 py-3">
                  <span className="text-sm font-medium text-slate-700">
                    Controle de estoque
                  </span>
                  <div
                    className={`h-6 w-11 shrink-0 rounded-full transition ${
                      viewingProduct.trackStock ? "bg-blue-500" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`mt-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                        viewingProduct.trackStock ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                </div>
                {viewingProduct.trackStock && (
                  <p className="text-xs text-slate-500">
                    Estoque: {viewingProduct.stockQty ?? 0} un.
                  </p>
                )}

                {/* Adicionar modificador */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/30 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-slate-700">
                        Adicionar modificador
                      </span>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Ingredientes, sabores, talheres...
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      0
                    </span>
                  </div>
                </div>

                {/* Cozinha */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">
                    Cozinha
                  </label>
                  <p className="text-xs text-slate-500">
                    Selecione a área onde você prepara seu produto (opcional).
                  </p>
                  <div className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-700">
                    Cozinha principal
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé: Editar + Fechar */}
            <div className="flex shrink-0 gap-3 border-t border-slate-200 p-4">
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(viewingProduct)
                  setViewingProduct(null)
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </button>
              <button
                type="button"
                onClick={() => setViewingProduct(null)}
                className="flex flex-1 items-center justify-center rounded-xl bg-slate-800 py-3 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modais de formulário */}
      {showCategoryForm && (
        <CategoryForm
          onClose={() => setShowCategoryForm(false)}
          onSuccess={handleCategoryCreated}
        />
      )}
      {editingCategory && (
        <CategoryForm
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSuccess={handleCategoryUpdated}
        />
      )}
      {showProductForm && (
        <ProductForm
          categories={categories}
          categoryId={selectedCategoryId ?? undefined}
          onClose={() => setShowProductForm(false)}
          onSuccess={handleProductCreated}
        />
      )}
      {editingProduct && (
        <ProductForm
          product={editingProduct}
          categories={categories}
          onClose={() => setEditingProduct(null)}
          onSuccess={handleProductUpdated}
        />
      )}
      <ConfirmModal
        open={!!deleteCategoryId}
        title="Excluir categoria"
        message="Os produtos desta categoria serão movidos ou excluídos. Deseja continuar?"
        confirmLabel="Excluir"
        onConfirm={() => deleteCategoryId && handleCategoryDeleted(deleteCategoryId)}
        onCancel={() => setDeleteCategoryId(null)}
      />
      <ConfirmModal
        open={!!deleteProductId}
        title="Excluir produto"
        message="Tem certeza que deseja excluir este produto?"
        confirmLabel="Excluir"
        onConfirm={() => deleteProductId && handleProductDeleted(deleteProductId)}
        onCancel={() => setDeleteProductId(null)}
      />
    </div>
  )
}
