"use client";

import type { BudgetProgress } from "@/lib/calculations/summary";
import { fmtCurrency } from "@/lib/utils";
import { G } from "@/components/shell/ghost";
import { CATEGORIES } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  wantsBudgets: BudgetProgress[]; // only wants-group budgets
  wantsTotal: number;
  wantsSpent: number;
}

export function FreeToSpendModal({
  open,
  onClose,
  wantsBudgets,
  wantsTotal,
  wantsSpent,
}: Props) {
  const remaining = wantsTotal - wantsSpent;
  const percentUsed = wantsTotal > 0 ? Math.min(100, (wantsSpent / wantsTotal) * 100) : 0;
  const isOver = remaining < 0;

  const wantsSet = new Set<string>(CATEGORIES.wants);
  const rows = wantsBudgets.filter((b) => wantsSet.has(b.category));

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
              <G>{fmtCurrency(Math.max(0, remaining))}</G>
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {wantsTotal === 0
                ? "No wants budget set"
                : isOver
                  ? <>Over <G>{fmtCurrency(-remaining)}</G> on <G>{fmtCurrency(wantsTotal)}</G> wants budget</>
                  : <>from <G>{fmtCurrency(wantsTotal)}</G> wants budget</>}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: "6px 10px" }}>
            ✕
          </button>
        </div>

        {wantsTotal > 0 && (
          <div className="progress-track mb-5">
            <div
              className="progress-fill"
              style={{
                width: `${percentUsed}%`,
                background: isOver ? "var(--over)" : "var(--accent)",
              }}
            />
          </div>
        )}

        <p className="section-label mb-3">Remaining per category</p>
        {rows.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Set budgets for Eating Out, Ride Share, or Misc to see them here.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((b) => {
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
                      {over ? (
                        <>−<G>{fmtCurrency(-b.remaining)}</G> over</>
                      ) : (
                        <><G>{fmtCurrency(b.remaining)}</G> left</>
                      )}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.min(100, b.percent)}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
