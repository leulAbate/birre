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
  const depositAccountId = profile?.paycheck_account_id ?? null;

  // Before deleting existing paystub-generated rows, read their current
  // amounts + account_ids so we can reverse their balance effect. Only
  // reverse on debit-type accounts (never on credit/loan — those are
  // user-managed and were skipped by applyDeltas on insert anyway).
  const { data: existingRows } = await supabase
    .from("transactions")
    .select("amount, account_id")
    .not("paystub_id", "is", null);

  if (existingRows && existingRows.length > 0) {
    // Pull account types once so we can skip credit/loan
    const accountIds = [...new Set(existingRows.map((r) => r.account_id).filter(Boolean))] as string[];
    const typeByAccount: Record<string, string> = {};
    if (accountIds.length > 0) {
      const { data: accs } = await supabase.from("accounts").select("id, type").in("id", accountIds);
      for (const a of accs ?? []) typeByAccount[a.id as string] = a.type as string;
    }
    for (const r of existingRows) {
      if (!r.account_id) continue;
      const t = typeByAccount[r.account_id];
      if (t === "credit" || t === "loan") continue;
      await supabase.rpc("adjust_account_balance", {
        p_account_id: r.account_id,
        p_delta: -Number(r.amount),
      });
    }
  }

  await supabase.from("transactions").delete().not("paystub_id", "is", null);

  const entries = walkPayPeriods(paystubs, frequency);
  if (entries.length > 0) {
    const rows = entries.map(({ date, template }) => {
      const t = totalsFor(template);
      return {
        user_id: user.id,
        paystub_id: template.id,
        account_id: depositAccountId,
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

    // Credit the deposit account by the total if it's a debit-type account.
    if (depositAccountId) {
      const { data: acc } = await supabase
        .from("accounts")
        .select("type")
        .eq("id", depositAccountId)
        .single();
      if (acc && acc.type !== "credit" && acc.type !== "loan") {
        const total = rows.reduce((s, r) => s + Number(r.amount), 0);
        if (total > 0) {
          await supabase.rpc("adjust_account_balance", {
            p_account_id: depositAccountId,
            p_delta: total,
          });
        }
      }
    }
  }
  return { ok: true };
}

export async function setPaycheckAccount(accountId: string | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ paycheck_account_id: accountId })
    .eq("id", user.id);
  if (error) return { error: error.message };

  await syncPaycheckTransactions();
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
