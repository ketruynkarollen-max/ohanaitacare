export const dynamic = "force-dynamic"
/**
 * PATCH  /api/expenses/[id] → atualiza despesa
 * DELETE /api/expenses/[id] → remove despesa
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json()
    const { description, amount, category, date, notes } = body

    const data: Record<string, unknown> = {}
    if (description !== undefined) data.description = description.trim()
    if (amount      !== undefined) data.amount      = Number(amount)
    if (category    !== undefined) data.category    = category
    if (notes       !== undefined) data.notes       = notes?.trim() || null
    if (date        !== undefined) data.date        = new Date(date)

    const expense = await prisma.expense.update({
      where: { id: params.id },
      data,
    })
    return NextResponse.json(expense)
  } catch (error) {
    console.error("[API] Erro ao atualizar despesa:", error)
    return NextResponse.json({ error: "Erro ao atualizar despesa" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    await prisma.expense.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[API] Erro ao remover despesa:", error)
    return NextResponse.json({ error: "Erro ao remover despesa" }, { status: 500 })
  }
}
