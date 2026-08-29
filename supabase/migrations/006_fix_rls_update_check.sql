-- Fix C-05: transactions_update policy lacked WITH CHECK clause,
-- allowing an authenticated user to set user_id to another user's ID
-- on their own rows, bypassing RLS scope.

DROP POLICY IF EXISTS "transactions_update" ON transactions;

CREATE POLICY "transactions_update" ON transactions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Also add a composite index for the common sync-query pattern
-- (user_id + updated_at) used by the pull watermark after C-06 fix.
CREATE INDEX IF NOT EXISTS idx_transactions_user_updated
  ON transactions (user_id, updated_at DESC NULLS LAST);
