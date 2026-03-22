/**
 * API de um Cliente específico
 * GET   → detalhes do cliente
 * PATCH → atualiza o cliente
 * DELETE → remove o cliente
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withErrorHandler } from "@/lib/api-handler"

export const GET = withErrorHandler(
  async (
    _request: Request,
    context?: { params: { id: string } },
  ) => {
    const { id } = context?.params ?? {}

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, number: true, total: true, createdAt: true, status: true },
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
    }

    return NextResponse.json(customer)
  },
)

export const PATCH = withErrorHandler(
  async (
    request: Request,
    context?: { params: { id: string } },
  ) => {
    const { id } = context?.params ?? {}
    const body = await request.json()
    const { name, phone, email, address, city, notes } = body

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(city !== undefined && { city: city?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
      },
    })

    return NextResponse.json(customer)
  },
)

export const DELETE = withErrorHandler(
  async (
    _request: Request,
    context?: { params: { id: string } },
  ) => {
    const { id } = context?.params ?? {}
    await prisma.customer.delete({ where: { id } })
    return NextResponse.json({ success: true })
  },
)
