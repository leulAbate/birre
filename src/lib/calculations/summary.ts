import type { Budget, Transaction } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

export interface MonthSummary {
  income: number;
  expense: number;
  saved: number;          // savings-type transactions
  net: number;            // income - expense
  needs: number;
  wants: number;
  byCategory: Map<string, number>;
}

export function computeMonthSummary(transactions: Transaction[]): MonthSummary {
  const byCategory = new Map<string, number>();
  let income = 0;
  let expense = 0;
  let saved = 0;
  let needs = 0;
  let wants = 0;

  const NEEDS = new Set<string>(CATEGORIES.needs);
  const WANTS = new Set<string>(CATEGORIES.wants);
  const SAV = new Set<string>(CATEGORIES.savings);

  for (const tx of transactions) {
    const amt = Number(tx.amount);
    if (tx.type === "income") {
      income += amt;
    } else if (tx.type === "expense") {
      expense += amt;
      if (NEEDS.has(tx.category)) needs += amt;
      else if (WANTS.has(tx.category)) wants += amt;
      byCategory.set(tx.category, (byCategory.get(tx.category) ?? 0) + amt);
    } else if (tx.type === "transfer" && SAV.has(tx.category)) {
      saved += amt;
    }
  }

  return { income, expense, saved, net: income - expense, needs, wants, byCategory };
}

export interface BudgetProgress {
  category: string;
  spent: number;
  budgeted: number;
  remaining: number;       // can be negative
  percent: number;         // 0..100+
}

export function computeBudgetProgress(budgets: Budget[], byCategory: Map<string, number>): BudgetProgress[] {
  return budgets
    .map((b) => {
      const spent = byCategory.get(b.category) ?? 0;
      const remaining = Number(b.amount) - spent;
      const percent = b.amount > 0 ? (spent / Number(b.amount)) * 100 : 0;
      return { category: b.category, spent, budgeted: Number(b.amount), remaining, percent };
    })
    .sort((a, b) => b.percent - a.percent);
}

export function topExpenses(transactions: Transaction[], limit = 5): Transaction[] {
  return [...transactions]
    .filter((tx) => tx.type === "expense")
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, limit);
}
