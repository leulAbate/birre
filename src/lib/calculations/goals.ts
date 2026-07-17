import type { Goal, Transaction } from "@/lib/types";

export interface GoalProgress {
  goal: Goal;
  saved: number;            // sum of tagged transactions
  remaining: number;        // target - saved
  percent: number;          // 0..100
  contributions: Transaction[];
  monthsLeft: number | null; // null if no target_date
  monthlyNeeded: number | null;
  onTrack: "ok" | "warn" | "over" | "complete";
}

export function computeGoalProgress(goal: Goal, allTransactions: Transaction[]): GoalProgress {
  const contributions = allTransactions.filter((tx) => tx.goal_id === goal.id);
  const saved = contributions.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const target = Number(goal.target_amount);
  const remaining = Math.max(0, target - saved);
  const percent = target > 0 ? Math.min(100, (saved / target) * 100) : 0;

  let monthsLeft: number | null = null;
  let monthlyNeeded: number | null = null;
  if (goal.target_date) {
    const now = new Date();
    const targetDate = new Date(goal.target_date + "T00:00:00");
    const ms = targetDate.getTime() - now.getTime();
    monthsLeft = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24 * 30)));
    if (monthsLeft > 0) {
      monthlyNeeded = remaining / monthsLeft;
    }
  }

  let onTrack: GoalProgress["onTrack"];
  if (percent >= 100) onTrack = "complete";
  else if (monthlyNeeded === null) onTrack = "ok";
  else if (monthsLeft && monthsLeft <= 0) onTrack = "over";
  else onTrack = percent >= 50 ? "ok" : "warn";

  return {
    goal,
    saved,
    remaining,
    percent,
    contributions,
    monthsLeft,
    monthlyNeeded,
    onTrack,
  };
}
