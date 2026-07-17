"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Account, Recurring, Transaction } from "@/lib/types";
import type { BudgetProgress, MonthSummary } from "@/lib/calculations/summary";
import { fmtCurrency, fmtDate } from "@/lib/utils";
import { G } from "@/components/shell/ghost";
import { AccountsModal } from "./accounts-modal";
import { BudgetsModal } from "./budgets-modal";

interface Props {
  ym: string;
  accounts: Account[];
  summary: MonthSummary;
  budgetProgress: BudgetProgress[];
  topExpenses: Transaction[];
  recentTransactions: Transaction[];
  recurring: Recurring[];
}

export function DashboardClient({
  ym,
  accounts,
  summary,
  budgetProgress,
  topExpenses,
  recentTransactions,
  recurring,
}: Props) {
  const router = useRouter();
  const [openAccounts, setOpenAccounts] = useState(false);
  const [openBudgets, setOpenBudgets] = useState(false);

  const netWorth = accounts.reduce((sum, a) => {
    const sign = a.type === "credit" ? -1 : 1;
    return sum + sign * Number(a.balance);
  }, 0);

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

      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Net Worth" value={fmtCurrency(netWorth)} accent />
        <StatCard label="Income" value={fmtCurrency(summary.income, { sign: true })} color="var(--accent)" />
        <StatCard label="Spent" value={fmtCurrency(-summary.expense)} color="var(--over)" />
        <StatCard label="Saved" value={fmtCurrency(summary.saved, { sign: true })} color="var(--accent)" />
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Accounts */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">Accounts</p>
            <button onClick={() => setOpenAccounts(true)} className="text-xs font-medium" style={{ color: "var(--accent)" }}>
              Manage
            </button>
          </div>
          {accounts.length === 0 ? (
            <EmptyHint
              text="No accounts yet. Add one to see your net worth."
              cta="Add an account"
              onClick={() => setOpenAccounts(true)}
            />
          ) : (
            <div className="space-y-0">
              {accounts.map((a) => (
                <div key={a.id} className="account-row">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{a.name}</p>
                    <p className="text-xs capitalize" style={{ color: "var(--text-muted)" }}>{a.type}</p>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: a.type === "credit" ? "var(--over)" : "var(--text-primary)" }}>
                    <G>{(a.type === "credit" ? "−" : "") + fmtCurrency(Number(a.balance))}</G>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Budgets */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">Budgets</p>
            <button onClick={() => setOpenBudgets(true)} className="text-xs font-medium" style={{ color: "var(--accent)" }}>
              Manage
            </button>
          </div>
          {budgetProgress.length === 0 ? (
            <EmptyHint
              text="Set monthly limits for categories you watch."
              cta="Set a budget"
              onClick={() => setOpenBudgets(true)}
            />
          ) : (
            <div className="space-y-3">
              {budgetProgress.slice(0, 5).map((b) => (
                <BudgetRow key={b.category} item={b} />
              ))}
            </div>
          )}
        </div>

        {/* Top expenses */}
        <div className="glass rounded-2xl p-5">
          <p className="section-label mb-3">Top Expenses This Month</p>
          {topExpenses.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No expenses recorded yet.</p>
          ) : (
            <div className="space-y-0">
              {topExpenses.map((tx) => (
                <div key={tx.id} className="account-row">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{tx.description}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {fmtDate(tx.date)} · {tx.category}
                    </p>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "var(--over)" }}>
                    <G>{"−" + fmtCurrency(Number(tx.amount))}</G>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="glass rounded-2xl p-5">
          <p className="section-label mb-3">Recent Transactions</p>
          {recentTransactions.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nothing here yet.</p>
          ) : (
            <div className="space-y-0">
              {recentTransactions.map((tx) => {
                const color =
                  tx.type === "income" ? "var(--accent)" :
                  tx.type === "expense" ? "var(--over)" :
                  "var(--text-secondary)";
                const sign = tx.type === "income" ? "+" : tx.type === "expense" ? "−" : "";
                return (
                  <div key={tx.id} className="account-row">
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{tx.description}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {fmtDate(tx.date)} · {tx.category}
                      </p>
                    </div>
                    <p className="text-sm font-semibold" style={{ color }}>
                      <G>{sign + fmtCurrency(Number(tx.amount))}</G>
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Subscriptions */}
        {recurring.length > 0 && (
          <div className="glass rounded-2xl p-5 lg:col-span-2">
            <p className="section-label mb-3">Recurring & Subscriptions</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recurring.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: "var(--progress-bg)", border: "1px solid var(--border)" }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{r.name}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {r.category} · {r.frequency}
                    </p>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    <G>{fmtCurrency(Number(r.amount))}</G>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AccountsModal open={openAccounts} onClose={() => setOpenAccounts(false)} accounts={accounts} />
      <BudgetsModal open={openBudgets} onClose={() => setOpenBudgets(false)} budgetProgress={budgetProgress} />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  accent,
}: {
  label: string;
  value: string;
  color?: string;
  accent?: boolean;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <p className="section-label mb-1">{label}</p>
      <p className={"text-2xl font-bold " + (accent ? "accent-num" : "")} style={{ color: color ?? "var(--text-primary)" }}>
        <G>{value}</G>
      </p>
    </div>
  );
}

function BudgetRow({ item }: { item: BudgetProgress }) {
  const overBy = item.percent - 100;
  const fillColor =
    item.percent >= 100 ? "var(--over)" :
    item.percent >= 80 ? "var(--warn)" :
    "var(--accent)";
  return (
    <div>
      <div className="flex items-end justify-between mb-1">
        <p className="text-sm" style={{ color: "var(--text-primary)" }}>{item.category}</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          <G>{fmtCurrency(item.spent)}</G> / <G>{fmtCurrency(item.budgeted)}</G>
        </p>
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${Math.min(100, item.percent)}%`, background: fillColor }}
        />
      </div>
      {overBy > 0 && (
        <p className="text-xs mt-1" style={{ color: "var(--over)" }}>
          Over by <G>{fmtCurrency(-item.remaining)}</G>
        </p>
      )}
    </div>
  );
}

function EmptyHint({ text, cta, onClick }: { text: string; cta: string; onClick: () => void }) {
  return (
    <div>
      <p className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>{text}</p>
      <button onClick={onClick} className="text-sm font-medium" style={{ color: "var(--accent)" }}>
        {cta} →
      </button>
    </div>
  );
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
