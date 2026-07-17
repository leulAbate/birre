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
  goal_id?: string | null;
  note?: string | null;
}

export async function addTransaction(input: TransactionInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    date: input.date,
    description: input.description,
    amount: input.amount,
    type: input.type,
    category: input.category,
    account_id: input.account_id ?? null,
    goal_id: input.goal_id ?? null,
    note: input.note ?? null,
  });

  if (error) return { error: error.message };
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/review");
  revalidatePath("/plans");
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
    goal_id: r.goal_id ?? null,
    note: r.note ?? null,
  }));

  const { error } = await supabase.from("transactions").insert(payload);
  if (error) return { error: error.message };
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/review");
  revalidatePath("/plans");
  return { ok: true, count: payload.length };
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/review");
  revalidatePath("/plans");
  return { ok: true };
}

export async function updateTransaction(id: string, input: Partial<TransactionInput>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("transactions").update(input).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/review");
  revalidatePath("/plans");
  return { ok: true };
}
