"use client"

import { Card, CardContent } from "@/components/ui/card"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

function formatCategory(cat: string) {
  return cat.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

const COLORS = ["#818CF8", "#34D399", "#FBBF24", "#F87171", "#A78BFA", "#38BDF8", "#FB923C", "#4ADE80"]

export default function SpendingBreakdown({ data }: { data: { category: string; amount: number }[] }) {
  const total = data.reduce((s, d) => s + d.amount, 0)
  const top6 = data.slice(0, 6)

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em] mb-3">
          Top Spending
        </p>

        {top6.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No spending data</p>
        ) : (
          <div className="space-y-2.5">
            {top6.map(({ category, amount }, i) => {
              const pct = total > 0 ? (amount / total) * 100 : 0
              const color = COLORS[i % COLORS.length]
              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                      <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                        {formatCategory(category)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold" style={{ color }}>{pct.toFixed(0)}%</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">{fmt(amount)}</span>
                    </div>
                  </div>
                  <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${color}99, ${color})`,
                        boxShadow: `0 0 6px ${color}50`,
                        transition: "width 0.6s ease",
                      }}
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
