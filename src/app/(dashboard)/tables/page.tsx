"use client"

/**
 * Mesas - Status e reservas
 */
import { useEffect, useState } from "react"
import toast from "react-hot-toast"

type Table = {
  id: string
  number: number
  name: string | null
  capacity: number
  status: string
}

const STATUS_LABELS: Record<string, string> = {
  FREE: "Livre",
  OCCUPIED: "Ocupada",
  RESERVED: "Reservada",
}

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)

  const loadTables = async () => {
    const res = await fetch("/api/tables")
    if (res.ok) {
      const data = await res.json()
      setTables(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadTables()
  }, [])

  const updateStatus = async (tableId: string, status: string) => {
    const res = await fetch(`/api/tables/${tableId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      toast.success(`Mesa atualizada para ${STATUS_LABELS[status]}`)
      loadTables()
    } else {
      toast.error("Erro ao atualizar")
    }
  }

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Carregando...</p>

  return (
    <div className="page-body">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Mesas</h1>
          <p className="page-subtitle">Status e reservas das mesas.</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {tables.map((t) => (
          <div
            key={t.id}
            className={`panel ${
              t.status === "OCCUPIED"
                ? "border-amber-300 bg-amber-50/50"
                : t.status === "RESERVED"
                  ? "border-blue-300 bg-blue-50/50"
                  : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-slate-900">Mesa {t.number}</span>
              <span className={`badge-pill ${
                t.status === "FREE" ? "badge-success" : t.status === "OCCUPIED" ? "badge-warning" : "badge-info"
              }`}>
                {STATUS_LABELS[t.status]}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => updateStatus(t.id, "FREE")}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                  t.status === "FREE" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Livre
              </button>
              <button
                onClick={() => updateStatus(t.id, "RESERVED")}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium ${
                  t.status === "RESERVED" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Reservar
              </button>
              <button
                onClick={() => updateStatus(t.id, "OCCUPIED")}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium ${
                  t.status === "OCCUPIED" ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Ocupada
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
