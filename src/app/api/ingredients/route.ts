export const dynamic = "force-dynamic"
/**
 * API de Ingredientes
 * GET  → lista todos os ingredientes
 * POST → cria novo ingrediente
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const ingredients = await prisma.ingredient.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { recipeItems: true } },
      },
    })
    return NextResponse.json(ingredients)
  } catch (error) {
    console.error("[API] Erro ao listar ingredientes:", error)
    return NextResponse.json({ error: "Erro ao buscar ingredientes" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, unit, unitCost, category } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })
    }
    if (typeof unitCost !== "number" || unitCost < 0) {
      return NextResponse.json({ error: "Custo inválido" }, { status: 400 })
    }

    const ingredient = await prisma.ingredient.create({
      data: {
        name: name.trim(),
        unit: unit || "un",
        unitCost: Number(unitCost),
        category: category || "OTHER",
      },
    })
    return NextResponse.json(ingredient)
  } catch (error) {
    console.error("[API] Erro ao criar ingrediente:", error)
    return NextResponse.json({ error: "Erro ao criar ingrediente" }, { status: 500 })
  }
}
