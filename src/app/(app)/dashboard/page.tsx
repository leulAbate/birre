import { createClient } from "@/lib/supabase/server";
import { getAccounts, getTransactions, monthRange } from "@/lib/data";
import { computeBudgetProgress, computeMonthSummary, topExpenses } from "@/lib/calculations/summary";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import type { Budget, Recurring } from "@/lib/types";

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const { month } = await searchParams;

  const now = new Date();
  const ym = month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [y, m] = ym.split("-").map(Number);
  const { start, end } = monthRange(y, m - 1);

  const supabase = await createClient();
  const [accounts, monthTransactions, budgetsRes, recurringRes] = await Promise.all([
    getAccounts(),
    getTransactions({ monthStart: start, monthEnd: end }),
    supabase.from("budgets").select("*"),
    supabase.from("recurring").select("*").eq("active", true),
  ]);

  const budgets = (budgetsRes.data ?? []) as Budget[];
  const recurring = (recurringRes.data ?? []) as Recurring[];

  const summary = computeMonthSummary(monthTransactions);
  const budgetProgress = computeBudgetProgress(budgets, summary.byCategory);
  const top = topExpenses(monthTransactions, 5);

  return (
    <DashboardClient
      ym={ym}
      accounts={accounts}
      summary={summary}
      budgetProgress={budgetProgress}
      topExpenses={top}
      recentTransactions={monthTransactions.slice(0, 6)}
      recurring={recurring}
    />
  );
}
