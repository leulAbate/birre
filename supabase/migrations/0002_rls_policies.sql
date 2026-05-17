-- Enable Row Level Security on every table
ALTER TABLE institutions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories    ENABLE ROW LEVEL SECURITY;

-- Institutions: users can only see and manage their own
CREATE POLICY "institutions_owner" ON institutions
  FOR ALL USING (auth.uid() = user_id);

-- Accounts
CREATE POLICY "accounts_owner" ON accounts
  FOR ALL USING (auth.uid() = user_id);

-- Transactions
CREATE POLICY "transactions_owner" ON transactions
  FOR ALL USING (auth.uid() = user_id);

-- Budgets
CREATE POLICY "budgets_owner" ON budgets
  FOR ALL USING (auth.uid() = user_id);

-- Goals
CREATE POLICY "goals_owner" ON goals
  FOR ALL USING (auth.uid() = user_id);

-- Categories: users see their own + system defaults (user_id IS NULL)
CREATE POLICY "categories_read" ON categories
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "categories_insert" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "categories_update" ON categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "categories_delete" ON categories
  FOR DELETE USING (auth.uid() = user_id);
