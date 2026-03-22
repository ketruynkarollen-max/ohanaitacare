export const dynamic = "force-dynamic"
/**
 * GET  /api/cash-sessions?date=YYYY-MM-DD  → sessão do dia (ou última aberta)
 * POST /api/cash-sessions                  → abre nova sessão
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function dayStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}
function dayEnd(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get("date")

    let targetDate: Date
    if (dateParam) {
      const [y, m, d] = dateParam.split("-").map(Number)
      targetDate = new Date(y, m - 1, d)
    } else {
      targetDate = new Date()
    }

    const session = await prisma.cashSession.findFirst({
      where: {
        date: { gte: dayStart(targetDate), lte: dayEnd(targetDate) },
      },
      orderBy: { openedAt: "desc" },
    })

    return NextResponse.json(session ?? null)
  } catch (error) {
    console.error("[API] Erro ao buscar sessão de caixa:", error)
    return NextResponse.json({ error: "Erro ao buscar sessão" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { openingBalance, date } = body

    if (typeof openingBalance !== "number" || openingBalance < 0) {
      return NextResponse.json({ error: "Saldo inicial inválido" }, { status: 400 })
    }

    // Determina a data do caixa
    let targetDate: Date
    if (date) {
      const [y, m, d] = String(date).split("-").map(Number)
      targetDate = new Date(y, m - 1, d)
    } else {
      targetDate = new Date()
    }

    // Impede abrir dois caixas no mesmo dia
    const existing = await prisma.cashSession.findFirst({
      where: {
        date:   { gte: dayStart(targetDate), lte: dayEnd(targetDate) },
        status: "OPEN",
      },
    })
    if (existing) {
      return NextResponse.json(
        { error: "Já existe um caixa aberto para este dia" },
        { status: 409 },
      )
    }

    const session = await prisma.cashSession.create({
      data: {
        date:           dayStart(targetDate),
        openingBalance: Number(openingBalance),
        status:         "OPEN",
        openedAt:       new Date(),
      },
    })

    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    console.error("[API] Erro ao abrir caixa:", error)
    return NextResponse.json({ error: "Erro ao abrir caixa" }, { status: 500 })
  }
}
