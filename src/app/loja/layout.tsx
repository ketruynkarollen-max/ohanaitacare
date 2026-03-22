import type { Metadata, Viewport } from "next"
import { Poppins } from "next/font/google"
import { Toaster } from "react-hot-toast"
import { SessionProvider } from "@/components/SessionProvider"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Ohana — Delivery",
  description: "Peça online com praticidade.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a122e",
}

export default function LojaLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className={poppins.className} style={{ minHeight: "100%", background: "#1a122e" }}>
        {children}
      </div>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
    </SessionProvider>
  )
}
