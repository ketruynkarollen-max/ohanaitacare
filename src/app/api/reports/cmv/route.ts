export const dynamic = "force-dynamic"
/**
 * GET /api/reports/cmv
 * Retorna todos os produtos com:
 *  - custo da ficha técnica (soma ingredientes × quantidade)
 *  - preço de venda
 *  - CMV% (custo / preço × 100)
 *  - classificação Menu Engineering (Star, Plowhorse, Puzzle, Dog)
 *    baseada em popularidade × margem estimada
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Produtos com ficha técnica
    const products = await prisma.product.findMany({
      where: { active: true },
      orderBy: [{ category: { position: "asc" } }, { position: "asc" }],
      include: {
        category: { select: { id: true, name: true } },
        recipeItems: {
          include: { ingredient: true },
        },
      },
    })

    // Popularidade: pedidos nos últimos 30 dias
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const salesData = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: {
          createdAt: { gte: thirtyDaysAgo },
          status: { not: "CANCELLED" },
        },
      },
      _sum: { quantity: true },
    })

    const salesMap = new Map<string, number>()
    for (const s of salesData) {
      salesMap.set(s.productId, s._sum.quantity ?? 0)
    }

    // Métricas por produto
    const items = products.map((p) => {
      const recipeCost = p.recipeItems.reduce(
        (sum, ri) => sum + ri.quantity * ri.ingredient.unitCost,
        0,
      )
      const cmvPercent = p.price > 0 ? (recipeCost / p.price) * 100 : 0
      const grossMargin = p.price - recipeCost
      const salesQty = salesMap.get(p.id) ?? 0

      return {
        id:          p.id,
        name:        p.name,
        price:       p.price,
        category:    p.category,
        recipeCost,
        cmvPercent,
        grossMargin,
        salesQty,
        hasRecipe:   p.recipeItems.length > 0,
        recipeItems: p.recipeItems.map((ri) => ({
          ingredientId:   ri.ingredientId,
          ingredientName: ri.ingredient.name,
          unit:           ri.ingredient.unit,
          unitCost:       ri.ingredient.unitCost,
          quantity:       ri.quantity,
          lineCost:       ri.quantity * ri.ingredient.unitCost,
        })),
      }
    })

    // Menu Engineering: classifica com base em margem vs popularidade
    const withRecipe = items.filter((i) => i.hasRecipe)
    const avgMargin = withRecipe.length
      ? withRecipe.reduce((s, i) => s + i.grossMargin, 0) / withRecipe.length
      : 0
    const avgSales = withRecipe.length
      ? withRecipe.reduce((s, i) => s + i.salesQty, 0) / withRecipe.length
      : 0

    const classified = items.map((item) => {
      let menuClass: "star" | "plowhorse" | "puzzle" | "dog" | "none" = "none"
      if (item.hasRecipe) {
        const highMargin = item.grossMargin >= avgMargin
        const highSales  = item.salesQty >= avgSales
        if (highMargin && highSales)  menuClass = "star"
        else if (!highMargin && highSales) menuClass = "plowhorse"
        else if (highMargin && !highSales) menuClass = "puzzle"
        else menuClass = "dog"
      }
      return { ...item, menuClass }
    })

    // Totais gerais
    const summary = {
      totalProducts:       items.length,
      withRecipe:          withRecipe.length,
      withoutRecipe:       items.length - withRecipe.length,
      avgCmv:              withRecipe.length
        ? withRecipe.reduce((s, i) => s + i.cmvPercent, 0) / withRecipe.length
        : 0,
      stars:      classified.filter((i) => i.menuClass === "star").length,
      plowhorses: classified.filter((i) => i.menuClass === "plowhorse").length,
      puzzles:    classified.filter((i) => i.menuClass === "puzzle").length,
      dogs:       classified.filter((i) => i.menuClass === "dog").length,
    }

    return NextResponse.json({ items: classified, summary })
  } catch (error) {
    console.error("[API] Erro ao gerar CMV:", error)
    return NextResponse.json({ error: "Erro ao gerar relatório CMV" }, { status: 500 })
  }
}
