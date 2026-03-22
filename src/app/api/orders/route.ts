/**
 * API de Pedidos
 * GET  → lista pedidos (filtros opcionais)
 * POST → cria um novo pedido com itens (preços validados no servidor)
 */
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { customerAuthOptions } from "@/lib/auth-customer"
import { prisma } from "@/lib/prisma"
import { withErrorHandler } from "@/lib/api-handler"

export const GET = withErrorHandler(async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const type = searchParams.get("type")
  const customerId = searchParams.get("customerId")
  const limit = parseInt(searchParams.get("limit") || "50", 10)

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (type) where.type = type
  if (customerId) where.customerId = customerId

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      items: {
        include: {
          product: { select: { name: true } },
          variation: { select: { name: true } },
          addons: { include: { addon: { select: { name: true } } } },
        },
      },
      table: { select: { number: true } },
      customer: { select: { name: true, phone: true } },
    },
  })

  return NextResponse.json(orders)
})

export const POST = withErrorHandler(async (request: Request) => {
    const body = await request.json()
    let { type, source, tableId, tableNumber, customerId, address, notes, items, discount, deliveryFee, couponCode } = body

    // Respeitar horário de funcionamento
    const business = await prisma.business.findFirst()
    if (business?.openTime && business?.closeTime) {
      const now = new Date()
      const [openH, openM] = business.openTime.split(":").map(Number)
      const [closeH, closeM] = business.closeTime.split(":").map(Number)
      const minutesNow = now.getHours() * 60 + now.getMinutes()
      const minutesOpen = openH * 60 + openM
      const minutesClose = closeH * 60 + closeM

      const isOpen =
        minutesOpen <= minutesClose
          ? minutesNow >= minutesOpen && minutesNow <= minutesClose        // mesma madrugada
          : minutesNow >= minutesOpen || minutesNow <= minutesClose        // vira à meia-noite

      if (!isOpen) {
        return NextResponse.json(
          { error: "A loja está fechada no momento. Tente novamente no horário de funcionamento." },
          { status: 403 },
        )
      }
    }

    // Vincular cliente logado (Google) ao pedido
    if (!customerId) {
      const session = await getServerSession(customerAuthOptions)
      const sessionCustomerId = (session?.user as { customerId?: string })?.customerId
      if (sessionCustomerId) customerId = sessionCustomerId
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Adicione pelo menos um item ao pedido" },
        { status: 400 }
      )
    }

    // Buscar preços no servidor (nunca confiar no cliente)
    const productIds = [...new Set(items.map((i: { productId: string }) => i.productId))]
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        variations: { where: { active: true } },
        addonGroups: { where: { active: true }, include: { addons: { where: { active: true } } } },
      },
    })
    const productMap = new Map(products.map((p) => [p.id, p]))

    let subtotal = 0
    const orderItemsData: Array<{
      productId: string
      variationId?: string
      quantity: number
      unitPrice: number
      notes: string | null
      addons: Array<{ addonId: string; price: number }>
    }> = []

    for (const item of items) {
      const product = productMap.get(item.productId)
      if (!product) {
        return NextResponse.json({ error: `Produto não encontrado: ${item.productId}` }, { status: 400 })
      }

      let basePrice = product.price
      const addonsData: Array<{ addonId: string; price: number }> = []

      if (item.variationId) {
        const variation = product.variations.find((v) => v.id === item.variationId)
        if (variation) basePrice = variation.price
      }

      if (item.addons && Array.isArray(item.addons)) {
        for (const a of item.addons) {
          for (const group of product.addonGroups) {
            const addon = group.addons.find((ad) => ad.id === a.addonId)
            if (addon) {
              addonsData.push({ addonId: addon.id, price: addon.price })
            }
          }
        }
      }

      const qty = Math.max(1, parseInt(String(item.quantity), 10) || 1)
      const itemTotal = (basePrice + addonsData.reduce((s, a) => s + a.price, 0)) * qty
      subtotal += itemTotal

      orderItemsData.push({
        productId: product.id,
        variationId: item.variationId || null,
        quantity: qty,
        unitPrice: basePrice,
        notes: item.notes || null,
        addons: addonsData,
      })
    }

    // Checagem de estoque antes de criar pedido (agregado por produto)
    const qtyByProduct = new Map<string, number>()
    for (const item of orderItemsData) {
      qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) || 0) + item.quantity)
    }
    for (const [pid, needed] of qtyByProduct) {
      const product = productMap.get(pid)
      if (product?.trackStock && product.stockQty < needed) {
        return NextResponse.json(
          { error: `Estoque insuficiente para "${product.name}". Disponível: ${product.stockQty}, necessário: ${needed}` },
          { status: 400 }
        )
      }
    }

    // Cupom
    let disc = Number(discount) || 0
    let appliedCoupon: { id: string } | null = null
    if (couponCode?.trim()) {
      const coupon = await prisma.coupon.findFirst({
        where: { code: couponCode.trim().toUpperCase(), active: true },
      })
      if (!coupon) {
        return NextResponse.json({ error: "Cupom inválido" }, { status: 400 })
      }

      const now = new Date()
      if (coupon.expiresAt && coupon.expiresAt < now) {
        return NextResponse.json({ error: "Cupom expirado" }, { status: 400 })
      }
      if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
        return NextResponse.json({ error: "Cupom esgotado" }, { status: 400 })
      }
      if (subtotal < (coupon.minOrder || 0)) {
        return NextResponse.json(
          { error: `Pedido mínimo para cupom: R$ ${(coupon.minOrder || 0).toFixed(2)}` },
          { status: 400 }
        )
      }

      if (coupon.type === "PERCENT") {
        disc += (subtotal * coupon.value) / 100
      } else {
        disc += coupon.value
      }

      appliedCoupon = { id: coupon.id }
    }

    const fee = Number(deliveryFee) || 0
    const total = Math.max(0, subtotal - disc + fee)

    let finalTableId = tableId || null
    if (type === "TABLE" && tableNumber != null && !finalTableId) {
      const num = parseInt(String(tableNumber), 10)
      if (!isNaN(num)) {
        let table = await prisma.table.findFirst({ where: { number: num } })
        if (!table) {
          table = await prisma.table.create({ data: { number: num } })
        }
        finalTableId = table.id
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      const [{ num }] = await tx.$queryRaw<{ num: bigint }[]>`SELECT nextval('order_number_seq') as num`
      const orderNumber = Number(num)

      const createdOrder = await tx.order.create({
        data: {
          number: orderNumber,
          type: type || "TABLE",
          source: source === "ONLINE" ? "ONLINE" : "PDV",
          tableId: finalTableId,
          customerId: customerId || null,
          address: address || null,
          notes: notes || null,
          subtotal,
          discount: disc,
          deliveryFee: fee,
          total,
          items: {
            create: orderItemsData.map((item) => ({
              productId: item.productId,
              variationId: item.variationId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              notes: item.notes,
              addons: item.addons.length
                ? {
                    create: item.addons.map((a) => ({
                      addonId: a.addonId,
                      price: a.price,
                    })),
                  }
                : undefined,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: { select: { name: true, price: true } },
              variation: { select: { name: true, price: true } },
              addons: { include: { addon: { select: { name: true } } } },
            },
          },
          table: { select: { number: true } },
        },
      })

      // Se houver cupom aplicado, incrementa o usedCount dentro da mesma transaction
      if (appliedCoupon) {
        await tx.coupon.update({
          where: { id: appliedCoupon.id },
          data: { usedCount: { increment: 1 } },
        })
      }

      // Se for pedido de mesa, marcar mesa como OCCUPIED
      if ((type || "TABLE") === "TABLE" && createdOrder.tableId) {
        await tx.table.update({
          where: { id: createdOrder.tableId },
          data: { status: "OCCUPIED" },
        })
      }

      // Para cada item com trackStock, decrementa estoque e registra movimento
      for (const [pid, qty] of qtyByProduct) {
        const product = productMap.get(pid)
        if (product?.trackStock) {
          await tx.product.update({
            where: { id: pid },
            data: { stockQty: product.stockQty - qty },
          })
          await tx.stockMovement.create({
            data: {
              productId: pid,
              type: "OUT",
              quantity: -qty,
              reason: `Pedido #${createdOrder.number}`,
            },
          })
        }
      }

      return createdOrder
    })

    // Dispara push notification em background (não bloqueia a resposta)
    const baseUrl = process.env.NEXTAUTH_URL
    if (baseUrl && baseUrl.startsWith("http")) {
      try {
        // Não aguarda o resultado; erros são ignorados e logados
        fetch(`${baseUrl}/api/push?action=send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `Novo pedido #${order.number}`,
            body: `${order.type === "DELIVERY" ? "Delivery" : "Retirada"} · R$ ${Number(order.total)
              .toFixed(2)
              .replace(".", ",")}`,
            orderId: order.id,
          }),
        }).catch(() => {})
      } catch (err) {
        console.error("[Push] Erro ao agendar envio de push:", err)
      }
    }

    return NextResponse.json(order)
})
