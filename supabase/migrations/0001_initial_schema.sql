-- All tables cascade-delete when the user is removed from auth.users

CREATE TABLE institutions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plaid_item_id        TEXT NOT NULL UNIQUE,
  plaid_access_token   TEXT NOT NULL,
  institution_id       TEXT NOT NULL,
  institution_name     TEXT NOT NULL,
  logo_url             TEXT,
  primary_color        TEXT,
  cursor               TEXT,
  status               TEXT NOT NULL DEFAULT 'active',
  error_code           TEXT,
  last_synced_at       TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id    UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  plaid_account_id  TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  official_name     TEXT,
  type              TEXT NOT NULL,
  subtype           TEXT,
  current_balance   NUMERIC(14,2),
  available_balance NUMERIC(14,2),
  limit_balance     NUMERIC(14,2),
  iso_currency_code TEXT NOT NULL DEFAULT 'USD',
  mask              TEXT,
  is_hidden         BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE transactions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id                UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plaid_transaction_id      TEXT NOT NULL UNIQUE,
  amount                    NUMERIC(14,2) NOT NULL,
  iso_currency_code         TEXT NOT NULL DEFAULT 'USD',
  description               TEXT NOT NULL,
  merchant_name             TEXT,
  category                  TEXT,
  plaid_category            TEXT[],
  personal_finance_category TEXT,
  date                      DATE NOT NULL,
  authorized_date           DATE,
  pending                   BOOLEAN NOT NULL DEFAULT false,
  logo_url                  TEXT,
  website                   TEXT,
  note                      TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX transactions_user_date     ON transactions(user_id, date DESC);
CREATE INDEX transactions_user_account  ON transactions(user_id, account_id);
CREATE INDEX transactions_user_category ON transactions(user_id, category);

CREATE TABLE budgets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category   TEXT NOT NULL,
  amount     NUMERIC(14,2) NOT NULL,
  period     TEXT NOT NULL DEFAULT 'monthly',
  color      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category, period)
);

CREATE TABLE goals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  description    TEXT,
  target_amount  NUMERIC(14,2) NOT NULL,
  current_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  target_date    DATE,
  account_id     UUID REFERENCES accounts(id) ON DELETE SET NULL,
  icon           TEXT,
  color          TEXT,
  is_complete    BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  icon      TEXT,
  color     TEXT,
  is_income BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, name)
);

-- Seed default categories (user_id NULL = available to everyone)
INSERT INTO categories (name, icon, color, is_income) VALUES
  ('Food & Dining',      '🍔', '#F59E0B', false),
  ('Shopping',           '🛍️', '#8B5CF6', false),
  ('Transportation',     '🚗', '#3B82F6', false),
  ('Entertainment',      '🎬', '#EC4899', false),
  ('Housing',            '🏠', '#10B981', false),
  ('Utilities',          '💡', '#6366F1', false),
  ('Health & Fitness',   '💊', '#EF4444', false),
  ('Travel',             '✈️', '#14B8A6', false),
  ('Education',          '📚', '#F97316', false),
  ('Personal Care',      '💅', '#E879F9', false),
  ('Subscriptions',      '📱', '#64748B', false),
  ('Income',             '💰', '#22C55E', true),
  ('Transfer',           '↔️', '#94A3B8', false),
  ('Other',              '📦', '#78716C', false);
