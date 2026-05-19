import { createClient } from "@/lib/supabase/server"
import PageHeader from "@/components/layout/PageHeader"
import SubscriptionsView from "@/components/subscriptions/SubscriptionsView"
import { detectRecurring } from "@/lib/calculations/recurring"

export default async function SubscriptionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch last 6 months of reviewed spending transactions
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const since = sixMonthsAgo.toISOString().split("T")[0]

  const { data: transactions } = await supabase
    .from("transactions")
    .select("merchant_name, description, amount, date, logo_url, custom_category, category")
    .eq("user_id", user!.id)
    .eq("reviewed", true)
    .gt("amount", 0)
    .gte("date", since)
    .order("date", { ascending: true })

  const recurring = detectRecurring(transactions ?? [])

  const monthlyTotal = recurring
    .filter((r) => r.frequency === "monthly")
    .reduce((sum, r) => sum + r.amount, 0)

  const weeklyTotal = recurring
    .filter((r) => r.frequency === "weekly")
    .reduce((sum, r) => sum + r.amount, 0)

  const annualTotal = recurring
    .filter((r) => r.frequency === "annual")
    .reduce((sum, r) => sum + r.amount, 0)

  const estimatedMonthly = monthlyTotal + weeklyTotal * 4.33 + annualTotal / 12

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Recurring"
        description="Subscriptions and recurring charges detected from your transactions"
      />
      <SubscriptionsView
        items={recurring}
        estimatedMonthly={estimatedMonthly}
      />
    </div>
  )
}
