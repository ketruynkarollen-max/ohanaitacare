export const dynamic = "force-dynamic"
/**
 * API de Movimentações de Estoque
 * GET  → lista movimentações (opcional: productId)
 * POST → registra entrada, saída ou ajuste e atualiza o produto
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("productId")
    const limit = parseInt(searchParams.get("limit") || "50", 10)

    const where = productId ? { productId } : {}

    const movements = await prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        product: { select: { name: true } },
      },
    })

    return NextResponse.json(movements)
  } catch (error) {
    console.error("[API] Erro ao listar movimentações:", error)
    return NextResponse.json(
      { error: "Erro ao buscar movimentações" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { productId, type, quantity, reason } = body

    if (!productId || !type || typeof quantity !== "number") {
      return NextResponse.json(
        { error: "productId, type e quantity são obrigatórios" },
        { status: 400 }
      )
    }

    const validTypes = ["IN", "OUT", "ADJUSTMENT"]
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "type deve ser IN, OUT ou ADJUSTMENT" },
        { status: 400 }
      )
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, stockQty: true, trackStock: true },
    })

    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 })
    }

    if (!product.trackStock) {
      return NextResponse.json(
        { error: "Produto não tem controle de estoque ativo" },
        { status: 400 }
      )
    }

    let newQty = product.stockQty
    if (type === "IN") newQty += quantity
    else if (type === "OUT") newQty -= quantity
    else if (type === "ADJUSTMENT") newQty = Math.max(0, quantity)

    if (newQty < 0) {
      return NextResponse.json(
        { error: "Quantidade insuficiente em estoque" },
        { status: 400 }
      )
    }

    const movement = await prisma.stockMovement.create({
      data: {
        productId,
        type,
        quantity: type === "ADJUSTMENT" ? newQty - product.stockQty : quantity,
        reason: reason || null,
      },
    })

    await prisma.product.update({
      where: { id: productId },
      data: { stockQty: newQty },
    })

    return NextResponse.json({
      ...movement,
      newStockQty: newQty,
    })
  } catch (error) {
    console.error("[API] Erro ao registrar movimentação:", error)
    return NextResponse.json(
      { error: "Erro ao registrar movimentação" },
      { status: 500 }
    )
  }
}
