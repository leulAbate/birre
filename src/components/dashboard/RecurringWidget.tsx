import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { RefreshCw, ChevronRight } from "lucide-react"
import { RecurringItem } from "@/lib/calculations/recurring"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

const fmtExact = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)

export default function RecurringWidget({ items }: { items: RecurringItem[] }) {
  const monthlyTotal =
    items.filter((i) => i.frequency === "monthly").reduce((s, i) => s + i.amount, 0) +
    items.filter((i) => i.frequency === "weekly").reduce((s, i) => s + i.amount, 0) * 4.33 +
    items.filter((i) => i.frequency === "annual").reduce((s, i) => s + i.amount, 0) / 12

  const preview = items.slice(0, 3)

  return (
    <Link href="/subscriptions" className="block">
      <Card className="hover:border-primary/30 transition-all duration-200 cursor-pointer group">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-primary" />
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Recurring</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>

          <p className="text-xl font-bold tabular-nums mb-0.5">
            {fmt(monthlyTotal)}<span className="text-xs font-normal text-muted-foreground">/mo</span>
          </p>
          <p className="text-[10px] text-muted-foreground mb-3">{items.length} active charges</p>

          <div className="space-y-2 border-t border-white/5 pt-3">
            {preview.map((item) => (
              <div key={item.merchant} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 rounded-md overflow-hidden shrink-0 flex items-center justify-center text-[9px] font-bold"
                    style={{ background: "rgba(124,106,247,0.15)", color: "#a78bfa" }}>
                    {item.logo_url ? (
                      <img src={item.logo_url} alt="" className="w-full h-full object-contain" />
                    ) : (
                      item.merchant.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground truncate">{item.merchant}</span>
                </div>
                <span className="text-[11px] font-semibold tabular-nums shrink-0 ml-2">{fmtExact(item.amount)}</span>
              </div>
            ))}
            {items.length > 3 && (
              <p className="text-[10px] text-muted-foreground text-center pt-0.5">+{items.length - 3} more</p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
