"use client";

import type { TrendPoint } from "@/app/(app)/review/page";
import { iconFor } from "@/lib/types";
import { fmtCurrency } from "@/lib/utils";
import { G } from "@/components/shell/ghost";

interface Props {
  trend: TrendPoint[];
  topN?: number;
}

export function CategorySparklines({ trend, topN = 5 }: Props) {
  if (trend.length === 0) return null;
  // find categories with the highest current-month spend
  const current = trend[trend.length - 1]?.byCategory ?? {};
  const categories = Object.entries(current)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([c]) => c);

  return (
    <div className="glass rounded-2xl p-5">
      <p className="section-label mb-4">Category Trends — Last {trend.length} Months</p>
      {categories.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Not enough spending data yet.
        </p>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => (
            <SparklineRow key={cat} category={cat} trend={trend} />
          ))}
        </div>
      )}
    </div>
  );
}

function SparklineRow({ category, trend }: { category: string; trend: TrendPoint[] }) {
  const values = trend.map((p) => p.byCategory[category] ?? 0);
  const max = Math.max(1, ...values);
  const cur = values[values.length - 1];
  const prev = values[values.length - 2] ?? 0;
  const three = values.slice(0, -1);
  const avg = three.length > 0 ? three.reduce((s, v) => s + v, 0) / three.length : 0;

  let trendLabel = "→ steady";
  let trendColor = "var(--text-muted)";
  if (cur > 0 && prev > 0) {
    const diff = ((cur - prev) / Math.max(1, prev)) * 100;
    if (diff > 30) {
      trendLabel = "↑ spiked";
      trendColor = "var(--over)";
    } else if (diff > 10) {
      trendLabel = "↑ up";
      trendColor = "var(--warn)";
    } else if (diff < -20) {
      trendLabel = "↓ improving";
      trendColor = "var(--accent)";
    } else if (diff < -10) {
      trendLabel = "↓ down";
      trendColor = "var(--accent)";
    }
  }

  const barColor =
    trendLabel.includes("spiked") ? "var(--over)" :
    trendLabel.includes("up") ? "var(--warn)" :
    trendLabel.includes("improving") || trendLabel.includes("down") ? "var(--accent)" :
    "var(--text-muted)";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 12 }}>{iconFor(category)}</span>
          <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            {category}
          </span>
        </div>
        <span className="text-xs font-bold" style={{ color: trendColor }}>
          {trendLabel}
        </span>
      </div>
      <div className="flex items-end gap-1" style={{ height: 40 }}>
        {values.map((v, i) => {
          const isCurrent = i === values.length - 1;
          const h = (v / max) * 100;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${Math.max(2, h)}%`,
                background: isCurrent ? barColor : `${barColor}`,
                opacity: isCurrent ? 1 : 0.35 + i * 0.15,
                borderRadius: 3,
              }}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1" style={{ fontSize: 10, color: "var(--text-muted)" }}>
        {values.map((v, i) => (
          <span
            key={i}
            style={{
              color: i === values.length - 1 ? trendColor : "var(--text-muted)",
              fontWeight: i === values.length - 1 ? 700 : 400,
            }}
          >
            <G>{fmtCurrency(v, { decimals: false })}</G>
          </span>
        ))}
      </div>
      {avg > 0 && cur > 0 && (
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          vs 3-mo avg <G>{fmtCurrency(avg, { decimals: false })}</G>
        </p>
      )}
    </div>
  );
}
