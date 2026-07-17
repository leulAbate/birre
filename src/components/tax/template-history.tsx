"use client";

import type { Paystub } from "@/lib/types";
import { totalsFor } from "@/lib/calculations/paystubs";
import { fmtCurrency, fmtDate } from "@/lib/utils";
import { G } from "@/components/shell/ghost";

interface Props {
  paystubs: Paystub[];
  activeId: string | null;
  onEdit: (p: Paystub) => void;
}

export function TemplateHistory({ paystubs, activeId, onEdit }: Props) {
  if (paystubs.length <= 1) return null;

  const sorted = [...paystubs].sort((a, b) => b.pay_date.localeCompare(a.pay_date));

  return (
    <div className="glass rounded-2xl p-5">
      <p className="section-label mb-3">Template History</p>
      <div className="space-y-2">
        {sorted.map((p) => {
          const isActive = p.id === activeId;
          const t = totalsFor(p);
          return (
            <button
              key={p.id}
              onClick={() => onEdit(p)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left"
              style={{
                background: isActive ? "var(--ok-bg)" : "var(--progress-bg)",
                border: `1px solid ${isActive ? "var(--ok-border)" : "var(--border)"}`,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                  Effective {fmtDate(p.pay_date)}
                  {isActive && (
                    <span
                      style={{
                        marginLeft: 8, fontSize: 9, fontWeight: 700, letterSpacing: "0.04em",
                        textTransform: "uppercase", color: "var(--accent)",
                      }}
                    >
                      active
                    </span>
                  )}
                </p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                  {p.employer ?? "—"} · net <G>{fmtCurrency(t.netPay)}</G>/period
                </p>
              </div>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Edit</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
