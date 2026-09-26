import { createClient } from "@/lib/supabase/server";
import { getAccounts, getGoals, getPaystubs, getProfile, getTransactions, monthRange } from "@/lib/data";
import { computeBudgetProgress, computeMonthSummary } from "@/lib/calculations/summary";
import { computeGoalProgress } from "@/lib/calculations/goals";
import { computePulseInsights } from "@/lib/calculations/pulse";
import { projectYTD } from "@/lib/calculations/paystubs";
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
  const [accounts, monthTransactions, allTransactions, goals, budgetsRes, trend, profile, paystubs] = await Promise.all([
    getAccounts(),
    getTransactions({ monthStart: start, monthEnd: end }),
    getTransactions(),
    getGoals(),
    supabase.from("budgets").select("*"),
    loadSpendingTrend(6),
    getProfile(),
    getPaystubs({ yearStart: `${now.getFullYear()}-01-01` }),
  ]);

  const budgets = (budgetsRes.data ?? []) as Budget[];

  const summary = computeMonthSummary(monthTransactions);
  const budgetProgress = computeBudgetProgress(budgets, summary.byCategory);
  const insights = computePulseInsights(summary, budgetProgress, trend);
  const activePlans = goals
    .filter((g) => g.status === "active")
    .map((g) => computeGoalProgress(g, allTransactions));

  // Monthly income baseline for % budgeting. Prefer paystub projection
  // (accurate net → net take-home is what shows up in the budget); fall
  // back to profile.annual_salary / 12 (gross).
  const proj = projectYTD(paystubs, profile?.pay_frequency ?? "biweekly");
  const monthlyIncome = proj
    ? proj.annual.netPay / 12
    : profile?.annual_salary
      ? Number(profile.annual_salary) / 12
      : 0;

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
      monthlyIncome={monthlyIncome}
    />
  );
}
