import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: Request,
  context?: { params: { id: string } },
) {
  try {
    const id = context?.params.id
    if (!id) {
      return NextResponse.json({ error: "ID do pedido inválido" }, { status: 400 })
    }
    const body = await request.json()
    const { productId, quantity } = body as {
      productId?: string
      quantity?: number
    }

    if (!productId) {
      return NextResponse.json(
        { error: "Produto é obrigatório" },
        { status: 400 },
      )
    }

    const qty = Math.max(1, Number(quantity) || 1)

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado" },
        { status: 404 },
      )
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    })
    if (!product) {
      return NextResponse.json(
        { error: "Produto não encontrado" },
        { status: 404 },
      )
    }

    if (product.trackStock && product.stockQty < qty) {
      return NextResponse.json(
        {
          error: `Estoque insuficiente para "${product.name}". Disponível: ${product.stockQty}, necessário: ${qty}`,
        },
        { status: 400 },
      )
    }

    const unitPrice = product.price

    const updated = await prisma.$transaction(async (tx) => {
      const newItem = await tx.orderItem.create({
        data: {
          orderId: id,
          productId: product.id,
          quantity: qty,
          unitPrice,
        },
      })

      // Recalcula o subtotal do pedido com base em TODOS os itens atuais
      const currentItems = await tx.orderItem.findMany({
        where: { orderId: id },
        select: { quantity: true, unitPrice: true },
      })
      const subtotal = currentItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      )
      const discount = order.discount ?? 0
      const deliveryFee = order.deliveryFee ?? 0
      const total = Math.max(0, subtotal - discount + deliveryFee)

      if (product.trackStock) {
        await tx.product.update({
          where: { id: product.id },
          data: { stockQty: Math.max(0, product.stockQty - qty) },
        })
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: "OUT",
            quantity: qty,
            reason: `Item adicionado ao pedido #${order.number}`,
          },
        })
      }

      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          subtotal,
          total,
        },
        include: {
          items: {
            include: {
              product: { select: { name: true, image: true, price: true } },
              variation: { select: { name: true, price: true } },
            },
          },
          table: { select: { number: true } },
          customer: { select: { name: true, phone: true, address: true } },
        },
      })

      return updatedOrder
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[API] Erro ao adicionar item ao pedido:", error)
    return NextResponse.json(
      { error: "Erro ao adicionar item ao pedido" },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: Request,
  context?: { params: { id: string } },
) {
  try {
    const id = context?.params.id
    if (!id) {
      return NextResponse.json({ error: "ID do pedido inválido" }, { status: 400 })
    }
    const body = await request.json()
    const { itemId, quantity } = body as {
      itemId?: string
      quantity?: number
    }

    if (!itemId) {
      return NextResponse.json(
        { error: "Item é obrigatório" },
        { status: 400 },
      )
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado" },
        { status: 404 },
      )
    }

    const existingItem = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: { product: true },
    })
    if (!existingItem || existingItem.orderId !== id) {
      return NextResponse.json(
        { error: "Item não encontrado neste pedido" },
        { status: 404 },
      )
    }

    const newQty = Math.max(1, Number(quantity) || 1)

    if (existingItem.product.trackStock) {
      const diff = newQty - existingItem.quantity
      if (diff > 0 && existingItem.product.stockQty < diff) {
        return NextResponse.json(
          {
            error: `Estoque insuficiente para "${existingItem.product.name}". Disponível: ${existingItem.product.stockQty}, necessário: ${diff}`,
          },
          { status: 400 },
        )
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.orderItem.update({
        where: { id: itemId },
        data: {
          quantity: newQty,
        },
      })

      // Recalcula o subtotal do pedido com base em TODOS os itens atuais
      const currentItems = await tx.orderItem.findMany({
        where: { orderId: id },
        select: { quantity: true, unitPrice: true },
      })
      const subtotal = currentItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      )
      const discount = order.discount ?? 0
      const deliveryFee = order.deliveryFee ?? 0
      const total = Math.max(0, subtotal - discount + deliveryFee)

      if (existingItem.product.trackStock) {
        const diff = newQty - existingItem.quantity
        if (diff !== 0) {
          await tx.product.update({
            where: { id: existingItem.productId },
            data: { stockQty: existingItem.product.stockQty - diff },
          })
          await tx.stockMovement.create({
            data: {
              productId: existingItem.productId,
              type: diff > 0 ? "OUT" : "IN",
              quantity: diff > 0 ? -diff : Math.abs(diff),
              reason: `Quantidade do item ajustada no pedido #${order.number}`,
            },
          })
        }
      }

      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          subtotal,
          total,
        },
        include: {
          items: {
            include: {
              product: { select: { name: true, image: true, price: true } },
              variation: { select: { name: true, price: true } },
            },
          },
          table: { select: { number: true } },
          customer: { select: { name: true, phone: true, address: true } },
        },
      })

      return updatedOrder
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[API] Erro ao editar item do pedido:", error)
    return NextResponse.json(
      { error: "Erro ao editar item do pedido" },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: Request,
  context?: { params: { id: string } },
) {
  try {
    const id = context?.params.id
    if (!id) {
      return NextResponse.json({ error: "ID do pedido inválido" }, { status: 400 })
    }
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get("itemId")

    if (!itemId) {
      return NextResponse.json(
        { error: "Item é obrigatório" },
        { status: 400 },
      )
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado" },
        { status: 404 },
      )
    }

    const existingItem = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: { product: true },
    })
    if (!existingItem || existingItem.orderId !== id) {
      return NextResponse.json(
        { error: "Item não encontrado neste pedido" },
        { status: 404 },
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.orderItem.delete({
        where: { id: itemId },
      })

      // Recalcula o subtotal do pedido com base em TODOS os itens atuais
      const currentItems = await tx.orderItem.findMany({
        where: { orderId: id },
        select: { quantity: true, unitPrice: true },
      })
      const subtotal = currentItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      )
      const discount = order.discount ?? 0
      const deliveryFee = order.deliveryFee ?? 0
      const total = Math.max(0, subtotal - discount + deliveryFee)

      if (existingItem.product.trackStock) {
        await tx.product.update({
          where: { id: existingItem.productId },
          data: { stockQty: existingItem.product.stockQty + existingItem.quantity },
        })
        await tx.stockMovement.create({
          data: {
            productId: existingItem.productId,
            type: "IN",
            quantity: existingItem.quantity,
            reason: `Item removido do pedido #${order.number}`,
          },
        })
      }

      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          subtotal,
          total,
        },
        include: {
          items: {
            include: {
              product: { select: { name: true, image: true, price: true } },
              variation: { select: { name: true, price: true } },
            },
          },
          table: { select: { number: true } },
          customer: { select: { name: true, phone: true, address: true } },
        },
      })

      return updatedOrder
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[API] Erro ao remover item do pedido:", error)
    return NextResponse.json(
      { error: "Erro ao remover item do pedido" },
      { status: 500 },
    )
  }
}

