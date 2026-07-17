-- Link auto-generated income transactions back to the paystub template
-- that produced them. Presence of paystub_id means "machine-generated —
-- safe to delete and recreate on sync." Null means "user entered manually."

alter table transactions
  add column if not exists paystub_id uuid references paystubs(id) on delete cascade;

create index if not exists transactions_paystub_idx
  on transactions(paystub_id)
  where paystub_id is not null;
