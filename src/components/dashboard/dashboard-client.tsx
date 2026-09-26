"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Account, Budget } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import type { BudgetProgress, MonthSummary } from "@/lib/calculations/summary";
import type { GoalProgress } from "@/lib/calculations/goals";
import { fmtCurrency } from "@/lib/utils";
import { G } from "@/components/shell/ghost";
import { AccountsModal } from "./accounts-modal";
import { LoansModal } from "./loans-modal";
import { FreeToSpendModal } from "./free-to-spend-modal";
import { SpentModal } from "./spent-modal";
import { CategoryBreakdown } from "./category-breakdown";
import { SpendingVisual } from "./spending-visual";
import { AiPulse } from "./ai-pulse";
import { ActivePlans } from "./active-plans";
import { QuickAddBar } from "./quick-add-bar";
import type { PulseInsight } from "@/lib/calculations/pulse";

interface TrendPoint { label: string; expense: number; }

interface Props {
  ym: string;
  accounts: Account[];
  summary: MonthSummary;
  budgets: Budget[];
  budgetProgress: BudgetProgress[];
  trend: TrendPoint[];
  insights: PulseInsight[];
  activePlans: GoalProgress[];
}

export function DashboardClient({
  ym,
  accounts,
  summary,
  budgets,
  budgetProgress,
  trend,
  insights,
  activePlans,
}: Props) {
  const router = useRouter();
  const [openAccounts, setOpenAccounts] = useState(false);
  const [openFreeToSpend, setOpenFreeToSpend] = useState(false);
  const [openSpent, setOpenSpent] = useState(false);
  const [openLoans, setOpenLoans] = useState(false);
  const [quickAdd, setQuickAdd] = useState(false);

  const netWorth = accounts.reduce((sum, a) => {
    const sign = a.type === "credit" ? -1 : 1;
    return sum + sign * Number(a.balance);
  }, 0);
  const netWorthPositive = accounts
    .filter((a) => a.type !== "credit")
    .reduce((s, a) => s + Number(a.balance), 0);
  const netWorthFill = netWorthPositive > 0
    ? Math.min(100, Math.max(0, (netWorth / netWorthPositive) * 100))
    : 0;

  const loanAccounts = accounts.filter((a) => a.type === "credit");
  const loanBalance = loanAccounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const loanFill = netWorthPositive > 0
    ? Math.min(100, (loanBalance / netWorthPositive) * 100)
    : 0;

  const wantsSet = new Set<string>(CATEGORIES.wants);
  const wantsBudgets = budgetProgress.filter((b) => wantsSet.has(b.category));
  const wantsTotal = wantsBudgets.reduce((s, b) => s + b.budgeted, 0);
  const wantsSpent = wantsBudgets.reduce((s, b) => s + b.spent, 0);
  const freeToSpend = Math.max(0, wantsTotal - wantsSpent);
  const wantsPercent = wantsTotal > 0 ? (wantsSpent / wantsTotal) * 100 : 0;

  const spentPercent = summary.income > 0
    ? Math.min(100, (summary.expense / summary.income) * 100)
    : 0;

  function shiftMonth(direction: number) {
    const [y, m] = ym.split("-").map(Number);
    const d = new Date(y, m - 1 + direction, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    router.push(`/dashboard?month=${next}`);
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
          <h1 className="text-2xl font-bold page-title">Dashboard</h1>
        </div>
        <button
          onClick={() => setQuickAdd((v) => !v)}
          className="btn-primary flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          Add Expense
        </button>
      </div>

      <QuickAddBar open={quickAdd} onClose={() => setQuickAdd(false)} accounts={accounts} />

      {/* Top stats — all clickable to open detail modals */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Free to Spend"
          value={fmtCurrency(freeToSpend)}
          accent
          sub={wantsTotal > 0 ? `of ${fmtCurrency(wantsTotal)} wants budget` : "No wants budget set"}
          progress={wantsPercent}
          progressColor={
            wantsPercent > 100 ? "var(--over)" :
            wantsPercent >= 80 ? "var(--warn)" :
            "var(--accent)"
          }
          onClick={() => setOpenFreeToSpend(true)}
        />
        <StatCard
          label="Total Spent"
          value={fmtCurrency(summary.expense)}
          color="var(--text-primary)"
          sub={summary.income > 0 ? `${spentPercent.toFixed(0)}% of income` : "No income this month"}
          progress={spentPercent}
          progressColor={
            spentPercent > 100 ? "var(--over)" :
            spentPercent >= 80 ? "var(--warn)" :
            "var(--accent)"
          }
          onClick={() => setOpenSpent(true)}
        />
        <StatCard
          label="Loan Balance"
          value={fmtCurrency(loanBalance)}
          color={loanBalance > 0 ? "var(--text-primary)" : "var(--text-muted)"}
          sub={loanAccounts.length === 0
            ? "No loans added"
            : `${loanAccounts.length} loan${loanAccounts.length === 1 ? "" : "s"}`}
          progress={loanBalance > 0 ? loanFill : 0}
          progressColor="var(--violet)"
          onClick={() => setOpenLoans(true)}
        />
        <StatCard
          label="Net Worth"
          value={fmtCurrency(netWorth)}
          accent
          sub={`across ${accounts.length} account${accounts.length === 1 ? "" : "s"}`}
          progress={netWorthFill}
          progressColor="var(--accent)"
          onClick={() => setOpenAccounts(true)}
        />
      </div>

      {/* Category Breakdown + right column (Spending Visual + Active Plans) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <CategoryBreakdown
          byCategory={summary.byCategory}
          saved={summary.saved}
          budgets={budgets}
          monthLabel={monthLabel}
        />
        <div className="flex flex-col gap-4">
          <SpendingVisual
            byCategory={summary.byCategory}
            totalExpense={summary.expense}
            trend={trend}
          />
          <ActivePlans plans={activePlans} />
        </div>
      </div>

      {/* AI Pulse */}
      <AiPulse insights={insights} monthLabel={monthLabel} />

      <AccountsModal open={openAccounts} onClose={() => setOpenAccounts(false)} accounts={accounts} />
      <FreeToSpendModal
        open={openFreeToSpend}
        onClose={() => setOpenFreeToSpend(false)}
        wantsBudgets={wantsBudgets}
        wantsTotal={wantsTotal}
        wantsSpent={wantsSpent}
      />
      <SpentModal
        open={openSpent}
        onClose={() => setOpenSpent(false)}
        totalExpense={summary.expense}
        income={summary.income}
        byCategory={summary.byCategory}
      />
      <LoansModal
        open={openLoans}
        onClose={() => setOpenLoans(false)}
        loans={loanAccounts}
        onManage={() => {
          setOpenLoans(false);
          setOpenAccounts(true);
        }}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  accent,
  sub,
  progress,
  progressColor,
  onClick,
}: {
  label: string;
  value: string;
  color?: string;
  accent?: boolean;
  sub?: string;
  progress?: number;
  progressColor?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className="glass rounded-2xl p-5"
      onClick={onClick}
      style={{
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.15s",
      }}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <p className="section-label mb-2">{label}</p>
      <p
        className={"text-3xl font-bold " + (accent ? "accent-num" : "")}
        style={{ color: color ?? "var(--text-primary)" }}
      >
        <G>{value}</G>
      </p>
      {sub && (
        <p className="text-xs mt-1 mb-3" style={{ color: "var(--text-muted)" }}>
          {sub}
        </p>
      )}
      {progress !== undefined && (
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              background: progressColor ?? "var(--accent)",
            }}
          />
        </div>
      )}
      {onClick && (
        <p className="mt-2" style={{ fontSize: 10, color: "var(--text-muted)" }}>
          Click to expand ↗
        </p>
      )}
    </div>
  );
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
