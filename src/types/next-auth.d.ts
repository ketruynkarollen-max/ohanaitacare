import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null
      email?: string | null
      image?: string | null
      customerId?: string
      customerName?: string
      customerEmail?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    customerId?: string
    customerName?: string
    customerEmail?: string
  }
}
