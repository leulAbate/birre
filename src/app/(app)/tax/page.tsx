import { getPaystubs, getProfile } from "@/lib/data";
import { rebuildPaycheckTransactions } from "@/server/actions/paystubs";
import { TaxClient } from "@/components/tax/tax-client";

export default async function TaxPage() {
  // Auto-catch-up: fill in any paycheck transactions for periods that
  // elapsed since the last write. No revalidatePath here — the page
  // itself will render fresh data on this same request.
  await rebuildPaycheckTransactions();

  const year = new Date().getFullYear();
  const [profile, paystubs] = await Promise.all([
    getProfile(),
    getPaystubs({ yearStart: `${year}-01-01` }),
  ]);
  return <TaxClient profile={profile} paystubs={paystubs} year={year} />;
}
