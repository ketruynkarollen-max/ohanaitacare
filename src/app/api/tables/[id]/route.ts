export const dynamic = "force-dynamic"
/**
 * API de Mesa específica - PATCH para reservar/liberar
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  context?: { params: { id: string } }
) {
  try {
    const { id } = context?.params ?? {}
    const body = await request.json()
    const { status } = body

    if (!["FREE", "OCCUPIED", "RESERVED"].includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 })
    }

    const table = await prisma.table.update({
      where: { id },
      data: { status },
    })
    return NextResponse.json(table)
  } catch (error) {
    console.error("[API] Erro ao atualizar mesa:", error)
    return NextResponse.json({ error: "Erro ao atualizar mesa" }, { status: 500 })
  }
}
