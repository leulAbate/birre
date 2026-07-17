# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Dont commit push without asking first
Dont add co authored by claude to commits or during pushes

## Commands

- `npm run dev` — start dev server at http://localhost:3000
- `npm run build` — production build (also surfaces type errors)
- `npm run start` — run the production build

There is no lint or test script defined. Type checking happens via `next build` (TS strict mode is on).

## Stack

Next.js 16 (App Router) + React 19, Tailwind CSS v4, Supabase (Postgres + RLS), Anthropic SDK with streaming. See AGENTS.md — Next.js 16 has breaking changes from your training data; check `node_modules/next/dist/docs/` before writing Next-specific code.

## Architecture

### Transactions are the source of truth
Every page derives its numbers from the `transactions` table — dashboard cards, monthly aggregates, goal progress, budget adherence, savings rate. Do not introduce parallel state. If something needs a new number, compute it from transactions in `src/lib/calculations/`.

### Auth and routing
- Two route groups under `src/app/`: `(auth)` (login/signup) and `(app)` (everything behind auth).
- `src/proxy.ts` is the Next.js 16 middleware equivalent (note: `proxy.ts`, not `middleware.ts`). It refreshes the Supabase session cookie and redirects unauthenticated users to `/login`, and authenticated users away from `/login`/`/signup`.
- `src/app/(app)/layout.tsx` does a second `getUser()` redirect check — keep both: the proxy can't render UI, and server components shouldn't trust the proxy alone.

### Supabase clients
Three clients, all in `src/lib/supabase/`:
- `client.ts` — `createClient()` for client components (browser).
- `server.ts` — `createClient()` for server components / actions / route handlers. Uses the anon key with the user's cookie, so RLS applies.
- `server.ts` — `createAdminClient()` uses the service-role key and bypasses RLS. Only use server-side, and only when you genuinely need to bypass RLS.

Because every table has RLS policies tied to `auth.uid()`, server-side reads via the user-scoped client do not need `.eq("user_id", ...)` — the policy enforces it. Server actions still call `getUser()` to set `user_id` on inserts.

### Data flow
1. Server components fetch via helpers in `src/lib/data.ts` (`getTransactions`, `getAccounts`, `getGoals`, `getPaystubs`, `getProfile`).
2. Pure functions in `src/lib/calculations/` derive UI-ready shapes (`summary.ts`, `goals.ts`, `pulse.ts`, `paystubs.ts`, `tax.ts`, `categorize.ts`). Keep these pure — no Supabase imports.
3. Mutations go through server actions in `src/server/actions/*.ts`. Every mutation that changes a transaction calls `revalidatePath` for `/transactions`, `/dashboard`, `/review`, and `/plans` because all four pages read from transactions.

### Categories
`src/lib/types.ts` defines the canonical `CATEGORIES` object (needs / wants / savings / income) and `SAVINGS_CATEGORIES`. The summary logic treats `type === "transfer"` with a savings category as "saved" — that's how goal progress and savings-rate calculations work. Don't add new categories without updating both `CATEGORIES` and any UI dropdown that hardcodes a list.

### AI assistant
`src/app/api/ai/chat/route.ts` is the streaming Anthropic endpoint. The system prompt is page-scoped: each page id (`dashboard | transactions | review | plans | tax`) has a builder in `src/lib/ai/context.ts` that pulls live numbers from Supabase and serializes them into the prompt. To add AI support for a new page, add a key to `PageId`, write a builder, and register it in `PAGE_BUILDERS`.

The model id is pinned in `route.ts`. Update it deliberately, not as a drive-by.

### Schema
Migrations live in `supabase/migrations/` and are **forward-only**: never edit an applied file. `001_init.sql` is the baseline; every schema change since is a new numbered file (`002_add_paystubs.sql`, `003_…`). Each file must be idempotent (`create table if not exists`, `create or replace function`, `drop policy if exists` before `create policy`, etc.) so re-runs are safe. Apply via Supabase SQL editor or `supabase db push`. Mirror any schema change in `src/lib/types.ts`.

### Ghost mode
`src/components/shell/ghost.tsx` provides a `<G>` wrapper that randomizes visible dollar amounts (for screenshots). It multiplies the parsed number by a per-session random factor. When adding a money-shaped string to UI, wrap it in `<G>...</G>` so the privacy toggle works.

## Conventions

- Path alias `@/*` → `src/*`.
- Server actions return `{ ok: true }` or `{ error: string }` — match this shape.
- Currency rendering goes through `fmtCurrency` in `src/lib/utils.ts`, not ad-hoc `toLocaleString`.
- Theme is read from a `theme` cookie in the root layout and applied as `data-theme` on `<html>`; CSS variables in `globals.css` switch on that attribute.
