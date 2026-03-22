/**
 * API - Meus pedidos (cliente logado)
 */
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { customerAuthOptions } from "@/lib/auth-customer"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(customerAuthOptions)
  const customerId = (session?.user as { customerId?: string })?.customerId

  if (!customerId) {
    return NextResponse.json({ error: "Faça login para ver seus pedidos" }, { status: 401 })
  }

  const orders = await prisma.order.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      items: {
        include: {
          product: { select: { name: true, image: true } },
          variation: { select: { name: true } },
          addons: { include: { addon: { select: { name: true } } } },
        },
      },
    },
  })

  return NextResponse.json(orders)
}
