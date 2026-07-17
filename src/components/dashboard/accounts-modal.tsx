"use client";

import { useState, useTransition } from "react";
import type { Account, AccountType } from "@/lib/types";
import { fmtCurrency } from "@/lib/utils";
import { G } from "@/components/shell/ghost";
import { createAccount, deleteAccount, updateAccount } from "@/server/actions/accounts";

interface Props {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
}

const TYPES: AccountType[] = ["checking", "savings", "credit", "brokerage", "cash", "retirement"];

export function AccountsModal({ open, onClose, accounts }: Props) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("checking");
  const [balance, setBalance] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const bal = parseFloat(balance);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (isNaN(bal)) {
      setError("Balance must be a number");
      return;
    }
    startTransition(async () => {
      const res = await createAccount({ name: name.trim(), type, balance: bal });
      if (res.error) {
        setError(res.error);
        return;
      }
      setName("");
      setBalance("");
      setType("checking");
    });
  }

  function handleBalanceChange(id: string, newBalance: string) {
    const num = parseFloat(newBalance);
    if (isNaN(num)) return;
    startTransition(async () => {
      await updateAccount(id, { balance: num });
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteAccount(id);
    });
  }

  return (
    <div className={"modal-overlay" + (open ? " open" : "")} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel" style={{ width: 540 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold page-title">Accounts</h2>
          <button onClick={onClose} className="btn-ghost" style={{ padding: "6px 10px" }}>✕</button>
        </div>

        {accounts.length > 0 && (
          <div className="mb-6">
            <p className="section-label mb-2">Your accounts</p>
            <div style={{ borderRadius: 12, border: "1px solid var(--border)" }}>
              {accounts.map((a, i) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                  style={{ borderBottom: i < accounts.length - 1 ? "1px solid var(--border)" : "none" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{a.name}</p>
                    <p className="text-xs capitalize" style={{ color: "var(--text-muted)" }}>{a.type}</p>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={Number(a.balance)}
                    onBlur={(e) => {
                      if (parseFloat(e.target.value) !== Number(a.balance)) {
                        handleBalanceChange(a.id, e.target.value);
                      }
                    }}
                    style={{
                      width: 120, padding: "6px 10px", borderRadius: 8,
                      border: "1px solid var(--border)", background: "var(--progress-bg)",
                      color: "var(--text-primary)", fontSize: 13, textAlign: "right", outline: "none",
                    }}
                  />
                  <button
                    onClick={() => handleDelete(a.id)}
                    title="Remove"
                    style={{
                      width: 28, height: 28, borderRadius: 6, border: "none",
                      background: "transparent", color: "var(--text-muted)", cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              Total: <G>{fmtCurrency(accounts.reduce((s, a) => s + (a.type === "credit" ? -1 : 1) * Number(a.balance), 0))}</G>
            </p>
          </div>
        )}

        <form onSubmit={handleAdd}>
          <p className="section-label mb-2">Add account</p>
          {error && (
            <div
              className="text-sm px-3 py-2 rounded-lg mb-3"
              style={{ background: "var(--over-bg)", color: "var(--over)", border: "1px solid var(--over-border)" }}
            >
              {error}
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="modal-input"
            />
            <select className="modal-select" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              type="number"
              step="0.01"
              placeholder="Balance"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="modal-input"
            />
          </div>
          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? "Saving…" : "Add Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
