/**
 * Cliente Prisma - conexão única com o banco de dados
 * Evita criar várias conexões quando o Next.js recarrega em desenvolvimento
 */
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
