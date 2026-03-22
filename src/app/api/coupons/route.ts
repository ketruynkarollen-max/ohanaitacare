/**
 * API de Cupons
 * GET  → lista cupons
 * POST → cria cupom
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(coupons)
  } catch (error) {
    console.error("[API] Erro ao listar cupons:", error)
    return NextResponse.json({ error: "Erro ao buscar cupons" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { code, type, value, minOrder, maxUses, expiresAt } = body

    if (!code?.trim()) {
      return NextResponse.json({ error: "Código é obrigatório" }, { status: 400 })
    }
    if (!["PERCENT", "FIXED"].includes(type)) {
      return NextResponse.json({ error: "Tipo deve ser PERCENT ou FIXED" }, { status: 400 })
    }
    if (typeof value !== "number" || value <= 0) {
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 })
    }

    const existing = await prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    })
    if (existing) {
      return NextResponse.json({ error: "Código já existe" }, { status: 400 })
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.trim().toUpperCase(),
        type,
        value,
        minOrder: minOrder ?? 0,
        maxUses: maxUses ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })
    return NextResponse.json(coupon)
  } catch (error) {
    console.error("[API] Erro ao criar cupom:", error)
    return NextResponse.json({ error: "Erro ao criar cupom" }, { status: 500 })
  }
}
