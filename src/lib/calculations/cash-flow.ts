export function calcMonthlyCashFlow(
  transactions: { date: string; amount: number; category: string | null }[],
  monthsBack = 6
) {
  const now = new Date()
  const months: { label: string; key: string; income: number; spending: number }[] = []

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString("en-US", { month: "short" })
    months.push({ key, label, income: 0, spending: 0 })
  }

  for (const t of transactions) {
    const key = t.date.slice(0, 7)
    const bucket = months.find((m) => m.key === key)
    if (!bucket) continue
    if (t.amount < 0) {
      bucket.income += Math.abs(t.amount)
    } else {
      bucket.spending += t.amount
    }
  }

  return months
}

export function calcSpendingByCategory(
  transactions: { amount: number; category: string | null }[]
) {
  const map: Record<string, number> = {}
  for (const t of transactions) {
    if (t.amount <= 0) continue
    const cat = t.category ?? "Other"
    map[cat] = (map[cat] ?? 0) + t.amount
  }
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([category, amount]) => ({ category, amount }))
}
