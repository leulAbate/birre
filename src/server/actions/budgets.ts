"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function upsertBudget(category: string, amount: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Try to update first; if zero rows, insert.
  const { data: existing } = await supabase
    .from("budgets")
    .select("id")
    .eq("category", category)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("budgets")
      .update({ amount })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("budgets")
      .insert({ user_id: user.id, category, amount });
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
