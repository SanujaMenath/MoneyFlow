import { useState } from "react";
import { ArrowLeft, Plus, RefreshCw, Edit3, Check, X } from "lucide-react";
import type {
  SharedList, SharedListMember, SharedTransaction,
  BalanceSummary, SettlementSuggestion, ActivityLog,
  CreateSharedTransactionData,
} from "../../../types/collaboration";
import { MemberManagement } from "./MemberManagement";
import { SharedTransactionsTable } from "./SharedTransactionsTable";
import { AddSharedTransactionForm } from "./AddSharedTransactionForm";
import { BalanceSummaryComponent } from "./BalanceSummary";
import { ActivityHistoryComponent } from "./ActivityHistory";
import { SettlementSuggestionsComponent } from "./SettlementSuggestions";

type DetailTab = "transactions" | "balances" | "activity" | "members";

interface SharedListDetailViewProps {
  list: SharedList;
  currentUserId: string;
  members: SharedListMember[];
  transactions: SharedTransaction[];
  txLoading: boolean;
  balances: BalanceSummary[];
  settlements: SettlementSuggestion[];
  activityLogs: ActivityLog[];
  onBack: () => void;
  onInvite: (email: string) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
  onTransferOwnership: (userId: string) => Promise<void>;
  onAddTransaction: (data: CreateSharedTransactionData) => Promise<void>;
  onUpdateTransaction?: (id: string, data: CreateSharedTransactionData) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onUpdateList?: (id: string, updates: Partial<SharedList>) => Promise<void>;
}

export const SharedListDetailView = ({
  list, currentUserId,   members, transactions, txLoading,
  balances, settlements, activityLogs,
  onBack, onInvite, onRemoveMember, onTransferOwnership,
  onAddTransaction, onUpdateTransaction, onDeleteTransaction, onRefresh, onUpdateList,
}: SharedListDetailViewProps) => {
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>("transactions");
  const [showAddTx, setShowAddTx] = useState(false);
  const [editTx, setEditTx] = useState<SharedTransaction | null>(null);
  const [editingList, setEditingList] = useState(false);
  const [editName, setEditName] = useState(list.name);
  const [editDesc, setEditDesc] = useState(list.description || "");

  const isOwner = members.find((m) => m.user_id === currentUserId)?.role === "owner";

  const tabs: { key: DetailTab; label: string }[] = [
    { key: "transactions", label: "Transactions" },
    { key: "balances", label: "Balances" },
    { key: "activity", label: "Activity" },
    { key: "members", label: "Members" },
  ];

  const handleEditTx = (tx: SharedTransaction) => {
    setEditTx(tx);
    setShowAddTx(true);
  };

  const handleSaveTx = async (data: CreateSharedTransactionData) => {
    await onAddTransaction(data);
    setShowAddTx(false);
    setEditTx(null);
  };

  const handleDeleteAndRefresh = async (id: string) => {
    await onDeleteTransaction(id);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            title="Back"
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          {editingList ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="p-1.5 border border-border rounded-lg text-sm font-semibold flex-1 min-w-0"
                placeholder="List name"
              />
              <input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="p-1.5 border border-border rounded-lg text-xs flex-1 min-w-0"
                placeholder="Description (optional)"
              />
              <button
                onClick={async () => {
                  if (onUpdateList && editName.trim()) {
                    await onUpdateList(list.id, { name: editName.trim(), description: editDesc.trim() || null } as Partial<SharedList>);
                  }
                  setEditingList(false);
                }}
                className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 transition-all"
                title="Save"
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => { setEditingList(false); setEditName(list.name); setEditDesc(list.description || ""); }}
                className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-50 transition-all"
                title="Cancel"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-800 text-base tracking-tight truncate">{list.name}</h3>
                {list.description && (
                  <p className="text-slate-400 text-xs mt-0.5 truncate">{list.description}</p>
                )}
              </div>
              {isOwner && (
                <button
                  onClick={() => { setEditName(list.name); setEditDesc(list.description || ""); setEditingList(true); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all shrink-0"
                  title="Edit list"
                >
                  <Edit3 size={14} />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          {!showAddTx && (
            <button
              onClick={() => setShowAddTx(true)}
              className="bg-navy text-white px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 hover:bg-navy/90"
            >
              <Plus size={15} />
              Add Expense
            </button>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveDetailTab(tab.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeDetailTab === tab.key
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {showAddTx ? (
        <AddSharedTransactionForm
          members={members}
          listId={list.id}
          editTx={editTx}
          onClose={() => { setShowAddTx(false); setEditTx(null); }}
          onSave={handleSaveTx}
          onUpdate={onUpdateTransaction}
        />
      ) : (
        <>
          {activeDetailTab === "transactions" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100">
                <h4 className="font-semibold text-slate-800 text-sm">Transactions</h4>
              </div>
              <SharedTransactionsTable
                transactions={transactions}
                currentUserId={currentUserId}
                isOwner={isOwner}
                onEdit={handleEditTx}
                onDelete={handleDeleteAndRefresh}
                loading={txLoading}
              />
            </div>
          )}

          {activeDetailTab === "balances" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BalanceSummaryComponent balances={balances} />
              <SettlementSuggestionsComponent settlements={settlements} />
            </div>
          )}

          {activeDetailTab === "activity" && (
            <ActivityHistoryComponent logs={activityLogs} />
          )}

          {activeDetailTab === "members" && (
            <MemberManagement
              members={members}
              currentUserId={currentUserId}
              isOwner={isOwner}
              listId={list.id}
              onInvite={onInvite}
              onRemove={onRemoveMember}
              onTransferOwnership={onTransferOwnership}
            />
          )}
        </>
      )}
    </div>
  );
};
