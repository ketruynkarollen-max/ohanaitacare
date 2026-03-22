export const dynamic = "force-dynamic"
/**
 * PATCH /api/ingredients/[id] → atualiza ingrediente
 * DELETE /api/ingredients/[id] → remove ingrediente
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json()
    const { name, unit, unitCost, category } = body

    const data: Record<string, unknown> = {}
    if (name !== undefined)     data.name     = name.trim()
    if (unit !== undefined)     data.unit     = unit
    if (unitCost !== undefined) data.unitCost = Number(unitCost)
    if (category !== undefined) data.category = category

    const ingredient = await prisma.ingredient.update({
      where: { id: params.id },
      data,
    })
    return NextResponse.json(ingredient)
  } catch (error) {
    console.error("[API] Erro ao atualizar ingrediente:", error)
    return NextResponse.json({ error: "Erro ao atualizar ingrediente" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    await prisma.ingredient.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[API] Erro ao remover ingrediente:", error)
    return NextResponse.json({ error: "Erro ao remover ingrediente" }, { status: 500 })
  }
}
