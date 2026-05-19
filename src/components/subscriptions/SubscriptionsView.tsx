"use client"

import { RecurringItem } from "@/lib/calculations/recurring"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Calendar, TrendingUp } from "lucide-react"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)

const fmtDate = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })

const FREQ_LABEL: Record<string, string> = {
  monthly: "Monthly",
  weekly: "Weekly",
  annual: "Yearly",
  irregular: "Irregular",
}

const FREQ_COLOR: Record<string, string> = {
  monthly: "bg-primary/10 text-primary",
  weekly: "bg-chart-2/10 text-chart-2",
  annual: "bg-chart-5/10 text-chart-5",
  irregular: "bg-muted text-muted-foreground",
}

function daysUntil(dateStr: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + "T00:00:00")
  return Math.round((target.getTime() - now.getTime()) / 86_400_000)
}

interface Props {
  items: RecurringItem[]
  estimatedMonthly: number
}

export default function SubscriptionsView({ items, estimatedMonthly }: Props) {
  const monthly = items.filter((i) => i.frequency === "monthly")
  const weekly = items.filter((i) => i.frequency === "weekly")
  const annual = items.filter((i) => i.frequency === "annual")

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center py-24">
        <RefreshCw className="w-12 h-12 text-muted-foreground" />
        <p className="text-lg font-semibold">No recurring charges detected</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Review your transactions in the Inbox — once categorized, recurring charges will appear here automatically.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Est. Monthly Cost</p>
            <p className="text-2xl font-semibold tabular-nums">{fmt(estimatedMonthly)}</p>
            <p className="text-xs text-muted-foreground mt-1">{items.length} recurring charges</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Est. Annual Cost</p>
            <p className="text-2xl font-semibold tabular-nums">{fmt(estimatedMonthly * 12)}</p>
            <p className="text-xs text-muted-foreground mt-1">based on detected patterns</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Next 7 Days</p>
            <p className="text-2xl font-semibold tabular-nums">
              {fmt(
                items
                  .filter((i) => i.nextExpected && daysUntil(i.nextExpected) >= 0 && daysUntil(i.nextExpected) <= 7)
                  .reduce((sum, i) => sum + i.amount, 0)
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {items.filter((i) => i.nextExpected && daysUntil(i.nextExpected) >= 0 && daysUntil(i.nextExpected) <= 7).length} charges coming up
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming */}
      {items.some((i) => i.nextExpected && daysUntil(i.nextExpected) >= 0 && daysUntil(i.nextExpected) <= 14) && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Due in the next 2 weeks</h2>
          </div>
          <Card>
            <CardContent className="py-2 divide-y divide-border/50">
              {items
                .filter((i) => i.nextExpected && daysUntil(i.nextExpected) >= 0 && daysUntil(i.nextExpected) <= 14)
                .sort((a, b) => (a.nextExpected ?? "").localeCompare(b.nextExpected ?? ""))
                .map((item) => {
                  const days = daysUntil(item.nextExpected!)
                  return (
                    <RecurringRow
                      key={item.merchant}
                      item={item}
                      right={
                        <span className={`text-xs font-medium ${days === 0 ? "text-destructive" : days <= 3 ? "text-amber-500" : "text-muted-foreground"}`}>
                          {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`}
                        </span>
                      }
                    />
                  )
                })}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Monthly */}
      {monthly.length > 0 && (
        <RecurringSection label="Monthly" icon={<RefreshCw className="w-4 h-4" />} items={monthly} />
      )}

      {/* Weekly */}
      {weekly.length > 0 && (
        <RecurringSection label="Weekly" icon={<TrendingUp className="w-4 h-4" />} items={weekly} />
      )}

      {/* Annual */}
      {annual.length > 0 && (
        <RecurringSection label="Yearly" icon={<Calendar className="w-4 h-4" />} items={annual} />
      )}
    </div>
  )
}

function RecurringSection({
  label,
  icon,
  items,
}: {
  label: string
  icon: React.ReactNode
  items: RecurringItem[]
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{label}</h2>
        <span className="text-xs text-muted-foreground">
          · {fmt(items.reduce((s, i) => s + i.amount, 0))}/mo
        </span>
      </div>
      <Card>
        <CardContent className="py-2 divide-y divide-border/50">
          {items.map((item) => (
            <RecurringRow key={item.merchant} item={item} />
          ))}
        </CardContent>
      </Card>
    </section>
  )
}

function RecurringRow({ item, right }: { item: RecurringItem; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-3">
      {/* Logo / initial */}
      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
        {item.logo_url ? (
          <img src={item.logo_url} alt={item.merchant} className="w-full h-full object-contain" />
        ) : (
          <span className="text-sm font-semibold text-muted-foreground">
            {item.merchant.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.merchant}</p>
        <p className="text-xs text-muted-foreground">
          Last charged {fmtDate(item.lastCharged)}
          {item.nextExpected ? ` · Next ${fmtDate(item.nextExpected)}` : ""}
        </p>
      </div>

      {/* Right: amount + badge */}
      <div className="flex items-center gap-3 shrink-0">
        {right ?? (
          <Badge variant="secondary" className={`text-xs ${FREQ_COLOR[item.frequency]}`}>
            {FREQ_LABEL[item.frequency]}
          </Badge>
        )}
        <span className="text-sm font-semibold tabular-nums">{fmt(item.amount)}</span>
      </div>
    </div>
  )
}
