"use client"

/**
 * Configurações do negócio (Business)
 */
import { useEffect, useState } from "react"
import { Save } from "lucide-react"
import toast from "react-hot-toast"

type Business = {
  id: string
  name: string
  slug: string
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  openTime: string
  closeTime: string
  deliveryFee: number
  minOrder: number
  deliveryTime: number
  primaryColor: string
  acceptDelivery: boolean
  acceptPickup: boolean
  acceptTable: boolean
  acceptCash: boolean
  acceptCard: boolean
  acceptPix: boolean
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Business>>({})

  useEffect(() => {
    fetch("/api/business")
      .then((res) => res.json())
      .then((data) => {
        if (data.id) setForm(data)
        else setForm({ name: "Brasa", slug: "brasa", openTime: "08:00", closeTime: "23:00", deliveryFee: 0, minOrder: 0, deliveryTime: 45, primaryColor: "#ef4444", acceptDelivery: true, acceptPickup: true, acceptTable: true, acceptCash: true, acceptCard: true, acceptPix: true })
      })
      .catch(() => setForm({ name: "Brasa", slug: "brasa", openTime: "08:00", closeTime: "23:00", deliveryFee: 0, minOrder: 0, deliveryTime: 45, primaryColor: "#ef4444", acceptDelivery: true, acceptPickup: true, acceptTable: true, acceptCash: true, acceptCard: true, acceptPix: true }))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) toast.success("Configurações salvas")
      else toast.error("Erro ao salvar")
    } catch {
      toast.error("Erro de conexão")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Carregando...</p>

  return (
    <div className="page-body">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Configurações</h1>
          <p className="page-subtitle">Dados do negócio, delivery e horários.</p>
        </div>
        <div className="page-header-actions">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
            style={{ opacity: saving ? 0.5 : 1 }}
          >
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-6">
          <h2 className="mb-4 font-semibold text-slate-900">Dados do negócio</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Nome</label>
              <input
                type="text"
                value={form.name || ""}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Telefone</label>
              <input
                type="text"
                value={form.phone || ""}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Endereço</label>
              <input
                type="text"
                value={form.address || ""}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="panel p-6">
          <h2 className="mb-4 font-semibold text-slate-900">Delivery</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Taxa de entrega (R$)</label>
              <input
                type="number"
                step="0.01"
                value={form.deliveryFee ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, deliveryFee: parseFloat(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Pedido mínimo (R$)</label>
              <input
                type="number"
                step="0.01"
                value={form.minOrder ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, minOrder: parseFloat(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Tempo estimado (min)</label>
              <input
                type="number"
                value={form.deliveryTime ?? 45}
                onChange={(e) => setForm((f) => ({ ...f, deliveryTime: parseInt(e.target.value, 10) || 45 }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Horário (abertura – fechamento)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={parseInt(form.openTime?.split(":")[0] || "8", 10)}
                  onChange={(e) => setForm((f) => ({ ...f, openTime: `${String(parseInt(e.target.value, 10) || 0).padStart(2, "0")}:00` }))}
                  className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-2 text-center text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-slate-500">–</span>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={parseInt(form.closeTime?.split(":")[0] || "23", 10)}
                  onChange={(e) => setForm((f) => ({ ...f, closeTime: `${String(parseInt(e.target.value, 10) || 23).padStart(2, "0")}:00` }))}
                  className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-2 text-center text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
