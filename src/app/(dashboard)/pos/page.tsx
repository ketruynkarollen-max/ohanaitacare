"use client"

/**
 * PDV - Ponto de Venda
 * Mesa, balcão, delivery. Variações, addons, cupom.
 */
import { useEffect, useState } from "react"
import { Plus, Minus, Trash2, ShoppingCart } from "lucide-react"
import toast from "react-hot-toast"

type ProductVariation = { id: string; name: string; price: number }
type Addon = { id: string; name: string; price: number }
type AddonGroup = { id: string; name: string; addons: Addon[] }

type Category = { id: string; name: string }
type Product = {
  id: string
  name: string
  price: number
  image: string | null
  active: boolean
  category: { id: string; name: string }
  variations?: ProductVariation[]
  addonGroups?: AddonGroup[]
}

type CartItem = {
  productId: string
  name: string
  unitPrice: number
  quantity: number
  variationId?: string
  variationName?: string
  addons?: Array<{ addonId: string; name: string; price: number }>
}

export default function PosPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderType, setOrderType] = useState<"TABLE" | "PICKUP" | "DELIVERY">("TABLE")
  const [tableNumber, setTableNumber] = useState("")
  const [notes, setNotes] = useState("")
  const [address, setAddress] = useState("")
  const [discount, setDiscount] = useState("")
  const [couponCode, setCouponCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<number | null>(null)
  const [productToAdd, setProductToAdd] = useState<Product | null>(null)
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null)
  const [selectedAddons, setSelectedAddons] = useState<Array<{ addonId: string; name: string; price: number }>>([])

  const loadCategories = async () => {
    const res = await fetch("/api/categories")
    if (res.ok) {
      const data = await res.json()
      setCategories(data)
      if (data.length > 0 && !selectedCategoryId) setSelectedCategoryId(data[0].id)
    }
  }

  const loadProducts = async () => {
    const res = await fetch("/api/products?withVariations=1")
    if (res.ok) {
      const data = await res.json()
      setProducts(data.filter((p: Product) => p.active))
    }
  }

  useEffect(() => {
    loadCategories()
    loadProducts()
  }, [])

  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) setSelectedCategoryId(categories[0].id)
  }, [categories])

  const filteredProducts = selectedCategoryId
    ? products.filter((p) => p.category.id === selectedCategoryId)
    : products

  const addToCart = (product: Product) => {
    const hasVariations = product.variations && product.variations.length > 0
    const hasAddons = product.addonGroups && product.addonGroups.some((g) => g.addons?.length > 0)
    if (hasVariations || hasAddons) {
      setProductToAdd(product)
      setSelectedVariation(null)
      setSelectedAddons([])
    } else {
      doAddToCart(product, null, [])
    }
  }

  const doAddToCart = (
    product: Product,
    variation: ProductVariation | null,
    addons: Array<{ addonId: string; name: string; price: number }>
  ) => {
    const basePrice = variation ? variation.price : product.price
    const addonsTotal = addons.reduce((s, a) => s + a.price, 0)
    const unitPrice = basePrice + addonsTotal
    const name =
      product.name +
      (variation ? ` (${variation.name})` : "") +
      (addons.length ? ` + ${addons.map((a) => a.name).join(", ")}` : "")

    setCart((prev) => {
      const existing = prev.find(
        (i) =>
          i.productId === product.id &&
          (i.variationId || "") === (variation?.id || "") &&
          JSON.stringify((i.addons || []).map((a) => a.addonId).sort()) ===
            JSON.stringify(addons.map((a) => a.addonId).sort())
      )
      if (existing) {
        return prev.map((i) =>
          i === existing ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          name,
          unitPrice,
          quantity: 1,
          variationId: variation?.id,
          variationName: variation?.name,
          addons: addons.length ? addons : undefined,
        },
      ]
    })
    setProductToAdd(null)
    setSelectedVariation(null)
    setSelectedAddons([])
  }

  const updateQuantity = (productId: string, variationId: string | undefined, addonIds: string[], delta: number) => {
    setCart((prev) => {
      const item = prev.find(
        (i) =>
          i.productId === productId &&
          (i.variationId || "") === (variationId || "") &&
          JSON.stringify((i.addons || []).map((a) => a.addonId).sort()) === JSON.stringify([...addonIds].sort())
      )
      if (!item) return prev
      const newQty = item.quantity + delta
      if (newQty <= 0) return prev.filter((i) => i !== item)
      return prev.map((i) => (i === item ? { ...i, quantity: newQty } : i))
    })
  }

  const removeFromCart = (item: CartItem) => {
    setCart((prev) => prev.filter((i) => i !== item))
  }

  const subtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  const disc = parseFloat(discount.replace(",", ".")) || 0
  const total = Math.max(0, subtotal - disc)

  const formatPrice = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

  const handleFinalize = async () => {
    if (cart.length === 0) {
      toast.error("Adicione itens ao pedido")
      return
    }
    if (orderType === "TABLE" && !tableNumber.trim()) {
      toast.error("Informe o número da mesa")
      return
    }
    if (orderType === "DELIVERY" && !address.trim()) {
      toast.error("Informe o endereço de entrega")
      return
    }

    setLoading(true)
    setSuccess(null)
    try {
      const body: Record<string, unknown> = {
        type: orderType,
        notes: notes.trim() || null,
        discount: disc,
        couponCode: couponCode.trim() || null,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          variationId: i.variationId || null,
          addons: (i.addons || []).map((a) => ({ addonId: a.addonId })),
        })),
      }
      if (orderType === "TABLE") body.tableNumber = parseInt(tableNumber, 10)
      if (orderType === "DELIVERY") body.address = address.trim()

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Erro ao criar pedido")
        return
      }

      toast.success(`Pedido #${data.number} criado!`)
      setSuccess(data.number)
      setCart([])
      setNotes("")
      setDiscount("")
      setCouponCode("")
      setTableNumber("")
      setAddress("")
    } catch {
      toast.error("Erro de conexão")
    } finally {
      setLoading(false)
    }
  }

  const cartKey = (item: CartItem) =>
    `${item.productId}-${item.variationId || ""}-${(item.addons || []).map((a) => a.addonId).sort().join(",")}`

  return (
    <div className="page-body">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">PDV</h1>
          <p className="page-subtitle">Ponto de venda: mesa, balcão e delivery.</p>
        </div>
      </div>
      <div className="flex gap-4" style={{ height: "calc(100vh - 58px - 48px - 56px)" }}>
      <div className="flex flex-1 flex-col overflow-hidden panel p-0">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 p-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`filter-pill ${selectedCategoryId === cat.id ? "filter-pill-active" : "filter-pill-inactive"}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredProducts.map((prod) => (
              <button
                key={prod.id}
                onClick={() => addToCart(prod)}
                className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-primary hover:bg-slate-50"
              >
                <div className="mb-2 h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                  {prod.image ? (
                    <img src={prod.image} alt={prod.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl text-slate-500">🍽️</div>
                  )}
                </div>
                <span className="line-clamp-2 text-center text-sm font-medium">{prod.name}</span>
                <span className="mt-1 text-xs font-semibold text-primary">{formatPrice(prod.price)}</span>
              </button>
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <p className="py-8 text-center text-slate-500">Nenhum produto nesta categoria</p>
          )}
        </div>
      </div>

      <div className="flex w-96 flex-col panel p-0">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 p-4">
          <ShoppingCart className="h-5 w-5 text-slate-600" />
          <h2 className="font-semibold text-slate-900">Pedido</h2>
        </div>
        <div className="space-y-3 border-b border-slate-200 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Tipo</label>
            <div className="flex gap-2">
              {(["TABLE", "PICKUP", "DELIVERY"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setOrderType(t)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    orderType === t ? "bg-primary text-primary-foreground" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {t === "TABLE" ? "Mesa" : t === "PICKUP" ? "Balcão" : "Delivery"}
                </button>
              ))}
            </div>
          </div>
          {orderType === "TABLE" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Nº Mesa</label>
              <input
                type="number"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Ex: 5"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
          {orderType === "DELIVERY" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Endereço</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, número, bairro..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <p className="text-center text-sm text-slate-500">Carrinho vazio</p>
          ) : (
            <ul className="space-y-2">
              {cart.map((item) => (
                <li key={cartKey(item)} className="flex items-center justify-between rounded-lg bg-slate-50 p-2">
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">{item.name}</span>
                    <span className="text-xs text-slate-500">
                      {formatPrice(item.unitPrice)} × {item.quantity}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQuantity(item.productId, item.variationId, (item.addons || []).map((a) => a.addonId), -1)} className="rounded p-1 hover:bg-slate-200">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium text-slate-900">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, item.variationId, (item.addons || []).map((a) => a.addonId), 1)} className="rounded p-1 hover:bg-slate-200">
                      <Plus className="h-4 w-4" />
                    </button>
                    <button onClick={() => removeFromCart(item)} className="rounded p-1 text-red-500 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3 border-t border-slate-200 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Observações</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: sem cebola"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Cupom</label>
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Código do cupom"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Desconto (R$)</label>
            <input
              type="text"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0,00"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="text-slate-900">{formatPrice(subtotal)}</span>
            </div>
            {disc > 0 && (
              <div className="flex justify-between text-amber-600">
                <span>Desconto</span>
                <span>-{formatPrice(disc)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-semibold text-slate-900">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
          <button
            onClick={handleFinalize}
            disabled={loading || cart.length === 0}
            className="w-full rounded-lg bg-primary py-3 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Enviando..." : success ? `Pedido #${success} enviado!` : "Finalizar pedido"}
          </button>
          {success && (
            <button onClick={() => setSuccess(null)} className="w-full text-sm text-slate-500 hover:text-slate-900">
              Novo pedido
            </button>
          )}
        </div>
      </div>
      </div>

      {/* Modal variações/addons */}
      {productToAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">{productToAdd.name}</h3>
            {productToAdd.variations && productToAdd.variations.length > 0 && (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-slate-600">Tamanho/Variação</label>
                <div className="flex flex-wrap gap-2">
                  {productToAdd.variations.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariation(v)}
                      className={`rounded-lg px-3 py-2 text-sm transition ${
                        selectedVariation?.id === v.id ? "bg-primary text-primary-foreground" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {v.name} - {formatPrice(v.price)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {productToAdd.addonGroups?.map((group) => (
              <div key={group.id} className="mt-4">
                <label className="mb-2 block text-sm font-medium text-slate-600">{group.name}</label>
                <div className="flex flex-wrap gap-2">
                  {group.addons.map((a) => {
                    const isSelected = selectedAddons.some((s) => s.addonId === a.id)
                    return (
                      <button
                        key={a.id}
                        onClick={() =>
                          setSelectedAddons((prev) =>
                            isSelected ? prev.filter((s) => s.addonId !== a.id) : [...prev, { addonId: a.id, name: a.name, price: a.price }]
                          )
                        }
                        className={`rounded-lg px-3 py-2 text-sm transition ${
                          isSelected ? "bg-primary text-primary-foreground" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {a.name} {a.price > 0 && `+${formatPrice(a.price)}`}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setProductToAdd(null)
                  setSelectedVariation(null)
                  setSelectedAddons([])
                }}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const base = productToAdd.variations?.length ? selectedVariation : null
                  if (productToAdd.variations?.length && !base) {
                    toast.error("Selecione uma variação")
                    return
                  }
                  doAddToCart(productToAdd, base, selectedAddons)
                }}
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
