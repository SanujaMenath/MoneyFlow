-- Collaboration Feature: Shared Expense Lists
-- Run this in your Supabase SQL editor

-- 0. Profiles table (shared across features)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Also create profiles for existing users (run once)
INSERT INTO profiles (id, email, display_name)
SELECT id, email, split_part(email, '@', 1)
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Backfill: update profiles when auth user email changes
CREATE OR REPLACE FUNCTION handle_user_email_change()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email, display_name = split_part(NEW.email, '@', 1)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_email_change ON auth.users;
CREATE TRIGGER on_auth_user_email_change
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_email_change();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Members of shared lists can see profiles of other members
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (
    id IN (
      SELECT user_id FROM shared_list_members WHERE list_id IN (
        SELECT list_id FROM shared_list_members WHERE user_id = auth.uid()
      )
    )
  );

-- RPC to get user emails by IDs (for service fallback)
CREATE OR REPLACE FUNCTION get_users_by_ids(user_ids UUID[])
RETURNS TABLE(id UUID, email TEXT) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT au.id, au.email FROM auth.users au WHERE au.id = ANY(user_ids);
END;
$$;

-- 1. Shared Lists
CREATE TABLE IF NOT EXISTS shared_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'LKR',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shared_lists_owner_id ON shared_lists(owner_id);

-- 2. Shared List Members
CREATE TABLE IF NOT EXISTS shared_list_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES shared_lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(list_id, user_id)
);

CREATE INDEX idx_shared_list_members_list_id ON shared_list_members(list_id);
CREATE INDEX idx_shared_list_members_user_id ON shared_list_members(user_id);

-- 3. Invitations
CREATE TABLE IF NOT EXISTS shared_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES shared_lists(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE(list_id, invited_email)
);

CREATE INDEX idx_shared_invitations_token ON shared_invitations(token);
CREATE INDEX idx_shared_invitations_email ON shared_invitations(invited_email);
CREATE INDEX idx_shared_invitations_list_id ON shared_invitations(list_id);

