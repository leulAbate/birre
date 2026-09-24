"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Account, Budget } from "@/lib/types";
import type { BudgetProgress, MonthSummary } from "@/lib/calculations/summary";
import type { GoalProgress } from "@/lib/calculations/goals";
import { fmtCurrency } from "@/lib/utils";
import { G } from "@/components/shell/ghost";
import { AccountsModal } from "./accounts-modal";
import { BudgetsModal } from "./budgets-modal";
import { LoansModal } from "./loans-modal";
import { CategoryBreakdown } from "./category-breakdown";
import { SpendingVisual } from "./spending-visual";
import { AiPulse } from "./ai-pulse";
import { ActivePlans } from "./active-plans";
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
  const [openBudgets, setOpenBudgets] = useState(false);
  const [openLoans, setOpenLoans] = useState(false);

  const netWorth = accounts.reduce((sum, a) => {
    const sign = a.type === "credit" ? -1 : 1;
    return sum + sign * Number(a.balance);
  }, 0);

  const loanAccounts = accounts.filter((a) => a.type === "credit");
  const loanBalance = loanAccounts.reduce((sum, a) => sum + Number(a.balance), 0);

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
      </div>

      {/* Top stats — clickable to open detail modals */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Net Worth"
          value={fmtCurrency(netWorth)}
          accent
          sub={`${accounts.length} account${accounts.length === 1 ? "" : "s"}`}
          onClick={() => setOpenAccounts(true)}
        />
        <StatCard label="Income" value={fmtCurrency(summary.income, { sign: true })} color="var(--accent)" />
        <StatCard
          label="Spent"
          value={fmtCurrency(-summary.expense)}
          color="var(--over)"
          sub={budgets.length > 0 ? `${budgetProgress.filter((b) => b.percent > 100).length} over budget` : "No budgets set"}
          onClick={() => setOpenBudgets(true)}
        />
        <StatCard
          label="Loan Balance"
          value={fmtCurrency(loanBalance)}
          color={loanBalance > 0 ? "var(--violet)" : "var(--text-muted)"}
          sub={loanAccounts.length === 0 ? "No loans added" : `${loanAccounts.length} loan${loanAccounts.length === 1 ? "" : "s"}`}
          onClick={() => setOpenLoans(true)}
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
      <BudgetsModal open={openBudgets} onClose={() => setOpenBudgets(false)} budgetProgress={budgetProgress} />
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
  onClick,
}: {
  label: string;
  value: string;
  color?: string;
  accent?: boolean;
  sub?: string;
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
      <p className="section-label mb-1">{label}</p>
      <p className={"text-2xl font-bold " + (accent ? "accent-num" : "")} style={{ color: color ?? "var(--text-primary)" }}>
        <G>{value}</G>
      </p>
      {sub && (
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
