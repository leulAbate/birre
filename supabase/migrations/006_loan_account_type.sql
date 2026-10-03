-- Allow a dedicated 'loan' account type so credit cards (paid off monthly)
-- can be distinguished from actual loans (student / auto / mortgage).
-- Loans modal filters by type='loan' only.

alter table accounts
  drop constraint if exists accounts_type_check;

alter table accounts
  add constraint accounts_type_check
  check (type in ('checking','savings','credit','brokerage','cash','retirement','loan'));
