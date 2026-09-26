"use client";

import { useState, useTransition } from "react";
import type { Account } from "@/lib/types";
import { ALL_CATEGORIES, CATEGORIES } from "@/lib/types";
import { autoCategorize } from "@/lib/calculations/categorize";
import { addTransaction } from "@/server/actions/transactions";

interface Props {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function QuickAddBar({ open, onClose, accounts }: Props) {
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState(today());
  const [desc, setDesc] = useState("");
  const [amt, setAmt] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES.wants[0]);
  const [accountId, setAccountId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleDescChange(v: string) {
    setDesc(v);
    const guess = autoCategorize(v);
    if (guess && ALL_CATEGORIES.includes(guess)) setCategory(guess);
  }

  function handleSave() {
    setError(null);
    const num = parseFloat(amt);
    if (!num || num <= 0) {
      setError("Amount");
      return;
    }
    if (!desc.trim()) {
      setError("Description");
      return;
    }
    startTransition(async () => {
      const res = await addTransaction({
        date,
        description: desc.trim(),
        amount: num,
        type: "expense",
        category,
        account_id: accountId || null,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setDesc("");
      setAmt("");
      setDate(today());
    });
  }

  if (!open) return null;

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="section-label">Quick Add</p>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          ✕
        </button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm outline-none"
          style={{
            background: "var(--hover-bg)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            width: 140,
            flexShrink: 0,
          }}
        />
        <input
          type="text"
          placeholder="Description"
          value={desc}
          onChange={(e) => handleDescChange(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm outline-none"
          style={{
            background: "var(--hover-bg)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            flex: 1,
            minWidth: 140,
          }}
        />
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="$0.00"
          value={amt}
          onChange={(e) => setAmt(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm outline-none"
          style={{
            background: "var(--hover-bg)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            width: 110,
            flexShrink: 0,
          }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm outline-none"
          style={{
            background: "var(--bg-card-solid)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            flexShrink: 0,
          }}
        >
          {ALL_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm outline-none"
          style={{
            background: "var(--bg-card-solid)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            width: 160,
            flexShrink: 0,
          }}
        >
          <option value="">Account (optional)</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <button
          onClick={handleSave}
          disabled={pending}
          className="btn-primary shrink-0"
          style={{ padding: "9px 18px", opacity: pending ? 0.5 : 1 }}
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {error && (
        <p className="text-xs mt-2" style={{ color: "var(--over)" }}>
          {error} required
        </p>
      )}
    </div>
  );
}
