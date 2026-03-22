"use client"

/**
 * Clientes - Cadastro e gestão de clientes
 */
import { useEffect, useState } from "react"
import { Plus, Search, Pencil, Trash2, Phone, Mail, MapPin, ChevronRight } from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CustomerForm } from "@/components/customers/customer-form"
import { ConfirmModal } from "@/components/ui/confirm-modal"

type Customer = {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  notes: string | null
  _count: { orders: number }
}

type Order = {
  id: string
  number: number
  total: number
  status: string
  createdAt: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [ordersByCustomer, setOrdersByCustomer] = useState<Record<string, Order[]>>({})
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null)
  const [detailOrders, setDetailOrders] = useState<Order[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const loadCustomers = async () => {
    const url = search.trim()
      ? `/api/customers?q=${encodeURIComponent(search)}`
      : "/api/customers"
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      setCustomers(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    const timer = setTimeout(() => loadCustomers(), 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleCreated = () => {
    setShowForm(false)
    loadCustomers()
  }

  const handleUpdated = () => {
    setEditing(null)
    loadCustomers()
  }

  const loadOrders = async (customerId: string) => {
    const res = await fetch(`/api/orders?customerId=${customerId}&limit=10`)
    if (res.ok) {
      const data = await res.json()
      setOrdersByCustomer((prev) => ({ ...prev, [customerId]: data }))
    }
  }

  const toggleExpand = (customerId: string) => {
    const isExpanding = expandedId !== customerId
    setExpandedId(isExpanding ? customerId : null)
    if (isExpanding && !ordersByCustomer[customerId]) loadOrders(customerId)
  }

  const openDetailDrawer = async (customer: Customer) => {
    setDetailCustomer(customer)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/orders?customerId=${customer.id}&limit=20`)
      if (res.ok) {
        const data = (await res.json()) as Order[]
        setDetailOrders(data)
      } else {
        setDetailOrders([])
      }
    } finally {
      setDetailLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/customers/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Cliente excluído")
      setDeleteId(null)
      loadCustomers()
    } else {
      toast.error("Erro ao excluir cliente")
    }
  }

  return (
    <div className="page-body">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">Cadastro e histórico de pedidos.</p>
        </div>
        <div className="page-header-actions">
          <button
            onClick={() => {
              setEditing(null)
              setShowForm(true)
            }}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" />
            Novo cliente
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, telefone ou email"
          className="input-search"
        />
      </div>

      {loading ? (
        <p className="text-slate-500">Carregando...</p>
      ) : customers.length === 0 ? (
        <div className="panel rounded-xl border-dashed py-12 text-center text-slate-500">
          Nenhum cliente encontrado. Clique em &quot;Novo cliente&quot; para cadastrar.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {customers.map((c) => (
            <div
              key={c.id}
              className="panel transition hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => openDetailDrawer(c)}
                    className="w-full text-left"
                  >
                    <h3 className="font-semibold underline-offset-2 hover:underline">
                      {c.name}
                    </h3>
                  </button>
                  {c.phone && (
                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      {c.phone}
                    </p>
                  )}
                  {c.email && (
                    <p className="mt-0.5 flex items-center gap-2 text-sm text-slate-400">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </p>
                  )}
                  {c.address && (
                    <p className="mt-0.5 flex items-center gap-2 text-sm text-slate-400">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{c.address}</span>
                    </p>
                  )}
                  <button
                    onClick={() => openDetailDrawer(c)}
                    className="mt-2 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                  >
                    {c._count.orders} pedido(s)
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => setEditing(c)}
                    className="rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(c.id)}
                    className="rounded p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <CustomerForm
          onClose={() => setShowForm(false)}
          onSuccess={handleCreated}
        />
      )}
      {editing && (
        <CustomerForm
          customer={editing}
          onClose={() => setEditing(null)}
          onSuccess={handleUpdated}
        />
      )}
      <ConfirmModal
        open={!!deleteId}
        title="Excluir cliente"
        message="Tem certeza que deseja excluir este cliente?"
        confirmLabel="Excluir"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />

      {/* Painel lateral de detalhes do cliente */}
      {detailCustomer && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
          <div className="animate-slide-in flex h-full w-full max-w-md flex-col bg-white shadow-panel-lg dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Gerenciar cliente</div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  {detailCustomer.name}
                </div>
                {detailCustomer.phone && (
                  <div className="text-sm text-primary dark:text-sky-400">
                    {detailCustomer.phone}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDetailCustomer(null)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Fechar
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Informações de contato
                </div>
                <div className="space-y-1.5 text-sm text-slate-700 dark:text-slate-200">
                  {detailCustomer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate">{detailCustomer.email}</span>
                    </div>
                  )}
                  {detailCustomer.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate">{detailCustomer.address}</span>
                    </div>
                  )}
                  {detailCustomer.city && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 dark:text-slate-400">Cidade:</span>
                      <span>{detailCustomer.city}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Histórico de pedidos
                  </span>
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    {detailCustomer._count.orders} pedido(s)
                  </span>
                </div>
                {detailLoading ? (
                  <p className="text-sm text-slate-500">Carregando pedidos...</p>
                ) : detailOrders.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhum pedido encontrado para este cliente.</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    <ul className="space-y-1.5">
                      {detailOrders.map((o) => (
                        <li
                          key={o.id}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-800/80"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
                              #{o.number}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {format(new Date(o.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(o.total)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {detailCustomer.notes && (
                <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Observações
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                    {detailCustomer.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
