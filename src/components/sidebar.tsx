"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  UtensilsCrossed,
  ScrollText,
  CookingPot,
  Boxes,
  Users,
  LineChart,
  Settings,
  Receipt,
  Square,
  Store,
  ListChecks,
  Wallet,
  Flame,
  TrendingUp,
  FlaskConical,
  BarChart2,
  Telescope,
} from "lucide-react"
import clsx from "clsx"

const navSections = [
  {
    label: "Principal",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/pos", label: "PDV", icon: ScrollText },
      { href: "/orders", label: "Pedidos", icon: ListChecks },
      { href: "/kitchen", label: "Cozinha", icon: CookingPot },
      { href: "/tables", label: "Mesas", icon: Square },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/menu", label: "Cardápio", icon: UtensilsCrossed },
      { href: "/inventory", label: "Inventário", icon: Boxes },
      { href: "/ingredients", label: "Ingredientes", icon: FlaskConical },
      { href: "/customers", label: "Clientes", icon: Users },
      { href: "/expenses", label: "Despesas", icon: Receipt },
      { href: "/cash", label: "Caixa do dia", icon: Wallet },
    ],
  },
  {
    label: "Análises",
    items: [
      { href: "/reports", label: "Relatórios", icon: LineChart },
      { href: "/dre",               label: "DRE / Resultado",  icon: TrendingUp },
      { href: "/cmv",               label: "CMV / Fichas",     icon: BarChart2 },
      { href: "/menu-engineering",  label: "Eng. Cardápio",    icon: Telescope },
    ],
  },
]

const bottomItems = [
  { href: "/loja", label: "Abrir loja", icon: Store, external: true },
  { href: "/settings", label: "Configurações", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href))

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Flame className="h-4 w-4 text-white" />
        </div>
        <span className="sidebar-logo-text">Brasa</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.label} style={{ marginBottom: 8 }}>
            <div className="sidebar-section-label">{section.label}</div>
            {section.items.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx("sidebar-link", active && "sidebar-link-active")}
                >
                  <Icon
                    className="h-4 w-4 flex-shrink-0"
                    style={{ color: active ? "white" : "var(--text-muted)" }}
                  />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom items */}
      <div className="sidebar-footer">
        {bottomItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
              className={clsx("sidebar-link", active && "sidebar-link-active")}
            >
              <Icon
                className="h-4 w-4 flex-shrink-0"
                style={{ color: active ? "white" : "var(--text-muted)" }}
              />
              <span>{item.label}</span>
            </Link>
          )
        })}
        <div
          style={{
            marginTop: 12,
            fontSize: 10,
            color: "var(--text-muted)",
            paddingLeft: 4,
          }}
        >
          Servidor próprio · Online
        </div>
      </div>
    </aside>
  )
}
