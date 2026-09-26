import { getPaystubs, getProfile } from "@/lib/data";
import { rebuildPaycheckTransactions } from "@/server/actions/paystubs";
import { TaxClient } from "@/components/tax/tax-client";

interface Props {
  searchParams: Promise<{ year?: string }>;
}

export default async function TaxPage({ searchParams }: Props) {
  await rebuildPaycheckTransactions();

  const { year: yearParam } = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = yearParam ? parseInt(yearParam, 10) : currentYear;

  const [profile, paystubs] = await Promise.all([
    getProfile(),
    getPaystubs({ yearStart: `${year}-01-01` }),
  ]);
  return <TaxClient profile={profile} paystubs={paystubs} year={year} />;
}
