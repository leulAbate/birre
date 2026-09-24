"use client";

import type { PulseInsight, InsightTone } from "@/lib/calculations/pulse";
import { G } from "@/components/shell/ghost";

interface Props {
  insights: PulseInsight[];
  monthLabel: string;
}

const TONE: Record<InsightTone, { color: string; bg: string; border: string }> = {
  over: {
    color: "var(--over)",
    bg: "rgba(185,28,28,0.07)",
    border: "rgba(185,28,28,0.15)",
  },
  warn: {
    color: "var(--warn)",
    bg: "rgba(180,83,9,0.07)",
    border: "rgba(180,83,9,0.15)",
  },
  ok: {
    color: "var(--accent)",
    bg: "var(--accent-bg)",
    border: "var(--accent-border)",
  },
  info: {
    color: "var(--violet)",
    bg: "rgba(109,40,217,0.06)",
    border: "rgba(109,40,217,0.18)",
  },
};

export function AiPulse({ insights, monthLabel }: Props) {
  if (insights.length === 0) return null;

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "var(--accent-bg)", border: "1px solid var(--accent-border)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--accent)">
            <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />
          </svg>
        </div>
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Pulse
        </p>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-semibold"
          style={{ background: "var(--accent-bg)", color: "var(--accent)", fontSize: 10 }}
        >
          {monthLabel}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {insights.map((i, idx) => {
          const t = TONE[i.tone];
          return (
            <div
              key={idx}
              className="rounded-xl p-3"
              style={{ background: t.bg, border: `1px solid ${t.border}` }}
            >
              <p className="text-xs font-semibold mb-1" style={{ color: t.color }}>
                {i.icon} <G>{i.title}</G>
              </p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                <G>{i.detail}</G>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
