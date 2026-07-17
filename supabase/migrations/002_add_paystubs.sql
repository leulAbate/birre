-- Add paystubs table for the Tax page.
--
-- Each row is one pay period the user enters from their paystub.
-- Tax YTD numbers are computed by summing across these rows.
-- All amounts are positive — the meaning is determined by the column.

create table if not exists paystubs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pay_date date not null,
  period_start date,
  period_end date,
  employer text,
  -- Earnings
  regular_pay numeric(12,2) not null default 0,
  bonus numeric(12,2) not null default 0,
  hours numeric(6,2),
  -- Pre-tax deductions
  medical numeric(12,2) not null default 0,
  dental numeric(12,2) not null default 0,
  vision numeric(12,2) not null default 0,
  hsa numeric(12,2) not null default 0,
  fsa numeric(12,2) not null default 0,
  retirement_pretax numeric(12,2) not null default 0,  -- Traditional 401k
  other_pretax numeric(12,2) not null default 0,
  -- Taxes withheld
  federal_withheld numeric(12,2) not null default 0,
  state_withheld numeric(12,2) not null default 0,
  social_security numeric(12,2) not null default 0,
  medicare numeric(12,2) not null default 0,
  -- After-tax deductions
  retirement_aftertax numeric(12,2) not null default 0,  -- Roth 401k
  other_aftertax numeric(12,2) not null default 0,
  -- Notes
  note text,
  created_at timestamptz not null default now()
);

create index if not exists paystubs_user_date_idx on paystubs(user_id, pay_date desc);

alter table paystubs enable row level security;

drop policy if exists "users own paystubs" on paystubs;
create policy "users own paystubs"
  on paystubs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
