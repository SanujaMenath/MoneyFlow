import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import type {
  SharedList, Invitation, SharedTransaction,
  BalanceSummary, SettlementSuggestion, ActivityLog, SharedListMember,
} from "../../../types/collaboration";
import * as CollabService from "../services/collaborationService";

export const useCollaboration = () => {
  const [lists, setLists] = useState<SharedList[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshLists = useCallback(async () => {
    try {
      const data = await CollabService.getSharedLists();
      setLists(data);
    } catch {
    }
  }, []);

  const refreshInvitations = useCallback(async () => {
    try {
      const data = await CollabService.getInvitations();
      setInvitations(data);
    } catch {
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([refreshLists(), refreshInvitations()]);
      setLoading(false);
    };
    init();

    const channel = supabase
      .channel("collaboration-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_lists" }, refreshLists)
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_list_members" }, refreshLists)
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_invitations" }, refreshInvitations)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refreshLists, refreshInvitations]);

  const createList = useCallback(async (name: string, description: string, currency: string) => {
    await CollabService.createSharedList({ name, description, currency });
    await refreshLists();
  }, [refreshLists]);

  const deleteList = useCallback(async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this shared list? This cannot be undone.")) return;
    await CollabService.deleteSharedList(id);
    await refreshLists();
  }, [refreshLists]);

  const inviteUser = useCallback(async (listId: string, email: string) => {
    await CollabService.inviteUser(listId, email);
    await refreshInvitations();
  }, [refreshInvitations]);

  const acceptInvite = useCallback(async (invitationId: string) => {
    await CollabService.acceptInvitation(invitationId);
    await Promise.all([refreshInvitations(), refreshLists()]);
  }, [refreshInvitations, refreshLists]);

  const declineInvite = useCallback(async (invitationId: string) => {
    await CollabService.declineInvitation(invitationId);
    await refreshInvitations();
  }, [refreshInvitations]);

  const removeMember = useCallback(async (listId: string, userId: string) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return;
    await CollabService.removeMember(listId, userId);
  }, []);

  const transferOwnership = useCallback(async (listId: string, newOwnerId: string) => {
    if (!window.confirm("Are you sure you want to transfer ownership? This cannot be undone.")) return;
    await CollabService.transferOwnership(listId, newOwnerId);
    await refreshLists();
  }, [refreshLists]);

  const [transactions, setTransactions] = useState<SharedTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  const loadTransactions = useCallback(async (listId: string) => {
    setTxLoading(true);
    try {
      const data = await CollabService.getSharedTransactions(listId);
      setTransactions(data);
    } catch {
    } finally {
      setTxLoading(false);
    }
  }, []);

  const addTransaction = useCallback(async (data: Parameters<typeof CollabService.createSharedTransaction>[0]) => {
    await CollabService.createSharedTransaction(data);
    await loadTransactions(data.list_id);
  }, [loadTransactions]);

  const editTransaction = useCallback(async (id: string, updates: Partial<SharedTransaction>, listId: string) => {
    await CollabService.updateSharedTransaction(id, updates);
    await loadTransactions(listId);
  }, [loadTransactions]);

  const deleteTransaction = useCallback(async (id: string, listId: string) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;
    await CollabService.deleteSharedTransaction(id);
    await loadTransactions(listId);
  }, [loadTransactions]);

  const [balances, setBalances] = useState<BalanceSummary[]>([]);
  const [settlements, setSettlements] = useState<SettlementSuggestion[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [members, setMembers] = useState<SharedListMember[]>([]);

  const loadBalances = useCallback(async (listId: string) => {
    const data = await CollabService.getBalanceSummary(listId);
    setBalances(data);
  }, []);

  const loadSettlements = useCallback(async (listId: string) => {
    const data = await CollabService.getSettlementSuggestions(listId);
    setSettlements(data);
  }, []);

  const loadActivity = useCallback(async (listId: string) => {
    const data = await CollabService.getActivityLogs(listId);
    setActivityLogs(data);
  }, []);

  const loadMembers = useCallback(async (listId: string) => {
    const data = await CollabService.getSharedListMembers(listId);
    setMembers(data);
  }, []);

  const loadAll = useCallback(async (listId: string) => {
    await Promise.all([
      loadTransactions(listId),
      loadBalances(listId),
      loadSettlements(listId),
      loadActivity(listId),
      loadMembers(listId),
    ]);
  }, [loadTransactions, loadBalances, loadSettlements, loadActivity, loadMembers]);

  return {
    lists, invitations, loading,
    createList, deleteList, inviteUser,
    acceptInvite, declineInvite,
    removeMember, transferOwnership,
    refreshLists, refreshInvitations,
    transactions, txLoading, loadTransactions,
    addTransaction, editTransaction, deleteTransaction,
    balances, settlements, activityLogs, members,
    loadBalances, loadSettlements, loadActivity, loadMembers, loadAll,
  };
};
