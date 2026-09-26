"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Personal-use auto-login. If PERSONAL_LOGIN_EMAIL + PERSONAL_LOGIN_PASSWORD
 * are set in the server env, sign in as that user and set the session cookies.
 * Returns { ok: true } on success, { error } otherwise (falls back to the
 * normal login form on the client).
 */
export async function autoLogin(): Promise<{ ok: true } | { error: string }> {
  const email = process.env.PERSONAL_LOGIN_EMAIL;
  const password = process.env.PERSONAL_LOGIN_PASSWORD;
  if (!email || !password) {
    return { error: "Auto-login not configured" };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { ok: true };
}
