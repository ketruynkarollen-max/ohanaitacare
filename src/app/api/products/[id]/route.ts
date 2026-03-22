/**
 * API de um Produto específico
 * PATCH  → atualiza o produto
 * DELETE → remove o produto
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withErrorHandler } from "@/lib/api-handler"

export const PATCH = withErrorHandler(
  async (
    request: Request,
    context?: { params: { id: string } },
  ) => {
    const { id } = context?.params ?? {}
    const body = await request.json()

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
        ...(body.price !== undefined && { price: Number(body.price) }),
        ...(body.image !== undefined && { image: body.image?.trim() || null }),
        ...(body.position !== undefined && { position: body.position }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
        ...(body.active !== undefined && { active: body.active }),
        ...(body.featured !== undefined && { featured: body.featured }),
        ...(body.trackStock !== undefined && { trackStock: body.trackStock }),
        ...(body.stockQty !== undefined && { stockQty: body.stockQty }),
        ...(body.alertQty !== undefined && { alertQty: body.alertQty }),
        ...(body.preparationTime !== undefined && { preparationTime: body.preparationTime }),
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(product)
  },
)

export const DELETE = withErrorHandler(
  async (
    _request: Request,
  ) => {
    const url = new URL(_request.url)
    const id = url.pathname.split("/").pop() as string
    await prisma.product.delete({ where: { id } })
    return NextResponse.json({ success: true })
  },
)
