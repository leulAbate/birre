import { createClient } from "@/lib/supabase/server";
import { getTransactions, monthRange } from "@/lib/data";
import { computeBudgetProgress, computeMonthSummary } from "@/lib/calculations/summary";
import { computePulseScore } from "@/lib/calculations/pulse";
import { ReviewClient } from "@/components/review/review-client";
import type { Budget, MonthlyNote, Transaction } from "@/lib/types";

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function ReviewPage({ searchParams }: Props) {
  const { month } = await searchParams;
  const now = new Date();
  const ym = month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [y, m] = ym.split("-").map(Number);
  const { start, end } = monthRange(y, m - 1);

  const supabase = await createClient();
  const [thisMonth, budgetsRes, noteRes, trendTxs] = await Promise.all([
    getTransactions({ monthStart: start, monthEnd: end }),
    supabase.from("budgets").select("*"),
    supabase.from("monthly_notes").select("*").eq("month", start).maybeSingle(),
    fetchPrevMonths(supabase, y, m - 1, 4),
  ]);

  const budgets = (budgetsRes.data ?? []) as Budget[];
  const note = (noteRes.data ?? null) as MonthlyNote | null;

  const summary = computeMonthSummary(thisMonth);
  const budgetProgress = computeBudgetProgress(budgets, summary.byCategory);
  const pulse = computePulseScore(summary, budgetProgress);

  return (
    <ReviewClient
      ym={ym}
      monthStart={start}
      summary={summary}
      budgets={budgets}
      budgetProgress={budgetProgress}
      pulse={pulse}
      trend={trendTxs}
      note={note}
    />
  );
}

export interface TrendPoint {
  label: string;                    // "Feb"
  ym: string;                       // "2026-02"
  income: number;
  expense: number;
  saved: number;
  savingsRate: number;              // 0-100
  byCategory: Record<string, number>;
}

async function fetchPrevMonths(
  supabase: Awaited<ReturnType<typeof createClient>>,
  year: number,
  monthIdx: number,
  count: number,
): Promise<TrendPoint[]> {
  const points: TrendPoint[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(year, monthIdx - i, 1);
    const { start, end } = monthRange(d.getFullYear(), d.getMonth());
    const { data } = await supabase
      .from("transactions")
      .select("amount, type, category")
      .gte("date", start)
      .lte("date", end);
    const rows = (data ?? []) as Array<Pick<Transaction, "amount" | "type" | "category">>;
    const summary = computeMonthSummary(
      rows.map((r) => ({
        ...r,
        id: "", user_id: "", account_id: null, to_account_id: null,
        goal_id: null, paystub_id: null, date: "", description: "",
        note: null, created_at: "",
      })),
    );
    const savingsRate = summary.income > 0 ? (summary.saved / summary.income) * 100 : 0;
    points.push({
      label: d.toLocaleDateString(undefined, { month: "short" }),
      ym: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      income: summary.income,
      expense: summary.expense,
      saved: summary.saved,
      savingsRate,
      byCategory: Object.fromEntries(summary.byCategory),
    });
  }
  return points;
}
