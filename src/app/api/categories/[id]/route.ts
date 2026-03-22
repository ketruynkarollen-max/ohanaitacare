export const dynamic = "force-dynamic"
/**
 * API de uma Categoria específica
 * PATCH  → atualiza a categoria
 * DELETE → remove a categoria (produtos são removidos em cascata)
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  context?: { params: { id: string } },
) {
  try {
    const { id } = context?.params ?? {}
    const body = await request.json()
    const { name, description, image, position, active } = body

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(image !== undefined && { image: image?.trim() || null }),
        ...(position !== undefined && { position }),
        ...(active !== undefined && { active }),
      },
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error("[API] Erro ao atualizar categoria:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar categoria" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  context?: { params: { id: string } },
) {
  try {
    const { id } = context?.params ?? {}
    await prisma.category.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[API] Erro ao excluir categoria:", error)
    return NextResponse.json(
      { error: "Erro ao excluir categoria" },
      { status: 500 }
    )
  }
}
