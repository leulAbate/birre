"use client";

import { useState, useTransition } from "react";
import { createGoal } from "@/server/actions/goals";

const EMOJI_OPTIONS = ["🎯", "🏖️", "🏠", "🚗", "💻", "✈️", "💍", "🎓", "🆘", "🎧"];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddGoalModal({ open, onClose }: Props) {
  const [pending, startTransition] = useTransition();
  const [icon, setIcon] = useState("🎯");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [saved, setSaved] = useState("");
  const [date, setDate] = useState("");
  const [isWishlist, setIsWishlist] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setIcon("🎯");
    setName("");
    setAmount("");
    setSaved("");
    setDate("");
    setIsWishlist(false);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const target = parseFloat(amount);
    if (!target || target <= 0) {
      setError("Target amount must be greater than zero");
      return;
    }
    if (!name.trim()) {
      setError("Goal name is required");
      return;
    }

    startTransition(async () => {
      const res = await createGoal({
        icon,
        name: name.trim(),
        target_amount: target,
        target_date: date || null,
        status: isWishlist ? "wishlist" : "active",
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      handleClose();
    });
  }

  return (
    <div className={"modal-overlay" + (open ? " open" : "")} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="section-label mb-1">New Goal</p>
            <h2 className="text-xl font-bold page-title" style={{ color: "var(--text-primary)" }}>
              What are you saving for?
            </h2>
          </div>
          <button onClick={handleClose} className="btn-ghost" style={{ padding: "6px 10px" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              className="text-sm px-3 py-2 rounded-lg"
              style={{ background: "var(--over-bg)", color: "var(--over)", border: "1px solid var(--over-border)" }}
            >
              {error}
            </div>
          )}

          <div>
            <label className="modal-label">Icon</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setIcon(e)}
                  style={{
                    width: 36, height: 36, borderRadius: 8,
                    border: `1px solid ${icon === e ? "var(--accent-border)" : "var(--border)"}`,
                    background: icon === e ? "var(--accent-bg)" : "transparent",
                    fontSize: 16, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s",
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="modal-label">Goal Name</label>
            <input
              type="text"
              placeholder="e.g. Japan Trip"
              className="modal-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="modal-label">Target Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="3500"
                className="modal-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="modal-label">
                Target Date{" "}
                <span style={{ color: "var(--text-muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                  (optional)
                </span>
              </label>
              <input
                type="date"
                className="modal-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isWishlist}
              onChange={(e) => setIsWishlist(e.target.checked)}
              style={{ accentColor: "var(--violet)" }}
            />
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Wishlist — no deadline, lower priority
            </span>
          </label>

          <hr className="modal-divider" />

          <div className="flex gap-3">
            <button type="button" onClick={handleClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={pending} className="btn-primary flex-1">
              {pending ? "Creating…" : "Create Goal"}
            </button>
          </div>
        </form>

        <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
          Tip: progress fills in automatically when you tag savings transactions to this goal.
        </p>
      </div>
    </div>
  );
}
