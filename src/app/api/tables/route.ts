export const dynamic = "force-dynamic"
/**
 * API de Mesas
 * GET  → lista mesas
 * POST → cria mesa (para setup inicial)
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const tables = await prisma.table.findMany({
      where: { active: true },
      orderBy: { number: "asc" },
    })
    return NextResponse.json(tables)
  } catch (error) {
    console.error("[API] Erro ao listar mesas:", error)
    return NextResponse.json(
      { error: "Erro ao buscar mesas" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { number, name, capacity } = body

    if (typeof number !== "number") {
      return NextResponse.json(
        { error: "Número da mesa é obrigatório" },
        { status: 400 }
      )
    }

    const table = await prisma.table.create({
      data: {
        number,
        name: name || null,
        capacity: capacity ?? 4,
      },
    })

    return NextResponse.json(table)
  } catch (error) {
    console.error("[API] Erro ao criar mesa:", error)
    return NextResponse.json(
      { error: "Erro ao criar mesa" },
      { status: 500 }
    )
  }
}