-- 4. Shared Transactions
CREATE TABLE IF NOT EXISTS shared_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES shared_lists(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  split_method TEXT NOT NULL DEFAULT 'equal' CHECK (split_method IN ('equal', 'custom', 'percentage')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shared_transactions_list_id ON shared_transactions(list_id);
CREATE INDEX idx_shared_transactions_creator_id ON shared_transactions(creator_id);

-- 5. Transaction Splits
CREATE TABLE IF NOT EXISTS shared_transaction_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES shared_transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  percentage NUMERIC(5,2),
  UNIQUE(transaction_id, user_id)
);

CREATE INDEX idx_shared_transaction_splits_tx_id ON shared_transaction_splits(transaction_id);
CREATE INDEX idx_shared_transaction_splits_user_id ON shared_transaction_splits(user_id);

-- 6. Activity Logs
CREATE TABLE IF NOT EXISTS shared_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES shared_lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shared_activity_logs_list_id ON shared_activity_logs(list_id);
CREATE INDEX idx_shared_activity_logs_created_at ON shared_activity_logs(created_at DESC);

-- Row Level Security
ALTER TABLE shared_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_transaction_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_activity_logs ENABLE ROW LEVEL SECURITY;

-- Shared Lists: owner and members can view
CREATE POLICY "shared_lists_select" ON shared_lists
  FOR SELECT USING (
    owner_id = auth.uid() OR
    id IN (SELECT list_id FROM shared_list_members WHERE user_id = auth.uid())
  );

CREATE POLICY "shared_lists_insert" ON shared_lists
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "shared_lists_update" ON shared_lists
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "shared_lists_delete" ON shared_lists
  FOR DELETE USING (owner_id = auth.uid());

-- Members: members can view, owner can manage
CREATE POLICY "shared_list_members_select" ON shared_list_members
  FOR SELECT USING (
    list_id IN (SELECT list_id FROM shared_list_members WHERE user_id = auth.uid())
  );

CREATE POLICY "shared_list_members_insert" ON shared_list_members
  FOR INSERT WITH CHECK (
    list_id IN (SELECT id FROM shared_lists WHERE owner_id = auth.uid())
  );

CREATE POLICY "shared_list_members_delete" ON shared_list_members
  FOR DELETE USING (
    list_id IN (SELECT id FROM shared_lists WHERE owner_id = auth.uid())
  );

-- Invitations: can view own invitations, owner can manage
CREATE POLICY "shared_invitations_select" ON shared_invitations
  FOR SELECT USING (
    invited_email IN (SELECT email FROM auth.users WHERE id = auth.uid()) OR
    invited_by = auth.uid() OR
    list_id IN (SELECT id FROM shared_lists WHERE owner_id = auth.uid())
  );

CREATE POLICY "shared_invitations_insert" ON shared_invitations
  FOR INSERT WITH CHECK (
    invited_by = auth.uid() AND
    list_id IN (SELECT id FROM shared_lists WHERE owner_id = auth.uid())
  );

CREATE POLICY "shared_invitations_update" ON shared_invitations
  FOR UPDATE USING (
    invited_email IN (SELECT email FROM auth.users WHERE id = auth.uid())
  ) WITH CHECK (
    invited_email IN (SELECT email FROM auth.users WHERE id = auth.uid())
    AND status IN ('accepted', 'declined')
  );

-- Shared Transactions: members can CRUD
CREATE POLICY "shared_transactions_select" ON shared_transactions
  FOR SELECT USING (
    list_id IN (SELECT list_id FROM shared_list_members WHERE user_id = auth.uid())
  );

CREATE POLICY "shared_transactions_insert" ON shared_transactions
  FOR INSERT WITH CHECK (
    creator_id = auth.uid() AND
    list_id IN (SELECT list_id FROM shared_list_members WHERE user_id = auth.uid())
  );

CREATE POLICY "shared_transactions_update" ON shared_transactions
  FOR UPDATE USING (
    creator_id = auth.uid() OR
    list_id IN (SELECT id FROM shared_lists WHERE owner_id = auth.uid())
  );

CREATE POLICY "shared_transactions_delete" ON shared_transactions
  FOR DELETE USING (
    creator_id = auth.uid() OR
    list_id IN (SELECT id FROM shared_lists WHERE owner_id = auth.uid())
  );

-- Splits: members can view, inserted via transaction triggers
CREATE POLICY "shared_transaction_splits_select" ON shared_transaction_splits
  FOR SELECT USING (
    transaction_id IN (
      SELECT id FROM shared_transactions WHERE list_id IN (
        SELECT list_id FROM shared_list_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "shared_transaction_splits_insert" ON shared_transaction_splits
  FOR INSERT WITH CHECK (
    transaction_id IN (
      SELECT id FROM shared_transactions WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "shared_transaction_splits_delete" ON shared_transaction_splits
  FOR DELETE USING (
    transaction_id IN (
      SELECT id FROM shared_transactions WHERE creator_id = auth.uid()
    )
  );

-- Activity Logs: members can view
CREATE POLICY "shared_activity_logs_select" ON shared_activity_logs
  FOR SELECT USING (
    list_id IN (SELECT list_id FROM shared_list_members WHERE user_id = auth.uid())
  );

CREATE POLICY "shared_activity_logs_insert" ON shared_activity_logs
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    list_id IN (SELECT list_id FROM shared_list_members WHERE user_id = auth.uid())
  );

-- Function to auto-accept invitation when user joins
CREATE OR REPLACE FUNCTION accept_invitation_on_join()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE shared_invitations
  SET status = 'accepted', responded_at = now()
  WHERE list_id = NEW.list_id
    AND invited_email = (SELECT email FROM auth.users WHERE id = NEW.user_id)
    AND status = 'pending';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_accept_invitation_on_join ON shared_list_members;
CREATE TRIGGER trg_accept_invitation_on_join
  AFTER INSERT ON shared_list_members
  FOR EACH ROW
  EXECUTE FUNCTION accept_invitation_on_join();
