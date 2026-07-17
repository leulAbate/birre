"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { GoalStatus } from "@/lib/types";

export interface GoalInput {
  icon: string;
  name: string;
  target_amount: number;
  target_date?: string | null;
  status?: GoalStatus;
}

export async function createGoal(input: GoalInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("goals").insert({
    user_id: user.id,
    icon: input.icon || "🎯",
    name: input.name,
    target_amount: input.target_amount,
    target_date: input.target_date ?? null,
    status: input.status ?? "active",
  });

  if (error) return { error: error.message };
  revalidatePath("/plans");
  return { ok: true };
}

export async function deleteGoal(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/plans");
  return { ok: true };
}

export async function updateGoal(id: string, input: Partial<GoalInput>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("goals").update(input).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/plans");
  return { ok: true };
}
