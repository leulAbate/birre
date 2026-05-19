import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(n))

const fmtDate = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })

export default function RecentTransactions({ transactions }: { transactions: any[] }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-2">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold">Recent Transactions</p>
          <Link
            href="/transactions"
            className="flex items-center gap-1 text-xs text-primary font-medium hover:text-primary/80 transition-colors"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border/50">
                  <th className="text-left pb-2 font-medium">Date</th>
                  <th className="text-left pb-2 font-medium">Merchant</th>
                  <th className="text-left pb-2 font-medium hidden md:table-cell">Account</th>
                  <th className="text-right pb-2 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {transactions.map((t) => {
                  const isIncome = t.amount < 0
                  const account = Array.isArray(t.account) ? t.account[0] : t.account
                  return (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDate(t.date)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 overflow-hidden ${isIncome ? "bg-chart-1/15 text-chart-1" : "bg-muted text-muted-foreground"}`}>
                            {t.logo_url ? (
                              <img src={t.logo_url} alt="" className="w-full h-full object-contain" />
                            ) : (
                              (t.merchant_name ?? t.description).charAt(0).toUpperCase()
                            )}
                          </div>
                          <span className="font-medium truncate max-w-[180px]">
                            {t.merchant_name ?? t.description}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-muted-foreground hidden md:table-cell">
                        {account?.name ?? "—"}
                      </td>
                      <td className={`py-2.5 text-right font-semibold tabular-nums whitespace-nowrap ${isIncome ? "text-chart-1" : ""}`}>
                        {isIncome ? "+" : "-"}{fmt(t.amount)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
