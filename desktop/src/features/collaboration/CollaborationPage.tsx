import { useState, useEffect } from "react";
import { Inbox, X, Check } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { SharedList, CreateSharedTransactionData } from "../../types/collaboration";
import { useCollaboration } from "./hooks/useCollaboration";
import * as CollabService from "./services/collaborationService";
import { SharedListsOverview } from "./components/SharedListsOverview";
import { CreateSharedListDialog } from "./components/CreateSharedListDialog";
import { SharedListDetailView } from "./components/SharedListDetailView";

const CollaborationPage = () => {
  const {
    lists, invitations, loading,
    createList, deleteList, updateList, inviteUser,
    acceptInvite, declineInvite,
    removeMember, transferOwnership,
    transactions, txLoading,
    addTransaction, updateTransactionWithSplits, deleteTransaction,
    balances, settlements, activityLogs, members,
    loadAll,
  } = useCollaboration();

  const [selectedList, setSelectedList] = useState<SharedList | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInvitations, setShowInvitations] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string>("");
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  // Handle accept-invitation from email link (e.g., /collaboration?accept=TOKEN)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("accept");
    if (!token) return;

    (async () => {
      try {
        await CollabService.acceptInvitationByToken(token);
        window.history.replaceState({}, "", window.location.pathname);
        window.location.reload();
      } catch (err) {
        console.error("Failed to accept invitation:", err);
        alert("Could not accept invitation. It may have expired or been cancelled.");
      }
    })();
  }, []);

  const handleSelectList = async (list: SharedList) => {
    setSelectedList(list);
    await loadAll(list.id);
  };

  const handleBack = () => {
    setSelectedList(null);
  };

  const handleCreateList = async (name: string, description: string, currency: string) => {
    await createList(name, description, currency);
    setShowCreateModal(false);
  };

  const handleAddTransaction = async (data: CreateSharedTransactionData) => {
    await addTransaction(data);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (selectedList) {
      await deleteTransaction(id, selectedList.id);
    }
  };

  const handleRefresh = async () => {
    if (selectedList) {
      await loadAll(selectedList.id);
    }
  };

  const pendingInvitations = invitations.filter((i) => i.status === "pending");

  if (selectedList) {
    return (
      <div>
        <SharedListDetailView
          list={selectedList}
          currentUserId={currentUserId}
          members={members}
          transactions={transactions}
          txLoading={txLoading}
          balances={balances}
          settlements={settlements}
          activityLogs={activityLogs}
          onBack={handleBack}
          onInvite={(email) => inviteUser(selectedList.id, email)}
          onRemoveMember={(userId) => removeMember(selectedList.id, userId)}
          onTransferOwnership={(userId) => transferOwnership(selectedList.id, userId)}
          onAddTransaction={handleAddTransaction}
          onUpdateTransaction={(id, data) => updateTransactionWithSplits(id, data)}
          onDeleteTransaction={handleDeleteTransaction}
          onRefresh={handleRefresh}
          onUpdateList={updateList}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Invitations Banner */}
      {pendingInvitations.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div
            className="px-6 py-3 flex items-center justify-between cursor-pointer"
            onClick={() => setShowInvitations(!showInvitations)}
          >
            <div className="flex items-center gap-2">
              <Inbox size={16} className="text-primary" />
              <span className="text-sm font-semibold text-slate-700">
                {pendingInvitations.length} pending invitation{pendingInvitations.length !== 1 ? "s" : ""}
              </span>
            </div>
            <span className="text-xs text-slate-400">{showInvitations ? "Hide" : "Show"}</span>
          </div>
          {showInvitations && (
            <div className="divide-y divide-slate-50 border-t border-slate-100">
              {pendingInvitations.map((inv) => (
                <div key={inv.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-700">
                      Invited to <span className="font-semibold">{inv.list_name}</span>
                    </p>
                    <p className="text-xs text-slate-400">by {inv.invited_by_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => acceptInvite(inv.id)}
                      className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 transition-all"
                      title="Accept"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => declineInvite(inv.id)}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-50 transition-all"
                      title="Decline"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <SharedListsOverview
        lists={lists}
        loading={loading}
        onCreateClick={() => setShowCreateModal(true)}
        onSelectList={handleSelectList}
        onDeleteList={deleteList}
      />

      {/* Create List Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-6"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <CreateSharedListDialog
                onClose={() => setShowCreateModal(false)}
                onCreate={handleCreateList}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborationPage;
