export const dynamic = "force-dynamic"
/**
 * GET /api/reports/menu-engineering
 *   ?days=7|30|60|90  (padrão: 30)
 *
 * Retorna dados enriquecidos para Engenharia de Cardápio:
 *  - Popularidade: quantidade vendida no período
 *  - Margem: margem bruta unitária e total (margem × qtd)
 *  - CMV%
 *  - Receita gerada
 *  - Classificação: Star, Plowhorse, Puzzle, Dog
 *  - Recomendação por produto
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type MenuClass = "star" | "plowhorse" | "puzzle" | "dog" | "none"

const RECOMMENDATIONS: Record<MenuClass, { action: string; detail: string; color: string }> = {
  star: {
    action: "Mantenha e promova",
    detail: "Alta margem + alta popularidade. Destaque no cardápio, coloque em local de destaque e treine a equipe para sugerir ativamente.",
    color: "#16a34a",
  },
  plowhorse: {
    action: "Aumente o preço gradualmente",
    detail: "Vende muito mas com margem baixa. Reajuste o preço em 5–10% ou reformule a ficha técnica reduzindo insumos sem afetar a percepção de qualidade.",
    color: "#2563eb",
  },
  puzzle: {
    action: "Aumente a visibilidade",
    detail: "Boa margem mas pouco vendido. Mova para posição de destaque no cardápio, crie combos, ou invista em foto/descrição atrativa.",
    color: "#d97706",
  },
  dog: {
    action: "Retire ou reformule urgente",
    detail: "Baixa margem + baixo volume. Avalie se tem apelo emocional; caso contrário, retire do cardápio ou reformule completamente.",
    color: "#dc2626",
  },
  none: {
    action: "Cadastre a ficha técnica",
    detail: "Sem ficha técnica cadastrada. Não é possível calcular margem ou classificar este produto.",
    color: "#6b7280",
  },
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get("days") ?? "30", 10)
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Produtos ativos com ficha técnica
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

    // Vendas no período: quantidade e receita por produto
    const salesData = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: {
          createdAt: { gte: cutoff },
          status: { not: "CANCELLED" },
        },
      },
      _sum: { quantity: true },
    })

    // Receita por produto (soma de price × quantity nos pedidos do período)
    const revenueData = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: cutoff },
          status: { not: "CANCELLED" },
        },
      },
      select: { productId: true, quantity: true, price: true },
    })

    const salesMap = new Map<string, number>()
    for (const s of salesData) {
      salesMap.set(s.productId, s._sum.quantity ?? 0)
    }

    const revenueMap = new Map<string, number>()
    for (const r of revenueData) {
      const prev = revenueMap.get(r.productId) ?? 0
      revenueMap.set(r.productId, prev + r.price * r.quantity)
    }

    // Métricas por produto
    const items = products.map((p) => {
      const recipeCost = p.recipeItems.reduce(
        (sum, ri) => sum + ri.quantity * ri.ingredient.unitCost,
        0,
      )
      const cmvPercent   = p.price > 0 && recipeCost > 0 ? (recipeCost / p.price) * 100 : 0
      const grossMargin  = p.price - recipeCost   // margem unitária R$
      const marginPct    = p.price > 0 ? (grossMargin / p.price) * 100 : 0
      const salesQty     = salesMap.get(p.id) ?? 0
      const revenue      = revenueMap.get(p.id) ?? salesQty * p.price
      const totalMargin  = grossMargin * salesQty   // margem total gerada no período

      return {
        id:           p.id,
        name:         p.name,
        price:        p.price,
        category:     p.category,
        recipeCost,
        cmvPercent,
        grossMargin,
        marginPct,
        salesQty,
        revenue,
        totalMargin,
        hasRecipe:    p.recipeItems.length > 0,
        recipeItems:  p.recipeItems.map((ri) => ({
          name:     ri.ingredient.name,
          unit:     ri.ingredient.unit,
          quantity: ri.quantity,
          cost:     ri.quantity * ri.ingredient.unitCost,
        })),
      }
    })

    // Thresholds para classificação (média dos produtos com ficha)
    const withRecipe = items.filter((i) => i.hasRecipe)
    const avgMargin = withRecipe.length
      ? withRecipe.reduce((s, i) => s + i.grossMargin, 0) / withRecipe.length
      : 0
    const avgSales = withRecipe.length
      ? withRecipe.reduce((s, i) => s + i.salesQty, 0) / withRecipe.length
      : 0

    // Classificação Menu Engineering
    const classified = items.map((item) => {
      let menuClass: MenuClass = "none"
      if (item.hasRecipe) {
        const highMargin = item.grossMargin >= avgMargin
        const highSales  = item.salesQty   >= avgSales
        if      ( highMargin &&  highSales) menuClass = "star"
        else if (!highMargin &&  highSales) menuClass = "plowhorse"
        else if ( highMargin && !highSales) menuClass = "puzzle"
        else                               menuClass = "dog"
      }
      return {
        ...item,
        menuClass,
        recommendation: RECOMMENDATIONS[menuClass],
      }
    })

    // Resumo geral
    const totalRevenue     = classified.reduce((s, i) => s + i.revenue, 0)
    const totalMarginSum   = classified.reduce((s, i) => s + i.totalMargin, 0)
    const overallMarginPct = totalRevenue > 0 ? (totalMarginSum / totalRevenue) * 100 : 0
    const avgCmv           = withRecipe.length
      ? withRecipe.reduce((s, i) => s + i.cmvPercent, 0) / withRecipe.length
      : 0

    const summary = {
      totalProducts:    items.length,
      withRecipe:       withRecipe.length,
      withoutRecipe:    items.length - withRecipe.length,
      avgCmv,
      overallMarginPct,
      totalRevenue,
      totalMarginSum,
      avgMarginThreshold: avgMargin,
      avgSalesThreshold:  avgSales,
      stars:      classified.filter((i) => i.menuClass === "star").length,
      plowhorses: classified.filter((i) => i.menuClass === "plowhorse").length,
      puzzles:    classified.filter((i) => i.menuClass === "puzzle").length,
      dogs:       classified.filter((i) => i.menuClass === "dog").length,
      days,
    }

    return NextResponse.json({ items: classified, summary })
  } catch (error) {
    console.error("[API] Erro ao gerar Menu Engineering:", error)
    return NextResponse.json({ error: "Erro ao gerar relatório" }, { status: 500 })
  }
}
