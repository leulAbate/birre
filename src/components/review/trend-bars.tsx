"use client";

import { fmtCurrency } from "@/lib/utils";
import { G } from "@/components/shell/ghost";

interface Point {
  label: string;
  income: number;
  expense: number;
  saved: number;
}

export function TrendBars({ points }: { points: Point[] }) {
  if (points.every((p) => p.income === 0 && p.expense === 0 && p.saved === 0)) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Not enough data yet. Add a few months of transactions to see your trend.
      </p>
    );
  }

  const maxVal = Math.max(1, ...points.flatMap((p) => [p.income, p.expense]));

  return (
    <div className="flex items-end justify-around gap-4 h-48">
      {points.map((p) => (
        <div key={p.label} className="flex flex-col items-center gap-2 flex-1">
          <div className="flex items-end gap-1 h-32">
            <Bar height={(p.income / maxVal) * 100} color="var(--accent)" tooltip={`Income ${fmtCurrency(p.income)}`} />
            <Bar height={(p.expense / maxVal) * 100} color="var(--over)" tooltip={`Spent ${fmtCurrency(p.expense)}`} />
            <Bar height={(p.saved / maxVal) * 100} color="var(--violet)" tooltip={`Saved ${fmtCurrency(p.saved)}`} />
          </div>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{p.label}</span>
          <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
            <G>{fmtCurrency(p.income - p.expense, { sign: true })}</G>
          </span>
        </div>
      ))}
      <Legend />
    </div>
  );
}

function Bar({ height, color, tooltip }: { height: number; color: string; tooltip: string }) {
  return (
    <div
      title={tooltip}
      style={{
        width: 12,
        height: `${Math.max(2, height)}%`,
        background: color,
        borderRadius: 3,
        transition: "height 0.6s ease",
      }}
    />
  );
}

function Legend() {
  return (
    <div className="flex flex-col gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
      <LegendItem color="var(--accent)" label="Income" />
      <LegendItem color="var(--over)" label="Spent" />
      <LegendItem color="var(--violet)" label="Saved" />
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ width: 8, height: 8, background: color, borderRadius: 2 }} />
      {label}
    </div>
  );
}
