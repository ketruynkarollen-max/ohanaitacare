export const dynamic = "force-dynamic"
/**
 * GET  /api/products/[id]/recipe → retorna a ficha técnica do produto
 * PUT  /api/products/[id]/recipe → substitui a ficha técnica inteira
 *   body: { items: [{ ingredientId, quantity }] }
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const items = await prisma.recipeItem.findMany({
      where: { productId: params.id },
      include: {
        ingredient: true,
      },
      orderBy: { ingredient: { name: "asc" } },
    })

    // Calcula custo total da receita
    const totalCost = items.reduce(
      (sum, item) => sum + item.quantity * item.ingredient.unitCost,
      0,
    )

    return NextResponse.json({ items, totalCost })
  } catch (error) {
    console.error("[API] Erro ao buscar receita:", error)
    return NextResponse.json({ error: "Erro ao buscar receita" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json()
    const { items } = body as {
      items: { ingredientId: string; quantity: number }[]
    }

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "items deve ser um array" }, { status: 400 })
    }

    // Substitui todos os recipe items do produto numa transação
    await prisma.$transaction([
      prisma.recipeItem.deleteMany({ where: { productId: params.id } }),
      ...items
        .filter((item) => item.quantity > 0)
        .map((item) =>
          prisma.recipeItem.create({
            data: {
              productId:    params.id,
              ingredientId: item.ingredientId,
              quantity:     Number(item.quantity),
            },
          }),
        ),
    ])

    // Retorna a receita atualizada
    const updated = await prisma.recipeItem.findMany({
      where: { productId: params.id },
      include: { ingredient: true },
      orderBy: { ingredient: { name: "asc" } },
    })

    const totalCost = updated.reduce(
      (sum, item) => sum + item.quantity * item.ingredient.unitCost,
      0,
    )

    return NextResponse.json({ items: updated, totalCost })
  } catch (error) {
    console.error("[API] Erro ao salvar receita:", error)
    return NextResponse.json({ error: "Erro ao salvar receita" }, { status: 500 })
  }
}
