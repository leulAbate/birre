import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import CashFlowChart from "@/components/dashboard/CashFlowChart"
import SpendingBreakdown from "@/components/dashboard/SpendingBreakdown"
import RecentTransactions from "@/components/dashboard/RecentTransactions"
import RecurringWidget from "@/components/dashboard/RecurringWidget"
import AutoSync from "@/components/dashboard/AutoSync"
import { calcNetWorth } from "@/lib/calculations/net-worth"
import { calcMonthlyCashFlow, calcSpendingByCategory } from "@/lib/calculations/cash-flow"
import { detectRecurring } from "@/lib/calculations/recurring"
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react"

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

const fmtFull = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: accounts }, { data: transactions }] = await Promise.all([
    supabase
      .from("accounts")
      .select("type, current_balance")
      .eq("user_id", user!.id),
    supabase
      .from("transactions")
      .select("id, date, amount, category, custom_category, description, merchant_name, logo_url, pending, account:accounts(name)")
      .eq("user_id", user!.id)
      .eq("reviewed", true)
      .gte("date", new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split("T")[0])
      .order("date", { ascending: false }),
  ])

  const { netWorth, assets, liabilities } = calcNetWorth(accounts ?? [])
  const cashFlow = calcMonthlyCashFlow(transactions ?? [])
  const spendingByCategory = calcSpendingByCategory(transactions ?? [])
  const recurringItems = detectRecurring(transactions ?? [])

  const thisMonth = cashFlow[cashFlow.length - 1]
  const lastMonth = cashFlow[cashFlow.length - 2]
  const spendingDelta = lastMonth ? (thisMonth?.spending ?? 0) - lastMonth.spending : 0
  const incomeDelta  = lastMonth ? (thisMonth?.income ?? 0)  - lastMonth.income  : 0
  const netChange = thisMonth ? thisMonth.income - thisMonth.spending : 0
  const savingsRate = thisMonth && thisMonth.income > 0
    ? Math.round(((thisMonth.income - thisMonth.spending) / thisMonth.income) * 100)
    : null

  const recentTransactions = (transactions ?? []).slice(0, 10)

  // Split net worth at decimal for big/small styling
  const nwStr = fmtFull(Math.abs(netWorth))
  const dotIdx = nwStr.indexOf(".")
  const nwWhole = dotIdx >= 0 ? nwStr.slice(0, dotIdx) : nwStr
  const nwCents = dotIdx >= 0 ? nwStr.slice(dotIdx) : ".00"

  return (
    <div className="h-full overflow-y-auto">
      <AutoSync />

      <div className="p-5 space-y-4">
        {/* ── Row 1: Hero balance + 3 stat cards ── */}
        <div className="grid grid-cols-4 gap-4">
          {/* Hero */}
          <Card className="glow-primary col-span-1">
            <CardContent className="pt-5 pb-5 flex flex-col justify-between h-full min-h-[140px]">
              <div>
                <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-[0.15em] mb-3">
                  Net Worth
                </p>
                <p className="hero-balance font-bold leading-none tracking-tight" style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)" }}>
                  {netWorth < 0 ? "−" : ""}{nwWhole}
                  <span className="text-[55%] opacity-60">{nwCents}</span>
                </p>
              </div>
              <div className="mt-3 space-y-1">
                {netChange !== 0 && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${netChange >= 0 ? "text-chart-1" : "text-destructive"}`}>
                    {netChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {fmt(Math.abs(netChange))} this month
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {fmt(assets)} assets · {fmt(liabilities)} owed
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Income */}
          <Card>
            <CardContent className="pt-5 pb-5 h-full flex flex-col justify-between min-h-[140px]">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Income</p>
                <TrendingUp className="w-3.5 h-3.5 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums tracking-tight mt-2">
                  {fmt(thisMonth?.income ?? 0)}
                </p>
                <p className={`text-xs mt-1.5 font-medium ${incomeDelta >= 0 ? "text-chart-1" : "text-destructive"}`}>
                  {incomeDelta === 0 ? "Same as last month" : `${incomeDelta > 0 ? "+" : ""}${fmt(incomeDelta)} vs last mo.`}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Spending */}
          <Card>
            <CardContent className="pt-5 pb-5 h-full flex flex-col justify-between min-h-[140px]">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Spending</p>
                <TrendingDown className="w-3.5 h-3.5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums tracking-tight mt-2">
                  {fmt(thisMonth?.spending ?? 0)}
                </p>
                <p className={`text-xs mt-1.5 font-medium ${spendingDelta <= 0 ? "text-chart-1" : "text-destructive"}`}>
                  {spendingDelta === 0 ? "Same as last month" : `${spendingDelta > 0 ? "+" : ""}${fmt(spendingDelta)} vs last mo.`}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Saved / net */}
          <Card>
            <CardContent className="pt-5 pb-5 h-full flex flex-col justify-between min-h-[140px]">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Saved</p>
                <Wallet className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className={`text-2xl font-bold tabular-nums tracking-tight mt-2 ${netChange >= 0 ? "text-chart-1" : "text-destructive"}`}>
                  {netChange >= 0 ? "+" : ""}{fmt(netChange)}
                </p>
                <p className="text-xs mt-1.5 text-muted-foreground">
                  {savingsRate !== null ? `${savingsRate}% savings rate` : "No income data"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Row 2: Chart (3/5) + right column (2/5) ── */}
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-3">
            <CashFlowChart data={cashFlow} spendingByCategory={spendingByCategory} />
          </div>
          <div className="col-span-2 flex flex-col gap-4">
            <SpendingBreakdown data={spendingByCategory} />
            {recurringItems.length > 0 && <RecurringWidget items={recurringItems} />}
          </div>
        </div>

        {/* ── Row 3: Recent transactions ── */}
        <RecentTransactions transactions={recentTransactions} />
      </div>
    </div>
  )
}
