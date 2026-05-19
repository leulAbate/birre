export interface RecurringItem {
  merchant: string
  amount: number          // typical charge amount
  frequency: "monthly" | "weekly" | "annual" | "irregular"
  lastCharged: string     // ISO date
  nextExpected: string | null
  occurrences: number
  totalSpent: number
  logo_url: string | null
}

interface RawTx {
  merchant_name: string | null
  description: string
  amount: number
  date: string
  logo_url: string | null
  custom_category: string | null
  category: string | null
}

function daysBetween(a: string, b: string) {
  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 86_400_000
}

function detectFrequency(sortedDates: string[]): "monthly" | "weekly" | "annual" | "irregular" {
  if (sortedDates.length < 2) return "irregular"

  const gaps: number[] = []
  for (let i = 1; i < sortedDates.length; i++) {
    gaps.push(daysBetween(sortedDates[i - 1], sortedDates[i]))
  }
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length

  if (avgGap <= 10) return "weekly"           // ~7 days
  if (avgGap <= 45) return "monthly"          // ~30 days
  if (avgGap <= 400) return "annual"          // ~365 days
  return "irregular"
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

function expectedGapDays(freq: "monthly" | "weekly" | "annual" | "irregular") {
  if (freq === "weekly") return 7
  if (freq === "monthly") return 30
  if (freq === "annual") return 365
  return null
}

export function detectRecurring(transactions: RawTx[]): RecurringItem[] {
  const spending = transactions.filter((t) => t.amount > 0)

  // Group by merchant key
  const groups = new Map<string, { txs: RawTx[]; logo: string | null }>()
  for (const t of spending) {
    const key = (t.merchant_name || t.description).toLowerCase().trim()
    if (!key) continue
    const existing = groups.get(key)
    if (existing) {
      existing.txs.push(t)
    } else {
      groups.set(key, { txs: [t], logo: t.logo_url })
    }
  }

  const results: RecurringItem[] = []

  for (const [, { txs, logo }] of groups) {
    if (txs.length < 2) continue

    // Sort chronologically
    const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date))

    // Check amount consistency — median amount, all within 25% of it
    const amounts = sorted.map((t) => t.amount)
    const medianAmt = amounts.slice().sort((a, b) => a - b)[Math.floor(amounts.length / 2)]
    const consistent = amounts.every((a) => Math.abs(a - medianAmt) / medianAmt < 0.25)
    if (!consistent) continue

    // Must appear in at least 2 distinct calendar months
    const months = new Set(sorted.map((t) => t.date.slice(0, 7)))
    if (months.size < 2) continue

    const dates = sorted.map((t) => t.date)
    const freq = detectFrequency(dates)
    if (freq === "irregular") continue

    const lastCharged = dates[dates.length - 1]
    const gapDays = expectedGapDays(freq)
    const nextExpected = gapDays ? addDays(lastCharged, gapDays) : null

    const displayName = txs[0].merchant_name || txs[0].description

    results.push({
      merchant: displayName,
      amount: medianAmt,
      frequency: freq,
      lastCharged,
      nextExpected,
      occurrences: txs.length,
      totalSpent: amounts.reduce((a, b) => a + b, 0),
      logo_url: logo,
    })
  }

  // Sort by amount descending
  return results.sort((a, b) => b.amount - a.amount)
}
