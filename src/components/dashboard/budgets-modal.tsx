"use client";

import { useState, useTransition } from "react";
import type { Budget } from "@/lib/types";
import type { BudgetProgress } from "@/lib/calculations/summary";
import { CATEGORIES } from "@/lib/types";
import { fmtCurrency } from "@/lib/utils";
import { G } from "@/components/shell/ghost";
import { deleteBudget, upsertBudget } from "@/server/actions/budgets";

interface Props {
  open: boolean;
  onClose: () => void;
  budgetProgress: BudgetProgress[];
  budgets: Budget[];       // raw rows so we can read pct
  monthlyIncome: number;   // used to convert % → $
}

const BUDGETABLE: string[] = [...CATEGORIES.needs, ...CATEGORIES.wants];

type Mode = "dollar" | "percent";

export function BudgetsModal({ open, onClose, budgetProgress, budgets, monthlyIncome }: Props) {
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState<string>(BUDGETABLE[0]);
  const [amount, setAmount] = useState("");
  const [pctInput, setPctInput] = useState("");
  const [mode, setMode] = useState<Mode>("dollar");
  const [error, setError] = useState<string | null>(null);

  const existingCategories = new Set(budgetProgress.map((b) => b.category));
  const available = BUDGETABLE.filter((c) => !existingCategories.has(c));
  const budgetByCategory = new Map(budgets.map((b) => [b.category, b]));

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "dollar") {
      const num = parseFloat(amount);
      if (!num || num <= 0) {
        setError("Amount must be greater than zero");
        return;
      }
      startTransition(async () => {
        const res = await upsertBudget(category, { amount: num, pct: null });
        if (res.error) return setError(res.error);
        setAmount("");
        setPctInput("");
        if (available.length > 1)
          setCategory(available.filter((c) => c !== category)[0] ?? BUDGETABLE[0]);
      });
    } else {
      const pct = parseFloat(pctInput);
      if (!pct || pct <= 0) {
        setError("Percent must be greater than zero");
        return;
      }
      if (monthlyIncome <= 0) {
        setError("Set your annual salary on the Tax page first to use %");
        return;
      }
      const num = (pct / 100) * monthlyIncome;
      startTransition(async () => {
        const res = await upsertBudget(category, { amount: num, pct });
        if (res.error) return setError(res.error);
        setAmount("");
        setPctInput("");
        if (available.length > 1)
          setCategory(available.filter((c) => c !== category)[0] ?? BUDGETABLE[0]);
      });
    }
  }

  function handleUpdate(cat: string, newAmount: string) {
    const num = parseFloat(newAmount);
    if (!num || num <= 0) return;
    startTransition(async () => {
      await upsertBudget(cat, { amount: num, pct: null });
    });
  }

  function handleDelete(cat: string) {
    startTransition(async () => {
      await deleteBudget(cat);
    });
  }

  const previewAmount = (() => {
    if (mode === "dollar" || !pctInput) return null;
    const p = parseFloat(pctInput);
    if (!p || monthlyIncome <= 0) return null;
    return (p / 100) * monthlyIncome;
  })();

  return (
    <div className={"modal-overlay" + (open ? " open" : "")} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel" style={{ width: 540 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold page-title">Budgets</h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: "6px 10px" }}>✕</button>
        </div>

        {budgetProgress.length > 0 && (
          <div className="mb-6">
            <p className="section-label mb-2">This month</p>
            <div style={{ borderRadius: 12, border: "1px solid var(--border)" }}>
              {budgetProgress.map((b, i) => {
                const raw = budgetByCategory.get(b.category);
                const isPct = raw?.pct != null;
                return (
                  <div
                    key={b.category}
                    className="flex items-center gap-3 px-3 py-2"
                    style={{ borderBottom: i < budgetProgress.length - 1 ? "1px solid var(--border)" : "none" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{b.category}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Spent <G>{fmtCurrency(b.spent)}</G>
                        {isPct && ` · ${raw?.pct}% of income`}
                      </p>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={b.budgeted}
                      onBlur={(e) => {
                        if (parseFloat(e.target.value) !== b.budgeted) {
                          handleUpdate(b.category, e.target.value);
                        }
                      }}
                      style={{
                        width: 120, padding: "6px 10px", borderRadius: 8,
                        border: "1px solid var(--border)", background: "var(--progress-bg)",
                        color: "var(--text-primary)", fontSize: 13, textAlign: "right", outline: "none",
                      }}
                    />
                    <button
                      onClick={() => handleDelete(b.category)}
                      title="Remove"
                      style={{
                        width: 28, height: 28, borderRadius: 6, border: "none",
                        background: "transparent", color: "var(--text-muted)", cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {available.length > 0 ? (
          <form onSubmit={handleAdd}>
            <div className="flex items-center justify-between mb-2">
              <p className="section-label">Add budget</p>
              <div
                className="flex items-center gap-1 rounded-lg p-1"
                style={{ background: "var(--hover-bg)" }}
              >
                <ModeBtn active={mode === "dollar"} onClick={() => setMode("dollar")}>$</ModeBtn>
                <ModeBtn active={mode === "percent"} onClick={() => setMode("percent")}>%</ModeBtn>
              </div>
            </div>

            {error && (
              <div
                className="text-sm px-3 py-2 rounded-lg mb-3"
                style={{ background: "var(--over-bg)", color: "var(--over)", border: "1px solid var(--over-border)" }}
              >
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <select className="modal-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                {available.map((c) => <option key={c}>{c}</option>)}
              </select>
              {mode === "dollar" ? (
                <input
                  type="number"
                  step="0.01"
                  placeholder="Monthly limit"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="modal-input"
                />
              ) : (
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="% of income"
                  value={pctInput}
                  onChange={(e) => setPctInput(e.target.value)}
                  className="modal-input"
                />
              )}
            </div>
            {mode === "percent" && (
              <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                {monthlyIncome > 0 ? (
                  <>
                    Monthly income baseline: <G>{fmtCurrency(monthlyIncome)}</G>
                    {previewAmount !== null && (
                      <> · This = <G>{fmtCurrency(previewAmount)}</G></>
                    )}
                  </>
                ) : (
                  <span style={{ color: "var(--warn)" }}>
                    Set your annual salary on the Tax page to use %.
                  </span>
                )}
              </p>
            )}
            <button type="submit" disabled={pending} className="btn-primary w-full">
              {pending ? "Saving…" : "Set Budget"}
            </button>
          </form>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            All budgetable categories already have a limit. Edit or delete one above.
          </p>
        )}
      </div>
    </div>
  );
}

function ModeBtn({
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
      type="button"
      onClick={onClick}
      style={{
        padding: "4px 12px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        background: active ? "var(--bg-card-solid)" : "transparent",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
        border: "none",
      }}
    >
      {children}
    </button>
  );
}
