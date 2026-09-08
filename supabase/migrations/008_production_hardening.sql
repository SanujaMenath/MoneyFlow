-- Migration 008: Production Hardening
-- 1. Full Account Deletion (Apple App Store Guideline 5.1.1(v) Compliance)
-- 2. Aggregated Financial Summary RPC for Dashboard
-- 3. Profiles schema reconciliation (display_name support for collaboration)

-- ==============================================================================
-- 1. Complete Account Deletion RPC
-- ==============================================================================
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete all user transactions
  DELETE FROM public.transactions WHERE user_id = v_uid;

  -- Delete shared transaction splits for user
  DELETE FROM public.shared_transaction_splits WHERE user_id = v_uid;

  -- Delete shared transactions created by user
  DELETE FROM public.shared_transactions WHERE creator_id = v_uid;

  -- Delete shared list memberships
  DELETE FROM public.shared_list_members WHERE user_id = v_uid;

  -- Delete shared lists owned by user
  DELETE FROM public.shared_lists WHERE owner_id = v_uid;

  -- Delete invitations
  DELETE FROM public.shared_invitations WHERE invited_by = v_uid;

  -- Delete profile record
  DELETE FROM public.profiles WHERE id = v_uid;

  -- Delete auth user
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

REVOKE EXECUTE ON FUNCTION delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;

-- ==============================================================================
-- 2. Aggregated Financial Summary RPC
-- ==============================================================================
CREATE OR REPLACE FUNCTION get_financial_summary(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_result JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT json_build_object(
    'income', COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
    'expenses', COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0),
    'balance', COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0)
  )
  INTO v_result
  FROM public.transactions
  WHERE user_id = v_uid
    AND (p_start_date IS NULL OR date >= p_start_date::text)
    AND (p_end_date IS NULL OR date <= p_end_date::text);

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_financial_summary(DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_financial_summary(DATE, DATE) TO authenticated;

-- ==============================================================================
-- 3. Profiles Schema Reconciliation
-- ==============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Backfill display_name for existing profiles
UPDATE public.profiles
SET display_name = COALESCE(display_name, full_name, split_part(username, '@', 1), 'User')
WHERE display_name IS NULL;
