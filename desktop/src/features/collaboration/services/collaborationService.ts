import { supabase } from "../../../lib/supabase";
import type {
  SharedList, SharedListMember, Invitation, SharedTransaction,
  TransactionSplit, ActivityLog, CreateSharedListData,
  CreateSharedTransactionData, BalanceSummary, SettlementSuggestion,
} from "../../../types/collaboration";

// ─── Auth helper ──────────────────────────────────────────────
async function requireUser(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required.");
  return user.id;
}

const profileCache = new Map<string, string>();

async function getDisplayNames(userIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const uncached = userIds.filter((id) => !profileCache.has(id));
  if (uncached.length > 0) {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", uncached);
      (data || []).forEach((p: any) => {
        profileCache.set(p.id, p.display_name || p.email || p.id.substring(0, 8));
      });
    } catch (e) {
      console.warn("Failed to fetch profile data:", e);
    }
  }
  for (const id of userIds) {
    map.set(id, profileCache.get(id) || id.substring(0, 8));
  }
  return map;
}

// ─── Shared Lists ─────────────────────────────────────────────
export const getSharedLists = async (): Promise<SharedList[]> => {
  await requireUser();
  // RLS already filters to lists where user is owner or member
  const { data, error } = await supabase
    .from("shared_lists")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createSharedList = async (data: CreateSharedListData): Promise<SharedList> => {
  const userId = await requireUser();

  const { data: list, error } = await supabase
    .from("shared_lists")
    .insert([{ name: data.name, description: data.description || null, currency: data.currency, owner_id: userId }])
    .select()
    .single();

  if (error) {
    console.error("createSharedList error:", error);
    throw error;
  }

  // Manually add owner as a member (avoids trigger RLS issues)
  const { error: memberError } = await supabase
    .from("shared_list_members")
    .insert([{ list_id: list.id, user_id: userId, role: "owner" }]);

  if (memberError) {
    console.error("Failed to add owner as member:", memberError);
    // Clean up the list if member insert fails
    await supabase.from("shared_lists").delete().eq("id", list.id);
    throw memberError;
  }

  await logActivity(list.id, userId, "list_created", { name: data.name });
  return list;
};

export const updateSharedList = async (id: string, updates: Partial<SharedList>): Promise<void> => {
  await requireUser();
  const { error } = await supabase
    .from("shared_lists")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
};

export const deleteSharedList = async (id: string): Promise<void> => {
  const userId = await requireUser();
  const { error } = await supabase
    .from("shared_lists")
    .delete()
    .eq("id", id)
    .eq("owner_id", userId);

  if (error) throw error;
};

// ─── Members ──────────────────────────────────────────────────
export const getSharedListMembers = async (listId: string): Promise<SharedListMember[]> => {
  await requireUser();
  const { data, error } = await supabase
    .from("shared_list_members")
    .select("*")
    .eq("list_id", listId);

  if (error) throw error;

  const rows = data || [];
  const userIds = rows.map((r: any) => r.user_id);
  const nameMap = await getDisplayNames(userIds);

  return rows.map((r: any) => ({
    id: r.id,
    list_id: r.list_id,
    user_id: r.user_id,
    email: nameMap.get(r.user_id) || "",
    display_name: nameMap.get(r.user_id) || "Unknown",
    role: r.role,
    joined_at: r.joined_at,
  }));
};

export const removeMember = async (listId: string, userId: string): Promise<void> => {
  const currentUserId = await requireUser();
  const { data: list } = await supabase
    .from("shared_lists")
    .select("owner_id")
    .eq("id", listId)
    .single();

  if (!list || list.owner_id !== currentUserId) {
    throw new Error("Only the list owner can remove members.");
  }

  const { error } = await supabase
    .from("shared_list_members")
    .delete()
    .eq("list_id", listId)
    .eq("user_id", userId)
    .neq("user_id", currentUserId);

  if (error) throw error;
  await logActivity(listId, currentUserId, "member_removed", { removed_user_id: userId });
};

export const transferOwnership = async (listId: string, newOwnerId: string): Promise<void> => {
  const currentUserId = await requireUser();
  const { data: list } = await supabase
    .from("shared_lists")
    .select("owner_id")
    .eq("id", listId)
    .single();

  if (!list || list.owner_id !== currentUserId) {
    throw new Error("Only the list owner can transfer ownership.");
  }

  await supabase.from("shared_list_members")
    .update({ role: "member" })
    .eq("list_id", listId)
    .eq("user_id", currentUserId);

  await supabase.from("shared_list_members")
    .update({ role: "owner" })
    .eq("list_id", listId)
    .eq("user_id", newOwnerId);

  await supabase.from("shared_lists")
    .update({ owner_id: newOwnerId, updated_at: new Date().toISOString() })
    .eq("id", listId);

  await logActivity(listId, currentUserId, "ownership_transferred", { new_owner_id: newOwnerId });
};

// ─── Invitations ──────────────────────────────────────────────
export const inviteUser = async (listId: string, email: string): Promise<void> => {
  const userId = await requireUser();
  const token = crypto.randomUUID();

  // Check for existing pending invitation for this list+email
  const { data: existing } = await supabase
    .from("shared_invitations")
    .select("id")
    .eq("list_id", listId)
    .eq("invited_email", email)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    // Refresh the token and timestamp instead of failing
    const { error } = await supabase
      .from("shared_invitations")
      .update({ token, created_at: new Date().toISOString(), responded_at: null })
      .eq("id", existing.id);

    if (error) throw error;
  } else {
    const { error } = await supabase.from("shared_invitations").insert([{
      list_id: listId,
      invited_email: email,
      invited_by: userId,
      token,
    }]);

    if (error) throw error;
  }

  await logActivity(listId, userId, "invitation_sent", { email });
};

