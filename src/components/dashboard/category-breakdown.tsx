"use client";

import type { Budget } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { fmtCurrency } from "@/lib/utils";
import { G } from "@/components/shell/ghost";

interface Props {
  byCategory: Map<string, number>;
  saved: number;
  budgets: Budget[];
  monthLabel: string;
}

type Group = "needs" | "wants" | "savings";

const GROUP_LABEL: Record<Group, string> = {
  needs: "Needs",
  wants: "Wants",
  savings: "Savings",
};

const GROUP_COLOR: Record<Group, string> = {
  needs: "var(--accent)",
  wants: "var(--warn)",
  savings: "var(--violet)",
};

export function CategoryBreakdown({ byCategory, saved, budgets, monthLabel }: Props) {
  const budgetMap = new Map(budgets.map((b) => [b.category, Number(b.amount)]));

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Category Breakdown
        </h2>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {monthLabel}
        </span>
      </div>

      {(Object.keys(CATEGORIES) as Array<keyof typeof CATEGORIES>)
        .filter((g) => g !== "income")
        .map((g) => {
          const group = g as Group;
          const cats = CATEGORIES[group];
          return (
            <div key={group} className="mb-4 last:mb-0">
              <p className="section-label mb-2" style={{ color: GROUP_COLOR[group] }}>
                {GROUP_LABEL[group]}
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {cats.map((c) => {
                  const spent = group === "savings"
                    ? saved
                    : byCategory.get(c) ?? 0;
                  const budget = budgetMap.get(c);
                  return (
                    <CategoryTile
                      key={c}
                      category={c}
                      spent={spent}
                      budget={budget}
                      color={GROUP_COLOR[group]}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
}

function CategoryTile({
  category,
  spent,
  budget,
  color,
}: {
  category: string;
  spent: number;
  budget?: number;
  color: string;
}) {
  const hasBudget = budget !== undefined && budget > 0;
  const percent = hasBudget ? (spent / budget) * 100 : 0;
  const over = hasBudget && spent > budget;
  const isEmpty = spent === 0 && !hasBudget;

  let fillColor = color;
  let borderStyle = "1px solid var(--border)";
  let bgStyle = "var(--progress-bg)";
  if (over) {
    fillColor = "var(--over)";
    borderStyle = "1px solid var(--over-border)";
    bgStyle = "var(--over-bg)";
  } else if (hasBudget && percent >= 80) {
    fillColor = "var(--warn)";
  }

  const remaining = hasBudget ? budget - spent : 0;
  const status = isEmpty
    ? "Not started"
    : over
      ? `${fmtCurrency(-remaining)} over`
      : hasBudget
        ? `${fmtCurrency(remaining)} left`
        : "No budget";

  return (
    <div
      className="rounded-xl p-3.5"
      style={{
        border: borderStyle,
        background: bgStyle,
      }}
    >
      <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>
        {category}
      </p>
      <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
        <G>{fmtCurrency(spent)}</G>
      </p>
      {hasBudget && (
        <p className="text-xs opacity-60 mt-0.5" style={{ color: "var(--text-primary)" }}>
          of <G>{fmtCurrency(budget)}</G>
        </p>
      )}
      <div className="progress-track mt-2">
        {hasBudget && (
          <div
            className="progress-fill"
            style={{ width: `${Math.min(100, percent)}%`, background: fillColor }}
          />
        )}
      </div>
      <p
        className="text-xs mt-1.5 font-medium"
        style={{
          color: over ? "var(--over)" : isEmpty ? "var(--text-muted)" : "var(--text-secondary)",
        }}
      >
        {isEmpty ? status : <G>{status}</G>}
      </p>
    </div>
  );
}
