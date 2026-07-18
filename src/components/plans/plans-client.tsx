"use client";

import { useState } from "react";
import type { GoalProgress } from "@/lib/calculations/goals";
import { fmtCurrency } from "@/lib/utils";
import { G } from "@/components/shell/ghost";
import { AddGoalModal } from "./add-goal-modal";
import { GoalDetailModal } from "./goal-detail-modal";

export function PlansClient({ progress }: { progress: GoalProgress[] }) {
  const [openAdd, setOpenAdd] = useState(false);
  const [openDetail, setOpenDetail] = useState<GoalProgress | null>(null);

  const active = progress.filter((p) => p.goal.status === "active");
  const wishlist = progress.filter((p) => p.goal.status === "wishlist");

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-6 pt-6 pb-3 flex items-center justify-between">
        <div>
          <p className="section-label mb-1">Savings goals</p>
          <h1 className="text-2xl font-bold page-title">Plans</h1>
        </div>
        <button onClick={() => setOpenAdd(true)} className="btn-primary flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          New Goal
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 space-y-6">
        {progress.length === 0 ? (
          <EmptyState onAdd={() => setOpenAdd(true)} />
        ) : (
          <>
            {active.length > 0 && (
              <Section title="Active Goals">
                <GoalGrid items={active} onOpen={setOpenDetail} />
              </Section>
            )}
            {wishlist.length > 0 && (
              <Section title="Wishlist">
                <GoalGrid items={wishlist} onOpen={setOpenDetail} />
              </Section>
            )}
          </>
        )}
      </div>

      <AddGoalModal open={openAdd} onClose={() => setOpenAdd(false)} />
      <GoalDetailModal progress={openDetail} onClose={() => setOpenDetail(null)} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="section-label mb-3">{title}</p>
      {children}
    </div>
  );
}

function GoalGrid({
  items,
  onOpen,
}: {
  items: GoalProgress[];
  onOpen: (p: GoalProgress) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((p) => <GoalCard key={p.goal.id} progress={p} onOpen={() => onOpen(p)} />)}
    </div>
  );
}

function GoalCard({ progress, onOpen }: { progress: GoalProgress; onOpen: () => void }) {
  const { goal, saved, percent, monthsLeft, monthlyNeeded, onTrack } = progress;
  const fillColor =
    onTrack === "complete" ? "var(--accent)" :
    onTrack === "ok" ? "var(--accent)" :
    onTrack === "warn" ? "var(--warn)" :
    "var(--over)";
  const statusLabel = onTrack === "complete" ? "Complete" : onTrack === "ok" ? "On Track" : onTrack === "warn" ? "Behind" : "Past Due";
  const statusClass = onTrack === "complete" || onTrack === "ok" ? "status-ok" : onTrack === "warn" ? "status-warn" : "status-over";

  return (
    <div onClick={onOpen} className="glass rounded-2xl p-5 cursor-pointer" style={{ transition: "transform 0.2s" }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 40, height: 40, borderRadius: 12,
              background: "var(--accent-bg)", border: "1px solid var(--accent-border)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}
          >
            {goal.icon}
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{goal.name}</p>
            {goal.target_date && (
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {new Date(goal.target_date + "T00:00:00").toLocaleDateString(undefined, { month: "short", year: "numeric" })}
              </p>
            )}
          </div>
        </div>
        <span className={statusClass} style={{ fontSize: 10, padding: "2px 9px", borderRadius: 99, fontWeight: 700, letterSpacing: "0.04em" }}>
          {statusLabel}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between items-end mb-1.5">
          <span className="text-xl font-bold accent-num">
            <G>{fmtCurrency(saved)}</G>
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            of <G>{fmtCurrency(Number(goal.target_amount))}</G>
          </span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${percent}%`, background: fillColor }} />
        </div>
        <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
          {percent.toFixed(0)}% · <G>{fmtCurrency(progress.remaining)}</G> to go
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="section-label">Monthly needed</p>
          <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>
            {monthlyNeeded !== null ? <G>{fmtCurrency(monthlyNeeded) + "/mo"}</G> : "—"}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p className="section-label">Time left</p>
          <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>
            {monthsLeft !== null ? `${monthsLeft} mo` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="glass rounded-2xl p-8 text-center mt-4">
      <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
        No goals yet
      </p>
      <p className="text-sm mt-1 mb-4" style={{ color: "var(--text-secondary)" }}>
        Create a goal — then tag savings transactions to it and watch the progress fill in.
      </p>
      <button onClick={onAdd} className="btn-primary">Create your first goal</button>
    </div>
  );
}
