import type { MonthSummary } from "./summary";
import type { BudgetProgress } from "./summary";

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
