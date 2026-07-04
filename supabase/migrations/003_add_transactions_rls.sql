-- Enable RLS on transactions table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "transactions_select" ON transactions
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own transactions
CREATE POLICY "transactions_insert" ON transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own transactions
CREATE POLICY "transactions_update" ON transactions
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own transactions
CREATE POLICY "transactions_delete" ON transactions
  FOR DELETE USING (user_id = auth.uid());

-- Index on user_id for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
