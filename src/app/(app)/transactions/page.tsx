import { getAccounts, getGoals, getTransactions, monthRange } from "@/lib/data";
import { TransactionsClient } from "@/components/transactions/transactions-client";

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function TransactionsPage({ searchParams }: Props) {
  const { month } = await searchParams;

  // Default to current month.
  const now = new Date();
  const ym = month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [y, m] = ym.split("-").map(Number);
  const { start, end } = monthRange(y, m - 1);

  const [transactions, accounts, goals] = await Promise.all([
    getTransactions({ monthStart: start, monthEnd: end }),
    getAccounts(),
    getGoals(),
  ]);

  return (
    <TransactionsClient
      ym={ym}
      transactions={transactions}
      accounts={accounts}
      goals={goals}
    />
  );
}
