export const dynamic = "force-dynamic"
/**
 * API de Caixa do Dia
 * GET → resumo financeiro por dia (total pago, por forma de pagamento)
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get("date") // formato YYYY-MM-DD opcional

    const now = new Date()
    let baseDate: Date
    if (dateParam) {
      const [y, m, d] = dateParam.split("-").map((v) => parseInt(v, 10))
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        baseDate = new Date(y, m - 1, d)
      } else {
        baseDate = now
      }
    } else {
      baseDate = now
    }

    const start = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
    )
    const end = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate() + 1,
    )

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: start, lt: end },
        status: { not: "CANCELLED" },
      },
      orderBy: { createdAt: "asc" },
    })

    const paidOrders = orders.filter((o) => o.paymentStatus === "PAID")
    const unpaidOrders = orders.filter((o) => o.paymentStatus !== "PAID")

    const totalPaid = paidOrders.reduce((sum, o) => sum + o.total, 0)
    const totalUnpaid = unpaidOrders.reduce((sum, o) => sum + o.total, 0)

    const byMethod = paidOrders.reduce(
      (acc, o) => {
        const method = (o.paymentMethod || "OTHER") as
          | "CASH"
          | "PIX"
          | "CARD"
          | "OTHER"
        acc[method] = (acc[method] || 0) + o.total
        return acc
      },
      {} as Record<"CASH" | "PIX" | "CARD" | "OTHER", number>,
    )

    return NextResponse.json({
      date: start.toISOString(),
      totalPaid,
      totalUnpaid,
      cash: byMethod.CASH || 0,
      pix: byMethod.PIX || 0,
      card: byMethod.CARD || 0,
      other: byMethod.OTHER || 0,
      paidCount: paidOrders.length,
      unpaidCount: unpaidOrders.length,
      orders,
    })
  } catch (error) {
    console.error("[API] Erro ao buscar caixa do dia:", error)
    return NextResponse.json(
      { error: "Erro ao buscar caixa do dia" },
      { status: 500 },
    )
  }
}

