-- Migration 007: add updated_at + parent_transaction_id to transactions table.
--
-- C-02 fix: parent_transaction_id links generated recurring occurrences back
--   to their template, enabling correct idempotent deduplication.
-- C-06 fix: updated_at column enables the sync pull-watermark to filter by
--   last-edit time rather than creation time.
-- H-03 fix: no schema change needed; handled in application layer.

-- Add updated_at column (defaults to created_at for existing rows)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE transactions
  SET updated_at = created_at
  WHERE updated_at IS NULL;

-- Add parent_transaction_id for idempotent recurring generation
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS parent_transaction_id BIGINT REFERENCES transactions(id) ON DELETE SET NULL;

-- Index for efficient pull-sync watermark queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_updated_at
  ON transactions (user_id, updated_at DESC NULLS LAST);

-- Index for recurring occurrence lookups by parent (C-02)
CREATE INDEX IF NOT EXISTS idx_transactions_parent
  ON transactions (parent_transaction_id)
  WHERE parent_transaction_id IS NOT NULL;

-- Drop the B-tree index on description (useless for LIKE/FTS); a GIN trigram
-- index would be better but requires pg_trgm extension; leave un-indexed for now.
DROP INDEX IF EXISTS idx_transactions_description;

-- Auto-update updated_at on row changes (mirrors the handle_updated_at trigger
-- pattern already used on the profiles table)
CREATE OR REPLACE FUNCTION public.handle_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_transaction_updated ON transactions;
CREATE TRIGGER on_transaction_updated
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_transactions_updated_at();
