/**
 * API de Clientes
 * GET  → lista clientes (opcional: busca por nome, telefone ou email)
 * POST → cria um novo cliente
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withErrorHandler } from "@/lib/api-handler"

export const GET = withErrorHandler(async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim()
  const limit = parseInt(searchParams.get("limit") || "100", 10)

  const where = q
    ? {
        OR: [
          { name: { contains: q } },
          { phone: { contains: q } },
          { email: { contains: q } },
        ],
      }
    : {}

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { name: "asc" },
    take: limit,
    include: { _count: { select: { orders: true } } },
  })

  return NextResponse.json(customers)
})

export const POST = withErrorHandler(async (request: Request) => {
  const body = await request.json()
  const { name, phone, email, address, city, notes } = body

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Nome é obrigatório" },
      { status: 400 },
    )
  }

  const customer = await prisma.customer.create({
    data: {
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      address: address?.trim() || null,
      city: city?.trim() || null,
      notes: notes?.trim() || null,
    },
  })

  return NextResponse.json(customer)
})
