"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="glass rounded-3xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="nav-logo-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
              fill="var(--sidebar-active)"
            />
          </svg>
        </div>
        <span className="page-title text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Birr&apos;e
        </span>
      </div>

      <h1 className="page-title text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
        Welcome back
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        Sign in to your account
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div
            className="text-sm px-3 py-2 rounded-lg"
            style={{ background: "var(--over-bg)", color: "var(--over)", border: "1px solid var(--over-border)" }}
          >
            {error}
          </div>
        )}

        <div>
          <label className="modal-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="modal-input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="modal-label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="modal-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-sm text-center" style={{ color: "var(--text-secondary)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium hover:underline" style={{ color: "var(--accent)" }}>
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
