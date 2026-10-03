"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TxType } from "@/lib/types";

export interface TransactionInput {
  date: string;          // YYYY-MM-DD
  description: string;
  amount: number;        // always positive
  type: TxType;
  category: string;
  account_id?: string | null;
  to_account_id?: string | null;
  goal_id?: string | null;
  note?: string | null;
}

type Client = Awaited<ReturnType<typeof createClient>>;

async function getAccountType(supabase: Client, accountId: string | null): Promise<string | null> {
  if (!accountId) return null;
  const { data } = await supabase
    .from("accounts")
    .select("type")
    .eq("id", accountId)
    .single();
  return (data?.type as string) ?? null;
}

/**
 * Apply balance effects of a transaction.
 *
 * From account (money source):
 *   - debit-type account (checking/savings/etc): auto-adjust
 *   - credit card: skip (user manages payoff manually)
 *   - loan: skip (loans aren't a payment source)
 *
 * To account (destination):
 *   - debit-type destination on a transfer: +amount
 *   - loan destination (on either transfer OR expense): reduce debt by amount
 *     (lets a plain "Loan Payments" expense drop the loan balance when the
 *     user selects the loan in the modal's loan-account picker)
 *   - credit card destination: skip
 */
async function applyDeltas(
  supabase: Client,
  row: { type: TxType; amount: number; account_id: string | null; to_account_id: string | null },
  direction: 1 | -1,
) {
  const amt = Number(row.amount);

  if (row.account_id) {
    const fromType = await getAccountType(supabase, row.account_id);
    if (fromType !== "credit" && fromType !== "loan") {
      let delta = 0;
      if (row.type === "expense") delta = -amt;
      else if (row.type === "income") delta = +amt;
      else if (row.type === "transfer") delta = -amt;
      if (delta !== 0) {
        await supabase.rpc("adjust_account_balance", {
          p_account_id: row.account_id,
          p_delta: delta * direction,
        });
      }
    }
  }

  if (row.to_account_id) {
    const toType = await getAccountType(supabase, row.to_account_id);
    if (toType === "loan") {
      await supabase.rpc("adjust_account_balance", {
        p_account_id: row.to_account_id,
        p_delta: -amt * direction,
      });
    } else if (toType !== "credit" && row.type === "transfer") {
      await supabase.rpc("adjust_account_balance", {
        p_account_id: row.to_account_id,
        p_delta: amt * direction,
      });
    }
  }
}

function invalidate() {
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/review");
  revalidatePath("/plans");
}

export async function addTransaction(input: TransactionInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      date: input.date,
      description: input.description,
      amount: input.amount,
      type: input.type,
      category: input.category,
      account_id: input.account_id ?? null,
      to_account_id: input.to_account_id ?? null,
      goal_id: input.goal_id ?? null,
      note: input.note ?? null,
    })
    .select("account_id, to_account_id, type, amount")
    .single();

  if (error) return { error: error.message };
  if (data) await applyDeltas(supabase, data, 1);
  invalidate();
  return { ok: true };
}

export async function addTransactionsBulk(rows: TransactionInput[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const payload = rows.map((r) => ({
    user_id: user.id,
    date: r.date,
    description: r.description,
    amount: r.amount,
    type: r.type,
    category: r.category,
    account_id: r.account_id ?? null,
    to_account_id: r.type === "transfer" ? (r.to_account_id ?? null) : null,
    goal_id: r.goal_id ?? null,
    note: r.note ?? null,
  }));

  const { data, error } = await supabase
    .from("transactions")
    .insert(payload)
    .select("account_id, to_account_id, type, amount");
  if (error) return { error: error.message };
  if (data) for (const row of data) await applyDeltas(supabase, row, 1);
  invalidate();
  return { ok: true, count: payload.length };
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: old } = await supabase
    .from("transactions")
    .select("account_id, to_account_id, type, amount")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { error: error.message };
  if (old) await applyDeltas(supabase, old, -1);
  invalidate();
  return { ok: true };
}

export async function updateTransaction(id: string, input: Partial<TransactionInput>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: old } = await supabase
    .from("transactions")
    .select("account_id, to_account_id, type, amount")
    .eq("id", id)
    .single();

  const patch: Record<string, unknown> = { ...input };

  const { data: next, error } = await supabase
    .from("transactions")
    .update(patch)
    .eq("id", id)
    .select("account_id, to_account_id, type, amount")
    .single();

  if (error) return { error: error.message };

  if (old) await applyDeltas(supabase, old, -1);
  if (next) await applyDeltas(supabase, next, 1);

  invalidate();
  return { ok: true };
}
