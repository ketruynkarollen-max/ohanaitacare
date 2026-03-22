import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Business
  const business = await prisma.business.upsert({
    where: { slug: "brasa" },
    update: {},
    create: {
      name: "Brasa",
      slug: "brasa",
      primaryColor: "#7c5cf6",
      openTime: "08:00",
      closeTime: "23:00",
      deliveryFee: 5,
      minOrder: 30,
      deliveryTime: 45,
      acceptDelivery: true,
      acceptPickup: true,
      acceptTable: true,
      acceptCash: true,
      acceptCard: true,
      acceptPix: true,
    },
  })
  console.log("Business criado:", business.name)

  // Admin user
  const hash = await bcrypt.hash("admin123", 10)
  const user = await prisma.user.upsert({
    where: { email: "admin@brasa.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@brasa.com",
      password: hash,
      role: "ADMIN",
    },
  })
  console.log("Usuario admin criado:", user.email)
  console.log("")
  console.log("=== CREDENCIAIS DE ACESSO ===")
  console.log("Email:  admin@brasa.com")
  console.log("Senha:  admin123")
  console.log("=============================")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
