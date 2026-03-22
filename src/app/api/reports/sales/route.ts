/**
 * API de Relatórios de Vendas
 * GET → métricas agregadas (total, pedidos, por período)
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "today" // today, week, month

    const now = new Date()
    let start: Date

    if (period === "today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (period === "week") {
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      start = new Date(now.getFullYear(), now.getMonth(), diff)
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: start },
        status: { not: "CANCELLED" },
      },
      include: {
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const total = orders.reduce((sum, o) => sum + o.total, 0)
    const byDay = orders.reduce<Record<string, number>>((acc, o) => {
      const d = o.createdAt.toISOString().slice(0, 10)
      acc[d] = (acc[d] || 0) + o.total
      return acc
    }, {})

    const byProduct = orders.reduce<Record<string, { name: string; qty: number; total: number }>>((acc, o) => {
      for (const item of o.items) {
        const key = item.productId
        if (!acc[key]) {
          acc[key] = { name: item.product.name, qty: 0, total: 0 }
        }
        acc[key].qty += item.quantity
        acc[key].total += item.quantity * item.unitPrice
      }
      return acc
    }, {})

    const topProducts = Object.entries(byProduct)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    return NextResponse.json({
      total,
      orderCount: orders.length,
      avgOrder: orders.length > 0 ? total / orders.length : 0,
      byDay: Object.entries(byDay).map(([date, value]) => ({ date, value })),
      topProducts,
      recentOrders: orders.slice(0, 20),
    })
  } catch (error) {
    console.error("[API] Erro ao buscar relatórios:", error)
    return NextResponse.json(
      { error: "Erro ao buscar relatórios" },
      { status: 500 }
    )
  }
}
