"use client";

import type { TrendPoint } from "@/app/(app)/review/page";
import { iconFor } from "@/lib/types";
import { fmtCurrency } from "@/lib/utils";
import { G } from "@/components/shell/ghost";

interface Props {
  trend: TrendPoint[];
}

export function MomDiff({ trend }: Props) {
  if (trend.length < 2) return null;
  const cur = trend[trend.length - 1];
  const prev = trend[trend.length - 2];
  const cats = new Set<string>([
    ...Object.keys(cur.byCategory),
    ...Object.keys(prev.byCategory),
  ]);

  const rows = Array.from(cats)
    .map((cat) => {
      const c = cur.byCategory[cat] ?? 0;
      const p = prev.byCategory[cat] ?? 0;
      return { category: cat, cur: c, prev: p, diff: c - p };
    })
    .filter((r) => r.cur > 0 || r.prev > 0)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 6);

  return (
    <div className="glass rounded-2xl p-5">
      <p className="section-label mb-1">vs {prev.label} {prev.ym.slice(0, 4)}</p>
      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
        How each category moved
      </p>
      <div>
        {rows.map((r) => {
          let label = "→ no change";
          let color = "var(--text-muted)";
          if (Math.abs(r.diff) < 5) {
            label = "→ no change";
          } else if (r.diff > 0) {
            label = `↑ +${fmtCurrency(r.diff, { decimals: false })} more`;
            color = "var(--over)";
          } else {
            label = `↓ ${fmtCurrency(r.diff, { decimals: false })} less`;
            color = "var(--accent)";
          }
          return (
            <div
              key={r.category}
              className="flex items-center justify-between py-2"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 13 }}>{iconFor(r.category)}</span>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{r.category}</span>
              </div>
              <span className="text-xs font-semibold" style={{ color }}>
                <G>{label}</G>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
