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

  const rawBudgets = (budgetsRes.data ?? []) as Budget[];
  const summary = computeMonthSummary(monthTransactions);

  // Monthly take-home baseline for % budgeting.
  //
  // Steady-state projection = paystub net / 12 — stable, future-looking.
  // Actual = sum of income transactions for the viewed month — includes
  // bonuses or any extra income the user logs.
  //
  // Use max(projection, actual) so:
  //   - Early in the month, before actual income has arrived, we still
  //     show the projection as the expected envelope.
  //   - After a bonus or extra pay lands, the baseline bumps up to match.
  const proj = projectYTD(paystubs, profile?.pay_frequency ?? "biweekly");
  const projectedMonthly = proj ? proj.annual.netPay / 12 : 0;
  const monthlyIncome = Math.max(projectedMonthly, summary.income);

  // Live-adjust %-based budgets so a raise / bonus / new paystub flows
  // through without the user having to re-save. $-based budgets stay as-is.
  const budgets: Budget[] = rawBudgets.map((b) => {
    if (b.pct != null && monthlyIncome > 0) {
      return { ...b, amount: (Number(b.pct) / 100) * monthlyIncome };
    }
    return b;
  });
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
      monthlyIncome={monthlyIncome}
    />
  );
}
