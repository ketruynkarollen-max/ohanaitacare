"use client"

/**
 * Loja do Cliente — Ohana mobile (roxo profundo + dourado, cardápio + Google)
 */
import { useEffect, useState, useRef, Suspense, useMemo } from "react"
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
  ChevronLeft,
  CheckCircle2,
  LogOut,
  User,
  Heart,
  Star,
  Menu,
  Search,
  Share2,
  SlidersHorizontal,
  Home,
} from "lucide-react"
import { signIn, signOut, useSession } from "next-auth/react"
import toast from "react-hot-toast"

const CART_STORAGE_KEY = "ohana-loja-cart"
const WELCOME_DISMISSED_KEY = "ohana-loja-welcome-dismissed"

export const dynamic = "force-dynamic"

// ── Design tokens Ohana (mobile) ─────────────────────────
const D = {
  bg: "#1A122E",
  bgTop: "#251838",
  card: "#2a1f3d",
  cardElevated: "#352848",
  border: "rgba(255,255,255,0.09)",
  borderLight: "rgba(255,255,255,0.05)",
  accent: "#F5BA41",
  accentDark: "#d9a238",
  accentGlow: "rgba(245,186,65,0.3)",
  textPrimary: "#ffffff",
  textSecondary: "rgba(255,255,255,0.7)",
  textMuted: "rgba(255,255,255,0.45)",
  success: "#22c55e",
  danger: "#ef4444",
  overlay: "rgba(0,0,0,0.72)",
}

// ── Types ────────────────────────────────────────────────
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
  preparationTime?: number
  category: { id: string; name: string }
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

// ── Helpers ──────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  PREPARING: "Preparando",
  READY: "Pronto",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#f59e0b",
  CONFIRMED: "#3b82f6",
  PREPARING: "#8b5cf6",
  READY: "#22c55e",
  DELIVERED: "#22c55e",
  CANCELLED: "#ef4444",
}

function formatPrice(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
}

function getImage(product: Product) {
  return product.image || null
}

/** Valores ilustrativos para grid nutricional (sem dados no banco) */
function nutritionFromId(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % 233
  return {
    protein: 14 + (h % 18),
    calories: 420 + (h % 180),
    fat: 10 + (h % 14),
    carbs: 22 + (h % 35),
  }
}

function ProductPlaceholder({ name }: { name: string }) {
  const colors = [
    "linear-gradient(135deg, #3b1f0c, #7c3a00)",
    "linear-gradient(135deg, #0c2340, #1d4ed8)",
    "linear-gradient(135deg, #0c2a1a, #15803d)",
    "linear-gradient(135deg, #2d1b4e, #7c3aed)",
    "linear-gradient(135deg, #3b0c1f, #be185d)",
  ]
  const idx = name.charCodeAt(0) % colors.length
  return (
    <div style={{
      width: "100%", height: "100%",
      background: colors[idx],
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 24,
    }}>
      🍽
    </div>
  )
}

