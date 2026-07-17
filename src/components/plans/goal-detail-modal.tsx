"use client";

import { useState, useTransition } from "react";
import type { GoalProgress } from "@/lib/calculations/goals";
import { fmtCurrency, fmtDate } from "@/lib/utils";
import { G } from "@/components/shell/ghost";
import { deleteGoal } from "@/server/actions/goals";

interface Props {
  progress: GoalProgress | null;
  onClose: () => void;
}

export function GoalDetailModal({ progress, onClose }: Props) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!progress) return null;
  const { goal, saved, percent, monthlyNeeded, monthsLeft, contributions, onTrack } = progress;
  const fillColor =
    onTrack === "complete" ? "var(--accent)" :
    onTrack === "ok" ? "var(--accent)" :
    onTrack === "warn" ? "var(--warn)" :
    "var(--over)";

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 2500);
      return;
    }
    startTransition(async () => {
      await deleteGoal(goal.id);
      setConfirming(false);
      onClose();
    });
  }

  return (
    <div className={"modal-overlay" + (progress ? " open" : "")} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 28 }}>{goal.icon}</span>
            <h2 className="text-lg font-bold page-title">{goal.name}</h2>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: "6px 10px" }}>✕</button>
        </div>

        <div style={{ margin: "20px 0" }}>
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="section-label mb-1">Progress</p>
              <p style={{ fontSize: 28, fontWeight: 800 }} className="accent-num">
                <G>{fmtCurrency(saved)}</G>
              </p>
            </div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              of <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
                <G>{fmtCurrency(Number(goal.target_amount))}</G>
              </span>
            </p>
          </div>
          <div className="progress-track" style={{ height: 10 }}>
            <div className="progress-fill" style={{ width: `${percent}%`, background: fillColor }} />
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
            {percent.toFixed(0)}% complete
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <Stat label="Monthly needed" value={monthlyNeeded !== null ? <G>{fmtCurrency(monthlyNeeded) + "/mo"}</G> : "—"} />
          <Stat label="Months left" value={monthsLeft !== null ? `${monthsLeft} mo` : "—"} />
          <Stat
            label="Target date"
            value={
              goal.target_date
                ? new Date(goal.target_date + "T00:00:00").toLocaleDateString(undefined, { month: "short", year: "numeric" })
                : "—"
            }
          />
        </div>

        <div className="mb-4">
          <label className="modal-label">Recent Contributions</label>
          {contributions.length === 0 ? (
            <div
              className="text-sm rounded-lg p-3"
              style={{ background: "var(--progress-bg)", color: "var(--text-muted)" }}
            >
              No contributions yet. Tag savings transactions to this goal — they&apos;ll show up here.
            </div>
          ) : (
            <div style={{ borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
              {contributions.slice(0, 5).map((tx, i) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{ borderBottom: i < Math.min(contributions.length, 5) - 1 ? "1px solid var(--border)" : "none" }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {tx.description}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {fmtDate(tx.date)} · {tx.category}
                    </p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: "var(--accent)" }}>
                    <G>{"+" + fmtCurrency(Number(tx.amount))}</G>
                  </p>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
            Tracked automatically — when you add a savings transaction, tag it to this goal.
          </p>
        </div>

        <hr className="modal-divider" />

        <div className="flex gap-3 justify-between">
          <button
            onClick={handleDelete}
            disabled={pending}
            className="btn-ghost"
            style={{
              color: confirming ? "var(--over)" : "var(--text-secondary)",
              borderColor: confirming ? "var(--over-border)" : "var(--border)",
            }}
          >
            {confirming ? "Click again to confirm" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="glass rounded-xl p-3 text-center">
      <p className="section-label mb-1">{label}</p>
      <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
    </div>
  );
}
