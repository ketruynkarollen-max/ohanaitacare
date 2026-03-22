export const dynamic = "force-dynamic"
/**
 * API da DRE — Demonstração do Resultado do Exercício
 * GET → receitas (pedidos) + despesas + lucro líquido por período
 *
 * Query params:
 *   from  → ISO date string (ex: 2025-01-01)
 *   to    → ISO date string (ex: 2025-01-31)
 *   period → "this_month" | "last_month" | "last_7" | "last_30" (atalhos)
 *            Se `from`/`to` forem fornecidos, têm prioridade.
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fromParam = searchParams.get("from")
    const toParam   = searchParams.get("to")
    const period    = searchParams.get("period") || "this_month"

    const now = new Date()
    let from: Date
    let to: Date
    let periodLabel: string

    if (fromParam && toParam) {
      from = startOfDay(new Date(fromParam))
      to   = endOfDay(new Date(toParam))
      periodLabel = "Período personalizado"
    } else if (period === "last_month") {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      to   = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0))
      periodLabel = "Mês passado"
    } else if (period === "last_7") {
      from = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000))
      to   = endOfDay(now)
      periodLabel = "Últimos 7 dias"
    } else if (period === "last_30") {
      from = startOfDay(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000))
      to   = endOfDay(now)
      periodLabel = "Últimos 30 dias"
    } else {
      // this_month (padrão)
      from = new Date(now.getFullYear(), now.getMonth(), 1)
      to   = endOfDay(now)
      periodLabel = "Este mês"
    }

    // ── Pedidos no período (não cancelados) ──────────────────────────────────
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        status: { not: "CANCELLED" },
      },
      select: {
        id: true,
        total: true,
        subtotal: true,
        discount: true,
        deliveryFee: true,
        paymentStatus: true,
        createdAt: true,
      },
    })

    const grossRevenue   = orders.reduce((s, o) => s + o.total, 0)
    const totalDiscounts = orders.reduce((s, o) => s + (o.discount ?? 0), 0)
    const netRevenue     = grossRevenue - totalDiscounts

    const paidRevenue    = orders
      .filter((o) => o.paymentStatus === "PAID")
      .reduce((s, o) => s + o.total, 0)
    const pendingRevenue = grossRevenue - paidRevenue

    const orderCount     = orders.length
    const avgTicket      = orderCount > 0 ? grossRevenue / orderCount : 0

    // ── Despesas no período ──────────────────────────────────────────────────
    const expenses = await prisma.expense.findMany({
      where: {
        date: { gte: from, lte: to },
      },
      select: {
        amount: true,
        category: true,
        date: true,
      },
    })

    const expenseCategories = ["FOOD", "SALARY", "RENT", "UTILITIES", "OTHER"] as const
    type ExpCat = typeof expenseCategories[number]

    const expenseByCategory = expenseCategories.reduce(
      (acc, cat) => {
        acc[cat] = expenses
          .filter((e) => e.category === cat)
          .reduce((s, e) => s + e.amount, 0)
        return acc
      },
      {} as Record<ExpCat, number>,
    )

    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

    // ── Resultado ────────────────────────────────────────────────────────────
    const operationalResult = netRevenue - totalExpenses
    const profitMargin =
      netRevenue > 0 ? (operationalResult / netRevenue) * 100 : 0

    // ── Breakdown diário (receita vs despesas por dia) ───────────────────────
    const revenueByDay: Record<string, number> = {}
    for (const o of orders) {
      const d = o.createdAt.toISOString().slice(0, 10)
      revenueByDay[d] = (revenueByDay[d] || 0) + o.total
    }

    const expensesByDay: Record<string, number> = {}
    for (const e of expenses) {
      const d = new Date(e.date).toISOString().slice(0, 10)
      expensesByDay[d] = (expensesByDay[d] || 0) + e.amount
    }

    // Unir todas as datas existentes
    const allDates = Array.from(
      new Set([...Object.keys(revenueByDay), ...Object.keys(expensesByDay)]),
    ).sort()

    const byDay = allDates.map((date) => ({
      date,
      revenue:  revenueByDay[date]  ?? 0,
      expenses: expensesByDay[date] ?? 0,
      profit:   (revenueByDay[date] ?? 0) - (expensesByDay[date] ?? 0),
    }))

    return NextResponse.json({
      period: {
        from: from.toISOString(),
        to:   to.toISOString(),
        label: periodLabel,
      },
      revenue: {
        gross:      grossRevenue,
        discounts:  totalDiscounts,
        net:        netRevenue,
        paid:       paidRevenue,
        pending:    pendingRevenue,
        orderCount,
        avgTicket,
      },
      expenses: {
        total:      totalExpenses,
        byCategory: expenseByCategory,
      },
      result: {
        operational: operationalResult,
        margin:      profitMargin,
      },
      byDay,
    })
  } catch (error) {
    console.error("[API] Erro ao gerar DRE:", error)
    return NextResponse.json({ error: "Erro ao gerar DRE" }, { status: 500 })
  }
}
