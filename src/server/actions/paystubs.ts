"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getPaystubs } from "@/lib/data";
import { totalsFor, walkPayPeriods } from "@/lib/calculations/paystubs";

export interface PaystubInput {
  pay_date: string;
  period_start?: string | null;
  period_end?: string | null;
  employer?: string | null;
  regular_pay: number;
  bonus: number;
  hours?: number | null;
  medical: number;
  dental: number;
  vision: number;
  hsa: number;
  fsa: number;
  retirement_pretax: number;
  other_pretax: number;
  federal_withheld: number;
  state_withheld: number;
  social_security: number;
  medicare: number;
  retirement_aftertax: number;
  other_aftertax: number;
  note?: string | null;
}

export async function createPaystub(input: PaystubInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("paystubs").insert({
    user_id: user.id,
    ...input,
  });
  if (error) return { error: error.message };
  await syncPaycheckTransactions();
  return { ok: true };
}

export async function updatePaystub(id: string, input: Partial<PaystubInput>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("paystubs").update(input).eq("id", id);
  if (error) return { error: error.message };
  await syncPaycheckTransactions();
  return { ok: true };
}

export async function deletePaystub(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("paystubs").delete().eq("id", id);
  if (error) return { error: error.message };
  await syncPaycheckTransactions();
  return { ok: true };
}

/**
 * Rebuild the user's auto-generated paycheck transactions from their
 * paystub templates. Deletes every transaction with paystub_id set,
 * then walks pay periods and inserts one 'Paycheck' income row per
 * period using the active template's net pay.
 *
 * Safe to call from render (server components) — no revalidate here.
 * Only touches machine-generated rows; manual entries (paystub_id
 * null) are untouched.
 */
export async function rebuildPaycheckTransactions() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const [profile, paystubs] = await Promise.all([
    getProfile(),
    getPaystubs(),
  ]);
  const frequency = profile?.pay_frequency ?? "biweekly";

  await supabase.from("transactions").delete().not("paystub_id", "is", null);

  const entries = walkPayPeriods(paystubs, frequency);
  if (entries.length > 0) {
    const rows = entries.map(({ date, template }) => {
      const t = totalsFor(template);
      return {
        user_id: user.id,
        paystub_id: template.id,
        account_id: null,
        goal_id: null,
        date,
        description: template.employer ? `Paycheck · ${template.employer}` : "Paycheck",
        amount: t.netPay,
        type: "income" as const,
        category: "Paycheck",
        note: null,
      };
    });
    const { error } = await supabase.from("transactions").insert(rows);
    if (error) return { error: error.message };
  }
  return { ok: true };
}

/**
 * Rebuild + invalidate caches on the pages that read from transactions.
 * Call this from server actions after a mutation, not from render.
 */
export async function syncPaycheckTransactions() {
  const result = await rebuildPaycheckTransactions();
  if ("error" in result) return result;
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/review");
  revalidatePath("/plans");
  revalidatePath("/tax");
  return { ok: true };
}
