"use client";

import { fmtCurrency } from "@/lib/utils";
import { G } from "@/components/shell/ghost";

interface Props {
  open: boolean;
  onClose: () => void;
  totalExpense: number;
  income: number;
  byCategory: Map<string, number>;
}

const SLICE_COLORS = [
  "var(--accent)",
  "var(--violet)",
  "var(--over)",
  "var(--warn)",
  "#60a5fa",
  "#f472b6",
  "#94a3b8",
];

export function SpentModal({ open, onClose, totalExpense, income, byCategory }: Props) {
  const percentOfIncome = income > 0 ? (totalExpense / income) * 100 : 0;

  const rows = [...byCategory.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount], i) => ({
      category,
      amount,
      color: SLICE_COLORS[i % SLICE_COLORS.length],
      pct: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
    }));

  const barColor =
    percentOfIncome > 100 ? "var(--over)" :
    percentOfIncome >= 80 ? "var(--warn)" :
    "var(--accent)";

  return (
    <div
      className={"modal-overlay" + (open ? " open" : "")}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-panel" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="section-label mb-1">Total Spent</p>
            <p className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
              <G>{fmtCurrency(totalExpense)}</G>
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {income > 0
                ? `${percentOfIncome.toFixed(1)}% of your income`
                : "No income recorded this month"}
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
              style={{ width: `${Math.min(100, percentOfIncome)}%`, background: barColor }}
            />
          </div>
        )}

        <p className="section-label mb-3">By category</p>
        {rows.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No expenses recorded this month.
          </p>
        ) : (
          <div className="space-y-2.5">
            {rows.map((r) => (
              <div key={r.category} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: r.color, display: "inline-block" }}
                  />
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {r.category}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    <G>{fmtCurrency(r.amount)}</G>
                  </span>
                  <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
                    {r.pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
