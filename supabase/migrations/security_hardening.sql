-- ==============================================================================
-- 1. [C-01] Strict WITH CHECK on shared tables
-- ==============================================================================
DROP POLICY IF EXISTS "shared_lists_update" ON shared_lists;
CREATE POLICY "shared_lists_update" ON shared_lists
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "shared_transactions_update" ON shared_transactions;
CREATE POLICY "shared_transactions_update" ON shared_transactions
  FOR UPDATE
  USING (
    creator_id = auth.uid() OR
    list_id IN (SELECT id FROM shared_lists WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    creator_id = auth.uid() AND
    list_id IN (SELECT list_id FROM shared_list_members WHERE user_id = auth.uid())
  );

-- ==============================================================================
-- 2. [C-02] & [M-04] Secure RPC User Enumeration and Enforce search_path
-- ==============================================================================
CREATE OR REPLACE FUNCTION get_users_by_ids(user_ids UUID[])
RETURNS TABLE(id UUID, email TEXT) 
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  RETURN QUERY 
  SELECT au.id, au.email 
  FROM auth.users au
  WHERE au.id = ANY(user_ids)
    AND (
      au.id = auth.uid()
      OR au.id IN (
        SELECT m2.user_id 
        FROM shared_list_members m1
        JOIN shared_list_members m2 ON m1.list_id = m2.list_id
        WHERE m1.user_id = auth.uid()
      )
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION get_users_by_ids(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_users_by_ids(UUID[]) TO authenticated;

-- ==============================================================================
-- 3. [H-03] Collaboration RLS Fixes: Allow pending invitees to join and leave
-- ==============================================================================
DROP POLICY IF EXISTS "shared_list_members_insert" ON shared_list_members;
CREATE POLICY "shared_list_members_insert" ON shared_list_members
  FOR INSERT WITH CHECK (
    list_id IN (SELECT id FROM shared_lists WHERE owner_id = auth.uid())
    OR
    (
      user_id = auth.uid() AND
      list_id IN (
        SELECT list_id FROM shared_invitations
        WHERE invited_email = (auth.jwt() ->> 'email')
          AND status = 'pending'
      )
    )
  );

DROP POLICY IF EXISTS "shared_list_members_delete" ON shared_list_members;
CREATE POLICY "shared_list_members_delete" ON shared_list_members
  FOR DELETE USING (
    list_id IN (SELECT id FROM shared_lists WHERE owner_id = auth.uid())
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "shared_invitations_select" ON shared_invitations;
CREATE POLICY "shared_invitations_select" ON shared_invitations
  FOR SELECT USING (
    invited_email = (auth.jwt() ->> 'email') OR
    invited_by = auth.uid() OR
    list_id IN (SELECT id FROM shared_lists WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "shared_invitations_update" ON shared_invitations;
CREATE POLICY "shared_invitations_update" ON shared_invitations
  FOR UPDATE USING (
    invited_email = (auth.jwt() ->> 'email') OR
    list_id IN (SELECT id FROM shared_lists WHERE owner_id = auth.uid())
  ) WITH CHECK (
    (invited_email = (auth.jwt() ->> 'email') AND status IN ('accepted', 'declined'))
    OR (list_id IN (SELECT id FROM shared_lists WHERE owner_id = auth.uid()))
  );