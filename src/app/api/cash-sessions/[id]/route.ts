export const dynamic = "force-dynamic"
/**
 * PATCH /api/cash-sessions/[id]  → fecha o caixa
 *  body: {
 *    closingBalance: number,   // contagem física de dinheiro
 *    notes?: string,
 *    // totais dos pedidos do dia são calculados aqui server-side
 *  }
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function dayStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}
function dayEnd(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json()
    const { closingBalance, notes } = body

    if (typeof closingBalance !== "number" || closingBalance < 0) {
      return NextResponse.json({ error: "Saldo de fechamento inválido" }, { status: 400 })
    }

    // Busca a sessão
    const session = await prisma.cashSession.findUnique({ where: { id: params.id } })
    if (!session) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 })
    }
    if (session.status === "CLOSED") {
      return NextResponse.json({ error: "Caixa já fechado" }, { status: 409 })
    }

    // Calcula totais dos pedidos PAGOS no dia desta sessão
    const sessionDate = new Date(session.date)
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: dayStart(sessionDate), lte: dayEnd(sessionDate) },
        status:    { not: "CANCELLED" },
        paymentStatus: "PAID",
      },
      select: { total: true, paymentMethod: true },
    })

    const totalCash  = orders.filter((o) => o.paymentMethod === "CASH").reduce((s, o) => s + o.total, 0)
    const totalPix   = orders.filter((o) => o.paymentMethod === "PIX").reduce((s, o) => s + o.total, 0)
    const totalCard  = orders.filter((o) => o.paymentMethod === "CARD").reduce((s, o) => s + o.total, 0)
    const totalOther = orders.filter((o) => !["CASH", "PIX", "CARD"].includes(o.paymentMethod ?? "")).reduce((s, o) => s + o.total, 0)
    const totalOrders = totalCash + totalPix + totalCard + totalOther

    // Saldo esperado na gaveta: troco inicial + dinheiro recebido
    const expectedCash = session.openingBalance + totalCash
    const difference   = closingBalance - expectedCash

    const updated = await prisma.cashSession.update({
      where: { id: params.id },
      data: {
        status:        "CLOSED",
        closedAt:      new Date(),
        totalCash,
        totalPix,
        totalCard,
        totalOther,
        totalOrders,
        expectedCash,
        closingBalance,
        difference,
        notes:         notes?.trim() || null,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[API] Erro ao fechar caixa:", error)
    return NextResponse.json({ error: "Erro ao fechar caixa" }, { status: 500 })
  }
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await prisma.cashSession.findUnique({ where: { id: params.id } })
    if (!session) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json(session)
  } catch {
    return NextResponse.json({ error: "Erro" }, { status: 500 })
  }
}
