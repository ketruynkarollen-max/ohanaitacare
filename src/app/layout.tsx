import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Painel do Restaurante",
  description: "Sistema completo de gestão para restaurante com servidor próprio.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}

