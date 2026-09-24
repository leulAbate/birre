"use client";

import { useState } from "react";
import { fmtCurrency } from "@/lib/utils";
import { G } from "@/components/shell/ghost";

interface TrendPoint {
  label: string;
  expense: number;
}

interface Props {
  byCategory: Map<string, number>;
  totalExpense: number;
  trend: TrendPoint[];
}

type Tab = "donut" | "bar" | "trend";

const SLICE_COLORS = [
  "var(--accent)",
  "var(--violet)",
  "var(--over)",
  "var(--warn)",
  "#60a5fa",
  "#f472b6",
  "#94a3b8",
];

export function SpendingVisual({ byCategory, totalExpense, trend }: Props) {
  const [tab, setTab] = useState<Tab>("donut");

  const entries = [...byCategory.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([category, amount], i) => ({
      category,
      amount,
      color: SLICE_COLORS[i % SLICE_COLORS.length],
      pct: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
    }));

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Spending Visual
        </h2>
        <div
          className="flex items-center gap-1 rounded-lg p-1"
          style={{ background: "var(--hover-bg)" }}
        >
          <TabButton active={tab === "donut"} onClick={() => setTab("donut")}>Donut</TabButton>
          <TabButton active={tab === "bar"} onClick={() => setTab("bar")}>Bar</TabButton>
          <TabButton active={tab === "trend"} onClick={() => setTab("trend")}>Trend</TabButton>
        </div>
      </div>

      {entries.length === 0 && tab !== "trend" ? (
        <p className="text-sm py-6 text-center" style={{ color: "var(--text-muted)" }}>
          No spending recorded yet.
        </p>
      ) : tab === "donut" ? (
        <DonutView entries={entries} totalExpense={totalExpense} />
      ) : tab === "bar" ? (
        <BarView entries={entries} />
      ) : (
        <TrendView trend={trend} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 11px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        background: active ? "var(--bg-card-solid)" : "transparent",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
        border: "none",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function DonutView({
  entries,
  totalExpense,
}: {
  entries: { category: string; amount: number; color: string; pct: number }[];
  totalExpense: number;
}) {
  const CIRC = 2 * Math.PI * 55;
  let offset = 0;
  return (
    <>
      <div className="flex justify-center mb-3">
        <svg width="150" height="150" viewBox="0 0 150 150">
          <circle
            cx="75" cy="75" r="55" fill="none"
            stroke="var(--progress-bg)" strokeWidth="20"
          />
          {entries.map((e) => {
            const len = (e.pct / 100) * CIRC;
            const dash = `${len} ${CIRC - len}`;
            const rotation = (offset / CIRC) * 360 - 90;
            offset += len;
            return (
              <circle
                key={e.category}
                cx="75" cy="75" r="55" fill="none"
                stroke={e.color} strokeWidth="20"
                strokeDasharray={dash}
                style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "75px 75px" }}
              />
            );
          })}
          <text
            x="75" y="71" textAnchor="middle"
            fill="var(--text-primary)" fontSize="14" fontWeight="700"
          >
            <G>{fmtCurrency(totalExpense)}</G>
          </text>
          <text x="75" y="85" textAnchor="middle" fill="var(--text-secondary)" fontSize="8">
            spent
          </text>
        </svg>
      </div>
      <div className="space-y-1.5">
        {entries.map((e) => (
          <div key={e.category} className="flex justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: e.color, display: "inline-block" }}
              />
              <span style={{ color: "var(--text-secondary)" }}>{e.category}</span>
            </div>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>
              {e.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function BarView({
  entries,
}: {
  entries: { category: string; amount: number; color: string; pct: number }[];
}) {
  const max = Math.max(1, ...entries.map((e) => e.amount));
  return (
    <>
      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
        This month
      </p>
      <div className="flex items-end gap-1.5 h-24 px-1">
        {entries.map((e) => {
          const h = Math.max(2, (e.amount / max) * 90);
          const label = e.category.length > 6 ? e.category.slice(0, 6) + "…" : e.category;
          return (
            <div key={e.category} className="flex flex-col items-center gap-1" style={{ flex: 1 }}>
              <div
                className="w-full rounded-t-md"
                style={{ height: `${h}px`, background: e.color, opacity: 0.85 }}
                title={`${e.category}: ${fmtCurrency(e.amount)}`}
              />
              <p
                className="mt-1 text-center"
                style={{ fontSize: 9, color: "var(--text-muted)" }}
              >
                {label}
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
}

function TrendView({ trend }: { trend: TrendPoint[] }) {
  if (trend.length === 0) {
    return (
      <p className="text-sm py-6 text-center" style={{ color: "var(--text-muted)" }}>
        No history yet.
      </p>
    );
  }
  const max = Math.max(1, ...trend.map((p) => p.expense));
  const w = 260;
  const h = 90;
  const pad = 10;
  const step = trend.length > 1 ? (w - pad * 2) / (trend.length - 1) : 0;
  const points = trend.map((p, i) => ({
    x: pad + i * step,
    y: h - pad - ((p.expense / max) * (h - pad * 2)),
    label: p.label,
    expense: p.expense,
  }));

  const path = points
    .map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`))
    .join(" ");
  const areaPath = `${path} L${points[points.length - 1].x},${h} L${points[0].x},${h} Z`;

  return (
    <>
      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
        Monthly spending trend
      </p>
      <svg width="100%" height="100" viewBox={`0 0 ${w} 100`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#trendGrad)" />
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
        {points.map((p) => (
          <circle key={p.label} cx={p.x} cy={p.y} r="3.5" fill="var(--accent)" />
        ))}
        {points.map((p) => (
          <text
            key={`t-${p.label}`}
            x={p.x} y="98" textAnchor="middle"
            fill="var(--text-muted)" fontSize="8"
          >
            {p.label}
          </text>
        ))}
      </svg>
    </>
  );
}
