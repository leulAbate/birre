"use client"

import { Card, CardContent } from "@/components/ui/card"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

function formatCategory(cat: string) {
  return cat.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

const COLORS = [
  "bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5", "bg-primary/40"
]

export default function SpendingBreakdown({
  data,
}: {
  data: { category: string; amount: number }[]
}) {
  const total = data.reduce((s, d) => s + d.amount, 0)

  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Top Spending
        </p>

        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No spending data yet</p>
        ) : (
          <div className="space-y-3">
            {data.map(({ category, amount }, i) => {
              const pct = total > 0 ? (amount / total) * 100 : 0
              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium truncate max-w-[130px]">
                      {formatCategory(category)}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">{fmt(amount)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${COLORS[i % COLORS.length]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
