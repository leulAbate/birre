import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(n))

export default function RecentTransactions({ transactions }: { transactions: any[] }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-2">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Recent Transactions
          </p>
          <Link
            href="/transactions"
            className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No transactions yet</p>
        ) : (
          <div className="space-y-1">
            {transactions.map((t) => {
              const isIncome = t.amount < 0
              return (
                <div key={t.id} className="flex items-center justify-between px-2 py-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 ${isIncome ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {isIncome ? "↓" : "↑"}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-tight">
                        {t.merchant_name ?? t.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.account?.name} · {new Date(t.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <p className={`text-sm font-semibold tabular-nums shrink-0 ${isIncome ? "text-primary" : ""}`}>
                    {isIncome ? "+" : "-"}{fmt(t.amount)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
