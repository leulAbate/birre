# Backlog

Short list of nice-to-have ideas (not bugs). Add new ones to the top; strike/delete when shipped.

- **Monthly balance snapshot** — "Snapshot now" button + a `balance_at_month_start` column. Show "this month: +$X / −$Y" on each account row so Chase/US Bank-style accounts can be reset at month start and tracked by delta.
- **PDF export of transactions** — printable one-page summary (we have CSV already).
- **Expand transaction search** — currently matches description + category only; add note, account name, amount.
- **"Show deleted" toggle in Accounts modal** — restore soft-deleted accounts from the UI instead of SQL.
- **Loan payoff estimates** — needs `original_balance` + `monthly_payment` on loan accounts; project payoff date in Loans modal.
- **AI panel: dynamic tax year** — contextPill for `/tax` hardcodes the current year; swap for the active year on the page.
- **CSV import: pick account per-row remember-last** — remember the last account used so bulk imports with repeated accounts don't require re-selecting.
