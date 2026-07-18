"use client";

import { useState, useTransition, useEffect } from "react";
import type { Account, Goal, Transaction, TxType } from "@/lib/types";
import { ALL_CATEGORIES, CATEGORIES, SAVINGS_CATEGORIES } from "@/lib/types";
import { autoCategorize } from "@/lib/calculations/categorize";
import {
  addTransaction,
  addTransactionsBulk,
  deleteTransaction,
  updateTransaction,
  type TransactionInput,
} from "@/server/actions/transactions";

interface Props {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  goals: Goal[];
  editing?: Transaction | null;
}

interface Row {
  date: string;
  description: string;
  amount: string;
  category: string;
  type: TxType;
}

type Mode = "single" | "multiple";

function blankRow(): Row {
  return { date: today(), description: "", amount: "", category: "", type: "expense" };
}

export function AddTransactionModal({ open, onClose, accounts, goals, editing = null }: Props) {
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("single");
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Single mode state
  const [type, setType] = useState<TxType>("expense");
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [goalId, setGoalId] = useState("");
  const [note, setNote] = useState("");

  // Multiple mode state
  const [rows, setRows] = useState<Row[]>([blankRow(), blankRow(), blankRow()]);

  const isEditing = editing !== null;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setConfirmDelete(false);
    if (editing) {
      setMode("single");
      setType(editing.type);
      setDate(editing.date);
      setAmount(String(Number(editing.amount)));
      setDescription(editing.description);
      setCategory(editing.category);
      setAccountId(editing.account_id ?? "");
      setGoalId(editing.goal_id ?? "");
      setNote(editing.note ?? "");
    } else {
      setMode("single");
      setAccountId("");
      setType("expense");
      setDate(today());
      setAmount("");
      setDescription("");
      setCategory("");
      setGoalId("");
      setNote("");
      setRows([blankRow(), blankRow(), blankRow()]);
    }
  }, [open, editing]);

  function handleClose() {
    onClose();
  }

  function handleSubmitSingle(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      setError("Amount must be greater than zero");
      return;
    }
    if (!category) {
      setError("Pick a category");
      return;
    }

    const payload = {
      date,
      description: description.trim() || category,
      amount: num,
      type,
      category,
      account_id: accountId || null,
      goal_id: SAVINGS_CATEGORIES.has(category) && goalId ? goalId : null,
      note: note.trim() || null,
    };

    startTransition(async () => {
      const res = editing
        ? await updateTransaction(editing.id, payload)
        : await addTransaction(payload);
      if (res.error) {
        setError(res.error);
        return;
      }
      handleClose();
    });
  }

  function handleDelete() {
    if (!editing) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 2500);
      return;
    }
    startTransition(async () => {
      await deleteTransaction(editing.id);
      handleClose();
    });
  }

  function handleSubmitMultiple() {
    setError(null);
    const valid: TransactionInput[] = [];
    for (const r of rows) {
      const amt = parseFloat(r.amount);
      if (!r.description.trim() || !amt || !r.category) continue;
      valid.push({
        date: r.date,
        description: r.description.trim(),
        amount: amt,
        type: r.type,
        category: r.category,
        account_id: accountId || null,
      });
    }
    if (valid.length === 0) {
      setError("Fill at least one complete row (date, description, amount, category)");
      return;
    }
    startTransition(async () => {
      const res = await addTransactionsBulk(valid);
      if (res.error) {
        setError(res.error);
        return;
      }
      handleClose();
    });
  }

  function updateRow(idx: number, field: keyof Row, value: string) {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const next: Row = { ...r, [field]: value };
        if (field === "description" && !r.category) {
          const guess = autoCategorize(value);
          if (guess) next.category = guess;
        }
        return next;
      })
    );
  }

  const showGoalField = SAVINGS_CATEGORIES.has(category);
  const isMultiple = mode === "multiple";

  return (
    <div
      className={"modal-overlay" + (open ? " open" : "")}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="modal-panel"
        style={{ width: isMultiple ? 720 : 420, maxWidth: "95vw" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="section-label mb-1">
              {isEditing ? "Edit Entry" : isMultiple ? "Bulk Entry" : "New Entry"}
            </p>
            <h2 className="text-xl font-bold page-title" style={{ color: "var(--text-primary)" }}>
              {isEditing ? "Edit Transaction" : `Add Transaction${isMultiple ? "s" : ""}`}
            </h2>
          </div>
          <button onClick={handleClose} className="btn-ghost" style={{ padding: "6px 10px" }}>
            ✕
          </button>
        </div>

        {/* Mode toggle — hidden in edit mode */}
        {!isEditing && (
          <div
            className="flex gap-1 p-1 rounded-xl mb-5"
            style={{ background: "var(--progress-bg)", border: "1px solid var(--border)" }}
          >
            <ModeButton active={mode === "single"} onClick={() => setMode("single")}>
              Single
            </ModeButton>
            <ModeButton active={mode === "multiple"} onClick={() => setMode("multiple")}>
              Multiple
            </ModeButton>
          </div>
        )}

        {error && (
          <div
            className="text-sm px-3 py-2 rounded-lg mb-4"
            style={{
              background: "var(--over-bg)",
              color: "var(--over)",
              border: "1px solid var(--over-border)",
            }}
          >
            {error}
          </div>
        )}

        {isMultiple ? (
          <MultipleForm
            rows={rows}
            updateRow={updateRow}
            addRow={() => setRows((prev) => [...prev, blankRow()])}
            removeRow={(i) => setRows((prev) => prev.filter((_, idx) => idx !== i))}
            accountId={accountId}
            setAccountId={setAccountId}
            accounts={accounts}
            onSubmit={handleSubmitMultiple}
            onCancel={handleClose}
            pending={pending}
          />
        ) : (
          <form onSubmit={handleSubmitSingle} className="space-y-4">
            <div className="flex gap-2">
              <TypeButton active={type === "expense"} onClick={() => setType("expense")} variant="expense">
                − Expense
              </TypeButton>
              <TypeButton active={type === "income"} onClick={() => setType("income")} variant="income">
                + Income
              </TypeButton>
              <TypeButton
                active={type === "transfer"}
                onClick={() => setType("transfer")}
                variant="transfer"
              >
                ↔ Transfer
              </TypeButton>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="modal-label">Date</label>
                <input
                  type="date"
                  className="modal-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="modal-label">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="modal-input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="modal-label">Description</label>
              <input
                type="text"
                placeholder="e.g. Trader Joe's"
                className="modal-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="modal-label">Category</label>
                <select
                  className="modal-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  <option value="">Select…</option>
                  <optgroup label="Needs">
                    {CATEGORIES.needs.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Wants">
                    {CATEGORIES.wants.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Savings">
                    {CATEGORIES.savings.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Income">
                    {CATEGORIES.income.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="modal-label">Account</label>
                <select
                  className="modal-select"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                >
                  <option value="">None</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {showGoalField && goals.length > 0 && (
              <div>
                <label className="modal-label">
                  Tag to Goal{" "}
                  <span
                    style={{
                      color: "var(--text-muted)",
                      fontWeight: 400,
                      textTransform: "none",
                      letterSpacing: 0,
                    }}
                  >
                    (optional)
                  </span>
                </label>
                <select
                  className="modal-select"
                  value={goalId}
                  onChange={(e) => setGoalId(e.target.value)}
                >
                  <option value="">None</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.icon} {g.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="modal-label">
                Note{" "}
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontWeight: 400,
                    textTransform: "none",
                    letterSpacing: 0,
                  }}
                >
                  (optional)
                </span>
              </label>
              <input
                type="text"
                placeholder="Any extra detail…"
                className="modal-input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <hr className="modal-divider" />

            <div className="flex gap-3">
              {isEditing ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="btn-ghost"
                  style={{
                    color: confirmDelete ? "var(--over)" : "var(--text-secondary)",
                    borderColor: confirmDelete ? "var(--over-border)" : "var(--border)",
                  }}
                >
                  {confirmDelete ? "Click again to confirm" : "Delete"}
                </button>
              ) : (
                <button type="button" onClick={handleClose} className="btn-ghost flex-1">
                  Cancel
                </button>
              )}
              <button type="submit" disabled={pending} className="btn-primary flex-1">
                {pending ? "Saving…" : isEditing ? "Save Changes" : "Save Transaction"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function ModeButton({
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
        flex: 1,
        padding: "7px 12px",
        borderRadius: 8,
        fontSize: 12,
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

function TypeButton({
  active,
  onClick,
  children,
  variant,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  variant: "expense" | "income" | "transfer";
}) {
  const colors = {
    expense: { color: "var(--over)", bg: "var(--over-bg)", border: "var(--over-border)" },
    income: { color: "var(--accent)", bg: "var(--accent-bg)", border: "var(--accent-border)" },
    transfer: { color: "var(--violet)", bg: "var(--violet-bg)", border: "var(--violet-border)" },
  }[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "9px 14px",
        borderRadius: 12,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        background: active ? colors.bg : "transparent",
        color: active ? colors.color : "var(--text-secondary)",
        border: `1px solid ${active ? colors.border : "var(--border)"}`,
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function MultipleForm({
  rows,
  updateRow,
  addRow,
  removeRow,
  accountId,
  setAccountId,
  accounts,
  onSubmit,
  onCancel,
  pending,
}: {
  rows: Row[];
  updateRow: (idx: number, field: keyof Row, value: string) => void;
  addRow: () => void;
  removeRow: (idx: number) => void;
  accountId: string;
  setAccountId: (v: string) => void;
  accounts: Account[];
  onSubmit: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <label className="modal-label" style={{ marginBottom: 0 }}>
          Account for all rows:
        </label>
        <select
          className="modal-select"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          style={{ flex: 1 }}
        >
          <option value="">None / mixed</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ maxHeight: 380, overflowY: "auto" }}>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Description</Th>
              <Th>Amount</Th>
              <Th>Category</Th>
              <Th>Type</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <Td>
                  <CompactInput type="date" value={row.date} onChange={(v) => updateRow(i, "date", v)} />
                </Td>
                <Td>
                  <CompactInput
                    type="text"
                    value={row.description}
                    placeholder="e.g. Trader Joe's"
                    onChange={(v) => updateRow(i, "description", v)}
                  />
                </Td>
                <Td>
                  <CompactInput
                    type="number"
                    value={row.amount}
                    placeholder="0.00"
                    onChange={(v) => updateRow(i, "amount", v)}
                  />
                </Td>
                <Td>
                  <CompactSelect value={row.category} onChange={(v) => updateRow(i, "category", v)}>
                    <option value="">…</option>
                    {ALL_CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </CompactSelect>
                </Td>
                <Td>
                  <CompactSelect value={row.type} onChange={(v) => updateRow(i, "type", v as TxType)}>
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="transfer">Transfer</option>
                  </CompactSelect>
                </Td>
                <Td>
                  <button
                    onClick={() => removeRow(i)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      border: "none",
                      background: "transparent",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                    }}
                    title="Remove row"
                  >
                    ✕
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={addRow}
        className="text-sm mt-3"
        style={{ color: "var(--accent)", fontWeight: 500 }}
      >
        + Add another row
      </button>

      <hr className="modal-divider" />

      <div className="flex gap-3">
        <button onClick={onCancel} className="btn-ghost flex-1">
          Cancel
        </button>
        <button onClick={onSubmit} disabled={pending} className="btn-primary flex-1">
          {pending ? "Saving…" : "Save All"}
        </button>
      </div>
    </>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        padding: "0 8px 8px",
        textAlign: "left",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "5px 4px", verticalAlign: "middle" }}>{children}</td>;
}

function CompactInput({
  type,
  value,
  placeholder,
  onChange,
}: {
  type: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "7px 10px",
        borderRadius: 9,
        border: "1px solid var(--border)",
        background: "var(--progress-bg)",
        color: "var(--text-primary)",
        fontSize: 13,
        outline: "none",
      }}
    />
  );
}

function CompactSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "7px 10px",
        borderRadius: 9,
        border: "1px solid var(--border)",
        background: "var(--progress-bg)",
        color: "var(--text-primary)",
        fontSize: 13,
        outline: "none",
        cursor: "pointer",
      }}
    >
      {children}
    </select>
  );
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
