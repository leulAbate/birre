"use client";

import { useRouter } from "next/navigation";
import type { Budget } from "@/lib/types";
import type { YearMonthPoint } from "@/app/(app)/review/page";
import { fmtCurrency } from "@/lib/utils";
import { G } from "@/components/shell/ghost";

interface Props {
  year: number;
  months: YearMonthPoint[];
  budgets: Budget[];
}

export function YearReviewClient({ year, months, budgets }: Props) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const canGoForward = year < currentYear;

  const monthlyBudget = budgets.reduce((s, b) => s + Number(b.amount), 0);

  const totals = months.reduce(
    (t, m) => ({
      income: t.income + m.income,
      expense: t.expense + m.expense,
      saved: t.saved + m.saved,
      monthsWith: t.monthsWith + (m.hasData ? 1 : 0),
    }),
    { income: 0, expense: 0, saved: 0, monthsWith: 0 },
  );
  const savingsRateYtd = totals.income > 0 ? (totals.saved / totals.income) * 100 : 0;
  const avgSpend = totals.monthsWith > 0 ? totals.expense / totals.monthsWith : 0;

  function goMonth(ym: string) {
    router.push(`/review?month=${ym}`);
  }

  function shiftYear(direction: number) {
    router.push(`/review?year=${year + direction}`);
  }

  function switchToMonth() {
    router.push(`/review`);
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <button onClick={() => shiftYear(-1)} className="month-nav-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </button>
            <span className="section-label" style={{ padding: "2px 6px" }}>{year}</span>
            <button
              onClick={() => canGoForward && shiftYear(1)}
              disabled={!canGoForward}
              className="month-nav-btn"
              style={{ opacity: canGoForward ? 1 : 0.3, cursor: canGoForward ? "pointer" : "not-allowed" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
              </svg>
            </button>
          </div>
          <h1 className="text-2xl font-bold page-title">Review</h1>
        </div>

        {/* View toggle */}
        <div
          className="flex items-center gap-1 rounded-lg p-1"
          style={{ background: "var(--hover-bg)" }}
        >
          <ToggleBtn active={false} onClick={switchToMonth}>Month</ToggleBtn>
          <ToggleBtn active={true} onClick={() => {}}>Year</ToggleBtn>
        </div>
      </div>

      {/* YTD strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="YTD Income" value={fmtCurrency(totals.income, { sign: true })} color="var(--accent)" />
        <Stat label="YTD Spent" value={fmtCurrency(totals.expense)} color="var(--text-primary)" />
        <Stat label="YTD Saved" value={fmtCurrency(totals.saved, { sign: true })} color="var(--accent)" />
        <Stat
          label="Savings Rate YTD"
          value={totals.income > 0 ? `${savingsRateYtd.toFixed(0)}%` : "—"}
          color={
            savingsRateYtd >= 30 ? "var(--accent)" :
            savingsRateYtd >= 15 ? "var(--warn)" :
            "var(--over)"
          }
          rawValue
        />
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {months.map((m) => (
          <MonthCard
            key={m.ym}
            m={m}
            monthlyBudget={monthlyBudget}
            avgSpend={avgSpend}
            onClick={() => goMonth(m.ym)}
          />
        ))}
      </div>
    </div>
  );
}

function MonthCard({
  m,
  monthlyBudget,
  avgSpend,
  onClick,
}: {
  m: YearMonthPoint;
  monthlyBudget: number;
  avgSpend: number;
  onClick: () => void;
}) {
  const dim = !m.hasData;
  const budgetPct = monthlyBudget > 0 ? (m.expense / monthlyBudget) * 100 : 0;
  const barColor =
    budgetPct > 100 ? "var(--over)" :
    budgetPct >= 80 ? "var(--warn)" :
    "var(--accent)";
  const vsAvg = avgSpend > 0 ? ((m.expense - avgSpend) / avgSpend) * 100 : 0;
  const savingsColor =
    m.savingsRate >= 30 ? "var(--accent)" :
    m.savingsRate >= 15 ? "var(--warn)" :
    "var(--over)";

  return (
    <div
      onClick={m.hasData ? onClick : undefined}
      className="glass rounded-2xl p-4"
      style={{
        cursor: m.hasData ? "pointer" : "default",
        opacity: dim ? 0.5 : 1,
        transition: "transform 0.15s",
      }}
      onMouseEnter={(e) => {
        if (m.hasData) e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
    >
      <div className="flex items-center justify-between mb-3">
        <p
          className="section-label"
          style={{ padding: 0, fontSize: 11 }}
        >
          {m.label}
        </p>
        {m.hasData && m.savingsRate > 0 && (
          <span
            style={{
              fontSize: 10,
              padding: "1px 8px",
              borderRadius: 99,
              fontWeight: 700,
              letterSpacing: "0.04em",
              background: "var(--progress-bg)",
              color: savingsColor,
            }}
          >
            {m.savingsRate.toFixed(0)}%
          </span>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span
          className="text-xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          <G>{fmtCurrency(m.expense, { decimals: false })}</G>
        </span>
        {avgSpend > 0 && m.hasData && Math.abs(vsAvg) > 5 && (
          <span
            style={{
              fontSize: 10,
              color: vsAvg > 0 ? "var(--over)" : "var(--accent)",
              fontWeight: 600,
            }}
          >
            {vsAvg > 0 ? "↑" : "↓"} {Math.abs(vsAvg).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
        spent
      </p>

      {monthlyBudget > 0 && m.hasData && (
        <div className="progress-track mt-2">
          <div
            className="progress-fill"
            style={{ width: `${Math.min(100, budgetPct)}%`, background: barColor }}
          />
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Income
          </p>
          <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
            <G>{m.income > 0 ? fmtCurrency(m.income, { decimals: false }) : "—"}</G>
          </p>
        </div>
        <div>
          <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Saved
          </p>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            <G>{m.saved > 0 ? fmtCurrency(m.saved, { decimals: false }) : "—"}</G>
          </p>
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

function ToggleBtn({
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
        padding: "5px 14px",
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
