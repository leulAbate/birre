import { getGoals, getTransactions } from "@/lib/data";
import { computeGoalProgress } from "@/lib/calculations/goals";
import { PlansClient } from "@/components/plans/plans-client";

export default async function PlansPage() {
  const [goals, allTransactions] = await Promise.all([
    getGoals(),
    getTransactions(), // all transactions; goal-tagged ones used for progress
  ]);

  const progress = goals.map((g) => computeGoalProgress(g, allTransactions));
  return <PlansClient progress={progress} />;
}
