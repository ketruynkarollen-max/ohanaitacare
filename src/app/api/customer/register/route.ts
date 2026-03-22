export const dynamic = "force-dynamic"
/**
 * Cadastro de cliente da loja (email + senha)
 */
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { error: "Nome, email e senha são obrigatórios" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter no mínimo 6 caracteres" },
        { status: 400 }
      )
    }

    const emailNorm = email.trim().toLowerCase()
    const existing = await prisma.customer.findFirst({
      where: { email: emailNorm },
    })

    if (existing) {
      if (existing.passwordHash) {
        return NextResponse.json(
          { error: "Este email já está cadastrado. Faça login." },
          { status: 409 }
        )
      }
      // Conta criada pelo Google: vincular senha
      const passwordHash = await bcrypt.hash(password, 10)
      await prisma.customer.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          name: name.trim() || existing.name,
        },
      })
      return NextResponse.json({ ok: true, message: "Conta vinculada. Faça login." })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    await prisma.customer.create({
      data: {
        name: name.trim(),
        email: emailNorm,
        passwordHash,
      },
    })
    return NextResponse.json({ ok: true, message: "Cadastro realizado. Faça login." })
  } catch (e) {
    console.error("[API] Erro no cadastro do cliente:", e)
    const message =
      e && typeof e === "object" && "message" in e
        ? String((e as { message?: string }).message)
        : "Erro ao cadastrar"
    const isDev = process.env.NODE_ENV !== "production"
    return NextResponse.json(
      { error: isDev ? message : "Erro ao cadastrar. Tente de novo ou use outro email." },
      { status: 500 }
    )
  }
}
