"use client";

import { useState, useTransition } from "react";
import type { GoalProgress } from "@/lib/calculations/goals";
import { fmtCurrency } from "@/lib/utils";
import { G } from "@/components/shell/ghost";
import { AddGoalModal } from "./add-goal-modal";
import { GoalDetailModal } from "./goal-detail-modal";
import { updateGoalStatus } from "@/server/actions/goals";

export function PlansClient({ progress }: { progress: GoalProgress[] }) {
  const [openAdd, setOpenAdd] = useState(false);
  const [openDetail, setOpenDetail] = useState<GoalProgress | null>(null);

  const active = progress.filter((p) => p.goal.status === "active");
  const wishlist = progress.filter((p) => p.goal.status === "wishlist");

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-6 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold page-title">Plans</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Track what you&apos;re saving toward
          </p>
        </div>
        <button onClick={() => setOpenAdd(true)} className="btn-primary flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          Add Goal
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 space-y-8">
        {progress.length === 0 ? (
          <EmptyState onAdd={() => setOpenAdd(true)} />
        ) : (
          <>
            <div>
              <p className="section-label mb-3">Active Goals</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map((p) => (
                  <GoalCard key={p.goal.id} progress={p} onOpen={() => setOpenDetail(p)} />
                ))}
                <AddGoalTile onClick={() => setOpenAdd(true)} />
              </div>
            </div>

            {wishlist.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="section-label">Wishlist</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    No deadline · things you want someday
                  </p>
                </div>
                <div className="glass rounded-2xl overflow-hidden">
                  {wishlist.map((p, i) => (
                    <WishlistRow
                      key={p.goal.id}
                      progress={p}
                      isLast={i === wishlist.length - 1}
                      onOpen={() => setOpenDetail(p)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AddGoalModal open={openAdd} onClose={() => setOpenAdd(false)} />
      <GoalDetailModal progress={openDetail} onClose={() => setOpenDetail(null)} />
    </div>
  );
}

function GoalCard({ progress, onOpen }: { progress: GoalProgress; onOpen: () => void }) {
  const { goal, saved, percent, monthlyNeeded, onTrack } = progress;
  const fillColor =
    onTrack === "complete" ? "var(--accent)" :
    onTrack === "ok" ? "var(--accent)" :
    onTrack === "warn" ? "var(--warn)" :
    "var(--over)";
  const statusLabel =
    onTrack === "complete" ? "Complete" :
    onTrack === "ok" ? "On Track" :
    onTrack === "warn" ? "Behind" :
    "Past Due";
  const statusClass =
    onTrack === "complete" || onTrack === "ok" ? "status-ok" :
    onTrack === "warn" ? "status-warn" :
    "status-over";

  const targetDate = goal.target_date
    ? new Date(goal.target_date + "T00:00:00").toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : "—";

  return (
    <div
      onClick={onOpen}
      className="glass rounded-2xl p-5 cursor-pointer"
      style={{ transition: "transform 0.15s" }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
    >
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
          <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{goal.name}</p>
        </div>
        <span
          className={statusClass}
          style={{ fontSize: 10, padding: "2px 9px", borderRadius: 99, fontWeight: 700, letterSpacing: "0.04em" }}
        >
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
          <p className="section-label">Target date</p>
          <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>
            {targetDate}
          </p>
        </div>
      </div>
    </div>
  );
}

function AddGoalTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="glass rounded-2xl p-5 flex flex-col items-center justify-center gap-3 cursor-pointer"
      style={{
        minHeight: 200,
        border: "1px dashed var(--border)",
        background: "transparent",
        color: "var(--text-muted)",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--accent-border)";
        e.currentTarget.style.color = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.color = "var(--text-muted)";
      }}
    >
      <div
        style={{
          width: 40, height: 40, borderRadius: 12,
          background: "var(--hover-bg)", border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
      </div>
      <p className="text-sm font-medium">Add a new goal</p>
    </button>
  );
}

function WishlistRow({
  progress,
  isLast,
  onOpen,
}: {
  progress: GoalProgress;
  isLast: boolean;
  onOpen: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const { goal } = progress;
  const created = new Date(goal.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" });

  function makeGoal(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      await updateGoalStatus(goal.id, "active");
    });
  }

  return (
    <div
      onClick={onOpen}
      className="flex items-center justify-between px-4 py-3 cursor-pointer"
      style={{
        borderBottom: isLast ? "none" : "1px solid var(--border)",
        opacity: pending ? 0.5 : 1,
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div className="flex items-center gap-3">
        <div
          style={{
            width: 34, height: 34, borderRadius: 10,
            background: "var(--violet-bg)", border: "1px solid var(--violet-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, flexShrink: 0,
          }}
        >
          {goal.icon}
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{goal.name}</p>
          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Added {created} · ~<G>{fmtCurrency(Number(goal.target_amount))}</G>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span
          className="status-warn"
          style={{ fontSize: 10, padding: "2px 9px", borderRadius: 99, fontWeight: 700, letterSpacing: "0.04em" }}
        >
          Wishlist
        </span>
        <button
          onClick={makeGoal}
          disabled={pending}
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "5px 10px",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          → Make Goal
        </button>
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