export const getInvitations = async (): Promise<Invitation[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const [emailRes, invitedRes] = await Promise.all([
    supabase.from("shared_invitations").select("*").eq("invited_email", user.email),
    supabase.from("shared_invitations").select("*").eq("invited_by", user.id),
  ]);

  const data = [...(emailRes.data || []), ...(invitedRes.data || [])];
  data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const rows = data || [];
  const listIds = [...new Set(rows.map((r: any) => r.list_id))];
  const inviterIds = [...new Set(rows.map((r: any) => r.invited_by))];

  const [listsRes] = await Promise.all([
    supabase.from("shared_lists").select("id, name").in("id", listIds),
  ]);

  const listNameMap = new Map((listsRes.data || []).map((l: any) => [l.id, l.name]));
  const nameMap = await getDisplayNames(inviterIds);

  return rows.map((r: any) => ({
    id: r.id,
    list_id: r.list_id,
    list_name: listNameMap.get(r.list_id) || "Unknown List",
    invited_email: r.invited_email,
    invited_by: r.invited_by,
    invited_by_name: nameMap.get(r.invited_by) || "Unknown",
    token: r.token,
    status: r.status,
    created_at: r.created_at,
    responded_at: r.responded_at,
  }));
};

export const getListInvitations = async (listId: string): Promise<Invitation[]> => {
  await requireUser();
  const { data, error } = await supabase
    .from("shared_invitations")
    .select("*")
    .eq("list_id", listId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    list_id: r.list_id,
    list_name: "",
    invited_email: r.invited_email,
    invited_by: r.invited_by,
    invited_by_name: "",
    token: r.token,
    status: r.status,
    created_at: r.created_at,
    responded_at: r.responded_at,
  }));
};

export const acceptInvitation = async (invitationId: string): Promise<void> => {
  const userId = await requireUser();

  const { data: inv, error: fetchError } = await supabase
    .from("shared_invitations")
    .select("list_id, invited_email")
    .eq("id", invitationId)
    .single();

  if (fetchError || !inv) throw new Error("Invitation not found.");

  const { data: { user } } = await supabase.auth.getUser();
  if (user?.email?.toLowerCase() !== inv.invited_email.toLowerCase()) throw new Error("This invitation is not for you.");

  const { error: memberError } = await supabase
    .from("shared_list_members")
    .insert([{ list_id: inv.list_id, user_id: userId, role: "member" }]);

  if (memberError) throw memberError;

  await logActivity(inv.list_id, userId, "member_joined", {});
};

