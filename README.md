# Finance — Personal Finance App

A personal finance web app inspired by Monarch Money. Track your net worth, spending, budgets, and savings goals — with secure, read-only connections to your bank accounts.

---

## What It Does

| Feature | Description |
|---|---|
| **Dashboard** | Net worth snapshot, income vs. spending chart, recent transactions |
| **Transactions** | Full searchable list with categories, filters, and notes |
| **Budgets** | Per-category monthly limits with live progress bars |
| **Accounts** | All connected bank/credit/investment accounts in one view |
| **Goals** | Savings goals with progress tracking and target dates |
| **Connections** | Connect and manage bank accounts via Plaid |

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- **Charts:** recharts
- **Data fetching:** TanStack Query
- **Auth + Database:** Supabase (PostgreSQL + Row Level Security)
- **Financial data:** Plaid API (read-only)
- **Deployment:** Vercel

---

## Security Model

Bank connections are **read-only** by design:

- Only Plaid read products are enabled: `transactions`, `balance`, `investments`, `liabilities`
- Money-movement products (`payment_initiation`, `transfer`) are never requested
- Plaid access tokens are stored server-side only — the browser never sees them
- Column-level database permissions block the client from reading tokens even if RLS is bypassed
- All financial API calls happen in server-only routes and actions
- Every table has Row Level Security: users can only access their own data
- Plaid webhooks are signature-verified before processing

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # login + signup
│   ├── (app)/            # authenticated pages (dashboard, transactions, etc.)
│   └── api/plaid/        # server-only API routes (token exchange, sync, webhook)
├── lib/
│   ├── supabase/         # browser + server Supabase clients
│   ├── plaid/            # Plaid API client + transaction sync logic
│   └── calculations/     # pure business logic (net worth, cash flow, budgets)
├── hooks/                # TanStack Query data hooks
├── server/               # Server Actions for CRUD
└── components/           # UI components organized by feature
supabase/
└── migrations/           # SQL schema + RLS policies
```

---

## Web → Mobile Path

The app is structured web-first but designed for a future React Native / Expo mobile app:

- `src/lib/calculations/` and `src/hooks/` have zero Next.js or browser dependencies — they can be copied directly into a React Native project
- TanStack Query hooks are identical in React Native
- When adding mobile: restructure into a monorepo (`/apps/web`, `/apps/mobile`, `/packages/core`), swap shadcn/ui for NativeWind + native components, swap recharts for victory-native

---

## Build Phases

1. **Phase 0** — Project init, Supabase setup, Vercel deploy
2. **Phase 1** — Auth (login/signup) + sidebar shell
3. **Phase 2** — Plaid integration (connect banks, sync transactions)
4. **Phase 3** — Accounts page
5. **Phase 4** — Transactions page (search, filter, categorize)
6. **Phase 5** — Dashboard (net worth, cash flow chart)
7. **Phase 6** — Budgets
8. **Phase 7** — Goals
9. **Phase 8** — Polish, mobile layout, Vercel Cron sync

---

## Setup

You will need:
- A [Supabase](https://supabase.com) project
- A [Plaid](https://plaid.com) developer account (sandbox is free)
- A [Vercel](https://vercel.com) account for deployment

Copy `.env.example` to `.env.local` and fill in your keys before running locally.
