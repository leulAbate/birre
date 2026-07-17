# Birr'e — Personal Finance Dashboard

Track your spending, savings goals, taxes, and monthly progress — with your own data, entered manually or imported from CSV.

---

## Features

| Feature | Description |
|---|---|
| **Dashboard** | Net worth, monthly cash flow, top expenses, upcoming subscriptions |
| **Transactions** | Full searchable list. Add one at a time, paste a bulk batch, or upload a CSV |
| **Review** | Pulse score, goal vs. actual, 4-month trends, savings rate, monthly notes |
| **Plans** | Savings goals — progress tracked automatically by tagging savings transactions |
| **Tax** | Paycheck decoder, take-home calculator, US 2025 bracket visualizer |
| **AI Assistant** | Context-aware Claude chat on every page, with your real numbers loaded |
| **Ghost Mode** | Privacy toggle that randomizes visible dollar amounts (useful for screenshots) |

---

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Styling:** Tailwind CSS v4 + custom CSS variables for the dark / "old money" light themes
- **Auth + Database:** Supabase (PostgreSQL + Row Level Security)
- **AI:** Claude (Anthropic SDK, streaming)
- **Deployment:** Vercel

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/                 # login + signup (already scaffolded)
│   ├── (app)/                  # authenticated pages share a layout
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── review/
│   │   ├── plans/
│   │   └── tax/
│   ├── api/ai/chat/            # streaming Anthropic endpoint
│   └── globals.css             # design tokens (CSS vars), fonts
├── components/                 # organized by feature
│   ├── shell/                  # sidebar, theme toggle, ghost toggle, AI panel
│   ├── transactions/
│   ├── plans/
│   ├── review/
│   ├── dashboard/
│   └── tax/
├── lib/
│   ├── supabase/               # browser + server clients
│   ├── calculations/           # pure business logic
│   ├── ai/                     # per-page system prompts + context builders
│   └── types.ts                # TS types mirroring the DB schema
└── server/actions/             # server actions for mutations
supabase/
└── migrations/                 # SQL schema + RLS policies
```

The single rule worth knowing: **transactions are the source of truth.** Every page reads from the `transactions` table — dashboard cards, monthly aggregates, goal progress, tax YTD numbers. No duplicated state.

---

## Setup

You will need:
- A [Supabase](https://supabase.com) project (free tier is fine)
- An [Anthropic](https://console.anthropic.com) API key
- A [Vercel](https://vercel.com) account for deployment (optional, for hosting)

1. `cp .env.example .env.local` and fill in your keys
2. Apply the schema: paste `supabase/migrations/001_init.sql` into Supabase SQL editor, or use `supabase db push` if you have the CLI
3. `npm install`
4. `npm run dev` and visit `http://localhost:3000`

Sign up the first time; subsequent visits use the same account.