export const declineInvitation = async (invitationId: string): Promise<void> => {
  const { error } = await supabase
    .from("shared_invitations")
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("id", invitationId);

  if (error) throw error;
};

// ─── Shared Transactions ──────────────────────────────────────
export const getSharedTransactions = async (listId: string): Promise<SharedTransaction[]> => {
  await requireUser();
  const { data, error } = await supabase
    .from("shared_transactions")
    .select("*")
    .eq("list_id", listId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = data || [];
  const creatorIds = [...new Set(rows.map((r: any) => r.creator_id))];
  const nameMap = await getDisplayNames(creatorIds);

  return rows.map((r: any) => ({
    id: r.id,
    list_id: r.list_id,
    creator_id: r.creator_id,
    creator_name: nameMap.get(r.creator_id) || "Unknown",
    amount: r.amount,
    type: r.type,
    category: r.category,
    date: r.date,
    notes: r.notes,
    split_method: r.split_method,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
};

export const createSharedTransaction = async (data: CreateSharedTransactionData): Promise<SharedTransaction> => {
  const userId = await requireUser();

  const { data: tx, error: txError } = await supabase
    .from("shared_transactions")
    .insert([{
      list_id: data.list_id,
      creator_id: userId,
      amount: data.amount,
      type: data.type,
      category: data.category,
      date: data.date,
      notes: data.notes || null,
      split_method: data.split_method,
    }])
    .select()
    .single();

  if (txError) throw txError;

  const splitAmounts = computeSplits(data.amount, data.split_method, data.splits);
  const splits = splitAmounts.map((s) => ({
    transaction_id: tx.id,
    user_id: s.user_id,
    amount: s.amount,
    percentage: s.percentage || null,
  }));

  const { error: splitError } = await supabase
    .from("shared_transaction_splits")
    .insert(splits);

  if (splitError) throw splitError;

  await logActivity(data.list_id, userId, "expense_added", {
    amount: data.amount,
    category: data.category,
    transaction_id: tx.id,
  });

  return {
    ...tx,
    creator_name: "",
    notes: tx.notes || null,
  };
};

export const updateSharedTransaction = async (id: string, updates: Partial<SharedTransaction>): Promise<void> => {
  const userId = await requireUser();
  const { error } = await supabase
    .from("shared_transactions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;

  const { data: tx } = await supabase.from("shared_transactions").select("list_id").eq("id", id).single();
  if (tx) await logActivity(tx.list_id, userId, "expense_edited", { transaction_id: id });
};

export const deleteSharedTransaction = async (id: string): Promise<void> => {
  const userId = await requireUser();
  const { data: tx } = await supabase.from("shared_transactions").select("list_id, amount, category").eq("id", id).single();
  if (!tx) throw new Error("Transaction not found.");

  const { error } = await supabase
    .from("shared_transactions")
    .delete()
    .eq("id", id);

  if (error) throw error;
  await logActivity(tx.list_id, userId, "expense_deleted", { amount: tx.amount, category: tx.category });
};

// ─── Transaction Splits ───────────────────────────────────────
export const getTransactionSplits = async (transactionId: string): Promise<TransactionSplit[]> => {
  await requireUser();
  const { data, error } = await supabase
    .from("shared_transaction_splits")
    .select("*")
    .eq("transaction_id", transactionId);

  if (error) throw error;

  const rows = data || [];
  const userIds = rows.map((r: any) => r.user_id);
  const nameMap = await getDisplayNames(userIds);

  return rows.map((r: any) => ({
    id: r.id,
    transaction_id: r.transaction_id,
    user_id: r.user_id,
    user_name: nameMap.get(r.user_id) || "Unknown",
    amount: r.amount,
    percentage: r.percentage,
  }));
};

// ─── Balances ─────────────────────────────────────────────────
export const getBalanceSummary = async (listId: string): Promise<BalanceSummary[]> => {
  const members = await getSharedListMembers(listId);
  const transactions = await getSharedTransactions(listId);

  const memberMap = new Map(members.map((m) => [m.user_id, m.display_name]));
  const splits: Record<string, { user_id: string; amount: number }[]> = {};

  for (const tx of transactions) {
    const { data } = await supabase
      .from("shared_transaction_splits")
      .select("user_id, amount")
      .eq("transaction_id", tx.id);

    if (data) splits[tx.id] = data;
  }

  const paid: Record<string, number> = {};
  const owes: Record<string, number> = {};

  for (const m of members) {
    paid[m.user_id] = 0;
    owes[m.user_id] = 0;
  }

  for (const tx of transactions) {
    paid[tx.creator_id] = (paid[tx.creator_id] || 0) + tx.amount;
    const txSplits = splits[tx.id] || [];
    for (const s of txSplits) {
      owes[s.user_id] = (owes[s.user_id] || 0) + s.amount;
    }
  }

  return members.map((m) => ({
    member_id: m.user_id,
    member_name: memberMap.get(m.user_id) || "Unknown",
    paid: paid[m.user_id] || 0,
    owes: owes[m.user_id] || 0,
    net: (paid[m.user_id] || 0) - (owes[m.user_id] || 0),
  }));
};

export const getSettlementSuggestions = async (listId: string): Promise<SettlementSuggestion[]> => {
  const balances = await getBalanceSummary(listId);
  const debts = balances.filter((b) => b.net < 0).map((b) => ({ ...b, net: Math.abs(b.net) }));
  const credits = balances.filter((b) => b.net > 0).map((b) => ({ ...b, net: b.net }));

  const suggestions: SettlementSuggestion[] = [];

  let i = 0, j = 0;
  while (i < debts.length && j < credits.length) {
    const amount = Math.min(debts[i].net, credits[j].net);
    if (amount > 0) {
      suggestions.push({
        from_user_id: debts[i].member_id,
        from_user_name: debts[i].member_name,
        to_user_id: credits[j].member_id,
        to_user_name: credits[j].member_name,
        amount,
      });
    }
    debts[i].net -= amount;
    credits[j].net -= amount;
    if (debts[i].net === 0) i++;
    if (credits[j].net === 0) j++;
  }

  return suggestions;
};

// ─── Activity Log ─────────────────────────────────────────────
export const logActivity = async (listId: string, userId: string, action: string, details?: Record<string, unknown>): Promise<void> => {
  await supabase.from("shared_activity_logs").insert([{
    list_id: listId,
    user_id: userId,
    action,
    details: details || null,
  }]);
};

export const getActivityLogs = async (listId: string): Promise<ActivityLog[]> => {
  await requireUser();
  const { data, error } = await supabase
    .from("shared_activity_logs")
    .select("*")
    .eq("list_id", listId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  const rows = data || [];
  const userIds = [...new Set(rows.map((r: any) => r.user_id))];
  const nameMap = await getDisplayNames(userIds);

  return rows.map((r: any) => ({
    id: r.id,
    list_id: r.list_id,
    user_id: r.user_id,
    user_name: nameMap.get(r.user_id) || "Unknown",
    action: r.action,
    details: r.details,
    created_at: r.created_at,
  }));
};

// ─── Helpers ──────────────────────────────────────────────────
function computeSplits(
  totalAmount: number,
  method: "equal" | "custom" | "percentage",
  splits: { user_id: string; amount?: number; percentage?: number }[]
): { user_id: string; amount: number; percentage: number | null }[] {
  if (method === "equal") {
    const perPerson = Math.floor(totalAmount / splits.length);
    const remainder = totalAmount - perPerson * splits.length;
    return splits.map((s, i) => ({
      user_id: s.user_id,
      amount: perPerson + (i === 0 ? remainder : 0),
      percentage: null,
    }));
  }

  if (method === "percentage") {
    return splits.map((s) => ({
      user_id: s.user_id,
      amount: Math.round(totalAmount * ((s.percentage || 0) / 100)),
      percentage: s.percentage || null,
    }));
  }

  return splits.map((s) => ({
    user_id: s.user_id,
    amount: s.amount || 0,
    percentage: null,
  }));
}


