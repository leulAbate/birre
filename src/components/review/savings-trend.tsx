"use client";

import type { TrendPoint } from "@/app/(app)/review/page";

interface Props {
  trend: TrendPoint[];
  target?: number;
}

export function SavingsTrend({ trend, target = 30 }: Props) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="section-label mb-3">Savings Rate Trend</p>
      <div className="space-y-2.5">
        {[...trend].reverse().map((p) => {
          const rate = p.savingsRate;
          const color = rate >= 30 ? "var(--accent)" : rate >= 20 ? "var(--warn)" : "var(--over)";
          const fill = Math.min(100, (rate / 50) * 100); // 50% = full bar
          return (
            <div key={p.ym}>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: "var(--text-secondary)" }}>{p.label} {p.ym.slice(0, 4)}</span>
                <span style={{ color, fontWeight: 600 }}>{rate.toFixed(1)}%</span>
              </div>
              <div className="progress-track" style={{ height: 5 }}>
                <div className="progress-fill" style={{ width: `${fill}%`, background: color }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
        Target: <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{target}%</span>
      </p>
    </div>
  );
}
