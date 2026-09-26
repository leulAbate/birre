"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface UpsertOpts {
  amount: number;      // dollar amount (computed on client if pct-based)
  pct?: number | null; // if percent-based
}

export async function upsertBudget(category: string, opts: UpsertOpts | number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Backwards-compat: allow plain number in place of the opts object.
  const { amount, pct } = typeof opts === "number" ? { amount: opts, pct: null } : opts;

  const { data: existing } = await supabase
    .from("budgets")
    .select("id")
    .eq("category", category)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("budgets")
      .update({ amount, pct: pct ?? null })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("budgets")
      .insert({ user_id: user.id, category, amount, pct: pct ?? null });
    if (error) return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/review");
  return { ok: true };
}

export async function deleteBudget(category: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("budgets").delete().eq("category", category);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/review");
  return { ok: true };
}
