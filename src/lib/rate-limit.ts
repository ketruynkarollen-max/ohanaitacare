/**
 * Rate Limiting — Edge Runtime (Vercel Middleware)
 *
 * Funciona com Map em memória no Edge — sem Redis, sem biblioteca externa.
 * Cada instância do Edge Worker tem sua própria memória, então o limite
 * é por instância (não global). Para produção com muito tráfego, use
 * Upstash Redis + @upstash/ratelimit. Para um restaurante pequeno/médio,
 * esta solução é suficiente e gratuita.
 *
 * COMO FUNCIONA (sliding window):
 * - Cada IP tem uma lista de timestamps das suas requisições recentes
 * - A cada request, timestamps velhos são descartados
 * - Se o IP ainda tem muitos requests no janela de tempo → bloqueia
 * - Entradas antigas são limpas automaticamente para não vazar memória
 */

type RateLimitEntry = {
  timestamps: number[]
  blockedUntil?: number
}

const store = new Map<string, RateLimitEntry>()

// Limpa entradas inativas a cada 5 minutos para não vazar memória
let lastCleanup = Date.now()
function maybeCleanup() {
  const now = Date.now()
  if (now - lastCleanup < 5 * 60 * 1000) return
  lastCleanup = now
  for (const [key, entry] of store.entries()) {
    const windowMs = 60_000
    const cutoff = now - windowMs
    if (
      entry.timestamps.every((t) => t < cutoff) &&
      (!entry.blockedUntil || entry.blockedUntil < now)
    ) {
      store.delete(key)
    }
  }
}

export type RateLimitConfig = {
  /** Número máximo de requests permitidos na janela */
  limit: number
  /** Tamanho da janela em milissegundos */
  windowMs: number
  /** Quanto tempo bloquear após exceder o limite (ms). Default: windowMs */
  blockMs?: number
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterMs: number
}

export function rateLimit(ip: string, config: RateLimitConfig): RateLimitResult {
  maybeCleanup()

  const { limit, windowMs, blockMs = windowMs } = config
  const now = Date.now()
  const cutoff = now - windowMs

  const entry = store.get(ip) ?? { timestamps: [] }

  // Se ainda está bloqueado
  if (entry.blockedUntil && entry.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: entry.blockedUntil - now,
    }
  }

  // Descarta timestamps fora da janela
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff)

  if (entry.timestamps.length >= limit) {
    // Excedeu — bloqueia por blockMs
    entry.blockedUntil = now + blockMs
    store.set(ip, entry)
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: blockMs,
    }
  }

  // Permite e registra o timestamp
  entry.timestamps.push(now)
  entry.blockedUntil = undefined
  store.set(ip, entry)

  return {
    allowed: true,
    remaining: limit - entry.timestamps.length,
    retryAfterMs: 0,
  }
}

/**
 * Extrai o IP real do request, considerando proxies (Vercel, Cloudflare)
 */
export function getIp(request: Request): string {
  const headers = new Headers((request as any).headers)
  return (
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  )
}
