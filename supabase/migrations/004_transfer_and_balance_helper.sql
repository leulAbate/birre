-- Transfer accounting + account balance helper.
--
-- Adds a `to_account_id` column to transactions so a transfer row can
-- represent both sides (debit source, credit destination). Adds an
-- `adjust_account_balance` SQL function used by server actions to apply
-- signed deltas atomically.

alter table transactions
  add column if not exists to_account_id uuid references accounts(id) on delete set null;

create index if not exists transactions_to_account_idx
  on transactions(to_account_id)
  where to_account_id is not null;

create or replace function adjust_account_balance(p_account_id uuid, p_delta numeric)
returns void
language sql
security invoker
as $$
  update accounts set balance = balance + p_delta where id = p_account_id;
$$;
