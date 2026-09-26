"use client";

import type { BudgetProgress, MonthSummary } from "@/lib/calculations/summary";
import type { TrendPoint } from "@/app/(app)/review/page";
import { fmtCurrency } from "@/lib/utils";
import { G } from "@/components/shell/ghost";

interface Props {
  summary: MonthSummary;
  budgetProgress: BudgetProgress[];
  trend: TrendPoint[];
  monthLabel: string;
}

interface Insight {
  tone: "over" | "warn" | "ok" | "info";
  title: string;
  detail: string;
}

function buildInsights(
  summary: MonthSummary,
  budgetProgress: BudgetProgress[],
  trend: TrendPoint[],
): Insight[] {
  const out: Insight[] = [];

  // Worst budget over-runs
  const overs = budgetProgress.filter((b) => b.percent > 100).sort((a, b) => b.percent - a.percent);
  for (const b of overs.slice(0, 2)) {
    out.push({
      tone: "over",
      title: `${b.category} ${b.percent.toFixed(0)}% over budget`,
      detail: `${fmtCurrency(b.spent, { decimals: false })} spent vs ${fmtCurrency(b.budgeted, { decimals: false })} budget — ${fmtCurrency(-b.remaining, { decimals: false })} over.`,
    });
  }

  // Category trend up 3+ months in a row
  if (trend.length >= 3) {
    const currentCats = trend[trend.length - 1].byCategory;
    for (const cat of Object.keys(currentCats)) {
      const vals = trend.map((p) => p.byCategory[cat] ?? 0);
      const rising = vals.slice(-3).every((v, i, arr) => i === 0 || v >= arr[i - 1]);
      if (rising && vals[vals.length - 1] > 0 && vals[vals.length - 3] > 0) {
        const cur = vals[vals.length - 1];
        const start = vals[vals.length - 3];
        if (cur > start * 1.15) {
          out.push({
            tone: "warn",
            title: `${cat} up 3 months in a row`,
            detail: `${fmtCurrency(start, { decimals: false })} → ${fmtCurrency(vals[vals.length - 2], { decimals: false })} → ${fmtCurrency(cur, { decimals: false })}. Worth watching.`,
          });
          break;
        }
      }
    }
  }

  // Savings rate change vs last month
  if (trend.length >= 2) {
    const cur = trend[trend.length - 1].savingsRate;
    const prev = trend[trend.length - 2].savingsRate;
    if (cur < prev - 5 && cur < 30) {
      out.push({
        tone: "warn",
        title: `Savings rate slipped to ${cur.toFixed(1)}%`,
        detail: `Down from ${prev.toFixed(1)}% last month. Cover the shortfall in the next few weeks to catch up.`,
      });
    } else if (cur > prev + 5) {
      out.push({
        tone: "ok",
        title: `Savings rate up to ${cur.toFixed(1)}%`,
        detail: `Up from ${prev.toFixed(1)}% last month. Keep the streak going.`,
      });
    }
  }

  // Category under 3-month avg
  if (trend.length >= 4) {
    for (const cat of Object.keys(trend[trend.length - 1].byCategory)) {
      const vals = trend.map((p) => p.byCategory[cat] ?? 0);
      const cur = vals[vals.length - 1];
      const avg = vals.slice(0, -1).reduce((s, v) => s + v, 0) / (vals.length - 1);
      if (avg > 0 && cur > 0 && cur < avg * 0.75) {
        const pct = ((avg - cur) / avg) * 100;
        out.push({
          tone: "ok",
          title: `${cat} ${pct.toFixed(0)}% under average`,
          detail: `${fmtCurrency(cur, { decimals: false })} vs 3-month avg ${fmtCurrency(avg, { decimals: false })}. Nice.`,
        });
        break;
      }
    }
  }

  // If income > 0 and savings > 20%, a positive callout
  if (summary.income > 0 && summary.saved > 0) {
    const rate = (summary.saved / summary.income) * 100;
    if (rate >= 25) {
      out.push({
        tone: "info",
        title: `💡 Saving ${rate.toFixed(0)}% of income`,
        detail: `Above the 20% rule-of-thumb. Consider bumping investments or accelerating a loan.`,
      });
    }
  }

  return out.slice(0, 6);
}

export function AiInsights({ summary, budgetProgress, trend, monthLabel }: Props) {
  const insights = buildInsights(summary, budgetProgress, trend);

  if (insights.length === 0) return null;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div
          style={{
            width: 20, height: 20, borderRadius: 6,
            background: "var(--violet-bg)", border: "1px solid var(--violet-border)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--violet)">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
        </div>
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Insights</p>
        <span
          style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: "auto" }}
        >
          {monthLabel}
        </span>
      </div>
      {insights.map((i, idx) => {
        const dotColor =
          i.tone === "over" ? "var(--over)" :
          i.tone === "warn" ? "var(--warn)" :
          i.tone === "ok" ? "var(--accent)" :
          "var(--violet)";
        return (
          <div
            key={idx}
            className="flex items-start gap-3 px-4 py-3"
            style={{
              borderBottom: idx < insights.length - 1 ? "1px solid var(--border)" : "none",
              background: i.tone === "info" ? "rgba(167,139,250,0.04)" : "transparent",
            }}
          >
            <div
              style={{
                width: 8, height: 8, borderRadius: 999,
                background: dotColor, marginTop: 6, flexShrink: 0,
                boxShadow: i.tone === "over" ? `0 0 6px ${dotColor}` : "none",
              }}
            />
            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: i.tone === "info" ? "var(--violet)" : "var(--text-primary)" }}
              >
                <G>{i.title}</G>
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--text-muted)", lineHeight: 1.5 }}
              >
                <G>{i.detail}</G>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
