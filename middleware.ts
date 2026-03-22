/**
 * Middleware - Autenticação, autorização e rate limiting
 *
 * MUDANÇAS nesta versão:
 * 1. Rate limiting adicionado para rotas públicas críticas:
 *    - POST /api/orders   → 10 pedidos/minuto por IP
 *      (impede spam de pedidos falsos que travam a cozinha)
 *    - POST /api/auth/login → 5 tentativas/minuto por IP
 *      (impede brute force de senha)
 *    - GET  /api/products, /api/categories → 60 req/minuto por IP
 *      (impede scraping agressivo do cardápio)
 *    - Rotas autenticadas → 120 req/minuto por IP
 *      (proteção geral contra uso abusivo do painel)
 *
 * 2. Resposta 429 com header Retry-After padrão HTTP
 *    → clientes bem-comportados sabem quando tentar de novo
 */
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"
import { rateLimit, getIp } from "@/lib/rate-limit"

const PUBLIC_PATHS = ["/login", "/loja"]
const API_PUBLIC_PATHS = ["/api/products", "/api/categories", "/api/business"]

const ROLE_ROUTES: Record<string, string[]> = {
  "/settings":  ["ADMIN"],
  "/reports":   ["ADMIN", "MANAGER"],
  "/expenses":  ["ADMIN", "MANAGER"],
  "/cash":      ["ADMIN", "MANAGER"],
  "/customers": ["ADMIN", "MANAGER", "STAFF"],
  "/kitchen":   ["ADMIN", "MANAGER", "KITCHEN", "STAFF"],
  "/inventory": ["ADMIN", "MANAGER", "STAFF"],
}

const API_ROLE_ROUTES: Record<string, string[]> = {
  "/api/settings": ["ADMIN"],
  "/api/reports":  ["ADMIN", "MANAGER"],
  "/api/expenses": ["ADMIN", "MANAGER"],
  "/api/cash":     ["ADMIN", "MANAGER"],
  "/api/users":    ["ADMIN"],
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

function isApiPublicPath(pathname: string, method: string): boolean {
  // NextAuth: callback OAuth, session, CSRF, etc. (login Google na loja)
  if (pathname.startsWith("/api/auth")) return true
  if (API_PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true
  if (pathname === "/api/orders" && method === "POST") return true
  if (pathname.startsWith("/api/auth/customer")) return true
  if (pathname === "/api/auth/login") return true
  if (pathname === "/api/orders/me" && method === "GET") return true
  if (pathname.match(/^\/api\/orders\/[^/]+$/) && method === "GET") return true
  return false
}

function getRequiredRoles(
  pathname: string,
  routes: Record<string, string[]>
): string[] | null {
  const entry = Object.entries(routes).find(
    ([path]) => pathname === path || pathname.startsWith(path + "/")
  )
  return entry ? entry[1] : null
}

/** Resposta 429 padronizada com header Retry-After */
function tooManyRequests(retryAfterMs: number) {
  const retryAfterSec = Math.ceil(retryAfterMs / 1000)
  return NextResponse.json(
    { error: "Muitas tentativas. Aguarde antes de tentar novamente." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "X-RateLimit-Limit": "true",
      },
    }
  )
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method
  const ip = getIp(request)

  // ── 1. Rotas de página pública ──────────────────────────────────────────
  if (isPublicPath(pathname)) {
    const token = request.cookies.get("auth-token")?.value
    if (pathname.startsWith("/login") && token && verifyToken(token)) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
  }

  // ── 2. Rate limiting por rota ───────────────────────────────────────────

  // Login: 5 tentativas por minuto — após isso, bloqueia por 5 minutos
  if (pathname === "/api/auth/login" && method === "POST") {
    const result = rateLimit(`login:${ip}`, {
      limit: 5,
      windowMs: 60_000,       // janela: 1 minuto
      blockMs: 5 * 60_000,    // bloqueio: 5 minutos após exceder
    })
    if (!result.allowed) return tooManyRequests(result.retryAfterMs)
    return NextResponse.next()
  }

  // Criar pedido: 10 por minuto por IP
  // Proteção contra spam de pedidos falsos que travam a cozinha
  if (pathname === "/api/orders" && method === "POST") {
    const result = rateLimit(`orders:${ip}`, {
      limit: 10,
      windowMs: 60_000,
      blockMs: 2 * 60_000,
    })
    if (!result.allowed) return tooManyRequests(result.retryAfterMs)
    // Continua para isApiPublicPath abaixo
  }

  // Catálogo: 60 requests por minuto — proteção contra scraping
  if (API_PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const result = rateLimit(`catalog:${ip}`, {
      limit: 60,
      windowMs: 60_000,
    })
    if (!result.allowed) return tooManyRequests(result.retryAfterMs)
    // Continua para isApiPublicPath abaixo
  }

  // ── 3. APIs públicas ────────────────────────────────────────────────────
  if (isApiPublicPath(pathname, method)) {
    return NextResponse.next()
  }

  // ── 4. Verificar token ──────────────────────────────────────────────────
  const token = request.cookies.get("auth-token")?.value
  const payload = token ? verifyToken(token) : null

  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("from", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── 5. Rate limiting para rotas autenticadas ────────────────────────────
  // Proteção geral — staff legítimo nunca vai chegar perto desse limite
  if (pathname.startsWith("/api/")) {
    const result = rateLimit(`auth:${payload.userId}`, {
      limit: 120,
      windowMs: 60_000,
    })
    if (!result.allowed) return tooManyRequests(result.retryAfterMs)
  }

  // ── 6. RBAC para APIs ───────────────────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    const requiredRoles = getRequiredRoles(pathname, API_ROLE_ROUTES)
    if (requiredRoles && !requiredRoles.includes(payload.role)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }
    return NextResponse.next()
  }

  // ── 7. RBAC para páginas ────────────────────────────────────────────────
  const requiredRoles = getRequiredRoles(pathname, ROLE_ROUTES)
  if (requiredRoles && !requiredRoles.includes(payload.role)) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
