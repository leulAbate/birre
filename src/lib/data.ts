/**
 * Server-side data fetchers. Use from server components and route handlers.
 * Every function uses the RLS-respecting client, so we never need to manually
 * filter by user_id — the policies handle it.
 */
import { createClient } from "@/lib/supabase/server";
import type { Account, Goal, Paystub, Profile, Transaction } from "@/lib/types";

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").maybeSingle();
  return data;
}

export async function getAccounts(): Promise<Account[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("accounts")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getGoals(): Promise<Goal[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("goals")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getTransactions(opts?: {
  monthStart?: string; // YYYY-MM-01
  monthEnd?: string;   // YYYY-MM-DD of last day
}): Promise<Transaction[]> {
  const supabase = await createClient();
  let query = supabase.from("transactions").select("*").order("date", { ascending: false });

  if (opts?.monthStart) query = query.gte("date", opts.monthStart);
  if (opts?.monthEnd) query = query.lte("date", opts.monthEnd);

  const { data } = await query;
  return data ?? [];
}

export async function getPaystubs(opts?: { yearStart?: string }): Promise<Paystub[]> {
  const supabase = await createClient();
  let query = supabase.from("paystubs").select("*").order("pay_date", { ascending: false });
  if (opts?.yearStart) query = query.gte("pay_date", opts.yearStart);
  const { data } = await query;
  return data ?? [];
}

/** Returns first and last day of the given month as ISO date strings. */
export function monthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}