// ── Main Component ───────────────────────────────────────
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
  const [wishlist, setWishlist] = useState<Set<string>>(new Set())
  const [showWelcome, setShowWelcome] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)
  const [detailQty, setDetailQty] = useState(1)
  const catalogRef = useRef<HTMLDivElement>(null)
  const catBarRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()

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
    try {
      if (localStorage.getItem(WELCOME_DISMISSED_KEY) === "1") setShowWelcome(false)
    } catch {}
  }, [])

  useEffect(() => {
    if (session?.user) {
      try {
        localStorage.setItem(WELCOME_DISMISSED_KEY, "1")
      } catch {}
      setShowWelcome(false)
    }
  }, [session?.user])

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

  const listProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return filteredProducts
    return filteredProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
    )
  }, [filteredProducts, searchQuery])

  const featuredProduct = products.find((p) => p.featured) || products[0]
  const searching = searchQuery.trim().length > 0
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
      style: { background: D.card, color: D.textPrimary, fontSize: 13, border: `1px solid ${D.border}` },
      iconTheme: { primary: D.accent, secondary: D.card },
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

  const toggleWishlist = (id: string) => {
    setWishlist((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
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

  useEffect(() => { setDetailQty(1) }, [detailProduct])

  const selectCategory = (id: string) => {
    setSelectedCategoryId(id)
    const bar = catBarRef.current
    if (!bar) return
    const btn = bar.querySelector(`[data-cat="${id}"]`) as HTMLElement
    if (btn) btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
  }

  const dismissWelcome = () => {
    try {
      localStorage.setItem(WELCOME_DISMISSED_KEY, "1")
    } catch {}
    setShowWelcome(false)
  }

  const stickyBg = "rgba(26,18,46,0.94)"

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(180deg, ${D.bgTop} 0%, ${D.bg} 38%, ${D.bg} 100%)`,
      color: D.textPrimary,
    }}>

      {/* ── Splash / boas-vindas (Ohana) ───────────────── */}
      {showWelcome && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 80,
          background: `radial-gradient(ellipse 120% 80% at 50% -20%, rgba(124,58,237,0.35) 0%, transparent 55%), linear-gradient(180deg, ${D.bgTop} 0%, ${D.bg} 55%, #120a1f 100%)`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
          padding: "48px 28px 36px", overflow: "auto",
        }}>
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "12%", left: "-8%", width: 120, height: 120, borderRadius: "50%", background: "rgba(245,186,65,0.06)", border: "1px solid rgba(255,255,255,0.06)" }} />
            <div style={{ position: "absolute", top: "22%", right: "-5%", width: 88, height: 88, borderRadius: "50%", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(255,255,255,0.05)" }} />
          </div>

          <div style={{ textAlign: "center", maxWidth: 320, position: "relative", zIndex: 1 }}>
            <div style={{
              width: 72, height: 72, margin: "0 auto 20px", borderRadius: 20,
              background: `linear-gradient(145deg, ${D.cardElevated}, ${D.card})`,
              border: `1px solid ${D.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 36, boxShadow: `0 12px 40px rgba(0,0,0,0.35)`,
            }}>
              🍱
            </div>
            <p style={{ fontSize: 13, color: D.textMuted, marginBottom: 6, letterSpacing: "0.02em" }}>
              Bem-vindo ao
            </p>
            <h1 style={{
              fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 8,
            }}>
              {business?.name ?? "Ohana"}
            </h1>
            <p style={{ fontSize: 11, color: D.textMuted, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 10 }}>
              Delivery{business?.city ? ` · ${business.city}` : ""}
            </p>
            <p style={{ fontSize: 15, fontWeight: 600, color: D.textSecondary }}>
              Culinária <span style={{ color: D.accent }}>Oriental</span>
            </p>
            <p style={{ fontSize: 13, color: D.textMuted, lineHeight: 1.55, marginTop: 16 }}>
              Monte seu pedido, acompanhe tudo em tempo real e receba com o mesmo cuidado da cozinha.
            </p>
          </div>

          <div style={{ width: "100%", maxWidth: 340, position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/loja" })}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                width: "100%", padding: "14px 20px", borderRadius: 14,
                background: "#fff", color: "#1f1f1f", border: "none",
                fontSize: 15, fontWeight: 600, cursor: "pointer",
                boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Entrar com Google
            </button>
            <button
              type="button"
              onClick={dismissWelcome}
              style={{
                width: "100%", padding: "14px 20px", borderRadius: 14,
                background: "transparent", color: D.textSecondary,
                border: `1px solid ${D.border}`, fontSize: 14, fontWeight: 500, cursor: "pointer",
              }}
            >
              Ver cardápio sem conta
            </button>
          </div>
        </div>
      )}

      {/* ── Menu lateral ─────────────────────────────────── */}
      {menuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex" }}>
          <div
            role="presentation"
            onClick={() => setMenuOpen(false)}
            style={{ flex: 1, background: D.overlay, backdropFilter: "blur(6px)" }}
          />
          <nav style={{
            width: "min(300px, 88vw)", height: "100%", background: D.bg,
            borderLeft: `1px solid ${D.border}`,
            padding: "24px 20px", display: "flex", flexDirection: "column", gap: 8,
            boxShadow: "-12px 0 40px rgba(0,0,0,0.35)",
          }}>
            <p style={{ fontWeight: 800, fontSize: 18, marginBottom: 12, letterSpacing: "-0.02em" }}>
              {business?.name ?? "Ohana"}
            </p>
            {business && (
              <div style={{ fontSize: 12, color: D.textMuted, marginBottom: 16, lineHeight: 1.5 }}>
                <span style={{ color: D.success, fontWeight: 600 }}>● Aberto</span>
                {" · "}
                {business.openTime}–{business.closeTime}
                {business.address && (
                  <>
                    <br />
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6 }}>
                      <MapPin size={12} /> {business.address}{business.city ? `, ${business.city}` : ""}
                    </span>
                  </>
                )}
                <br />
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6 }}>
                  <Bike size={12} />
                  {business.deliveryFee > 0 ? formatPrice(business.deliveryFee) : "Entrega grátis"} · {business.deliveryTime} min
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => { setMenuOpen(false); setCartView("bag"); setCartOpen(true) }}
              style={{ ...menuDrawerBtn, justifyContent: "flex-start" }}
            >
              <ShoppingBag size={18} /> Carrinho
              {cartCount > 0 && (
                <span style={{ marginLeft: "auto", background: D.accent, color: "#000", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 100 }}>
                  {cartCount}
                </span>
              )}
            </button>
            {session?.user && (
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setCartView("orders"); setCartOpen(true) }}
                style={{ ...menuDrawerBtn, justifyContent: "flex-start" }}
              >
                <User size={18} /> Meus pedidos
              </button>
            )}
            <div style={{ marginTop: "auto", paddingTop: 20, borderTop: `1px solid ${D.border}` }}>
              {status === "loading" ? null : session?.user ? (
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/loja" })}
                  style={{ ...menuDrawerBtn, justifyContent: "flex-start", color: D.danger, borderColor: "rgba(239,68,68,0.25)" }}
                >
                  <LogOut size={18} /> Sair
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => signIn("google", { callbackUrl: "/loja" })}
                  style={{ ...accentBtn, width: "100%", justifyContent: "center" }}
                >
                  Entrar com Google
                </button>
              )}
            </div>
          </nav>
        </div>
      )}

      {/* ── Header + busca + cardápio (após splash) ─────── */}
      {!showWelcome && (
      <>
      <header style={{
        position: "sticky", top: 0, zIndex: 30,
        background: stickyBg,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: `1px solid ${D.border}`,
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", gap: 10,
        }}>
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setMenuOpen(true)}
            style={{
              width: 42, height: 42, borderRadius: 12, border: `1px solid ${D.border}`,
              background: D.card, color: D.textPrimary, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}
          >
            <Menu size={22} strokeWidth={2} />
          </button>
          <h2 style={{ flex: 1, textAlign: "center", fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
            Encontre um prato
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {cartCount > 0 && (
              <button
                type="button"
                aria-label="Carrinho"
                onClick={() => { setCartView("bag"); setCartOpen(true) }}
                style={{
                  width: 42, height: 42, borderRadius: 12, border: `1px solid ${D.border}`,
                  background: D.card, color: D.accent, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative",
                }}
              >
                <ShoppingBag size={20} />
                <span style={{
                  position: "absolute", top: 4, right: 4, minWidth: 16, height: 16, borderRadius: "50%",
                  background: D.accent, color: "#000", fontSize: 10, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              </button>
            )}
            <button
              type="button"
              aria-label="Buscar"
              onClick={() => {
                const el = document.getElementById("loja-search-input")
                el?.focus()
              }}
              style={{
                width: 42, height: 42, borderRadius: 12, border: `1px solid ${D.border}`,
                background: D.card, color: D.textPrimary, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}
            >
              <Search size={20} strokeWidth={2} />
            </button>
          </div>
        </div>
        <div style={{ padding: "0 16px 12px" }}>
          <div style={{ position: "relative" }}>
            <Search size={16} color={D.textMuted} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input
              id="loja-search-input"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar no cardápio..."
              autoComplete="off"
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "12px 14px 12px 42px",
                borderRadius: 14,
                border: `1px solid ${D.border}`,
                background: D.card,
                color: D.textPrimary,
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>
        </div>
      </header>

      {/* ── Hero: Featured Product (horizontal compact) ──── */}
      {!catalogLoading && featuredProduct && !searching && (
        <section style={{ padding: "20px 18px 0" }}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setDetailProduct(featuredProduct)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDetailProduct(featuredProduct) } }}
            style={{
              borderRadius: 18,
              background: `linear-gradient(135deg, ${D.card} 0%, ${D.bg} 100%)`,
              border: `1px solid #3a2c58`,
              padding: 14,
              display: "flex",
              alignItems: "center",
              gap: 14,
              position: "relative",
              overflow: "hidden",
              cursor: "pointer",
            }}
          >
            {/* Glow decoration */}
            <div style={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, borderRadius: "50%", background: `radial-gradient(circle, ${D.accentGlow} 0%, transparent 70%)`, pointerEvents: "none" }} />
            {/* Image 100×100 */}
            <div style={{ width: 100, height: 100, borderRadius: 14, flexShrink: 0, overflow: "hidden", background: D.cardElevated }}>
              {getImage(featuredProduct) ? (
                <img src={getImage(featuredProduct)!} alt={featuredProduct.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <ProductPlaceholder name={featuredProduct.name} />
              )}
            </div>
            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Badge */}
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                background: `rgba(245,186,65,0.12)`, border: `1px solid rgba(245,186,65,0.25)`,
                color: D.accent, fontSize: 10, fontWeight: 600,
                padding: "3px 9px", borderRadius: 20, marginBottom: 7,
                textTransform: "uppercase", letterSpacing: "0.6px",
              }}>★ Em destaque</span>
              <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 3, lineHeight: 1.2, color: "#f0e8ff", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                {featuredProduct.name}
              </p>
              {featuredProduct.description && (
                <p style={{ fontSize: 12, color: D.textMuted, marginBottom: 8, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                  {featuredProduct.description}
                </p>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: D.accent, fontSize: 17, fontWeight: 700 }}>
                  {formatPrice(Number(featuredProduct.price))}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleWishlist(featuredProduct.id) }}
                    style={{
                      width: 32, height: 32, borderRadius: 10, cursor: "pointer", border: "none",
                      background: wishlist.has(featuredProduct.id) ? "rgba(239,68,68,0.15)" : D.cardElevated,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Heart size={15} fill={wishlist.has(featuredProduct.id) ? D.danger : "none"} color={wishlist.has(featuredProduct.id) ? D.danger : D.textMuted} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); addToCart(featuredProduct) }}
                    style={{
                      width: 32, height: 32, borderRadius: 10, cursor: "pointer", border: "none",
                      background: D.accent,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <ShoppingBag size={15} color="#000" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Cardápio ─────────────────────────────────────── */}
      <section ref={catalogRef} style={{ paddingBottom: 90 }}>
        {catalogLoading ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            {/* Skeleton loading */}
            {[1, 2, 3].map((i) => (
              <div key={i} style={{
                background: D.card,
                borderRadius: 16, height: 80, marginBottom: 12,
                opacity: 1 - i * 0.15,
                animation: "pulse 1.5s ease-in-out infinite",
              }} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <ShoppingBag size={40} style={{ marginBottom: 12, opacity: 0.2, color: D.textMuted }} />
            <p style={{ color: D.textMuted, fontSize: 14, marginBottom: 16 }}>Cardápio não disponível.</p>
            <button onClick={loadCatalog} style={accentBtn}>Tentar novamente</button>
          </div>
        ) : (
          <>
            {/* Barra de categorias sticky */}
            <div style={{
              position: "sticky", top: 122, zIndex: 20,
              background: stickyBg,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderBottom: `1px solid ${D.border}`,
              display: "flex", alignItems: "center", gap: 8,
              padding: "12px 12px 12px 20px",
            }}>
              <div
                ref={catBarRef}
                style={{
                  display: "flex", gap: 8, overflowX: "auto", flex: 1,
                  scrollbarWidth: "none",
                }}
              >
                {categories.map((cat) => {
                  const active = selectedCategoryId === cat.id
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      data-cat={cat.id}
                      onClick={() => selectCategory(cat.id)}
                      style={{
                        whiteSpace: "nowrap",
                        padding: "7px 16px",
                        fontSize: 13,
                        fontWeight: active ? 600 : 400,
                        color: active ? "#000" : D.textSecondary,
                        background: active ? D.accent : D.card,
                        border: active ? "none" : `1px solid ${D.border}`,
                        borderRadius: 100,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        flexShrink: 0,
                      }}
                    >
                      {cat.name}
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                aria-label="Buscar e filtrar"
                onClick={() => document.getElementById("loja-search-input")?.focus()}
                style={{
                  flexShrink: 0, width: 40, height: 40, borderRadius: 12,
                  border: `1px solid ${D.border}`, background: D.card, color: D.textPrimary,
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}
              >
                <SlidersHorizontal size={18} />
              </button>
            </div>

            {/* Lista de produtos */}
            <div style={{ padding: "16px 20px 0" }}>
              {/* Section title */}
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 500, color: D.textMuted, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 4 }}>
                  {searching ? 'Busca' : 'Cardapio'}
                </p>
                <h3 style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px' }}>
                  {searching ? 'Resultados da busca' : (categories.find((c) => c.id === selectedCategoryId)?.name ?? 'Todos')}
                </h3>
                <p style={{ fontSize: 12, color: D.textMuted, marginTop: 2 }}>
                  {listProducts.length} {listProducts.length === 1 ? 'item' : 'itens'}
                </p>
              </div>

              {listProducts.length === 0 ? (
                <p style={{ padding: "40px 0", textAlign: "center", color: D.textMuted, fontSize: 14 }}>
                  Nenhum produto nesta categoria.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {listProducts.map((p) => {
                    const inCart = cart.find((c) => c.productId === p.id)
                    const img = getImage(p)
                    const liked = wishlist.has(p.id)
                    return (
                      <div
                        key={p.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setDetailProduct(p)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDetailProduct(p) } }}
                        style={{
                          display: "flex", gap: 14, alignItems: "center",
                          background: D.card,
                          borderRadius: 16,
                          border: `1px solid ${D.border}`,
                          padding: "14px",
                          transition: "border-color 0.2s",
                          cursor: "pointer",
                        }}
                      >
                        {/* Imagem */}
                        <div style={{
                          width: 84, height: 84, borderRadius: 12,
                          overflow: "hidden", flexShrink: 0,
                          background: D.cardElevated,
                          position: "relative",
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
                          {p.featured && (
                            <div style={{
                              position: "absolute", top: 5, left: 5,
                              background: D.accent, color: "#000",
                              borderRadius: 4, padding: "1px 5px",
                              fontSize: 9, fontWeight: 700,
                            }}>
                              ★
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 3, lineHeight: 1.3, color: D.textPrimary }}>
                            {p.name}
                          </p>
                          {p.description && (
                            <p style={{ fontSize: 12, color: D.textMuted, marginBottom: 6, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>
                              {p.description}
                            </p>
                          )}
                          {/* Stars */}
                          <div style={{ display: "flex", gap: 2, marginBottom: 6 }}>
                            {[1,2,3,4,5].map((s) => (
                              <Star key={s} size={10} fill={s <= 4 ? D.accent : "none"} color={s <= 4 ? D.accent : "#3a2c58"} />
                            ))}
                          </div>
                          {/* Tags */}
                          {p.tags && p.tags.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                              {p.tags.map((t) => (
                                <span key={t} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 100, background: "rgba(34,197,94,0.15)", color: "#22c55e", fontWeight: 500 }}>
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Price + actions */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                            <span style={{ fontWeight: 700, fontSize: 15, color: D.accent }}>
                              {formatPrice(Number(p.price))}
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {/* Wishlist button */}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleWishlist(p.id) }}
                                style={{
                                  width: 30, height: 30, borderRadius: "50%",
                                  background: liked ? "rgba(239,68,68,0.15)" : D.cardElevated,
                                  border: `1px solid ${liked ? "rgba(239,68,68,0.3)" : D.border}`,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  cursor: "pointer",
                                }}
                              >
                                <Heart size={13} fill={liked ? D.danger : "none"} color={liked ? D.danger : D.textMuted} />
                              </button>

                              {/* Qty controls or add button */}
                              {inCart ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); updateQty(p.id, -1) }} style={darkQtyBtn}>
                                    <Minus size={13} />
                                  </button>
                                  <span style={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: "center", color: D.accent }}>
                                    {inCart.quantity}
                                  </span>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); updateQty(p.id, 1) }} style={{ ...darkQtyBtn, background: D.accent, borderColor: D.accent, color: "#000" }}>
                                    <Plus size={13} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); addToCart(p) }}
                                  style={{
                                    width: 32, height: 32, borderRadius: "50%",
                                    background: D.accent,
                                    border: "none", cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    color: "#000",
                                    transition: "transform 0.1s",
                                  }}
                                >
                                  <Plus size={16} />
                                </button>
                              )}
                            </div>
                          </div>
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
      </>
      )}

      {/* ── Bottom Nav Bar ───────────────────────────────── */}
      {!cartOpen && !detailProduct && (
        <nav style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40,
          height: 72,
          background: "#18122A",
          borderTop: `1px solid ${D.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-around",
          paddingBottom: 8,
        }}>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "4px 16px" }}>
            <Home size={22} color={D.accent} />
            <span style={{ fontSize: 10, fontWeight: 500, color: D.accent }}>Início</span>
          </button>
          <button type="button" onClick={() => catalogRef.current?.scrollIntoView({ behavior: "smooth" })} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "4px 16px" }}>
            <Menu size={22} color="#4a3a6a" />
            <span style={{ fontSize: 10, fontWeight: 500, color: "#4a3a6a" }}>Cardápio</span>
          </button>
          <button type="button" onClick={() => { setCartView("bag"); setCartOpen(true) }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "4px 16px", position: "relative" }}>
            <div style={{ position: "relative" }}>
              <ShoppingBag size={22} color={cartCount > 0 ? D.accent : "#4a3a6a"} />
              {cartCount > 0 && (
                <span style={{
                  position: "absolute", top: -4, right: -6, minWidth: 16, height: 16,
                  background: D.accent, borderRadius: "50%",
                  fontSize: 8, fontWeight: 800, color: "#1c1630",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  lineHeight: 1,
                }}>
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: 500, color: cartCount > 0 ? D.accent : "#4a3a6a" }}>Sacola</span>
          </button>
          <button type="button" onClick={() => setMenuOpen(true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "4px 16px" }}>
            <User size={22} color="#4a3a6a" />
            <span style={{ fontSize: 10, fontWeight: 500, color: "#4a3a6a" }}>Perfil</span>
          </button>
        </nav>
      )}

      {/* ── Painel lateral do carrinho ──────────────────── */}
      {cartOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
          {/* Overlay */}
          <div
            onClick={() => { setCartOpen(false); setEditingOrder(null); if (cartView === "success") setCartView("bag") }}
            style={{ position: "absolute", inset: 0, background: D.overlay, backdropFilter: "blur(4px)" }}
          />
          {/* Painel */}
          <div style={{
            position: "relative", width: "100%", maxWidth: 420,
            background: D.bg,
            border: `1px solid ${D.border}`,
            display: "flex", flexDirection: "column",
            height: "100%", overflowY: "auto",
          }}>
            {/* Header do painel */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: `1px solid ${D.border}`,
              position: "sticky", top: 0,
              background: "rgba(26,27,46,0.95)",
              backdropFilter: "blur(12px)",
              zIndex: 1,
            }}>
              <div style={{ display: "flex", gap: 6 }}>
                {session?.user ? (
                  <>
                    <DarkTabBtn active={cartView === "bag"} onClick={() => setCartView("bag")}>
                      Carrinho
                    </DarkTabBtn>
                    <DarkTabBtn active={cartView === "orders"} onClick={() => setCartView("orders")}>
                      Meus pedidos
                    </DarkTabBtn>
                  </>
                ) : (
                  <span style={{ fontWeight: 700, fontSize: 16 }}>Carrinho</span>
                )}
              </div>
              <button
                onClick={() => { setCartOpen(false); setEditingOrder(null); if (cartView === "success") setCartView("bag") }}
                style={{ background: "none", border: "none", cursor: "pointer", color: D.textMuted, padding: 4, borderRadius: 8 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* ── Pedido realizado ── */}
            {cartView === "success" && lastOrder ? (
              <div style={{ padding: 24, flex: 1 }}>
                <div style={{
                  width: 60, height: 60, borderRadius: "50%",
                  background: "rgba(34,197,94,0.15)",
                  border: "1px solid rgba(34,197,94,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 18,
                }}>
                  <CheckCircle2 size={28} color={D.success} />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 20, marginBottom: 6, letterSpacing: "-0.4px" }}>
                  Pedido #{lastOrder.number} realizado!
                </h3>
                <p style={{ fontSize: 13, color: D.textMuted, marginBottom: 22, lineHeight: 1.5 }}>
                  {lastOrder.status === "PENDING"
                    ? "Você pode cancelar ou editar enquanto estiver pendente."
                    : "Seu pedido foi enviado para a cozinha."}
                </p>
                <div style={{
                  border: `1px solid ${D.border}`,
                  borderRadius: 14,
                  overflow: "hidden",
                  marginBottom: 20,
                  background: D.card,
                }}>
                  {lastOrder.items.map((item, i) => (
                    <div key={item.id} style={{
                      display: "flex", justifyContent: "space-between",
                      padding: "11px 16px", fontSize: 13,
                      borderTop: i > 0 ? `1px solid ${D.border}` : "none",
                      color: D.textSecondary,
                    }}>
                      <span>{item.quantity}x {item.product.name}{item.variation ? ` (${item.variation.name})` : ""}</span>
                      <span style={{ fontWeight: 600, color: D.textPrimary }}>{formatPrice(Number(item.unitPrice) * item.quantity)}</span>
                    </div>
                  ))}
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "13px 16px", fontWeight: 700, fontSize: 15,
                    borderTop: `1px solid ${D.border}`,
                    background: D.cardElevated,
                  }}>
                    <span>Total</span>
                    <span style={{ color: D.accent }}>{formatPrice(Number(lastOrder.total))}</span>
                  </div>
                </div>
                {lastOrder.status === "PENDING" && (
                  <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                    <button
                      onClick={() => setEditingOrder(lastOrder)}
                      style={{ ...darkOutlineBtn, flex: 1, justifyContent: "center" }}
                    >
                      <Pencil size={14} /> Editar
                    </button>
                    <button
                      onClick={() => handleCancelOrder(lastOrder.id)}
                      disabled={loading}
                      style={{ ...darkDangerBtn, flex: 1, justifyContent: "center" }}
                    >
                      <XCircle size={14} /> Cancelar
                    </button>
                  </div>
                )}
                <button
                  onClick={() => { setCartView("bag"); setLastOrder(null); setCheckoutStep("cart"); setCartOpen(false) }}
                  style={{ ...accentBtn, width: "100%", justifyContent: "center", padding: "13px 0", fontSize: 15 }}
                >
                  Novo pedido
                </button>
              </div>

            ) : cartView === "orders" && session?.user ? (
              /* ── Meus pedidos ── */
              <div style={{ padding: 20, flex: 1 }}>
                {myOrders.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px 0" }}>
                    <ShoppingBag size={36} style={{ marginBottom: 12, opacity: 0.2, color: D.textMuted }} />
                    <p style={{ color: D.textMuted, fontSize: 14 }}>Nenhum pedido ainda.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {myOrders.map((o) => (
                      <div key={o.id} style={{
                        border: `1px solid ${D.border}`,
                        borderRadius: 14,
                        overflow: "hidden",
                        background: D.card,
                      }}>
                        <div style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "12px 14px", background: D.cardElevated,
                        }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>Pedido #{o.number}</span>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100,
                            background: STATUS_COLOR[o.status] + "22",
                            color: STATUS_COLOR[o.status] ?? D.textMuted,
                            border: `1px solid ${STATUS_COLOR[o.status] ?? D.border}33`,
                          }}>
                            {STATUS_LABEL[o.status] ?? o.status}
                          </span>
                        </div>
                        <div style={{ padding: "12px 14px" }}>
                          {o.items.slice(0, 3).map((item) => (
                            <p key={item.id} style={{ fontSize: 13, color: D.textMuted, marginBottom: 3 }}>
                              {item.quantity}x {item.product.name}
                            </p>
                          ))}
                          {o.items.length > 3 && (
                            <p style={{ fontSize: 12, color: D.textMuted, opacity: 0.6 }}>+{o.items.length - 3} itens</p>
                          )}
                          <p style={{ fontWeight: 700, fontSize: 15, marginTop: 10, color: D.accent }}>
                            {formatPrice(Number(o.total))}
                          </p>

                          {editingOrder?.id === o.id ? (
                            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                              <input
                                id={`notes-${o.id}`}
                                defaultValue={o.notes || ""}
                                placeholder="Observações"
                                style={darkInputStyle}
                              />
                              {(o.type === "DELIVERY" || o.address) && (
                                <input
                                  id={`address-${o.id}`}
                                  defaultValue={o.address || ""}
                                  placeholder="Endereço"
                                  style={darkInputStyle}
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
                                  style={{ ...accentBtn, flex: 1, justifyContent: "center" }}
                                >
                                  Salvar
                                </button>
                                <button onClick={() => setEditingOrder(null)} style={{ ...darkOutlineBtn, flex: 1, justifyContent: "center" }}>
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : o.status === "PENDING" ? (
                            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                              <button
                                onClick={() => setEditingOrder(o)}
                                style={{ ...darkOutlineBtn, fontSize: 12, padding: "5px 12px" }}
                              >
                                <Pencil size={12} /> Editar
                              </button>
                              <button
                                onClick={() => handleCancelOrder(o.id)}
                                disabled={loading}
                                style={{ ...darkDangerBtn, fontSize: 12, padding: "5px 12px" }}
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
                    <div style={{ textAlign: "center", padding: "60px 0", color: D.textMuted }}>
                      <ShoppingBag size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                      <p style={{ fontSize: 14 }}>Carrinho vazio</p>
                      <p style={{ fontSize: 12, marginTop: 6, opacity: 0.6 }}>Adicione itens do cardápio</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      {cart.map((item, i) => (
                        <div key={item.productId} style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "14px 0",
                          borderBottom: i < cart.length - 1 ? `1px solid ${D.border}` : "none",
                        }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 3, color: D.textPrimary }}>{item.name}</p>
                            <p style={{ fontSize: 13, color: D.accent, fontWeight: 500 }}>{formatPrice(item.price)}</p>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button onClick={() => updateQty(item.productId, -1)} style={darkQtyBtn}>
                              <Minus size={13} />
                            </button>
                            <span style={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: "center", color: D.accent }}>
                              {item.quantity}
                            </span>
                            <button onClick={() => updateQty(item.productId, 1)} style={{ ...darkQtyBtn, background: D.accent, borderColor: D.accent, color: "#000" }}>
                              <Plus size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{
                  padding: "16px 20px",
                  borderTop: `1px solid ${D.border}`,
                  position: "sticky", bottom: 0,
                  background: "rgba(26,27,46,0.97)",
                  backdropFilter: "blur(12px)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
                    <span style={{ color: D.textSecondary }}>Subtotal</span>
                    <span style={{ color: D.accent }}>{formatPrice(subtotal)}</span>
                  </div>
                  {!session?.user && (
                    <p style={{ fontSize: 12, color: D.textMuted, textAlign: "center", marginBottom: 12 }}>
                      Faça login para identificar e acompanhar seu pedido
                    </p>
                  )}
                  <button
                    onClick={() => setCheckoutStep("service")}
                    disabled={cart.length === 0}
                    style={{
                      ...accentBtn,
                      width: "100%", justifyContent: "center", padding: "14px 0",
                      fontSize: 15, opacity: cart.length === 0 ? 0.4 : 1,
                    }}
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
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    fontSize: 13, color: D.textMuted,
                    background: "none", border: "none", cursor: "pointer",
                    marginBottom: 20, padding: 0,
                  }}
                >
                  <ChevronLeft size={16} /> Voltar
                </button>
                <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 18, letterSpacing: "-0.3px" }}>
                  Como quer receber?
                </h3>

                <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                  {(["PICKUP", "DELIVERY"] as const).map((type) => {
                    const active = serviceType === type
                    return (
                      <button
                        key={type}
                        onClick={() => setServiceType(type)}
                        style={{
                          flex: 1, padding: "14px 12px", borderRadius: 14, cursor: "pointer",
                          border: active ? `2px solid ${D.accent}` : `1px solid ${D.border}`,
                          background: active ? `${D.accent}18` : D.card,
                          textAlign: "left",
                          transition: "all 0.2s",
                        }}
                      >
                        <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: active ? D.accent : D.textPrimary }}>
                          {type === "PICKUP" ? "Retirada" : "Delivery"}
                        </p>
                        <p style={{ fontSize: 12, color: D.textMuted }}>
                          {type === "PICKUP" ? "Buscar no local" : `+${formatPrice(business?.deliveryFee ?? 0)}`}
                        </p>
                      </button>
                    )
                  })}
                </div>

                {serviceType === "DELIVERY" && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, color: D.textMuted, display: "block", marginBottom: 7, fontWeight: 500 }}>
                      Endereço de entrega
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Rua, número, bairro..."
                      style={darkInputStyle}
                    />
                  </div>
                )}

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, color: D.textMuted, display: "block", marginBottom: 7, fontWeight: 500 }}>
                    Observações (opcional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: sem cebola, ponto da carne..."
                    style={darkInputStyle}
                  />
                </div>

                <div style={{ marginTop: "auto" }}>
                  <div style={{
                    display: "flex", flexDirection: "column", gap: 8,
                    marginBottom: 18,
                    background: D.card,
                    borderRadius: 14,
                    border: `1px solid ${D.border}`,
                    padding: "14px 16px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: D.textMuted }}>
                      <span>Subtotal</span><span style={{ color: D.textSecondary }}>{formatPrice(subtotal)}</span>
                    </div>
                    {serviceType === "DELIVERY" && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: D.textMuted }}>
                        <span>Taxa de entrega</span><span style={{ color: D.textSecondary }}>{formatPrice(deliveryFeeVal)}</span>
                      </div>
                    )}
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      fontSize: 16, fontWeight: 700,
                      paddingTop: 10, borderTop: `1px solid ${D.border}`,
                    }}>
                      <span>Total</span>
                      <span style={{ color: D.accent }}>{formatPrice(totalWithFee)}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleFinalize}
                    disabled={loading}
                    style={{
                      ...accentBtn,
                      width: "100%", justifyContent: "center", padding: "14px 0",
                      fontSize: 15, opacity: loading ? 0.6 : 1,
                    }}
                  >
                    {loading ? "Enviando..." : "Finalizar pedido"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Detail Product Overlay ───────────────────────── */}
      {detailProduct && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60 }}>
          <div
            onClick={() => setDetailProduct(null)}
            style={{ position: "absolute", inset: 0, background: D.overlay, backdropFilter: "blur(4px)" }}
          />
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: D.bg,
            borderRadius: "24px 24px 0 0",
            maxHeight: "92vh",
            overflow: "hidden",
            display: "flex", flexDirection: "column",
          }}>
            {/* Hero image */}
            <div style={{ height: 240, position: "relative", flexShrink: 0, background: `linear-gradient(135deg, ${D.card}, ${D.cardElevated})` }}>
              {getImage(detailProduct) ? (
                <img src={getImage(detailProduct)!} alt={detailProduct.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80 }}>🍽</div>
              )}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(26,18,46,0.92) 0%, transparent 60%)" }} />
              {/* Back */}
              <button
                type="button"
                onClick={() => setDetailProduct(null)}
                style={{
                  position: "absolute", top: 16, left: 16,
                  width: 38, height: 38, borderRadius: "50%",
                  background: "rgba(28,22,48,0.75)", backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#fff",
                }}
              >
                <X size={18} />
              </button>
              {/* Heart */}
              <button
                type="button"
                onClick={() => toggleWishlist(detailProduct.id)}
                style={{
                  position: "absolute", top: 16, right: 16,
                  width: 38, height: 38, borderRadius: "50%",
                  background: "rgba(28,22,48,0.75)", backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <Heart size={18} fill={wishlist.has(detailProduct.id) ? D.danger : "none"} color={wishlist.has(detailProduct.id) ? D.danger : "#fff"} />
              </button>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 0" }}>
              {/* Carousel dots */}
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 16 }}>
                <div style={{ width: 28, height: 3, borderRadius: 2, background: D.accent }} />
                <div style={{ width: 6, height: 3, borderRadius: 3, background: D.cardElevated }} />
                <div style={{ width: 6, height: 3, borderRadius: 3, background: D.cardElevated }} />
              </div>
              {/* Title + category */}
              <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px", marginBottom: 4 }}>{detailProduct.name}</h2>
              <p style={{ fontSize: 13, color: D.textMuted, marginBottom: 14 }}>
                {categories.find((c) => c.id === detailProduct.category.id)?.name ?? ""}
              </p>
              {/* Review row */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ display: "flex" }}>
                  {["#7c4ae0", "#e07820", "#20a060"].map((color, i) => (
                    <div key={i} style={{
                      width: 26, height: 26, borderRadius: "50%",
                      background: color, border: `2px solid ${D.bg}`,
                      marginRight: -8, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, color: "#fff", fontWeight: 600, flexShrink: 0,
                    }}>
                      {["A", "B", "C"][i]}
                    </div>
                  ))}
                </div>
                <span style={{ fontSize: 12, color: D.textMuted, marginLeft: 12 }}>+120 avaliações</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} size={12} fill={s <= 4 ? D.accent : "none"} color={D.accent} />
                  ))}
                </div>
              </div>
              {/* Description */}
              {detailProduct.description && (
                <p style={{ color: D.textMuted, fontSize: 13, lineHeight: 1.65, marginBottom: 18 }}>
                  {detailProduct.description}
                </p>
              )}
              {/* Macro grid */}
              {(() => {
                const n = nutritionFromId(detailProduct.id)
                return (
                  <div style={{ display: "flex", marginBottom: 20, background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12, borderRight: `1px solid ${D.border}` }}>
                      <div>
                        <p style={{ color: D.textMuted, fontSize: 11, fontWeight: 500 }}>Proteína</p>
                        <p style={{ color: D.textPrimary, fontSize: 18, fontWeight: 700 }}>{n.protein}<span style={{ fontSize: 11, fontWeight: 400, color: D.textMuted }}>g</span></p>
                      </div>
                      <div>
                        <p style={{ color: D.textMuted, fontSize: 11, fontWeight: 500 }}>Gorduras</p>
                        <p style={{ color: D.textPrimary, fontSize: 18, fontWeight: 700 }}>{n.fat}<span style={{ fontSize: 11, fontWeight: 400, color: D.textMuted }}>g</span></p>
                      </div>
                    </div>
                    <div style={{ flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                      <div>
                        <p style={{ color: D.textMuted, fontSize: 11, fontWeight: 500 }}>Calorias</p>
                        <p style={{ color: D.textPrimary, fontSize: 18, fontWeight: 700 }}>{n.calories}<span style={{ fontSize: 11, fontWeight: 400, color: D.textMuted }}>kcal</span></p>
                      </div>
                      <div>
                        <p style={{ color: D.textMuted, fontSize: 11, fontWeight: 500 }}>Carboidratos</p>
                        <p style={{ color: D.textPrimary, fontSize: 18, fontWeight: 700 }}>{n.carbs}<span style={{ fontSize: 11, fontWeight: 400, color: D.textMuted }}>g</span></p>
                      </div>
                    </div>
                  </div>
                )
              })()}
              {/* Price + qty stepper */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div>
                  <p style={{ color: D.textMuted, fontSize: 12, marginBottom: 2 }}>Preço</p>
                  <p style={{ color: D.accent, fontSize: 24, fontWeight: 700, letterSpacing: "-0.3px" }}>
                    {formatPrice(Number(detailProduct.price))}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, overflow: "hidden" }}>
                  <button
                    type="button"
                    onClick={() => setDetailQty((q) => Math.max(1, q - 1))}
                    style={{ width: 36, height: 36, background: D.cardElevated, border: "none", cursor: "pointer", color: D.accent, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >−</button>
                  <span style={{ padding: "0 14px", color: D.textPrimary, fontSize: 15, fontWeight: 700 }}>{detailQty}</span>
                  <button
                    type="button"
                    onClick={() => setDetailQty((q) => Math.min(10, q + 1))}
                    style={{ width: 36, height: 36, background: D.cardElevated, border: "none", cursor: "pointer", color: D.accent, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >+</button>
                </div>
              </div>
            </div>

            {/* Fixed CTA */}
            <div style={{ padding: "12px 20px 28px", borderTop: `1px solid ${D.border}`, background: D.bg, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => {
                  for (let i = 0; i < detailQty; i++) addToCart(detailProduct)
                  setDetailProduct(null)
                }}
                style={{
                  ...accentBtn,
                  width: "100%", justifyContent: "center",
                  padding: "15px 0", fontSize: 15, borderRadius: 14,
                }}
              >
                <ShoppingBag size={18} />
                Adicionar à sacola — {formatPrice(Number(detailProduct.price) * detailQty)}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────

function DarkTabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px", fontSize: 13, borderRadius: 100,
        background: active ? D.accent : "none",
        color: active ? "#000" : D.textMuted,
        border: active ? "none" : `1px solid ${D.border}`,
        cursor: "pointer", fontWeight: active ? 700 : 400,
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  )
}

// ── Shared styles ────────────────────────────────────────

const menuDrawerBtn: React.CSSProperties = {
  width: "100%",
  background: "none",
  color: D.textSecondary,
  border: `1px solid ${D.border}`,
  borderRadius: 10,
  cursor: "pointer",
  padding: "11px 14px",
  fontSize: 14,
  fontWeight: 500,
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 8,
}

const accentBtn: React.CSSProperties = {
  background: D.accent,
  color: "#000",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  padding: "10px 18px",
  fontSize: 14,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
}

const darkGhostBtn: React.CSSProperties = {
  background: D.card,
  color: D.textSecondary,
  border: `1px solid ${D.border}`,
  borderRadius: 8,
  cursor: "pointer",
  padding: "6px 12px",
  fontSize: 13,
  fontWeight: 400,
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
}

const darkOutlineBtn: React.CSSProperties = {
  background: "none",
  color: D.textSecondary,
  border: `1px solid ${D.border}`,
  borderRadius: 8,
  cursor: "pointer",
  padding: "9px 16px",
  fontSize: 13,
  fontWeight: 500,
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
}

const darkDangerBtn: React.CSSProperties = {
  background: "rgba(239,68,68,0.1)",
  color: D.danger,
  border: "1px solid rgba(239,68,68,0.3)",
  borderRadius: 8,
  cursor: "pointer",
  padding: "9px 16px",
  fontSize: 13,
  fontWeight: 500,
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
}

const darkQtyBtn: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: "50%",
  background: D.cardElevated,
  color: D.textSecondary,
  border: `1px solid ${D.border}`,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
}

const darkInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  fontSize: 14,
  border: `1px solid ${D.border}`,
  borderRadius: 10,
  outline: "none",
  boxSizing: "border-box",
  background: D.card,
  color: D.textPrimary,
}

// ── Export ───────────────────────────────────────────────
export default function Page() {
  return (
    <Suspense>
      <LojaPage />
    </Suspense>
  )
}
