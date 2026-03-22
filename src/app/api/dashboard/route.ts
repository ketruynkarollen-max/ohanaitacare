export const dynamic = "force-dynamic"
/**
 * API do Dashboard - métricas resumidas
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [ordersToday, ordersPreparing, ordersOnlineToday, productCount, customerCount] = await Promise.all([
      prisma.order.aggregate({
        where: {
          createdAt: { gte: today },
          status: { not: "CANCELLED" },
        },
        _sum: { total: true },
        _count: true,
      }),
      prisma.order.count({
        where: { status: { in: ["PENDING", "CONFIRMED", "PREPARING"] } },
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: today },
          source: "ONLINE",
          status: { not: "CANCELLED" },
        },
      }),
      prisma.product.count({ where: { active: true } }),
      prisma.customer.count(),
    ])

    return NextResponse.json({
      salesToday: ordersToday._sum.total ?? 0,
      ordersToday: ordersToday._count,
      ordersOnlineToday,
      ordersPreparing,
      productCount,
      customerCount,
    })
  } catch (error) {
    console.error("[API] Erro ao buscar dashboard:", error)
    return NextResponse.json(
      { error: "Erro ao buscar dados" },
      { status: 500 }
    )
  }
}
