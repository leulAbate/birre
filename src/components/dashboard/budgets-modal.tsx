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

  // When the user edits either $ or %, we save BOTH columns so the row
  // can continue showing both without drifting.
  function handleUpdateAmount(cat: string, newAmount: string) {
    const num = parseFloat(newAmount);
    if (!num || num <= 0) return;
    const pct = monthlyIncome > 0 ? (num / monthlyIncome) * 100 : null;
    startTransition(async () => {
      await upsertBudget(cat, { amount: num, pct });
    });
  }

  function handleUpdatePct(cat: string, newPct: string) {
    const p = parseFloat(newPct);
    if (!p || p <= 0 || monthlyIncome <= 0) return;
    const num = (p / 100) * monthlyIncome;
    startTransition(async () => {
      await upsertBudget(cat, { amount: num, pct: p });
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
                // Derived pct if not stored, so every row shows both.
                const effectivePct = raw?.pct != null
                  ? Number(raw.pct)
                  : monthlyIncome > 0
                    ? (b.budgeted / monthlyIncome) * 100
                    : null;
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
                      </p>
                    </div>
                    {/* $ input */}
                    <input
                      type="number"
                      step="0.01"
                      key={`$-${b.category}-${b.budgeted}`}
                      defaultValue={b.budgeted.toFixed(2)}
                      onBlur={(e) => {
                        const next = parseFloat(e.target.value);
                        if (next && next !== b.budgeted) {
                          handleUpdateAmount(b.category, e.target.value);
                        }
                      }}
                      title="Dollar amount"
                      style={{
                        width: 100, padding: "6px 10px", borderRadius: 8,
                        border: "1px solid var(--border)", background: "var(--progress-bg)",
                        color: "var(--text-primary)", fontSize: 13, textAlign: "right", outline: "none",
                      }}
                    />
                    {/* % input */}
                    <div style={{ position: "relative", width: 76 }}>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        key={`%-${b.category}-${effectivePct}`}
                        defaultValue={effectivePct != null ? effectivePct.toFixed(1) : ""}
                        disabled={monthlyIncome <= 0}
                        placeholder={monthlyIncome <= 0 ? "—" : ""}
                        onBlur={(e) => {
                          const next = parseFloat(e.target.value);
                          if (next && effectivePct != null && Math.abs(next - effectivePct) > 0.05) {
                            handleUpdatePct(b.category, e.target.value);
                          }
                        }}
                        title={monthlyIncome <= 0 ? "Add a paystub to enable %" : "Percent of take-home"}
                        style={{
                          width: "100%", padding: "6px 22px 6px 10px", borderRadius: 8,
                          border: "1px solid var(--violet-border)",
                          background: monthlyIncome > 0 ? "var(--violet-bg)" : "var(--progress-bg)",
                          color: "var(--text-primary)", fontSize: 13, textAlign: "right", outline: "none",
                          opacity: monthlyIncome > 0 ? 1 : 0.5,
                        }}
                      />
                      <span
                        style={{
                          position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                          color: "var(--violet)", fontSize: 12, fontWeight: 700, pointerEvents: "none",
                        }}
                      >
                        %
                      </span>
                    </div>
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
                    Monthly take-home: <G>{fmtCurrency(monthlyIncome)}</G>
                    {previewAmount !== null && (
                      <> · This = <G>{fmtCurrency(previewAmount)}</G></>
                    )}
                  </>
                ) : (
                  <span style={{ color: "var(--warn)" }}>
                    Add a paystub on the Tax page to use %.
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
