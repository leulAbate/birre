-- Which account auto-generated paychecks are deposited into.
-- When set, rebuildPaycheckTransactions tags each generated transaction
-- with this account_id AND credits the account's balance.

alter table profiles
  add column if not exists paycheck_account_id uuid references accounts(id) on delete set null;
