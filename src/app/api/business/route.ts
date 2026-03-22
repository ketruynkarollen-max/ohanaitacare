/**
 * API de Configurações do Negócio (Business)
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const business = await prisma.business.findFirst()
    return NextResponse.json(business || {})
  } catch (error) {
    console.error("[API] Erro ao buscar negócio:", error)
    return NextResponse.json({ error: "Erro ao buscar configurações" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    let business = await prisma.business.findFirst()

    if (!business) {
      business = await prisma.business.create({
        data: {
          name: body.name || "Brasa",
          slug: body.slug || "brasa",
          phone: body.phone || null,
          address: body.address || null,
          city: body.city || null,
          state: body.state || null,
          zipCode: body.zipCode || null,
          openTime: body.openTime || "08:00",
          closeTime: body.closeTime || "23:00",
          deliveryFee: body.deliveryFee ?? 0,
          minOrder: body.minOrder ?? 0,
          deliveryTime: body.deliveryTime ?? 45,
          primaryColor: body.primaryColor || "#ef4444",
          acceptDelivery: body.acceptDelivery ?? true,
          acceptPickup: body.acceptPickup ?? true,
          acceptTable: body.acceptTable ?? true,
          acceptCash: body.acceptCash ?? true,
          acceptCard: body.acceptCard ?? true,
          acceptPix: body.acceptPix ?? true,
        },
      })
    } else {
      business = await prisma.business.update({
        where: { id: business.id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.phone !== undefined && { phone: body.phone }),
          ...(body.address !== undefined && { address: body.address }),
          ...(body.city !== undefined && { city: body.city }),
          ...(body.state !== undefined && { state: body.state }),
          ...(body.zipCode !== undefined && { zipCode: body.zipCode }),
          ...(body.openTime !== undefined && { openTime: body.openTime }),
          ...(body.closeTime !== undefined && { closeTime: body.closeTime }),
          ...(body.deliveryFee !== undefined && { deliveryFee: body.deliveryFee }),
          ...(body.minOrder !== undefined && { minOrder: body.minOrder }),
          ...(body.deliveryTime !== undefined && { deliveryTime: body.deliveryTime }),
          ...(body.primaryColor !== undefined && { primaryColor: body.primaryColor }),
          ...(body.acceptDelivery !== undefined && { acceptDelivery: body.acceptDelivery }),
          ...(body.acceptPickup !== undefined && { acceptPickup: body.acceptPickup }),
          ...(body.acceptTable !== undefined && { acceptTable: body.acceptTable }),
          ...(body.acceptCash !== undefined && { acceptCash: body.acceptCash }),
          ...(body.acceptCard !== undefined && { acceptCard: body.acceptCard }),
          ...(body.acceptPix !== undefined && { acceptPix: body.acceptPix }),
        },
      })
    }
    return NextResponse.json(business)
  } catch (error) {
    console.error("[API] Erro ao atualizar negócio:", error)
    return NextResponse.json({ error: "Erro ao salvar configurações" }, { status: 500 })
  }
}
