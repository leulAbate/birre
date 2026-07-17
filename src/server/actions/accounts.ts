"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AccountType } from "@/lib/types";

export interface AccountInput {
  name: string;
  type: AccountType;
  balance: number;
}

export async function createAccount(input: AccountInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    name: input.name,
    type: input.type,
    balance: input.balance,
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { ok: true };
}

export async function updateAccount(id: string, input: Partial<AccountInput> & { is_active?: boolean }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("accounts").update(input).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { ok: true };
}

export async function deleteAccount(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Soft delete: just mark inactive. Transactions keep account_id intact.
  const { error } = await supabase.from("accounts").update({ is_active: false }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { ok: true };
}
