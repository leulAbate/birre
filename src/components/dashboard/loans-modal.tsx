"use client";

import type { Account } from "@/lib/types";
import { fmtCurrency } from "@/lib/utils";
import { G } from "@/components/shell/ghost";

interface Props {
  open: boolean;
  onClose: () => void;
  loans: Account[];
  onManage: () => void;
}

export function LoansModal({ open, onClose, loans, onManage }: Props) {
  const total = loans.reduce((s, a) => s + Number(a.balance), 0);

  return (
    <div
      className={"modal-overlay" + (open ? " open" : "")}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-panel" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="section-label mb-1">Loan Balance</p>
            <p className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
              <G>{fmtCurrency(total)}</G>
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {loans.length === 0
                ? "No credit-type accounts yet"
                : `across ${loans.length} loan${loans.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: "6px 10px" }}>
            ✕
          </button>
        </div>

        {loans.length === 0 ? (
          <div>
            <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
              Add loans as <strong>credit</strong>-type accounts. They subtract from your net worth
              automatically.
            </p>
            <button onClick={onManage} className="btn-primary w-full">
              Add a loan
            </button>
          </div>
        ) : (
          <>
            <p className="section-label mb-2">Loans</p>
            <div style={{ borderRadius: 12, border: "1px solid var(--border)" }}>
              {loans.map((a, i) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between px-3 py-2.5"
                  style={{
                    borderBottom: i < loans.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {a.name}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Loan · balance owed
                    </p>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "var(--over)" }}>
                    <G>{"−" + fmtCurrency(Number(a.balance))}</G>
                  </p>
                </div>
              ))}
            </div>
            <button
              onClick={onManage}
              className="text-xs font-medium mt-3"
              style={{ color: "var(--accent)" }}
            >
              Manage accounts →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
