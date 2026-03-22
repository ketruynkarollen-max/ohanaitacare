"use client"

/**
 * Dashboard - Visão geral com métricas em tempo real
 */
import { useEffect, useState } from "react"
import { useOrderNotifications } from "@/hooks/useOrderNotifications"
import Link from "next/link"
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  Package,
  Users,
  ArrowUpRight,
  RefreshCw,
  ScrollText,
  CookingPot,
  UtensilsCrossed,
  ListChecks,
} from "lucide-react"

const shortcuts = [
  {
    href: "/pos",
    label: "Abrir PDV",
    description: "Lançar pedidos de mesa, balcão e delivery",
    icon: ScrollText,
    color: "metric-icon-purple",
  },
  {
    href: "/orders",
    label: "Pedidos",
    description: "Todos os pedidos, incluindo da loja online",
    icon: ListChecks,
    color: "metric-icon-blue",
  },
  {
    href: "/kitchen",
    label: "Ver Cozinha",
    description: "Controle em tempo real dos pedidos",
    icon: CookingPot,
    color: "metric-icon-amber",
  },
  {
    href: "/menu",
    label: "Cardápio",
    description: "Organize categorias, preços e fotos",
    icon: UtensilsCrossed,
    color: "metric-icon-green",
  },
]

type DashboardData = {
  salesToday: number
  ordersToday: number
  ordersOnlineToday: number
  ordersPreparing: number
  productCount: number
  customerCount: number
}

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useOrderNotifications()

  const loadData = () => {
    setLoading(true)
    fetch("/api/dashboard", { cache: "no-store" })
      .then((res) => res.json())
      .then((d) => {
        if (d && !d.error) setData(d)
        else setData(null)
        setLoading(false)
        setLastUpdated(new Date())
      })
      .catch(() => {
        setData(null)
        setLoading(false)
      })
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [])

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)

  const metrics = [
    {
      label: "Vendas hoje",
      value: loading
        ? null
        : data
        ? formatPrice(data.salesToday)
        : "R$ 0,00",
      icon: TrendingUp,
      iconClass: "metric-icon-purple",
      badge: null,
    },
    {
      label: "Pedidos hoje",
      value: loading ? null : data ? String(data.ordersToday) : "0",
      icon: ShoppingBag,
      iconClass: "metric-icon-blue",
      badge:
        !loading && data && data.ordersOnlineToday > 0
          ? `${data.ordersOnlineToday} online`
          : null,
    },
    {
      label: "Em preparo",
      value: loading ? null : data ? String(data.ordersPreparing) : "0",
      icon: Clock,
      iconClass: "metric-icon-amber",
      badge: null,
    },
    {
      label: "Produtos ativos",
      value: loading ? null : data ? String(data.productCount) : "0",
      icon: Package,
      iconClass: "metric-icon-green",
      badge: null,
    },
  ]

  return (
    <div className="animate-fade-in page-body">

      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Visão geral de vendas, pedidos e métricas do restaurante.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            onClick={loadData}
            className="btn-refresh"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw
              className="h-3.5 w-3.5"
              style={{
                color: "var(--text-muted)",
                animation: loading ? "spin 1s linear infinite" : "none",
              }}
            />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <div key={metric.label} className="card-metric">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="card-metric-label">{metric.label}</span>
                <div className={`metric-icon ${metric.iconClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="card-metric-value">
                {metric.value === null ? (
                  <span
                    style={{ fontSize: 14, color: "var(--text-muted)" }}
                    className="animate-pulse-soft"
                  >
                    —
                  </span>
                ) : (
                  metric.value
                )}
              </div>
              {metric.badge && (
                <span className="card-metric-badge badge-up">
                  <ArrowUpRight className="h-3 w-3" />
                  {metric.badge}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Main Grid: Shortcuts + Banner */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>

        {/* Shortcuts */}
        <div>
          <div style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Atalhos rápidos
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {shortcuts.map((s) => {
              const Icon = s.icon
              return (
                <Link key={s.href} href={s.href} className="shortcut-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div className={`metric-icon ${s.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                      {s.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                    {s.description}
                  </p>
                  <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                    <ArrowUpRight className="h-4 w-4" style={{ color: "var(--accent)" }} />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Total Sales ring card */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                Resumo de vendas
              </span>
            </div>

            {/* Ring / Progress visual */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", letterSpacing: -0.5 }}>
                  {loading ? "—" : data ? data.ordersToday : "0"}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>pedidos hoje</div>
                {!loading && data && data.ordersOnlineToday > 0 && (
                  <span className="card-metric-badge badge-up" style={{ marginTop: 8 }}>
                    <ArrowUpRight className="h-3 w-3" />
                    {data.ordersOnlineToday} online
                  </span>
                )}
              </div>

              {/* Simple ring */}
              <div style={{ position: "relative", width: 72, height: 72 }}>
                <svg width="72" height="72" viewBox="0 0 72 72">
                  <circle
                    cx="36" cy="36" r="28"
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth="7"
                  />
                  <circle
                    cx="36" cy="36" r="28"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray="175.93"
                    strokeDashoffset={
                      data
                        ? Math.max(175.93 - (data.ordersToday / Math.max(data.ordersToday + 10, 30)) * 175.93, 20)
                        : 140
                    }
                    transform="rotate(-90 36 36)"
                    style={{ transition: "stroke-dashoffset 0.6s ease" }}
                  />
                </svg>
                <div style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--accent)",
                }}>
                  {loading ? "—" : data ? data.ordersToday : "0"}
                </div>
              </div>
            </div>
          </div>

          {/* Gradient promo banner */}
          <div className="banner-gradient">
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Users className="h-4 w-4 text-white" />
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>
                  Clientes cadastrados
                </span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "white", letterSpacing: -0.4 }}>
                {loading ? "—" : data ? data.customerCount : "0"}
              </div>
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  padding: "2px 8px",
                  borderRadius: 999,
                }}>
                  Total na base
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Last updated */}
      {lastUpdated && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "right" }}>
          Última atualização: {lastUpdated.toLocaleTimeString("pt-BR")}
        </div>
      )}

    </div>
  )
}
