export type SplitMethod = "equal" | "custom" | "percentage";

export interface SharedList {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface SharedListMember {
  id: string;
  list_id: string;
  user_id: string;
  email: string;
  display_name: string;
  role: "owner" | "member";
  joined_at: string;
}

export interface Invitation {
  id: string;
  list_id: string;
  list_name: string;
  invited_email: string;
  invited_by: string;
  invited_by_name: string;
  token: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  responded_at: string | null;
}

export interface SharedTransaction {
  id: string;
  list_id: string;
  creator_id: string;
  creator_name: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  notes: string | null;
  split_method: SplitMethod;
  created_at: string;
  updated_at: string;
}

export interface TransactionSplit {
  id: string;
  transaction_id: string;
  user_id: string;
  user_name: string;
  amount: number;
  percentage: number | null;
}

export interface ActivityLog {
  id: string;
  list_id: string;
  user_id: string;
  user_name: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface SettlementSuggestion {
  from_user_id: string;
  from_user_name: string;
  to_user_id: string;
  to_user_name: string;
  amount: number;
}

export interface BalanceSummary {
  member_id: string;
  member_name: string;
  paid: number;
  owes: number;
  net: number;
}

export interface CreateSharedListData {
  name: string;
  description?: string;
  currency: string;
}

export interface CreateSharedTransactionData {
  list_id: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  notes?: string;
  split_method: SplitMethod;
  splits: { user_id: string; amount?: number; percentage?: number }[];
}
