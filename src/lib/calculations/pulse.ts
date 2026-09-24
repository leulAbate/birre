import type { MonthSummary } from "./summary";
import type { BudgetProgress } from "./summary";

export type InsightTone = "over" | "warn" | "ok" | "info";

export interface PulseInsight {
  tone: InsightTone;
  icon: string;
  title: string;
  detail: string;
}

/**
 * Rule-based generator of up to 3 "AI Pulse" tiles for the dashboard.
 * Deterministic; runs on the server, no LLM call. Swap for an AI-generated
 * version later by replacing this function.
 */
export function computePulseInsights(
  summary: MonthSummary,
  budgetProgress: BudgetProgress[],
  trend: Array<{ label: string; expense: number }>,
): PulseInsight[] {
  const insights: PulseInsight[] = [];

  const worstOver = budgetProgress.find((b) => b.percent > 100);
  if (worstOver) {
    insights.push({
      tone: "over",
      icon: "⚠️",
      title: `${worstOver.category} $${Math.abs(worstOver.remaining).toFixed(0)} over`,
      detail: `Spent $${worstOver.spent.toFixed(0)} against $${worstOver.budgeted.toFixed(0)} budget. Ease off this category for the rest of the month.`,
    });
  }

  if (trend.length >= 2) {
    const cur = trend[trend.length - 1].expense;
    const prev = trend[trend.length - 2].expense;
    if (prev > 0 && cur > 0) {
      const diff = ((cur - prev) / prev) * 100;
      if (diff > 15) {
        insights.push({
          tone: "warn",
          icon: "📈",
          title: `Spending up ${diff.toFixed(0)}%`,
          detail: `$${cur.toFixed(0)} this month vs $${prev.toFixed(0)} last month.`,
        });
      } else if (diff < -10) {
        insights.push({
          tone: "ok",
          icon: "📉",
          title: `Spending down ${Math.abs(diff).toFixed(0)}%`,
          detail: `$${cur.toFixed(0)} this month vs $${prev.toFixed(0)} last month. Nice.`,
        });
      }
    }
  }

  if (summary.income > 0) {
    const rate = (summary.saved / summary.income) * 100;
    if (rate >= 20) {
      insights.push({
        tone: "ok",
        icon: "✅",
        title: `Saving ${rate.toFixed(0)}% of income`,
        detail: `$${summary.saved.toFixed(0)} moved to savings. On track for a strong month.`,
      });
    } else if (rate > 0 && rate < 10) {
      insights.push({
        tone: "warn",
        icon: "💡",
        title: `Savings rate low (${rate.toFixed(0)}%)`,
        detail: `Only $${summary.saved.toFixed(0)} saved this month. Consider bumping automatic transfers.`,
      });
    } else if (summary.saved === 0) {
      insights.push({
        tone: "info",
        icon: "💡",
        title: "No savings recorded yet",
        detail: `You've had $${summary.income.toFixed(0)} of income this month. Move some to savings before it drifts.`,
      });
    }
  }

  if (summary.expense > summary.income && summary.income > 0) {
    insights.push({
      tone: "over",
      icon: "🔻",
      title: "Spending exceeds income",
      detail: `$${summary.expense.toFixed(0)} spent vs $${summary.income.toFixed(0)} earned. Reset before month end.`,
    });
  }

  const onTrackBudgets = budgetProgress.filter((b) => b.percent >= 50 && b.percent < 90);
  if (insights.length < 3 && onTrackBudgets.length > 0) {
    const best = onTrackBudgets[0];
    insights.push({
      tone: "ok",
      icon: "🎯",
      title: `${best.category} on pace`,
      detail: `$${best.spent.toFixed(0)} of $${best.budgeted.toFixed(0)} used. $${best.remaining.toFixed(0)} left.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      tone: "info",
      icon: "👋",
      title: "Getting started",
      detail: "Add some transactions and set a budget or two — Pulse fills in once there's data to comment on.",
    });
  }

  return insights.slice(0, 3);
}

export interface PulseScore {
  total: number;          // 0–100
  grade: "A" | "B" | "C" | "D" | "F";
  breakdown: {
    savingsRate: number;  // 0–40
    cashFlow: number;     // 0–20
    budgetAdherence: number; // 0–30
    diversityBonus: number;  // 0–10
  };
  savingsRate: number;    // 0–100 percent of income saved
}

/**
 * 100-point composite of the month's financial health.
 *
 *  - Savings rate (40 pts):  20%+ saved → full credit, linear scale below.
 *  - Cash flow (20 pts):     income ≥ expense → full credit, linear penalty.
 *  - Budget adherence (30):  none over → full credit, lose 5pt per category over.
 *  - Diversity bonus (10):   reward at least one savings transaction.
 *
 * Tweak weights here as priorities change.
 */
export function computePulseScore(
  summary: MonthSummary,
  budgetProgress: BudgetProgress[]
): PulseScore {
  const savingsRate = summary.income > 0 ? (summary.saved / summary.income) * 100 : 0;
  const savingsPts = Math.min(40, (savingsRate / 20) * 40);

  const cashFlowRatio = summary.income > 0 ? Math.min(1, (summary.income - summary.expense) / summary.income) : 0;
  const cashFlowPts = Math.max(0, cashFlowRatio * 20);

  const overCount = budgetProgress.filter((b) => b.percent > 100).length;
  const budgetPts = Math.max(0, 30 - overCount * 5);

  const diversityPts = summary.saved > 0 ? 10 : 0;

  const total = Math.round(savingsPts + cashFlowPts + budgetPts + diversityPts);
  const grade: PulseScore["grade"] =
    total >= 90 ? "A" :
    total >= 80 ? "B" :
    total >= 70 ? "C" :
    total >= 60 ? "D" : "F";

  return {
    total,
    grade,
    savingsRate,
    breakdown: {
      savingsRate: Math.round(savingsPts),
      cashFlow: Math.round(cashFlowPts),
      budgetAdherence: Math.round(budgetPts),
      diversityBonus: Math.round(diversityPts),
    },
  };
}
