"use client"

/**
 * Loja do Cliente - Visual redesenhado
 * Clean, branco, minimalista — estilo lista iFood
 * Com horário/endereço visíveis e tags de ingredientes/alérgenos
 */
import { useEffect, useState, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import {
  Plus,
  Minus,
  ShoppingBag,
  X,
  Pencil,
  XCircle,
  Clock,
  MapPin,
  Bike,
  CreditCard,
  ChevronLeft,
  CheckCircle2,
  LogOut,
  User,
} from "lucide-react"
import { signIn, signOut, useSession } from "next-auth/react"
import toast from "react-hot-toast"

const CART_STORAGE_KEY = "ohana-loja-cart"

export const dynamic = "force-dynamic"

type Business = {
  name: string
  address: string | null
  city: string | null
  openTime: string
  closeTime: string
  deliveryFee: number
  minOrder: number
  deliveryTime: number
  acceptCash: boolean
  acceptCard: boolean
  acceptPix: boolean
  whatsapp: string | null
}

type Category = { id: string; name: string }
type Product = {
  id: string
  name: string
  description: string | null
  price: number
  image: string | null
  featured: boolean
  active?: boolean
  category: { id: string; name: string }
  // campos opcionais de alérgenos — adicione no schema se quiser usar
  allergens?: string[]
  tags?: string[]
}

type CartItem = { productId: string; name: string; price: number; quantity: number }

type OrderItem = {
  id: string
  product: { name: string }
  variation?: { name: string } | null
  quantity: number
  unitPrice: number
  addons?: { addon: { name: string } }[]
}

type Order = {
  id: string
  number: number
  type: string
  status: string
  total: number
  address: string | null
  notes: string | null
  items: OrderItem[]
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  PREPARING: "Preparando",
  READY: "Pronto",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#d97706",
  CONFIRMED: "#2563eb",
  PREPARING: "#7c3aed",
  READY: "#16a34a",
  DELIVERED: "#16a34a",
  CANCELLED: "#dc2626",
}

function formatPrice(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}

function getImage(product: Product) {
  if (product.image) return product.image
  return null
}

// Placeholder colorido baseado no nome do produto
function ProductPlaceholder({ name }: { name: string }) {
  const colors = ["#fef3c7", "#dbeafe", "#d1fae5", "#fce7f3", "#ede9fe", "#fee2e2"]
  const idx = name.charCodeAt(0) % colors.length
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: colors[idx],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 28,
      }}
    >
      🍽️
    </div>
  )
}

