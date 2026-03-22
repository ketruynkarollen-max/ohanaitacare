export const dynamic = "force-dynamic"
/**
 * GET /api/cash-sessions/history?limit=30
 * Histórico de sessões de caixa (mais recentes primeiro)
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 90)

    const sessions = await prisma.cashSession.findMany({
      orderBy: { date: "desc" },
      take: limit,
    })
    return NextResponse.json(sessions)
  } catch (error) {
    console.error("[API] Erro ao buscar histórico de caixas:", error)
    return NextResponse.json({ error: "Erro ao buscar histórico" }, { status: 500 })
  }
}
