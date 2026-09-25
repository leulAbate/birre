import { createClient } from "@/lib/supabase/server";
import { getAccounts, getGoals, getTransactions, monthRange } from "@/lib/data";
import { TransactionsClient } from "@/components/transactions/transactions-client";
import type { Budget } from "@/lib/types";

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function TransactionsPage({ searchParams }: Props) {
  const { month } = await searchParams;

  const now = new Date();
  const ym = month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [y, m] = ym.split("-").map(Number);
  const { start, end } = monthRange(y, m - 1);

  const supabase = await createClient();
  const [transactions, accounts, goals, budgetsRes] = await Promise.all([
    getTransactions({ monthStart: start, monthEnd: end }),
    getAccounts(),
    getGoals(),
    supabase.from("budgets").select("*"),
  ]);
  const budgets = (budgetsRes.data ?? []) as Budget[];

  return (
    <TransactionsClient
      ym={ym}
      transactions={transactions}
      accounts={accounts}
      goals={goals}
      budgets={budgets}
    />
  );
}