function LojaPage() {
  const { data: session, status } = useSession()
  const [business, setBusiness] = useState<Business | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [cartView, setCartView] = useState<"bag" | "orders" | "success">("bag")
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "service" | "done">("cart")
  const [serviceType, setServiceType] = useState<"PICKUP" | "DELIVERY">("PICKUP")
  const [address, setAddress] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [lastOrder, setLastOrder] = useState<Order | null>(null)
  const [myOrders, setMyOrders] = useState<Order[]>([])
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const catalogRef = useRef<HTMLDivElement>(null)
  const catBarRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()

  // Restaurar carrinho do localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) setCart(parsed)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    if (searchParams.get("checkout") === "1" && cart.length > 0) {
      setCartOpen(true)
      setCheckoutStep("service")
      window.history.replaceState({}, "", "/loja")
    }
  }, [searchParams, cart.length])

  const loadCatalog = () => {
    setCatalogLoading(true)
    Promise.all([
      fetch("/api/business").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ])
      .then(([bizData, catsData, prodsData]) => {
        if (bizData && !bizData.error) setBusiness(bizData)
        if (Array.isArray(catsData)) {
          setCategories(catsData)
          if (catsData.length > 0) setSelectedCategoryId((id) => id || catsData[0].id)
        }
        if (Array.isArray(prodsData)) {
          setProducts(prodsData.filter((p: Product) => p.active !== false))
        }
      })
      .catch(() => {})
      .finally(() => setCatalogLoading(false))
  }

  useEffect(() => { loadCatalog() }, [])

  useEffect(() => {
    if (session?.user) {
      fetch("/api/orders/me")
        .then((r) => r.json())
        .then((data) => (Array.isArray(data) ? setMyOrders(data) : setMyOrders([])))
        .catch(() => setMyOrders([]))
    } else {
      setMyOrders([])
    }
  }, [session])

  const filteredProducts = selectedCategoryId
    ? products.filter((p) => p.category.id === selectedCategoryId)
    : products

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const deliveryFeeVal = serviceType === "DELIVERY" ? (business?.deliveryFee ?? 0) : 0
  const totalWithFee = subtotal + deliveryFeeVal

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { productId: product.id, name: product.name, price: Number(product.price), quantity: 1 }]
    })
    toast.success(`${product.name} adicionado!`, {
      style: { background: "#111", color: "#fff", fontSize: 14 },
      iconTheme: { primary: "#22c55e", secondary: "#fff" },
    })
  }

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => {
      const item = prev.find((i) => i.productId === productId)
      if (!item) return prev
      const newQty = item.quantity + delta
      if (newQty <= 0) return prev.filter((i) => i.productId !== productId)
      return prev.map((i) => i.productId === productId ? { ...i, quantity: newQty } : i)
    })
  }

  const handleFinalize = async () => {
    if (cart.length === 0) { toast.error("Adicione itens ao pedido"); return }
    if (!session?.user) {
      toast("Faça login para salvar e acompanhar seus pedidos.", { duration: 4000 })
      await signIn("google", { callbackUrl: "/loja?checkout=1" })
      return
    }
    if (serviceType === "DELIVERY" && !address.trim()) {
      toast.error("Informe o endereço de entrega"); return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: serviceType,
          source: "ONLINE",
          address: serviceType === "DELIVERY" ? address.trim() : null,
          notes: notes.trim() || null,
          items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Erro ao criar pedido"); return }
      setLastOrder(data)
      setCart([])
      setCheckoutStep("done")
      setCartView("success")
      if (session?.user) setMyOrders((prev) => [data, ...prev])
      toast.success(`Pedido #${data.number} realizado!`)
    } catch { toast.error("Erro de conexão") }
    finally { setLoading(false) }
  }

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Deseja cancelar este pedido?")) return
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || "Erro ao cancelar"); return }
      setMyOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: "CANCELLED" } : o))
      if (lastOrder?.id === orderId) setLastOrder(null)
      toast.success("Pedido cancelado")
    } catch { toast.error("Erro de conexão") }
    finally { setLoading(false) }
  }

  const handleEditOrder = async (orderId: string, newNotes: string, newAddress: string | null) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: newNotes, address: newAddress }),
      })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || "Erro ao editar"); return }
      const updated = await res.json()
      setMyOrders((prev) => prev.map((o) => o.id === orderId ? updated : o))
      if (lastOrder?.id === orderId) setLastOrder(updated)
      setEditingOrder(null)
      toast.success("Pedido atualizado")
    } catch { toast.error("Erro de conexão") }
    finally { setLoading(false) }
  }

  const scrollToCatalog = () => {
    catalogRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Scroll a categoria selecionada para o centro da barra
  const selectCategory = (id: string) => {
    setSelectedCategoryId(id)
    const bar = catBarRef.current
    if (!bar) return
    const btn = bar.querySelector(`[data-cat="${id}"]`) as HTMLElement
    if (btn) btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: "#111", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── Header ─────────────────────────────────────── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 30,
        background: "#fff",
        borderBottom: "1px solid #f0eeea",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", height: 56,
      }}>
        <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px" }}>
          {business?.name ?? "Ohana"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {status === "loading" ? null : session?.user ? (
            <>
              <button
                onClick={() => { setCartView("orders"); setCartOpen(true) }}
                style={btnGhost}
              >
                <User size={15} />
                <span style={{ fontSize: 13 }}>Meus pedidos</span>
              </button>
              {session.user.image ? (
                <img src={session.user.image} alt="" style={{ width: 30, height: 30, borderRadius: "50%", border: "2px solid #e5e5e5" }} />
              ) : (
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#f0eeea", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600 }}>
                  {(session.user.name || "U")[0].toUpperCase()}
                </div>
              )}
              <button onClick={() => signOut({ callbackUrl: "/loja" })} style={{ ...btnGhost, padding: "6px 8px" }}>
                <LogOut size={15} />
              </button>
            </>
          ) : (
            <button onClick={() => signIn("google", { callbackUrl: "/loja" })} style={btnDark}>
              Entrar com Google
            </button>
          )}
        </div>
      </header>

      {/* ── Barra de info rápida ────────────────────────── */}
      {business && (
        <div style={{
          background: "#fafaf8",
          borderBottom: "1px solid #f0eeea",
          padding: "8px 20px",
          display: "flex", alignItems: "center", gap: 16,
          fontSize: 12, color: "#888", overflowX: "auto",
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            Aberto agora
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
            <Clock size={12} />
            {business.openTime}–{business.closeTime}
          </span>
          {business.address && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
              <MapPin size={12} />
              {business.address}{business.city ? `, ${business.city}` : ""}
            </span>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
            <Bike size={12} />
            Entrega {business.deliveryFee > 0 ? formatPrice(business.deliveryFee) : "grátis"} · {business.deliveryTime} min
          </span>
        </div>
      )}

      {/* ── Hero ───────────────────────────────────────── */}
      <section style={{ padding: "36px 20px 28px", borderBottom: "1px solid #f0eeea" }}>
        <p style={{ fontSize: 12, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Delivery & Retirada
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.8px", marginBottom: 8, lineHeight: 1.15 }}>
          {business?.name ?? "Ohana Delivery"}
        </h1>
        <p style={{ fontSize: 14, color: "#666", marginBottom: 20, maxWidth: 400 }}>
          Peça online, acompanhe em tempo real. Retira no local ou receba em casa.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={scrollToCatalog} style={btnDark}>
            Ver cardápio
          </button>
        </div>
      </section>

      {/* ── Info do negócio ────────────────────────────── */}
      {business && (
        <section style={{ padding: "20px", borderBottom: "1px solid #f0eeea", background: "#fafaf8" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
          }}>
            <InfoCard
              icon={<Clock size={16} />}
              label="Horário"
              value={`${business.openTime} às ${business.closeTime}`}
            />
            {business.address && (
              <InfoCard
                icon={<MapPin size={16} />}
                label="Endereço"
                value={`${business.address}${business.city ? `, ${business.city}` : ""}`}
              />
            )}
            <InfoCard
              icon={<Bike size={16} />}
              label="Entrega"
              value={`${business.deliveryFee > 0 ? formatPrice(business.deliveryFee) : "Grátis"} · ${business.deliveryTime} min`}
            />
            <InfoCard
              icon={<CreditCard size={16} />}
              label="Pagamento"
              value={[
                business.acceptPix && "Pix",
                business.acceptCard && "Cartão",
                business.acceptCash && "Dinheiro",
              ].filter(Boolean).join(" · ")}
            />
          </div>
        </section>
      )}

      {/* ── Cardápio ───────────────────────────────────── */}
      <section ref={catalogRef} style={{ paddingBottom: 120 }}>
        {catalogLoading ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "#aaa", fontSize: 14 }}>
            Carregando cardápio...
          </div>
        ) : products.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <p style={{ color: "#aaa", fontSize: 14, marginBottom: 16 }}>Não foi possível carregar o cardápio.</p>
            <button onClick={loadCatalog} style={btnDark}>Tentar novamente</button>
          </div>
        ) : (
          <>
            {/* Barra de categorias sticky */}
            <div
              ref={catBarRef}
              style={{
                position: "sticky", top: 56, zIndex: 20,
                background: "#fff",
                borderBottom: "1px solid #f0eeea",
                display: "flex", gap: 0, overflowX: "auto",
                scrollbarWidth: "none",
              }}
            >
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  data-cat={cat.id}
                  onClick={() => selectCategory(cat.id)}
                  style={{
                    whiteSpace: "nowrap",
                    padding: "12px 16px",
                    fontSize: 13,
                    fontWeight: selectedCategoryId === cat.id ? 600 : 400,
                    color: selectedCategoryId === cat.id ? "#111" : "#888",
                    background: "none",
                    border: "none",
                    borderBottom: selectedCategoryId === cat.id ? "2px solid #111" : "2px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Lista de produtos */}
            <div style={{ padding: "0 20px" }}>
              {filteredProducts.length === 0 ? (
                <p style={{ padding: "40px 0", textAlign: "center", color: "#aaa", fontSize: 14 }}>
                  Nenhum produto nesta categoria.
                </p>
              ) : (
                <div>
                  {filteredProducts.map((p, i) => {
                    const inCart = cart.find((c) => c.productId === p.id)
                    const img = getImage(p)
                    return (
                      <div
                        key={p.id}
                        style={{
                          display: "flex", gap: 14, alignItems: "flex-start",
                          padding: "16px 0",
                          borderBottom: i < filteredProducts.length - 1 ? "1px solid #f0eeea" : "none",
                        }}
                      >
                        {/* Info do produto */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 3, lineHeight: 1.3 }}>{p.name}</p>
                          {p.description && (
                            <p style={{ fontSize: 13, color: "#888", marginBottom: 6, lineHeight: 1.4 }}>
                              {p.description}
                            </p>
                          )}
                          {/* Tags de alérgenos — exibe se o produto tiver o campo */}
                          {p.allergens && p.allergens.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                              {p.allergens.map((a) => (
                                <span key={a} style={tagStyle("#fef3c7", "#92400e")}>{a}</span>
                              ))}
                            </div>
                          )}
                          {p.tags && p.tags.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                              {p.tags.map((t) => (
                                <span key={t} style={tagStyle("#f0fdf4", "#166534")}>{t}</span>
                              ))}
                            </div>
                          )}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                            <span style={{ fontWeight: 700, fontSize: 14 }}>{formatPrice(Number(p.price))}</span>
                            {/* Controle de quantidade ou botão adicionar */}
                            {inCart ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <button
                                  onClick={() => updateQty(p.id, -1)}
                                  style={qtyBtn}
                                >
                                  <Minus size={14} />
                                </button>
                                <span style={{ fontSize: 14, fontWeight: 600, minWidth: 20, textAlign: "center" }}>
                                  {inCart.quantity}
                                </span>
                                <button
                                  onClick={() => updateQty(p.id, 1)}
                                  style={{ ...qtyBtn, background: "#111", color: "#fff", borderColor: "#111" }}
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(p)}
                                style={{
                                  width: 32, height: 32, borderRadius: "50%",
                                  background: "#111", color: "#fff", border: "none",
                                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <Plus size={16} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Imagem do produto */}
                        <div style={{
                          width: 80, height: 80, borderRadius: 10,
                          overflow: "hidden", flexShrink: 0,
                          background: "#f5f5f3",
                        }}>
                          {img ? (
                            <img
                              src={img}
                              alt={p.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <ProductPlaceholder name={p.name} />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* ── Barra do carrinho (bottom) ─────────────────── */}
      {cartCount > 0 && !cartOpen && (
        <button
          onClick={() => { setCartView("bag"); setCartOpen(true) }}
          style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 20px",
            background: "#111", color: "#fff",
            border: "none", cursor: "pointer",
            fontSize: 14,
          }}
        >
          <span style={{
            background: "#333", borderRadius: 6, padding: "2px 8px",
            fontSize: 13, fontWeight: 600,
          }}>
            {cartCount} {cartCount === 1 ? "item" : "itens"}
          </span>
          <span style={{ fontWeight: 600 }}>Ver carrinho</span>
          <span style={{ fontWeight: 600 }}>{formatPrice(subtotal)}</span>
        </button>
      )}

      {/* ── Painel lateral do carrinho ─────────────────── */}
      {cartOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
          {/* Overlay */}
          <div
            onClick={() => { setCartOpen(false); setEditingOrder(null); if (cartView === "success") setCartView("bag") }}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }}
          />

          {/* Painel */}
          <div style={{
            position: "relative", width: "100%", maxWidth: 420,
            background: "#fff", display: "flex", flexDirection: "column",
            height: "100%", overflowY: "auto",
          }}>
            {/* Header do painel */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid #f0eeea",
              position: "sticky", top: 0, background: "#fff", zIndex: 1,
            }}>
              <div style={{ display: "flex", gap: 4 }}>
                {session?.user ? (
                  <>
                    <TabBtn active={cartView === "bag"} onClick={() => setCartView("bag")}>Carrinho</TabBtn>
                    <TabBtn active={cartView === "orders"} onClick={() => setCartView("orders")}>Meus pedidos</TabBtn>
                  </>
                ) : (
                  <span style={{ fontWeight: 600, fontSize: 16 }}>Carrinho</span>
                )}
              </div>
              <button
                onClick={() => { setCartOpen(false); setEditingOrder(null); if (cartView === "success") setCartView("bag") }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#888", padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo do painel */}
            {cartView === "success" && lastOrder ? (
              /* ── Pedido realizado ── */
              <div style={{ padding: 24, flex: 1 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 16,
                }}>
                  <CheckCircle2 size={28} color="#16a34a" />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
                  Pedido #{lastOrder.number} realizado!
                </h3>
                <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
                  {lastOrder.status === "PENDING" ? "Você pode cancelar ou editar enquanto estiver pendente." : "Seu pedido foi enviado para a cozinha."}
                </p>
                <div style={{ border: "1px solid #f0eeea", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
                  {lastOrder.items.map((item, i) => (
                    <div key={item.id} style={{
                      display: "flex", justifyContent: "space-between",
                      padding: "10px 14px", fontSize: 13,
                      borderTop: i > 0 ? "1px solid #f0eeea" : "none",
                    }}>
                      <span>{item.quantity}x {item.product.name}{item.variation ? ` (${item.variation.name})` : ""}</span>
                      <span style={{ fontWeight: 600 }}>{formatPrice(Number(item.unitPrice) * item.quantity)}</span>
                    </div>
                  ))}
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "12px 14px", fontWeight: 700, fontSize: 14,
                    borderTop: "1px solid #f0eeea", background: "#fafaf8",
                  }}>
                    <span>Total</span>
                    <span>{formatPrice(Number(lastOrder.total))}</span>
                  </div>
                </div>
                {lastOrder.status === "PENDING" && (
                  <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                    <button
                      onClick={() => setEditingOrder(lastOrder)}
                      style={{ ...btnOutline, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    >
                      <Pencil size={14} /> Editar
                    </button>
                    <button
                      onClick={() => handleCancelOrder(lastOrder.id)}
                      disabled={loading}
                      style={{ ...btnDanger, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    >
                      <XCircle size={14} /> Cancelar
                    </button>
                  </div>
                )}
                <button
                  onClick={() => { setCartView("bag"); setLastOrder(null); setCheckoutStep("cart"); setCartOpen(false) }}
                  style={{ ...btnDark, width: "100%", justifyContent: "center" }}
                >
                  Fazer novo pedido
                </button>
              </div>

            ) : cartView === "orders" && session?.user ? (
              /* ── Meus pedidos ── */
              <div style={{ padding: 20, flex: 1 }}>
                {myOrders.length === 0 ? (
                  <p style={{ textAlign: "center", color: "#aaa", fontSize: 14, padding: "40px 0" }}>Nenhum pedido ainda.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {myOrders.map((o) => (
                      <div key={o.id} style={{ border: "1px solid #f0eeea", borderRadius: 10, overflow: "hidden" }}>
                        <div style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "12px 14px", background: "#fafaf8",
                        }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>Pedido #{o.number}</span>
                          <span style={{
                            fontSize: 12, fontWeight: 600, padding: "3px 8px", borderRadius: 100,
                            background: STATUS_COLOR[o.status] + "18",
                            color: STATUS_COLOR[o.status] ?? "#666",
                          }}>
                            {STATUS_LABEL[o.status] ?? o.status}
                          </span>
                        </div>
                        <div style={{ padding: "10px 14px" }}>
                          {o.items.slice(0, 3).map((item) => (
                            <p key={item.id} style={{ fontSize: 13, color: "#666", marginBottom: 2 }}>
                              {item.quantity}x {item.product.name}
                            </p>
                          ))}
                          {o.items.length > 3 && (
                            <p style={{ fontSize: 12, color: "#aaa" }}>+{o.items.length - 3} itens</p>
                          )}
                          <p style={{ fontWeight: 700, fontSize: 14, marginTop: 8 }}>{formatPrice(Number(o.total))}</p>

                          {editingOrder?.id === o.id ? (
                            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                              <input
                                id={`notes-${o.id}`}
                                defaultValue={o.notes || ""}
                                placeholder="Observações"
                                style={inputStyle}
                              />
                              {(o.type === "DELIVERY" || o.address) && (
                                <input
                                  id={`address-${o.id}`}
                                  defaultValue={o.address || ""}
                                  placeholder="Endereço"
                                  style={inputStyle}
                                />
                              )}
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  onClick={() => {
                                    const n = (document.getElementById(`notes-${o.id}`) as HTMLInputElement)?.value || ""
                                    const a = (document.getElementById(`address-${o.id}`) as HTMLInputElement)?.value || null
                                    handleEditOrder(o.id, n, a)
                                  }}
                                  disabled={loading}
                                  style={{ ...btnDark, flex: 1, justifyContent: "center" }}
                                >
                                  Salvar
                                </button>
                                <button onClick={() => setEditingOrder(null)} style={{ ...btnOutline, flex: 1, justifyContent: "center" }}>
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : o.status === "PENDING" ? (
                            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                              <button
                                onClick={() => setEditingOrder(o)}
                                style={{ ...btnOutline, fontSize: 12, padding: "5px 12px", display: "flex", alignItems: "center", gap: 4 }}
                              >
                                <Pencil size={12} /> Editar
                              </button>
                              <button
                                onClick={() => handleCancelOrder(o.id)}
                                disabled={loading}
                                style={{ ...btnDanger, fontSize: 12, padding: "5px 12px", display: "flex", alignItems: "center", gap: 4 }}
                              >
                                <XCircle size={12} /> Cancelar
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            ) : checkoutStep === "cart" ? (
              /* ── Itens do carrinho ── */
              <>
                <div style={{ flex: 1, padding: "16px 20px" }}>
                  {cart.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>
                      <ShoppingBag size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                      <p style={{ fontSize: 14 }}>Carrinho vazio</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      {cart.map((item, i) => (
                        <div key={item.productId} style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "14px 0",
                          borderBottom: i < cart.length - 1 ? "1px solid #f0eeea" : "none",
                        }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{item.name}</p>
                            <p style={{ fontSize: 13, color: "#888" }}>{formatPrice(item.price)}</p>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button onClick={() => updateQty(item.productId, -1)} style={qtyBtn}>
                              <Minus size={14} />
                            </button>
                            <span style={{ fontSize: 14, fontWeight: 600, minWidth: 20, textAlign: "center" }}>
                              {item.quantity}
                            </span>
                            <button onClick={() => updateQty(item.productId, 1)} style={{ ...qtyBtn, background: "#111", color: "#fff", borderColor: "#111" }}>
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ padding: "16px 20px", borderTop: "1px solid #f0eeea", position: "sticky", bottom: 0, background: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {!session?.user && (
                    <p style={{ fontSize: 12, color: "#888", textAlign: "center", marginBottom: 12 }}>
                      Faça login para identificar seu pedido e acompanhar em "Meus pedidos"
                    </p>
                  )}
                  <button
                    onClick={() => setCheckoutStep("service")}
                    disabled={cart.length === 0}
                    style={{ ...btnDark, width: "100%", justifyContent: "center", padding: "13px 0", fontSize: 15, opacity: cart.length === 0 ? 0.4 : 1 }}
                  >
                    Continuar
                  </button>
                </div>
              </>

            ) : (
              /* ── Tipo de serviço ── */
              <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column" }}>
                <button
                  onClick={() => setCheckoutStep("cart")}
                  style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#888", background: "none", border: "none", cursor: "pointer", marginBottom: 20, padding: 0 }}
                >
                  <ChevronLeft size={16} /> Voltar
                </button>
                <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Como quer receber?</h3>

                <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                  {(["PICKUP", "DELIVERY"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setServiceType(type)}
                      style={{
                        flex: 1, padding: 14, borderRadius: 10, cursor: "pointer",
                        border: serviceType === type ? "2px solid #111" : "1px solid #e5e5e5",
                        background: serviceType === type ? "#f9f9f7" : "#fff",
                        textAlign: "left",
                      }}
                    >
                      <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
                        {type === "PICKUP" ? "Retirada" : "Delivery"}
                      </p>
                      <p style={{ fontSize: 12, color: "#888" }}>
                        {type === "PICKUP" ? "Buscar no local" : `+${formatPrice(business?.deliveryFee ?? 0)}`}
                      </p>
                    </button>
                  ))}
                </div>

                {serviceType === "DELIVERY" && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, color: "#666", display: "block", marginBottom: 6 }}>Endereço de entrega</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Rua, número, bairro..."
                      style={inputStyle}
                    />
                  </div>
                )}

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, color: "#666", display: "block", marginBottom: 6 }}>Observações (opcional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: sem cebola, ponto da carne..."
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginTop: "auto" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#888" }}>
                      <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
                    </div>
                    {serviceType === "DELIVERY" && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#888" }}>
                        <span>Taxa de entrega</span><span>{formatPrice(deliveryFeeVal)}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, paddingTop: 8, borderTop: "1px solid #f0eeea" }}>
                      <span>Total</span><span>{formatPrice(totalWithFee)}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleFinalize}
                    disabled={loading}
                    style={{ ...btnDark, width: "100%", justifyContent: "center", padding: "13px 0", fontSize: 15, opacity: loading ? 0.6 : 1 }}
                  >
                    {loading ? "Enviando..." : "Finalizar pedido"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Componentes auxiliares ──────────────────────────

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #f0eeea", borderRadius: 10,
      padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#888", fontSize: 12 }}>
        {icon}
        <span>{label}</span>
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{value}</p>
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px", fontSize: 13, borderRadius: 100,
        background: active ? "#111" : "none",
        color: active ? "#fff" : "#888",
        border: active ? "none" : "1px solid #e5e5e5",
        cursor: "pointer", fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </button>
  )
}

// ── Estilos compartilhados ──────────────────────────

const btnDark: React.CSSProperties = {
  background: "#111", color: "#fff",
  border: "none", borderRadius: 8, cursor: "pointer",
  padding: "10px 18px", fontSize: 14, fontWeight: 600,
  display: "inline-flex", alignItems: "center", gap: 6,
}

const btnOutline: React.CSSProperties = {
  background: "none", color: "#111",
  border: "1px solid #e5e5e5", borderRadius: 8, cursor: "pointer",
  padding: "10px 18px", fontSize: 14, fontWeight: 500,
  display: "inline-flex", alignItems: "center", gap: 6,
}

const btnDanger: React.CSSProperties = {
  background: "none", color: "#dc2626",
  border: "1px solid #fecaca", borderRadius: 8, cursor: "pointer",
  padding: "10px 18px", fontSize: 14, fontWeight: 500,
  display: "inline-flex", alignItems: "center", gap: 6,
}

const btnGhost: React.CSSProperties = {
  background: "none", color: "#444",
  border: "1px solid #e5e5e5", borderRadius: 8, cursor: "pointer",
  padding: "6px 12px", fontSize: 13, fontWeight: 400,
  display: "inline-flex", alignItems: "center", gap: 5,
}

const qtyBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: "50%",
  background: "#f5f5f3", color: "#111",
  border: "1px solid #e5e5e5", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0,
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", fontSize: 14,
  border: "1px solid #e5e5e5", borderRadius: 8,
  outline: "none", boxSizing: "border-box",
  background: "#fafaf8",
}

function tagStyle(bg: string, color: string): React.CSSProperties {
  return {
    fontSize: 11, padding: "2px 7px", borderRadius: 100,
    background: bg, color,
  }
}

// ── Export ─────────────────────────────────────────

export default function LojaPageWrapper() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#fff" }} />}>
      <LojaPage />
    </Suspense>
  )
}
