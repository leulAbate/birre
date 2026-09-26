import { createClient } from "@/lib/supabase/server";
import { getTransactions, monthRange } from "@/lib/data";
import { computeBudgetProgress, computeMonthSummary } from "@/lib/calculations/summary";
import { computePulseScore } from "@/lib/calculations/pulse";
import { ReviewClient } from "@/components/review/review-client";
import { YearReviewClient } from "@/components/review/year-review-client";
import type { Budget, MonthlyNote, Transaction } from "@/lib/types";

interface Props {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function ReviewPage({ searchParams }: Props) {
  const { month, year } = await searchParams;
  const now = new Date();

  const supabase = await createClient();

  // Year mode
  if (year !== undefined) {
    const yr = parseInt(year, 10) || now.getFullYear();
    const [budgetsRes, months] = await Promise.all([
      supabase.from("budgets").select("*"),
      fetchYearMonths(supabase, yr),
    ]);
    const budgets = (budgetsRes.data ?? []) as Budget[];
    return <YearReviewClient year={yr} months={months} budgets={budgets} />;
  }

  // Month mode (default)
  const ym = month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [y, m] = ym.split("-").map(Number);
  const { start, end } = monthRange(y, m - 1);

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

export interface YearMonthPoint {
  label: string;                    // "Feb"
  ym: string;                       // "2026-02"
  income: number;
  expense: number;
  saved: number;
  savingsRate: number;
  hasData: boolean;
}

async function fetchYearMonths(
  supabase: Awaited<ReturnType<typeof createClient>>,
  year: number,
): Promise<YearMonthPoint[]> {
  const now = new Date();

  // Single query for all rows in the year — one round-trip instead of 12.
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const { data } = await supabase
    .from("transactions")
    .select("amount, type, category, date")
    .gte("date", yearStart)
    .lte("date", yearEnd);
  const allRows = (data ?? []) as Array<
    Pick<Transaction, "amount" | "type" | "category" | "date">
  >;

  // Bucket by month index
  const buckets: Array<typeof allRows> = Array.from({ length: 12 }, () => []);
  for (const r of allRows) {
    const monthIdx = parseInt(r.date.slice(5, 7), 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) buckets[monthIdx].push(r);
  }

  const points: YearMonthPoint[] = [];
  for (let m = 0; m < 12; m++) {
    const d = new Date(year, m, 1);
    const ym = `${year}-${String(m + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString(undefined, { month: "short" });
    const isFuture = d > now;
    const rows = buckets[m];

    if (isFuture || rows.length === 0) {
      points.push({
        label,
        ym,
        income: 0,
        expense: 0,
        saved: 0,
        savingsRate: 0,
        hasData: !isFuture && rows.length > 0,
      });
      continue;
    }

    const summary = computeMonthSummary(
      rows.map((r) => ({
        ...r,
        id: "", user_id: "", account_id: null, to_account_id: null,
        goal_id: null, paystub_id: null, description: "",
        note: null, created_at: "",
      })),
    );
    const savingsRate = summary.income > 0 ? (summary.saved / summary.income) * 100 : 0;
    points.push({
      label,
      ym,
      income: summary.income,
      expense: summary.expense,
      saved: summary.saved,
      savingsRate,
      hasData: true,
    });
  }
  return points;
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
