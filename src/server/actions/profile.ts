"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FilingStatus, PayFrequency, RetirementType } from "@/lib/types";

export interface TaxProfileInput {
  filing_status?: FilingStatus;
  state?: string;
  annual_salary?: number | null;
  pay_frequency?: PayFrequency;
  retirement_pct?: number;
  retirement_type?: RetirementType;
  health_pct?: number;
  hsa_per_paycheck?: number;
  fica_exempt?: boolean;
}

export async function updateTaxProfile(input: TaxProfileInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("profiles").update(input).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/tax");
  return { ok: true };
}
