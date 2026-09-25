"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Account, Budget, Goal, Transaction } from "@/lib/types";
import { ALL_CATEGORIES } from "@/lib/types";
import { fmtCurrency, fmtDate } from "@/lib/utils";
import { G } from "@/components/shell/ghost";
import { AddTransactionModal } from "./add-modal";
import { CsvImportModal } from "./csv-import-modal";
import { TransactionTable } from "./transaction-table";
import { CategoryView } from "./category-view";

interface Props {
  ym: string; // YYYY-MM
  transactions: Transaction[];
  accounts: Account[];
  goals: Goal[];
  budgets: Budget[];
}

type ViewMode = "date" | "category";

export function TransactionsClient({ ym, transactions, accounts, goals, budgets }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [accFilter, setAccFilter] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [openCsv, setOpenCsv] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [view, setView] = useState<ViewMode>("category");

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
      if (tx.type === "income") income += Number(tx.amount);
      else if (tx.type === "expense") expense += Number(tx.amount);
    }
    return { income, expense, net: income - expense, count: transactions.length };
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (catFilter && tx.category !== catFilter) return false;
      if (accFilter && tx.account_id !== accFilter) return false;
      if (q && !tx.description.toLowerCase().includes(q) && !tx.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [transactions, search, catFilter, accFilter]);

  const hasFilter = !!search || !!catFilter || !!accFilter;

  function shiftMonth(direction: number) {
    const [y, m] = ym.split("-").map(Number);
    const d = new Date(y, m - 1 + direction, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    router.push(`/transactions?month=${next}`);
  }

  const monthLabel = formatMonth(ym);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-3 space-y-3">
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
            <h1 className="text-2xl font-bold page-title">Transactions</h1>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setOpenCsv(true)} className="btn-ghost flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
              </svg>
              Import CSV
            </button>
            <button onClick={() => setOpenAdd(true)} className="btn-primary flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              Add Transaction
            </button>
          </div>
        </div>

        {/* Summary strip */}
        <div className="flex gap-3">
          <SummaryCard label="Total In" value={fmtCurrency(summary.income, { sign: true })} color="var(--accent)" />
          <SummaryCard label="Total Out" value={fmtCurrency(-summary.expense)} color="var(--over)" />
          <SummaryCard label="Net" value={fmtCurrency(summary.net, { sign: true })} color="var(--accent)" accent />
          <div className="glass rounded-2xl px-5 py-3 flex-1">
            <p className="section-label mb-0.5">Transactions</p>
            <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{summary.count}</p>
          </div>
        </div>

        {/* Filters + view toggle */}
        <div className="flex items-center gap-3">
          <div style={{ position: "relative", maxWidth: 280, flex: 1 }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
            >
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              type="text"
              placeholder="Search transactions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="modal-input"
              style={{ paddingLeft: 34, width: "100%" }}
            />
          </div>
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="modal-select" style={{ width: "auto" }}>
            <option value="">All Categories</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select value={accFilter} onChange={(e) => setAccFilter(e.target.value)} className="modal-select" style={{ width: "auto" }}>
            <option value="">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          {hasFilter && (
            <button
              onClick={() => {
                setSearch("");
                setCatFilter("");
                setAccFilter("");
              }}
              className="btn-ghost text-xs"
              style={{ padding: "5px 12px" }}
            >
              Clear
            </button>
          )}
          <div
            className="flex items-center gap-1 rounded-lg p-1 ml-auto"
            style={{ background: "var(--hover-bg)" }}
          >
            <ViewButton active={view === "date"} onClick={() => setView("date")}>Date</ViewButton>
            <ViewButton active={view === "category"} onClick={() => setView("category")}>Category</ViewButton>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
        {filtered.length === 0 ? (
          <EmptyState onAdd={() => setOpenAdd(true)} filtered={hasFilter} />
        ) : view === "category" ? (
          <CategoryView
            transactions={filtered}
            accounts={accounts}
            goals={goals}
            budgets={budgets}
            onEdit={(tx) => setEditing(tx)}
          />
        ) : (
          <TransactionTable
            transactions={filtered}
            accounts={accounts}
            goals={goals}
            onEdit={(tx) => setEditing(tx)}
          />
        )}
      </div>

      <AddTransactionModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        accounts={accounts}
        goals={goals}
      />
      <AddTransactionModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        accounts={accounts}
        goals={goals}
        editing={editing}
      />
      <CsvImportModal
        open={openCsv}
        onClose={() => setOpenCsv(false)}
        accounts={accounts}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
  accent,
}: {
  label: string;
  value: string;
  color: string;
  accent?: boolean;
}) {
  return (
    <div className="glass rounded-2xl px-5 py-3 flex-1">
      <p className="section-label mb-0.5">{label}</p>
      <p
        className={"text-lg font-bold " + (accent ? "accent-num" : "")}
        style={{ color }}
      >
        <G>{value}</G>
      </p>
    </div>
  );
}

function EmptyState({ onAdd, filtered }: { onAdd: () => void; filtered: boolean }) {
  if (filtered) {
    return (
      <div className="glass rounded-2xl p-8 text-center mt-4">
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          No matches
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Try clearing filters or changing the month.
        </p>
      </div>
    );
  }
  return (
    <div className="glass rounded-2xl p-8 text-center mt-4">
      <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
        No transactions yet
      </p>
      <p className="text-sm mt-1 mb-4" style={{ color: "var(--text-secondary)" }}>
        Add one manually, paste a bulk batch, or import a CSV from your bank.
      </p>
      <button onClick={onAdd} className="btn-primary">
        Add your first transaction
      </button>
    </div>
  );
}

function ViewButton({
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
        padding: "5px 12px",
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

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

// Re-export for transaction-table.tsx
export { fmtDate };
