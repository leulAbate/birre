# MVP2 — deferred features

Ideas explicitly punted from MVP1. Kept lightweight so we can reprioritize.

## Deferred features

- **Account balance auto-adjust from transactions.** When a transaction is added / edited / deleted, mutate the linked account's balance. Concrete cases the user cares about: `Rent` should decrease the checking account balance; a `Savings Transfer` to Fidelity or Marcus should decrease checking and increase Fidelity/Marcus (needs `to_account_id`); a `Paycheck` from the paystub sync should deposit into a chosen account. Requires: `to_account_id` column on transactions to model transfers, update/delete diff logic, careful handling for the auto-generated paycheck rows (need a target account per template). Bundle with: transfers between accounts, account deletion behavior, manual balance reconciliation.

## Known bugs / rough edges to revisit

- **CSV import silently drops rows.** Uploaded 60, imported 59. Likely one row failed to parse (bad date, missing amount, or trailing blank line). Add a "skipped N rows" summary to the review step.
- **Account picker discoverability in CSV modal.** Investigate — user reported not seeing the picker even with accounts created. May be UX (buried above the table) or a real bug.
