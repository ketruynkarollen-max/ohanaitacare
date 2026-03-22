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

  // Categorias e produtos iniciais
  const cats = [
    { name: "Entradas", description: "Porções e petiscos" },
    { name: "Pratos Principais", description: "Pratos quentes e grelhados" },
    { name: "Bebidas", description: "Sucos, refrigerantes e drinks" },
    { name: "Sobremesas", description: "Doces e sobremesas" },
  ]

  const products: Array<{ name: string; description: string; price: number; category: string; featured?: boolean }> = [
    // Entradas
    { name: "Pão de Alho", description: "Pão crocante com manteiga e alho", price: 18, category: "Entradas" },
    { name: "Bolinho de Bacalhau", description: "6 unidades, crocantes por fora e macios por dentro", price: 32, category: "Entradas" },
    { name: "Tábua de Frios", description: "Seleção de queijos e embutidos", price: 48, category: "Entradas", featured: true },
    // Pratos Principais
    { name: "Frango Grelhado", description: "Frango grelhado com legumes e arroz", price: 42, category: "Pratos Principais", featured: true },
    { name: "Picanha na Brasa", description: "300g com farofa, vinagrete e fritas", price: 68, category: "Pratos Principais" },
    { name: "Misto Quente", description: "Pão, presunto e queijo grelhados", price: 22, category: "Pratos Principais" },
    // Bebidas
    { name: "Suco Natural", description: "Laranja, limão ou abacaxi — 500ml", price: 12, category: "Bebidas" },
    { name: "Refrigerante", description: "Lata 350ml", price: 8, category: "Bebidas" },
    { name: "Água Mineral", description: "500ml com ou sem gás", price: 6, category: "Bebidas" },
    // Sobremesas
    { name: "Pudim", description: "Pudim de leite condensado caseiro", price: 16, category: "Sobremesas" },
    { name: "Brownie com Sorvete", description: "Brownie quente com sorvete de creme", price: 24, category: "Sobremesas", featured: true },
  ]

  for (let i = 0; i < cats.length; i++) {
    let cat = await prisma.category.findFirst({ where: { name: cats[i].name } })
    if (!cat) {
      cat = await prisma.category.create({
        data: { name: cats[i].name, description: cats[i].description, position: i },
      })
    }

    const catProducts = products.filter((p) => p.category === cats[i].name)
    for (let j = 0; j < catProducts.length; j++) {
      const p = catProducts[j]
      await prisma.product.create({
        data: {
          name: p.name,
          description: p.description,
          price: p.price,
          categoryId: cat.id,
          position: j,
          featured: p.featured ?? false,
          active: true,
        },
      })
    }
    console.log(`Categoria criada: ${cat.name} (${catProducts.length} produtos)`)
  }

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
