/**
 * API de Categorias
 * GET  → lista todas as categorias (ordenadas por position)
 * POST → cria uma nova categoria
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { position: "asc" },
      include: { _count: { select: { products: true } } },
    })
    return NextResponse.json(categories)
  } catch (error) {
    console.error("[API] Erro ao listar categorias:", error)
    // Em falha (ex.: banco indisponível na Vercel), devolve array vazio para a loja não quebrar
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, image, position } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Nome da categoria é obrigatório" },
        { status: 400 }
      )
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        image: image?.trim() || null,
        position: position ?? 0,
      },
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error("[API] Erro ao criar categoria:", error)
    return NextResponse.json(
      { error: "Erro ao criar categoria" },
      { status: 500 }
    )
  }
}
