"use client";

import Link from "next/link";
import type { GoalProgress } from "@/lib/calculations/goals";
import { fmtCurrency } from "@/lib/utils";
import { G } from "@/components/shell/ghost";

interface Props {
  plans: GoalProgress[];
}

const TONE = {
  ok: { color: "var(--accent)", bg: "var(--accent-bg)", border: "var(--accent-border)" },
  warn: { color: "var(--warn)", bg: "rgba(180,83,9,0.07)", border: "rgba(180,83,9,0.18)" },
  over: { color: "var(--over)", bg: "var(--over-bg)", border: "var(--over-border)" },
  complete: { color: "var(--violet)", bg: "rgba(109,40,217,0.06)", border: "rgba(109,40,217,0.18)" },
} as const;

export function ActivePlans({ plans }: Props) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Active Plans
        </h2>
        <Link href="/plans" className="text-xs font-medium" style={{ color: "var(--accent)" }}>
          + New
        </Link>
      </div>
      {plans.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No active plans.{" "}
          <Link href="/plans" style={{ color: "var(--accent)" }}>
            Start one →
          </Link>
        </p>
      ) : (
        <div className="space-y-2">
          {plans.slice(0, 3).map((p) => {
            const tone = TONE[p.onTrack];
            const perDay =
              p.monthsLeft && p.monthsLeft > 0 && p.remaining > 0
                ? p.remaining / (p.monthsLeft * 30)
                : 0;
            return (
              <div
                key={p.goal.id}
                className="rounded-xl p-3"
                style={{ background: tone.bg, border: `1px solid ${tone.border}` }}
              >
                <div className="flex justify-between mb-1.5">
                  <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                    {p.goal.icon} {p.goal.name}
                  </p>
                  <span className="text-xs font-bold" style={{ color: tone.color }}>
                    <G>{fmtCurrency(p.saved)}</G> / <G>{fmtCurrency(Number(p.goal.target_amount))}</G>
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min(100, p.percent)}%`, background: tone.color }}
                  />
                </div>
                {p.monthsLeft !== null && p.monthsLeft > 0 && perDay > 0 && (
                  <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
                    {p.monthsLeft * 30} days left · <G>{fmtCurrency(perDay)}</G>/day
                  </p>
                )}
                {p.onTrack === "complete" && (
                  <p className="text-xs mt-1.5" style={{ color: tone.color }}>
                    Complete
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
