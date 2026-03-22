export const dynamic = "force-dynamic"
/**
 * GET /api/expenses/export
 *   ?from=YYYY-MM-DD  (obrigatório)
 *   &to=YYYY-MM-DD    (obrigatório)
 *   &category=FOOD|SALARY|...  (opcional)
 *   &format=csv|xlsx  (padrão: csv)
 *
 * Retorna arquivo CSV formatado para abrir no Excel com BOM UTF-8
 * (BOM garante que acentos aparecem certos no Excel Windows)
 */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const CATEGORY_LABELS: Record<string, string> = {
  FOOD:      "Alimentação / Insumos",
  SALARY:    "Salários",
  RENT:      "Aluguel",
  UTILITIES: "Contas (luz, água, gás)",
  OTHER:     "Outros",
}

function escapeCSV(value: string | number) {
  const str = String(value ?? "")
  // Se contém vírgula, aspas ou quebra de linha, envolve em aspas duplas
  if (str.includes(";") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function fmtBRL(value: number) {
  return value.toFixed(2).replace(".", ",")
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fromParam     = searchParams.get("from")
    const toParam       = searchParams.get("to")
    const categoryParam = searchParams.get("category") || ""

    if (!fromParam || !toParam) {
      return NextResponse.json({ error: "Parâmetros from e to são obrigatórios" }, { status: 400 })
    }

    const from = new Date(fromParam + "T00:00:00")
    const to   = new Date(toParam   + "T23:59:59")

    const where: Record<string, unknown> = {
      date: { gte: from, lte: to },
    }
    if (categoryParam) where.category = categoryParam

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: "asc" },
    })

    const total = expenses.reduce((s, e) => s + e.amount, 0)

    // ── Monta o CSV ────────────────────────────────────────────────────────
    const lines: string[] = []

    // Título do relatório
    lines.push(`Relatório de Despesas`)
    lines.push(`Período;${fromParam} a ${toParam}`)
    lines.push(`Gerado em;${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`)
    lines.push("") // linha em branco

    // Cabeçalho da tabela
    lines.push(["Data", "Descrição", "Categoria", "Valor (R$)", "Observações"]
      .map(escapeCSV).join(";"))

    // Linhas de dados
    for (const e of expenses) {
      const row = [
        format(new Date(e.date), "dd/MM/yyyy", { locale: ptBR }),
        e.description,
        CATEGORY_LABELS[e.category] || e.category,
        fmtBRL(e.amount),
        e.notes ?? "",
      ]
      lines.push(row.map(escapeCSV).join(";"))
    }

    // Linha de total
    lines.push("")
    lines.push(["", "", "TOTAL", fmtBRL(total), ""].map(escapeCSV).join(";"))

    // Subtotais por categoria
    lines.push("")
    lines.push("Resumo por categoria")
    lines.push(["Categoria", "Total (R$)"].map(escapeCSV).join(";"))

    const byCategory: Record<string, number> = {}
    for (const e of expenses) {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
    }
    for (const [cat, val] of Object.entries(byCategory).sort(([, a], [, b]) => b - a)) {
      lines.push([CATEGORY_LABELS[cat] || cat, fmtBRL(val)].map(escapeCSV).join(";"))
    }

    // BOM UTF-8 (\uFEFF) garante que o Excel abre com acentos corretamente
    const csv = "\uFEFF" + lines.join("\r\n")

    const filename = `despesas_${fromParam}_${toParam}.csv`

    return new Response(csv, {
      headers: {
        "Content-Type":        "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("[API] Erro ao exportar despesas:", error)
    return NextResponse.json({ error: "Erro ao exportar" }, { status: 500 })
  }
}
