"use client";

import { useRouter } from "next/navigation";
import type { MonthlyNote } from "@/lib/types";
import type { BudgetProgress, MonthSummary } from "@/lib/calculations/summary";
import type { PulseScore } from "@/lib/calculations/pulse";
import { fmtCurrency } from "@/lib/utils";
import { G } from "@/components/shell/ghost";
import { PulseRing } from "./pulse-ring";
import { TrendBars } from "./trend-bars";
import { NotesField } from "./notes-field";

interface TrendPoint {
  label: string;
  income: number;
  expense: number;
  saved: number;
}

interface Props {
  ym: string;
  monthStart: string;
  summary: MonthSummary;
  budgetProgress: BudgetProgress[];
  pulse: PulseScore;
  trend: TrendPoint[];
  note: MonthlyNote | null;
}

export function ReviewClient({ ym, monthStart, summary, budgetProgress, pulse, trend, note }: Props) {
  const router = useRouter();

  function shiftMonth(direction: number) {
    const [y, m] = ym.split("-").map(Number);
    const d = new Date(y, m - 1 + direction, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    router.push(`/review?month=${next}`);
  }

  const monthLabel = formatMonth(ym);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <button onClick={() => shiftMonth(-1)} className="month-nav-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </button>
            <span className="section-label" style={{ padding: "2px 6px" }}>{monthLabel}</span>
            <button onClick={() => shiftMonth(1)} className="month-nav-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
              </svg>
            </button>
          </div>
          <h1 className="text-2xl font-bold page-title">Review</h1>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Income" value={fmtCurrency(summary.income, { sign: true })} color="var(--accent)" />
        <Stat label="Spent" value={fmtCurrency(-summary.expense)} color="var(--over)" />
        <Stat label="Saved" value={fmtCurrency(summary.saved, { sign: true })} color="var(--accent)" />
        <Stat label="Savings Rate" value={`${pulse.savingsRate.toFixed(0)}%`} color="var(--text-primary)" rawValue />
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pulse */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="section-label">Monthly Pulse</p>
            <span
              className="status-ok"
              style={{ fontSize: 11, padding: "2px 9px", borderRadius: 99, fontWeight: 700 }}
            >
              Grade {pulse.grade}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <PulseRing score={pulse.total} />
            <div className="flex-1 space-y-2">
              <BreakdownRow label="Savings rate" value={pulse.breakdown.savingsRate} max={40} />
              <BreakdownRow label="Cash flow" value={pulse.breakdown.cashFlow} max={20} />
              <BreakdownRow label="Budget adherence" value={pulse.breakdown.budgetAdherence} max={30} />
              <BreakdownRow label="Diversity" value={pulse.breakdown.diversityBonus} max={10} />
            </div>
          </div>
        </div>

        {/* Goal vs actual */}
        <div className="glass rounded-2xl p-5">
          <p className="section-label mb-3">Goal vs Actual</p>
          {budgetProgress.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No budgets set. Define category limits on the Dashboard to see how you tracked.
            </p>
          ) : (
            <div className="space-y-3">
              {budgetProgress.map((b) => (
                <BudgetVsActual key={b.category} item={b} />
              ))}
            </div>
          )}
        </div>

        {/* 4-month trend */}
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <p className="section-label mb-4">4-Month Trend</p>
          <TrendBars points={trend} />
        </div>

        {/* Notes */}
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <p className="section-label mb-3">Notes</p>
          <NotesField monthStart={monthStart} initialContent={note?.content ?? ""} />
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
  rawValue,
}: {
  label: string;
  value: string;
  color: string;
  rawValue?: boolean;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="section-label mb-1">{label}</p>
      <p className="text-xl font-bold" style={{ color }}>
        {rawValue ? value : <G>{value}</G>}
      </p>
    </div>
  );
}

function BreakdownRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {value}/{max}
        </span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%`, background: "var(--accent)" }} />
      </div>
    </div>
  );
}

function BudgetVsActual({ item }: { item: BudgetProgress }) {
  const fillColor =
    item.percent >= 100 ? "var(--over)" :
    item.percent >= 80 ? "var(--warn)" :
    "var(--accent)";
  return (
    <div>
      <div className="flex items-end justify-between mb-1">
        <span className="text-sm" style={{ color: "var(--text-primary)" }}>{item.category}</span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          <G>{fmtCurrency(item.spent)}</G> / <G>{fmtCurrency(item.budgeted)}</G> ({item.percent.toFixed(0)}%)
        </span>
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${Math.min(100, item.percent)}%`, background: fillColor }}
        />
      </div>
    </div>
  );
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
