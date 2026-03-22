/**
 * API - Retorna usuário autenticado
 */
import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const payload = await getAuthUser()
    if (!payload) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true, role: true, avatar: true },
    })

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("[API] Erro ao buscar usuário:", error)
    return NextResponse.json(
      { error: "Erro ao verificar autenticação" },
      { status: 500 }
    )
  }
}
