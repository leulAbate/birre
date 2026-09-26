-- Optional percent-of-income budgeting.
-- When pct is set, `amount` is the dollar equivalent computed at save time
-- from profile.annual_salary / 12 (or projected annual / 12 from paystubs).
-- If pct is null, the budget is a flat dollar amount.

alter table budgets
  add column if not exists pct numeric(5,2);
