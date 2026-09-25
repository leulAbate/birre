"use client";

import { useState, useTransition } from "react";
import type { Account, Budget, Goal, Transaction } from "@/lib/types";
import { CATEGORIES, iconFor } from "@/lib/types";
import { fmtCurrency, fmtDate } from "@/lib/utils";
import { G } from "@/components/shell/ghost";
import { deleteTransaction } from "@/server/actions/transactions";

interface Props {
  transactions: Transaction[];
  accounts: Account[];
  goals: Goal[];
  budgets: Budget[];
  onEdit: (tx: Transaction) => void;
}

type Group = "needs" | "wants" | "savings" | "income";

const GROUP_LABEL: Record<Group, string> = {
  needs: "Needs",
  wants: "Wants",
  savings: "Savings",
  income: "Income",
};

export function CategoryView({ transactions, accounts, goals, budgets, onEdit }: Props) {
  const accountById = Object.fromEntries(accounts.map((a) => [a.id, a]));
  const goalById = Object.fromEntries(goals.map((g) => [g.id, g]));
  const budgetByCat = new Map(budgets.map((b) => [b.category, Number(b.amount)]));

  const byCategory = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const arr = byCategory.get(tx.category) ?? [];
    arr.push(tx);
    byCategory.set(tx.category, arr);
  }

  const groups = Object.keys(CATEGORIES) as Group[];

  return (
    <div className="space-y-5 mt-4">
      {groups.map((group) => {
        const cats = CATEGORIES[group];
        const cards = cats
          .map((c) => ({
            category: c,
            txs: (byCategory.get(c) ?? []).sort((a, b) => (a.date < b.date ? 1 : -1)),
          }))
          .filter((c) => c.txs.length > 0);
        if (cards.length === 0) return null;
        return (
          <div key={group}>
            <p className="section-label mb-3">{GROUP_LABEL[group]}</p>
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
            >
              {cards.map(({ category, txs }) => (
                <CategoryCard
                  key={category}
                  category={category}
                  txs={txs}
                  budget={budgetByCat.get(category)}
                  accountById={accountById}
                  goalById={goalById}
                  onEdit={onEdit}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CategoryCard({
  category,
  txs,
  budget,
  accountById,
  goalById,
  onEdit,
}: {
  category: string;
  txs: Transaction[];
  budget: number | undefined;
  accountById: Record<string, Account>;
  goalById: Record<string, Goal>;
  onEdit: (tx: Transaction) => void;
}) {
  const total = txs.reduce((s, t) => {
    if (t.type === "expense") return s + Number(t.amount);
    if (t.type === "income") return s - Number(t.amount);
    return s + Number(t.amount);
  }, 0);
  const isIncome = txs[0]?.type === "income";
  const isSavings = txs[0]?.type === "transfer";
  const spent = isIncome ? -total : total;
  const hasBudget = budget !== undefined && budget > 0;
  const percent = hasBudget ? (spent / budget) * 100 : 0;
  const over = hasBudget && percent > 100;

  let barColor = "var(--accent)";
  if (over) barColor = "var(--over)";
  else if (hasBudget && percent >= 80) barColor = "var(--warn)";
  else if (isSavings) barColor = "var(--violet)";

  const badge = hasBudget
    ? over
      ? `$${(spent - budget).toFixed(0)} over`
      : `$${(budget - spent).toFixed(0)} left`
    : `${txs.length} txn${txs.length === 1 ? "" : "s"}`;

  const amountColor = isIncome
    ? "var(--accent)"
    : over
      ? "var(--over)"
      : isSavings
        ? "var(--violet)"
        : "var(--text-primary)";
  const amountPrefix = isIncome ? "+" : isSavings ? "" : "−";

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="p-4 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 18 }}>{iconFor(category)}</span>
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {category}
            </span>
          </div>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              background: over ? "var(--over-bg)" : "var(--progress-bg)",
              color: over ? "var(--over)" : "var(--text-secondary)",
              fontSize: 10,
            }}
          >
            {badge}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-bold" style={{ color: amountColor }}>
            <G>{`${amountPrefix}${fmtCurrency(spent, { decimals: false })}`}</G>
          </span>
          {hasBudget && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              of <G>{fmtCurrency(budget, { decimals: false })}</G>
            </span>
          )}
        </div>
        {hasBudget && (
          <div className="progress-track mt-2">
            <div
              className="progress-fill"
              style={{ width: `${Math.min(100, percent)}%`, background: barColor }}
            />
          </div>
        )}
      </div>
      <div>
        {txs.slice(0, 6).map((tx) => (
          <TxRow
            key={tx.id}
            tx={tx}
            account={tx.account_id ? accountById[tx.account_id] : undefined}
            goal={tx.goal_id ? goalById[tx.goal_id] : undefined}
            onEdit={onEdit}
          />
        ))}
        {txs.length > 6 && (
          <p
            className="text-xs px-4 py-2"
            style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}
          >
            +{txs.length - 6} more · use search or Date view to see all
          </p>
        )}
      </div>
    </div>
  );
}

function TxRow({
  tx,
  account,
  goal,
  onEdit,
}: {
  tx: Transaction;
  account?: Account;
  goal?: Goal;
  onEdit: (tx: Transaction) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const isAuto = tx.paystub_id !== null;

  const sign = tx.type === "income" ? "+" : tx.type === "expense" ? "−" : "";
  const color =
    tx.type === "income" ? "var(--accent)" :
    tx.type === "expense" ? "var(--over)" :
    "var(--text-secondary)";

  function onDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 2500);
      return;
    }
    startTransition(async () => {
      await deleteTransaction(tx.id);
    });
  }

  return (
    <div
      onClick={() => !isAuto && onEdit(tx)}
      className="flex items-center gap-2 px-4 py-2.5"
      style={{
        borderTop: "1px solid var(--border)",
        cursor: isAuto ? "default" : "pointer",
        opacity: pending ? 0.5 : 1,
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!isAuto) e.currentTarget.style.background = "var(--hover-bg)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p
            className="text-sm font-medium truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {tx.description}
          </p>
          {isAuto && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                padding: "1px 6px",
                borderRadius: 999,
                background: "var(--violet-bg)",
                color: "var(--violet)",
                border: "1px solid var(--violet-border)",
              }}
            >
              auto
            </span>
          )}
          {goal && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{
                background: "var(--violet-bg)",
                color: "var(--violet)",
                fontSize: 10,
              }}
            >
              {goal.icon}
            </span>
          )}
        </div>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {fmtDate(tx.date)}
          {account && ` · ${account.name}`}
        </p>
      </div>
      <p className="text-sm font-semibold whitespace-nowrap" style={{ color }}>
        <G>{`${sign}${fmtCurrency(Math.abs(Number(tx.amount)), { decimals: false }).replace("−", "")}`}</G>
      </p>
      {!isAuto && (
        <button
          onClick={onDelete}
          title={confirming ? "Click again to confirm" : "Delete"}
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            border: "none",
            background: confirming ? "var(--over-bg)" : "transparent",
            color: confirming ? "var(--over)" : "var(--text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
          </svg>
        </button>
      )}
    </div>
  );
}
