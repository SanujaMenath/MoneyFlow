ALTER TABLE transactions ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_transactions_description ON transactions(description);
