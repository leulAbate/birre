# Birr'e — session handoff

Last updated: 2026-07-29 (preview-env test)

## What it is
Personal-use finance dashboard for a single user (`abate.a.leul@gmail.com`). Deployed to Vercel on push to `main`. User does **not** run `npm run dev` — they test on the live Vercel URL. Exception: for visual changes they may want to preview locally before commit (offer this).

## Stack
- Next.js **16** (Turbopack, App Router). `src/proxy.ts` is the middleware (Next 16 renamed `middleware.ts` → `proxy.ts`).
- React 19, Tailwind CSS v4, Supabase (Postgres + RLS), Anthropic SDK 0.96.0 with streaming + tool-use.
- **Read `node_modules/next/dist/docs/` before writing Next-specific code** — Next 16 has breaking changes from training data (per `AGENTS.md`).

## Architecture rules (from `CLAUDE.md`)
- `transactions` table is the source of truth. Every number (dashboard cards, monthly aggregates, goal progress, savings rate) is derived from it via pure functions in `src/lib/calculations/`.
- Two route groups: `(auth)` (login/signup) and `(app)` (everything behind auth).
- Three Supabase clients in `src/lib/supabase/`: browser (`client.ts`), server-with-user-cookie (`server.ts createClient`), and admin/service-role (`server.ts createAdminClient`, use sparingly).
- Server actions in `src/server/actions/*.ts` return `{ ok: true }` or `{ error: string }` and call `revalidatePath` on `/transactions`, `/dashboard`, `/review`, `/plans`.
- Migrations in `supabase/migrations/` are **forward-only, idempotent**. Never edit an applied file. Mirror schema changes in `src/lib/types.ts`.
- Money always rendered via `fmtCurrency` from `src/lib/utils.ts` and wrapped in `<G>` from `src/components/shell/ghost.tsx` (privacy mode; **default ON**).

## Categories (current)
Slimmed to 7 + 2 income. Defined in `src/lib/types.ts`:
- **needs**: `Rent & Utilities`, `Loan Payments`, `Groceries`
- **wants**: `Eating Out`, `Ride Share`, `Misc`
- **savings**: `Savings & Investments`
- **income**: `Paycheck`, `Other Income`

Category is a plain text column, not an enum/FK — adding/splitting/renaming later is trivial (edit `CATEGORIES` + one `update` SQL).

## Paystubs
`src/app/api/paystub/extract/route.ts` takes a PDF, extracts fields via Claude tool-use (`record_paystub` tool), prefills the form. The paystub becomes a **template** — `src/lib/calculations/paystubs.ts` projects YTD by walking pay periods and applying the latest-effective template at each date. `src/server/actions/paystubs.ts` splits into `rebuildPaycheckTransactions()` (safe from render) and `syncPaycheckTransactions()` (with revalidatePath). Auto-generated income rows have `paystub_id` set — UI treats them as read-only ("AUTO" badge).

## Loans
No dedicated table. Loans are `credit`-type `accounts` — balance shown as negative in the Accounts list, subtracted from net worth. Dashboard has a **Loan Balance stat card** (`src/components/dashboard/loans-modal.tsx`) that lists all credit accounts. Per-loan payoff estimates would need `original_balance` + `monthly_payment` fields on `accounts` (MVP2).

## AI assistant
`src/app/api/ai/chat/route.ts` streams from Anthropic. System prompt is **page-scoped** — `src/lib/ai/context.ts` has a builder per page id (`dashboard | transactions | review | plans | tax`) that pulls live numbers from Supabase. Model ID is pinned in the route.

## Mockups vs live app
`mockups/*.html` were the visual reference. Live pages are significantly slimmer than mockups — we shipped ~40% of each mockup as MVP and moved on. Notable **not-yet-ported** pieces from `mockups/dashboard.html`:
- Clickable stat cards that open detail modals (Loan Balance done; others still static)
- Category Breakdown tiles grouped by Needs / Wants / Savings with progress bars
- Spending Visual chart (Donut / Bar / Trend tabs)
- AI Pulse insight card (3 tiles at bottom)
- Floating AI FAB + slide-in chat panel
- "Add Expense" header button + Quick Add inline bar
- Active Plans mini-preview in right column

Other pages likely have similar gaps — worth doing a full mockup/live diff on `transactions.html`, `monthly-review.html`, `plans.html`, `tax.html` before adding new features.

## Recent session work (2026-07-29)
1. Replaced "Saved" dashboard stat card with clickable **Loan Balance** that opens `LoansModal` listing credit accounts.
2. **CSV parser** (`src/components/transactions/csv-import-modal.tsx`): fixed `normalizeDate` — was silently misparsing 2-digit years as 2001 via `new Date()` fallback. Now handles `M/D` (current year), `M/D/YY` (20YY), `M/D/YYYY`, `YYYY-MM-DD`. Bad-date rows kept in preview with red highlight + warning banner.
3. **Categories** collapsed to the 7 above. Rules in `src/lib/calculations/categorize.ts` remapped. Supabase migration SQL run to update existing rows (`transactions`, `budgets`, `recurring`).

## Workflow rules (do not violate)
- **Never commit or push without explicit user permission.**
- **Never add `Co-Authored-By: Claude` lines to commits.**
- User tests on Vercel; after any change → commit + push → tell them "wait ~2 min for Vercel to redeploy." For visual changes they may want to preview, offer `npm run dev` in background first.
- Auto-accept edits is on.

## Environment
- Single Supabase project used for both local dev and Vercel prod. No dev/stage/prod separation. Bad migrations or destructive actions hit real data — take snapshots before schema changes.

## Open work (`MVP2.md`)
- Account balance auto-adjust when adding a transfer transaction (Fidelity / Marcus example).
- CSV: option to pick account per-row (currently only import-level).
- Per-loan payoff estimates (requires new fields on `accounts`).

## Memory files (in `~/.claude/projects/-Users-leul-vscode-finance/memory/`)
- `feedback_auto_accept.md`, `feedback_commit_policy.md`, `feedback_deployed_workflow.md`, `project_api_plan.md` — all current.
