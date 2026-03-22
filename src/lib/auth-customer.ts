/**
 * Autenticação de clientes - NextAuth apenas com Google
 */
import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"

const hasGoogleCreds = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

export const customerAuthOptions: NextAuthOptions = {
  providers: hasGoogleCreds
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
      ]
    : [],
  callbacks: {
    async signIn({ user, account }) {
      try {
        if (account?.provider === "google" && user.email) {
          const existing = await prisma.customer.findFirst({
            where: {
              OR: [{ googleId: account.providerAccountId }, { email: user.email }],
            },
          })
          if (existing) {
            if (!existing.googleId) {
              await prisma.customer.update({
                where: { id: existing.id },
                data: {
                  googleId: account.providerAccountId,
                  name: user.name || existing.name,
                  email: user.email,
                  avatar: user.image || null,
                },
              })
            }
          } else {
            await prisma.customer.create({
              data: {
                name: user.name || user.email,
                email: user.email,
                googleId: account.providerAccountId,
                avatar: user.image || null,
              },
            })
          }
        }
        return true
      } catch (err) {
        console.error("[AUTH] Erro no signIn do cliente:", err)
        // Mesmo que o banco falhe, não vamos bloquear o login do Google
        return true
      }
    },
    async jwt({ token, account, profile }) {
      try {
        if (account?.provider === "google" && profile?.email) {
          const customer = await prisma.customer.findFirst({
            where: { googleId: account.providerAccountId },
          })
          if (customer) {
            ;(token as any).customerId = customer.id
            ;(token as any).customerName = customer.name
            ;(token as any).customerEmail = customer.email
          } else {
            // Google logou mas cliente ainda não existe no banco (ex.: banco falhou no signIn)
            ;(token as any).customerName = token.name ?? profile?.name
            ;(token as any).customerEmail = token.email ?? profile?.email
          }
        }
      } catch (err) {
        console.error("[AUTH] Erro no jwt do cliente:", err)
        ;(token as any).customerName = token.name
        ;(token as any).customerEmail = token.email
      }
      return token
    },
    async session({ session, token }) {
      const t = token as any

      // Renovação automática: se faltar menos de 1h para expirar, estende por mais 8h
      const now = Math.floor(Date.now() / 1000)
      const exp = typeof t.exp === "number" ? t.exp : undefined
      const remaining = exp != null ? exp - now : null
      if (remaining != null && remaining < 60 * 60) {
        t.exp = now + 8 * 60 * 60
      }

      if (session?.user) {
        session.user.name = session.user.name ?? t.customerName ?? t.name ?? "Cliente"
        session.user.email = session.user.email ?? t.customerEmail ?? t.email ?? null
        ;(session.user as { customerId?: string }).customerId = t.customerId
        ;(session.user as { customerName?: string }).customerName = t.customerName ?? session.user.name
        ;(session.user as { customerEmail?: string }).customerEmail = t.customerEmail ?? session.user.email ?? null
      }
      return session
    },
  },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  jwt: { maxAge: 8 * 60 * 60 },
  pages: {
    signIn: "/loja",
    error: "/loja",
  },
}
