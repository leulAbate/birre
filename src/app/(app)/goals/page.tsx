import { createClient } from "@/lib/supabase/server"
import PageHeader from "@/components/layout/PageHeader"
import GoalGrid from "@/components/goals/GoalGrid"

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: goals }, { data: accounts }] = await Promise.all([
    supabase
      .from("goals")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("accounts")
      .select("id, name, mask, type, current_balance")
      .eq("user_id", user!.id)
      .in("type", ["depository", "investment"]),
  ])

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Goals"
        description="Track your savings targets"
      />
      <GoalGrid goals={goals ?? []} accounts={accounts ?? []} />
    </div>
  )
}
