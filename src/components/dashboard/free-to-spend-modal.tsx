"use client";

import type { BudgetProgress } from "@/lib/calculations/summary";
import { fmtCurrency } from "@/lib/utils";
import { G } from "@/components/shell/ghost";

interface Props {
  open: boolean;
  onClose: () => void;
  income: number;             // monthly take-home baseline
  actualIncome: number;       // actual income logged this month
  expense: number;            // total expenses this month
  saved: number;              // savings transfers this month (not counted as "used")
  budgetProgress: BudgetProgress[];
}

export function FreeToSpendModal({
  open,
  onClose,
  income,
  actualIncome,
  expense,
  saved,
  budgetProgress,
}: Props) {
  const freeToSpend = Math.max(0, income - expense);
  const spentPct = income > 0 ? Math.min(100, (expense / income) * 100) : 0;
  const isOver = income > 0 && expense > income;

  // Top expense categories to show breakdown
  const expenseByCategory = budgetProgress
    .filter((b) => b.spent > 0)
    .sort((a, b) => b.spent - a.spent);

  return (
    <div
      className={"modal-overlay" + (open ? " open" : "")}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-panel" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="section-label mb-1">Free to Spend</p>
            <p
              className="text-3xl font-bold accent-num"
              style={{ color: isOver ? "var(--over)" : "var(--accent)" }}
            >
              <G>{fmtCurrency(isOver ? expense - income : freeToSpend)}</G>
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {income === 0 ? (
                "No income this month"
              ) : isOver ? (
                <>Over by that much vs your take-home</>
              ) : (
                <>
                  of <G>{fmtCurrency(income)}</G> take-home still unspent
                </>
              )}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: "6px 10px" }}>
            ✕
          </button>
        </div>

        {income > 0 && (
          <div className="progress-track mb-5">
            <div
              className="progress-fill"
              style={{
                width: `${spentPct}%`,
                background: isOver ? "var(--over)" : spentPct >= 80 ? "var(--warn)" : "var(--accent)",
              }}
            />
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-5">
          <Mini label="Income" value={fmtCurrency(actualIncome)} color="var(--accent)" />
          <Mini label="Spent" value={fmtCurrency(expense)} color="var(--text-primary)" />
          <Mini label="Saved" value={fmtCurrency(saved)} color="var(--violet)" />
        </div>

        <p className="section-label mb-3">Spent by category</p>
        {expenseByCategory.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Nothing spent yet this month.
          </p>
        ) : (
          <div className="space-y-3">
            {expenseByCategory.map((b) => {
              const over = b.remaining < 0;
              const color = over
                ? "var(--over)"
                : b.percent >= 80
                  ? "var(--warn)"
                  : "var(--accent)";
              return (
                <div key={b.category}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span style={{ color: "var(--text-secondary)" }}>{b.category}</span>
                    <span className="font-semibold" style={{ color }}>
                      <G>{fmtCurrency(b.spent)}</G>
                      {b.budgeted > 0 && (
                        <span className="text-xs ml-1" style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                          / <G>{fmtCurrency(b.budgeted)}</G>
                        </span>
                      )}
                    </span>
                  </div>
                  {b.budgeted > 0 && (
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.min(100, b.percent)}%`, background: color }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Mini({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="glass rounded-xl p-3 text-center">
      <p className="section-label mb-1" style={{ fontSize: 9 }}>{label}</p>
      <p className="text-sm font-bold" style={{ color }}>
        <G>{value}</G>
      </p>
    </div>
  );
}
