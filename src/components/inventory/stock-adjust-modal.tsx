"use client"

/**
 * Modal para ajustar estoque: entrada, saída ou ajuste manual
 */
import { useState } from "react"
import { X } from "lucide-react"

type Product = {
  id: string
  name: string
  stockQty: number
  alertQty: number
}

type Props = {
  product: Product
  onClose: () => void
  onSuccess: () => void
}

export function StockAdjustModal({ product, onClose, onSuccess }: Props) {
  const [type, setType] = useState<"IN" | "OUT" | "ADJUSTMENT">("IN")
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    let qty: number
    if (type === "ADJUSTMENT") {
      qty = parseInt(quantity, 10)
      if (isNaN(qty) || qty < 0) {
        setError("Informe a quantidade final desejada")
        return
      }
    } else {
      qty = parseInt(quantity, 10)
      if (isNaN(qty) || qty <= 0) {
        setError("Informe a quantidade")
        return
      }
    }

    setLoading(true)
    try {
      const res = await fetch("/api/stock-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          type,
          quantity: qty,
          reason: reason.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erro ao registrar")
        return
      }
      onSuccess()
    } catch {
      setError("Erro de conexão")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ajustar estoque</h2>
          <button
            onClick={onClose}
            className="rounded p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-2 text-sm text-slate-400">
          {product.name} — Estoque atual: <strong>{product.stockQty}</strong>
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-900/30 p-3 text-sm text-red-400">{error}</div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Tipo de movimentação
            </label>
            <div className="flex gap-2">
              {(["IN", "OUT", "ADJUSTMENT"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    type === t ? "bg-primary text-primary-foreground" : "bg-slate-800"
                  }`}
                >
                  {t === "IN" ? "Entrada" : t === "OUT" ? "Saída" : "Ajuste"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              {type === "ADJUSTMENT"
                ? "Quantidade final (novo total)"
                : "Quantidade"}
            </label>
            <input
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={type === "ADJUSTMENT" ? String(product.stockQty) : "0"}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Motivo (opcional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Compra, Ajuste de inventário"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Salvando..." : "Confirmar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
