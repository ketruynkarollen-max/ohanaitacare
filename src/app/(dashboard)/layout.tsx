"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Topbar } from "@/components/topbar"
import { NewOrderNotifier } from "@/components/new-order-notifier"
import { Toaster } from "react-hot-toast"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="layout-shell">
      <Sidebar />
      <main className="page-container">
        <Topbar />
        <div className="page-content">
          <NewOrderNotifier />
          {children}
        </div>
      </main>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
    </div>
  )
}
