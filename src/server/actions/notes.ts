"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveMonthlyNote(month: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: existing } = await supabase
    .from("monthly_notes")
    .select("id")
    .eq("month", month)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("monthly_notes")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("monthly_notes").insert({
      user_id: user.id,
      month,
      content,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/review");
  return { ok: true };
}
