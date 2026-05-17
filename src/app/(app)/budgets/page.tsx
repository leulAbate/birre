import { createClient } from "@/lib/supabase/server"
import PageHeader from "@/components/layout/PageHeader"
import BudgetGrid from "@/components/budgets/BudgetGrid"

export default async function BudgetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Current month date range
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

  const [{ data: budgets }, { data: transactions }, { data: categories }] = await Promise.all([
    supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true }),

    // This month's spending per category
    supabase
      .from("transactions")
      .select("category, amount")
      .eq("user_id", user!.id)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .gt("amount", 0), // spending only

    // Last 3 months for suggested limits
    supabase
      .from("transactions")
      .select("category, amount")
      .eq("user_id", user!.id)
      .gte("date", new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split("T")[0])
      .gt("amount", 0),
  ])

  // Spending this month per category
  const spentMap: Record<string, number> = {}
  for (const t of transactions ?? []) {
    if (!t.category) continue
    spentMap[t.category] = (spentMap[t.category] ?? 0) + t.amount
  }

  // 3-month average per category (for suggestions when adding a budget)
  const avgMap: Record<string, number> = {}
  const catTotals: Record<string, number> = {}
  for (const t of categories ?? []) {
    if (!t.category) continue
    catTotals[t.category] = (catTotals[t.category] ?? 0) + t.amount
  }
  for (const [cat, total] of Object.entries(catTotals)) {
    avgMap[cat] = Math.round(total / 3)
  }

  // All unique categories from transactions (for the add budget dropdown)
  const availableCategories = [...new Set([
    ...Object.keys(spentMap),
    ...Object.keys(avgMap),
  ])].sort()

  const budgetsWithSpend = (budgets ?? []).map((b) => ({
    ...b,
    spent: spentMap[b.category] ?? 0,
  }))

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Budgets"
        description={now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
      />
      <BudgetGrid
        budgets={budgetsWithSpend}
        availableCategories={availableCategories}
        avgMap={avgMap}
      />
    </div>
  )
}
