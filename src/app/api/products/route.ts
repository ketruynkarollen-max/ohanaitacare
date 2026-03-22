/**
 * API de Produtos
 * GET  → lista produtos (opcional: filtrar por categoryId)
 * POST → cria um novo produto
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withErrorHandler } from "@/lib/api-handler"

export const GET = withErrorHandler(async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get("categoryId")

  const where = categoryId ? { categoryId } : {}

  const withExtras = searchParams.get("withVariations") === "1"
  const products = await prisma.product.findMany({
    where,
    orderBy: [{ category: { position: "asc" } }, { position: "asc" }],
    include: {
      category: { select: { id: true, name: true } },
      ...(withExtras && {
        variations: { where: { active: true } },
        addonGroups: { where: { active: true }, include: { addons: { where: { active: true } } } },
      }),
    },
  })

  return NextResponse.json(products)
})

export const POST = withErrorHandler(async (request: Request) => {
    const body = await request.json()
    const {
      name,
      description,
      price,
      image,
      position,
      categoryId,
      active,
      featured,
      trackStock,
      stockQty,
      alertQty,
      preparationTime,
    } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Nome do produto é obrigatório" },
        { status: 400 }
      )
    }
    if (!categoryId) {
      return NextResponse.json(
        { error: "Categoria é obrigatória" },
        { status: 400 }
      )
    }
    if (typeof price !== "number" || price < 0) {
      return NextResponse.json(
        { error: "Preço inválido" },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        price: Number(price),
        image: image?.trim() || null,
        position: position ?? 0,
        categoryId,
        active: active ?? true,
        featured: featured ?? false,
        trackStock: trackStock ?? false,
        stockQty: stockQty ?? 0,
        alertQty: alertQty ?? 5,
        preparationTime: preparationTime ?? 15,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(product)
})
