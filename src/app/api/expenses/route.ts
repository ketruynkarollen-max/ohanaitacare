export const dynamic = "force-dynamic"
/**
 * API de Despesas
 * GET  → lista despesas (filtro por período)
 * POST → registra despesa
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const limit = parseInt(searchParams.get("limit") || "100", 10)

    const where: { date?: { gte?: Date; lte?: Date } } = {}
    if (from) where.date = { ...where.date, gte: new Date(from) }
    if (to) where.date = { ...where.date, lte: new Date(to) }

    const expenses = await prisma.expense.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { date: "desc" },
      take: limit,
    })
    return NextResponse.json(expenses)
  } catch (error) {
    console.error("[API] Erro ao listar despesas:", error)
    return NextResponse.json({ error: "Erro ao buscar despesas" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { description, amount, category, date, notes } = body

    if (!description?.trim()) {
      return NextResponse.json({ error: "Descrição é obrigatória" }, { status: 400 })
    }
    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 })
    }

    const expense = await prisma.expense.create({
      data: {
        description: description.trim(),
        amount,
        category: category || "OTHER",
        date: date ? new Date(date) : new Date(),
        notes: notes?.trim() || null,
      },
    })
    return NextResponse.json(expense)
  } catch (error) {
    console.error("[API] Erro ao registrar despesa:", error)
    return NextResponse.json({ error: "Erro ao registrar despesa" }, { status: 500 })
  }
}
