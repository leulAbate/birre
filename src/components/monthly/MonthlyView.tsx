"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

const fmtFull = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(n))

function formatCategory(cat: string) {
  return cat.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function prevMonth(month: string) {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function nextMonth(month: string) {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function isCurrentMonth(month: string) {
  const now = new Date()
  return month === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

interface Transaction {
  amount: number
  category: string | null
  description: string
  merchant_name: string | null
  date: string
  pending?: boolean
}

interface Props {
  transactions: Transaction[]
  previousTransactions: { amount: number; category: string | null }[]
  month: string
}

function calcSummary(txns: { amount: number; category: string | null }[]) {
  const income = txns.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const spending = txns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const byCategory: Record<string, number> = {}
  for (const t of txns) {
    if (t.amount > 0 && t.category) {
      byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount
    }
  }
  return { income, spending, byCategory }
}

export default function MonthlyView({ transactions, previousTransactions, month }: Props) {
  const router = useRouter()
  const curr = calcSummary(transactions)
  const prev = calcSummary(previousTransactions)
  const net = curr.income - curr.spending

  const categories = Object.entries(curr.byCategory)
    .sort(([, a], [, b]) => b - a)

  const maxSpend = categories[0]?.[1] ?? 1

  function pctChange(curr: number, prev: number) {
    if (prev === 0) return null
    return ((curr - prev) / prev) * 100
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-3xl space-y-6">

        {/* Month navigator */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push(`/monthly?month=${prevMonth(month)}`)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </button>
          <button
            onClick={() => router.push(`/monthly?month=${nextMonth(month)}`)}
            disabled={isCurrentMonth(month)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">Income</p>
              <p className="text-xl font-bold text-primary tabular-nums">{fmt(curr.income)}</p>
              <CompareTag curr={curr.income} prev={prev.income} positiveIsGood />
            </CardContent>
          </Card>
          <Card className="border-destructive/20">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">Spending</p>
              <p className="text-xl font-bold tabular-nums">{fmt(curr.spending)}</p>
              <CompareTag curr={curr.spending} prev={prev.spending} positiveIsGood={false} />
            </CardContent>
          </Card>
          <Card className={net >= 0 ? "border-primary/20 bg-primary/5" : "border-destructive/20 bg-destructive/5"}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">Net saved</p>
              <p className={`text-xl font-bold tabular-nums ${net >= 0 ? "text-primary" : "text-destructive"}`}>
                {net >= 0 ? "+" : ""}{fmt(net)}
              </p>
              <CompareTag curr={net} prev={prev.income - prev.spending} positiveIsGood />
            </CardContent>
          </Card>
        </div>

        {/* Category breakdown */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <h3 className="text-sm font-semibold mb-4">Spending by Category</h3>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No spending data for this month.</p>
            ) : (
              <div className="space-y-3">
                {categories.map(([cat, amount]) => {
                  const prevAmt = prev.byCategory[cat] ?? 0
                  const change = pctChange(amount, prevAmt)
                  const barPct = (amount / maxSpend) * 100

                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{formatCategory(cat)}</span>
                          {change !== null && (
                            <span className={`text-xs font-medium flex items-center gap-0.5 ${change > 0 ? "text-destructive" : "text-primary"}`}>
                              {change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {Math.abs(change).toFixed(0)}%
                            </span>
                          )}
                          {prevAmt === 0 && <Badge variant="secondary" className="text-xs py-0">New</Badge>}
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold tabular-nums">{fmtFull(amount)}</span>
                          {prevAmt > 0 && (
                            <span className="text-xs text-muted-foreground ml-2">vs {fmtFull(prevAmt)}</span>
                          )}
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top transactions */}
        <Card>
          <CardContent className="pt-5 pb-2">
            <h3 className="text-sm font-semibold mb-4">Transactions</h3>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No transactions this month.</p>
            ) : (
              <div className="space-y-0.5">
                {transactions.slice(0, 20).map((t, i) => (
                  <div key={i} className="flex items-center justify-between px-2 py-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium leading-tight">{t.merchant_name ?? t.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-muted-foreground">{t.date}</span>
                        {t.category && (
                          <Badge variant="secondary" className="text-xs py-0">{formatCategory(t.category)}</Badge>
                        )}
                        {t.pending && <Badge variant="outline" className="text-xs py-0">Pending</Badge>}
                      </div>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${t.amount < 0 ? "text-primary" : ""}`}>
                      {t.amount < 0 ? "+" : ""}{fmtFull(t.amount)}
                    </span>
                  </div>
                ))}
                {transactions.length > 20 && (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    +{transactions.length - 20} more transactions
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

function CompareTag({ curr, prev, positiveIsGood }: { curr: number; prev: number; positiveIsGood: boolean }) {
  if (prev === 0) return null
  const pct = ((curr - prev) / Math.abs(prev)) * 100
  const up = pct > 0
  const good = positiveIsGood ? up : !up

  return (
    <p className={`text-xs mt-1 flex items-center gap-0.5 font-medium ${good ? "text-primary" : "text-destructive"}`}>
      {Math.abs(pct) < 0.5
        ? <><Minus className="w-3 h-3" /> Same as last month</>
        : up
          ? <><TrendingUp className="w-3 h-3" /> {pct.toFixed(0)}% vs last month</>
          : <><TrendingDown className="w-3 h-3" /> {Math.abs(pct).toFixed(0)}% vs last month</>
      }
    </p>
  )
}
