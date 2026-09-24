import { createClient } from "@/lib/supabase/server";
import { getAccounts, getGoals, getTransactions, monthRange } from "@/lib/data";
import { computeBudgetProgress, computeMonthSummary } from "@/lib/calculations/summary";
import { computeGoalProgress } from "@/lib/calculations/goals";
import { computePulseInsights } from "@/lib/calculations/pulse";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import type { Budget } from "@/lib/types";

interface TrendPoint { label: string; expense: number; }

async function loadSpendingTrend(monthsBack: number): Promise<TrendPoint[]> {
  const supabase = await createClient();
  const now = new Date();
  const points: TrendPoint[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const { start, end } = monthRange(d.getFullYear(), d.getMonth());
    const { data } = await supabase
      .from("transactions")
      .select("amount, type")
      .gte("date", start)
      .lte("date", end);
    const expense = (data ?? [])
      .filter((r) => r.type === "expense")
      .reduce((s, r) => s + Number(r.amount), 0);
    points.push({
      label: d.toLocaleDateString(undefined, { month: "short" }),
      expense,
    });
  }
  return points;
}

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
  const [accounts, monthTransactions, allTransactions, goals, budgetsRes, trend] = await Promise.all([
    getAccounts(),
    getTransactions({ monthStart: start, monthEnd: end }),
    getTransactions(),
    getGoals(),
    supabase.from("budgets").select("*"),
    loadSpendingTrend(6),
  ]);

  const budgets = (budgetsRes.data ?? []) as Budget[];

  const summary = computeMonthSummary(monthTransactions);
  const budgetProgress = computeBudgetProgress(budgets, summary.byCategory);
  const insights = computePulseInsights(summary, budgetProgress, trend);
  const activePlans = goals
    .filter((g) => g.status === "active")
    .map((g) => computeGoalProgress(g, allTransactions));

  return (
    <DashboardClient
      ym={ym}
      accounts={accounts}
      summary={summary}
      budgets={budgets}
      budgetProgress={budgetProgress}
      trend={trend}
      insights={insights}
      activePlans={activePlans}
    />
  );
}
