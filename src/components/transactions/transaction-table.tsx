"use client";

import { useMemo, useState, useTransition } from "react";
import type { Account, Goal, Transaction } from "@/lib/types";
import { fmtCurrency, fmtDate } from "@/lib/utils";
import { G } from "@/components/shell/ghost";
import { deleteTransaction } from "@/server/actions/transactions";

interface Props {
  transactions: Transaction[];
  accounts: Account[];
  goals: Goal[];
  onEdit: (tx: Transaction) => void;
}

export function TransactionTable({ transactions, accounts, goals, onEdit }: Props) {
  const grouped = useMemo(() => groupByDate(transactions), [transactions]);
  const accountById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);
  const goalById = useMemo(() => Object.fromEntries(goals.map((g) => [g.id, g])), [goals]);

  return (
    <div className="space-y-4 mt-4">
      {grouped.map(([date, rows]) => (
        <div key={date}>
          <p className="section-label mb-2">{fmtDate(date)}</p>
          <div className="glass rounded-2xl overflow-hidden">
            {rows.map((tx, i) => (
              <Row
                key={tx.id}
                tx={tx}
                account={tx.account_id ? accountById[tx.account_id] : undefined}
                goal={tx.goal_id ? goalById[tx.goal_id] : undefined}
                last={i === rows.length - 1}
                onEdit={onEdit}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Row({
  tx,
  account,
  goal,
  last,
  onEdit,
}: {
  tx: Transaction;
  account?: Account;
  goal?: Goal;
  last: boolean;
  onEdit: (tx: Transaction) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const isAuto = tx.paystub_id !== null;

  const sign = tx.type === "income" ? "+" : tx.type === "expense" ? "−" : "";
  const amount = `${sign}${fmtCurrency(Math.abs(Number(tx.amount)), { decimals: false }).replace("−", "")}`;
  const color =
    tx.type === "income"
      ? "var(--accent)"
      : tx.type === "expense"
      ? "var(--over)"
      : "var(--text-secondary)";

  function handleDelete(e: React.MouseEvent) {
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

  function handleRowClick() {
    if (isAuto) return;
    onEdit(tx);
  }

  return (
    <div
      onClick={handleRowClick}
      className="flex items-center justify-between px-4 py-3"
      style={{
        borderBottom: last ? "none" : "1px solid var(--border)",
        opacity: isPending ? 0.5 : 1,
        cursor: isAuto ? "default" : "pointer",
        userSelect: isAuto ? "auto" : "none",
        transition: "opacity 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!isAuto) e.currentTarget.style.background = "var(--hover-bg)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <div className="flex-1 min-w-0" style={{ pointerEvents: isAuto ? "auto" : "none" }}>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
            {tx.description}
          </p>
          {isAuto && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: "var(--violet-bg)",
                color: "var(--violet)",
                border: "1px solid var(--violet-border)",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
              title="Auto-generated from paystub template — edit the template on the Tax page"
            >
              auto
            </span>
          )}
          {goal && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: "var(--violet-bg)",
                color: "var(--violet)",
                border: "1px solid var(--violet-border)",
              }}
            >
              {goal.icon} {goal.name}
            </span>
          )}
        </div>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {tx.category}
          {account && ` · ${account.name}`}
          {tx.note && ` · ${tx.note}`}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <p className="text-sm font-semibold" style={{ color, pointerEvents: "none" }}>
          <G>{amount}</G>
        </p>
        {!isAuto && (
          <button
            onClick={handleDelete}
            title={confirming ? "Click again to confirm" : "Delete"}
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              border: "none",
              background: confirming ? "var(--over-bg)" : "transparent",
              color: confirming ? "var(--over)" : "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s, color 0.15s",
              pointerEvents: "auto",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function groupByDate(txs: Transaction[]): [string, Transaction[]][] {
  const map = new Map<string, Transaction[]>();
  for (const tx of txs) {
    const arr = map.get(tx.date) ?? [];
    arr.push(tx);
    map.set(tx.date, arr);
  }
  return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
}
