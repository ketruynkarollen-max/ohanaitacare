export const dynamic = "force-dynamic"
/**
 * API de um Pedido específico
 * GET   → detalhes do pedido
 * PATCH → atualiza status ou dados do pedido (cliente pode cancelar/editar se PENDING)
 */
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { customerAuthOptions } from "@/lib/auth-customer"
import { prisma } from "@/lib/prisma"
import { withErrorHandler } from "@/lib/api-handler"

export const GET = withErrorHandler(
  async (
    _request: Request,
    context?: { params: { id: string } },
  ) => {
    const { id } = context?.params ?? {}

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { select: { name: true, image: true } },
          },
        },
        table: { select: { number: true } },
        customer: { select: { name: true, phone: true, address: true } },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 })
    }

    return NextResponse.json(order)
  },
)

export const PATCH = withErrorHandler(
  async (
    request: Request,
  ) => {
    const url = new URL(request.url)
    const id = url.pathname.split("/").pop() as string
    const body = await request.json()
    const { status, paymentStatus, paymentMethod, notes, address, itemsQuantities } = body

    const order = await prisma.order.findUnique({ where: { id } })
    if (!order) {
      return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 })
    }

    const session = await getServerSession(customerAuthOptions)
    const customerId = (session?.user as { customerId?: string })?.customerId
    const isCustomerOrder = customerId && order.customerId === customerId

    const data: Record<string, unknown> = {}

    // Cliente pode cancelar ou editar (notes, address) apenas pedidos PENDING
    if (isCustomerOrder && order.status === "PENDING") {
      if (status === "CANCELLED") {
        data.status = "CANCELLED"
        // Reverter estoque ao cancelar
        const items = await prisma.orderItem.findMany({
          where: { orderId: id },
          include: { product: true },
        })
        for (const item of items) {
          if (item.product.trackStock) {
            await prisma.product.update({
              where: { id: item.productId },
              data: { stockQty: { increment: item.quantity } },
            })
            await prisma.stockMovement.create({
              data: {
                productId: item.productId,
                type: "IN",
                quantity: item.quantity,
                reason: `Pedido #${order.number} cancelado`,
              },
            })
          }
        }
      }
      if (notes !== undefined) data.notes = notes
      if (address !== undefined) data.address = address
    }

    // Staff pode alterar status, pagamento e itens da comanda
    let updated
    if (!isCustomerOrder || Object.keys(data).length === 0) {
      if (status) data.status = status
      if (paymentStatus) data.paymentStatus = paymentStatus
      if (paymentMethod) data.paymentMethod = paymentMethod
    }

    // Atualização de quantidades de itens da comanda (somente staff)
    if (!isCustomerOrder && Array.isArray(itemsQuantities) && itemsQuantities.length > 0) {
      updated = await prisma.$transaction(async (tx) => {
        const full = await tx.order.findUnique({
          where: { id },
          include: {
            items: {
              include: {
                product: true,
                addons: true,
              },
            },
          },
        })
        if (!full) {
          throw new Error("Pedido não encontrado para atualização")
        }

        const qtyMap = new Map<string, number>()
        for (const item of itemsQuantities as Array<{ id: string; quantity: number }>) {
          const q = Math.max(1, Number(item.quantity) || 1)
          qtyMap.set(item.id, q)
        }

        let newSubtotal = 0
        const stockDeltaByProduct = new Map<string, number>()

        for (const item of full.items) {
          const currentQty = item.quantity
          const newQty = qtyMap.get(item.id) ?? currentQty

          const addonsTotal = item.addons.reduce((sum, a) => sum + a.price, 0)
          const unitWithAddons = item.unitPrice + addonsTotal

          newSubtotal += unitWithAddons * newQty

          const delta = newQty - currentQty
          if (delta !== 0) {
            stockDeltaByProduct.set(
              item.productId,
              (stockDeltaByProduct.get(item.productId) || 0) + delta,
            )

            await tx.orderItem.update({
              where: { id: item.id },
              data: { quantity: newQty },
            })
          }
        }

        const discount = (data.discount as number | undefined) ?? full.discount ?? 0
        const deliveryFee =
          (data.deliveryFee as number | undefined) ?? full.deliveryFee ?? 0
        const total = Math.max(0, newSubtotal - discount + deliveryFee)

        data.subtotal = newSubtotal
        data.total = total

        // Ajustar estoque com base na diferença de quantidades
        for (const [productId, delta] of stockDeltaByProduct.entries()) {
          const product = await tx.product.findUnique({ where: { id: productId } })
          if (!product || !product.trackStock || delta === 0) continue

          const newStock = Math.max(0, product.stockQty - delta)
          await tx.product.update({
            where: { id: productId },
            data: { stockQty: newStock },
          })

          await tx.stockMovement.create({
            data: {
              productId,
              type: delta > 0 ? "OUT" : "IN",
              quantity: Math.abs(delta),
              reason: `Ajuste comanda pedido #${full.number}`,
            },
          })
        }

        const updatedOrder = await tx.order.update({
          where: { id },
          data,
          include: {
            items: {
              include: {
                product: { select: { name: true, image: true } },
              },
            },
            table: { select: { id: true, number: true, status: true } },
          },
        })

        // Se status mudou para DELIVERED ou CANCELLED, e tiver mesa, checa se ainda existem pedidos ativos na mesa
        if (
          (data.status === "DELIVERED" || data.status === "CANCELLED") &&
          updatedOrder.tableId
        ) {
          const activeCount = await tx.order.count({
            where: {
              tableId: updatedOrder.tableId,
              status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY"] },
            },
          })
          if (activeCount === 0) {
            await tx.table.update({
              where: { id: updatedOrder.tableId },
              data: { status: "FREE" },
            })
          }
        }

        return updatedOrder
      })
    } else {
      updated = await prisma.order.update({
        where: { id },
        data,
        include: {
          items: { include: { product: { select: { name: true } } } },
          table: { select: { id: true, number: true, status: true } },
        },
      })

      // Quando não há transaction (atualização simples), ainda assim garantir liberação da mesa se necessário
      if (
        (data.status === "DELIVERED" || data.status === "CANCELLED") &&
        updated.tableId
      ) {
        const activeCount = await prisma.order.count({
          where: {
            tableId: updated.tableId,
            status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY"] },
          },
        })
        if (activeCount === 0) {
          await prisma.table.update({
            where: { id: updated.tableId },
            data: { status: "FREE" },
          })
        }
      }
    }

    return NextResponse.json(updated)
  },
)
