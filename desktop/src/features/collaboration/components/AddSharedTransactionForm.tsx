import { useState, useMemo, useEffect } from "react";
import { X } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import type { SharedListMember, SharedTransaction, SplitMethod, CreateSharedTransactionData } from "../../../types/collaboration";
import { SHARED_EXPENSE_CATEGORIES, SHARED_INCOME_CATEGORIES } from "../../../types/collaboration";

interface AddSharedTransactionFormProps {
  members: SharedListMember[];
  listId: string;
  editTx?: SharedTransaction | null;
  onClose: () => void;
  onSave: (data: CreateSharedTransactionData) => Promise<void>;
  onUpdate?: (id: string, data: CreateSharedTransactionData) => Promise<void>;
}

export const AddSharedTransactionForm = ({ members, listId, editTx, onClose, onSave, onUpdate }: AddSharedTransactionFormProps) => {
  const today = new Date().toISOString().split("T")[0];
  const [amount, setAmount] = useState(editTx ? String(editTx.amount / 100) : "");
  const [type, setType] = useState<"income" | "expense">(editTx?.type || "expense");
  const [category, setCategory] = useState(editTx?.category || "");
  const [date, setDate] = useState(editTx?.date || today);
  const [notes, setNotes] = useState(editTx?.notes || "");
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(editTx?.split_method || "equal");
  const [saving, setSaving] = useState(false);

  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [percentageSplits, setPercentageSplits] = useState<Record<string, string>>({});

  const activeMembers = members.filter((m) => m.role === "owner" || m.role === "member");
  const [excludedMembers, setExcludedMembers] = useState<string[]>([]);

  useEffect(() => {
    if (!editTx) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCustomSplits({});
      setPercentageSplits({});
      setExcludedMembers([]);
      return;
    }
    supabase
      .from("shared_transaction_splits")
      .select("user_id, amount, percentage")
      .eq("transaction_id", editTx.id)
      .then(({ data }) => {
        if (data) {
          const custom: Record<string, string> = {};
          const pct: Record<string, string> = {};
          const excluded: string[] = [];
          for (const s of data) {
            custom[s.user_id] = String((s.amount as number) / 100);
            if (s.percentage !== null) pct[s.user_id] = String(s.percentage);
          }
          const splitUserIds = new Set(data.map((s: { user_id: string }) => s.user_id));
          for (const m of activeMembers) {
            if (!splitUserIds.has(m.user_id)) excluded.push(m.user_id);
          }
          setCustomSplits(custom);
          setPercentageSplits(pct);
          setExcludedMembers(excluded);
        }
      });
  }, [editTx?.id]);

  const splitMembers = activeMembers.filter((m) => !excludedMembers.includes(m.user_id));

  const availableCategories = useMemo(() => {
    return type === "income" ? SHARED_INCOME_CATEGORIES : SHARED_EXPENSE_CATEGORIES;
  }, [type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    if (splitMethod === "percentage") {
      const totalPct = splitMembers.reduce((sum, m) => sum + (parseFloat(percentageSplits[m.user_id]) || 0), 0);
      if (Math.abs(totalPct - 100) > 0.01) {
        alert("Percentages must add up to 100%.");
        return;
      }
    }

    const amountCents = Math.round(numericAmount * 100);
    const splits = splitMembers.map((m) => {
      if (splitMethod === "custom") {
        return { user_id: m.user_id, amount: Math.round((parseFloat(customSplits[m.user_id]) || 0) * 100) };
      }
      if (splitMethod === "percentage") {
        return { user_id: m.user_id, percentage: parseFloat(percentageSplits[m.user_id]) || 0 };
      }
      return { user_id: m.user_id };
    });

    setSaving(true);
    try {
      const payload: CreateSharedTransactionData = {
        list_id: listId,
        amount: amountCents,
        type,
        category: category.trim(),
        date,
        notes: notes.trim() || undefined,
        split_method: splitMethod,
        splits,
      };
      if (editTx && onUpdate) {
        await onUpdate(editTx.id, payload);
      } else {
        await onSave(payload);
      }
      onClose();
    } catch (err) {
      alert("Failed to save transaction.");
    } finally {
      setSaving(false);
    }
  };

  const toggleExclude = (userId: string) => {
    setExcludedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="p-5 sm:p-6 bg-white rounded-t-2xl sm:rounded-2xl">
      <div className="flex items-center justify-between mb-5 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-bold text-text-primary">
          {editTx ? "Edit Transaction" : "Add Shared Expense"}
        </h3>
        <button onClick={onClose} className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-gray-100 transition-colors" aria-label="Close">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Amount</label>
          <input
            type="number" step="0.01" placeholder="0.00"
            value={amount} onChange={(e) => setAmount(e.target.value)}
            className="p-3 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Type</label>
          <div className="flex bg-bg p-1 rounded-xl border border-border">
            <button type="button" onClick={() => { setType("income"); setCategory(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${type === "income" ? "bg-white text-emerald-600 shadow-sm" : "text-text-secondary"}`}>Income</button>
            <button type="button" onClick={() => { setType("expense"); setCategory(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${type === "expense" ? "bg-white text-rose-500 shadow-sm" : "text-text-secondary"}`}>Expense</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              title="Select category"
              className="p-3 border border-border rounded-xl text-sm bg-white" required>
              <option value="">Select category</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              placeholder="Select date"
              className="p-3 border border-border rounded-xl focus:ring-2 focus:ring-primary text-sm" required />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Notes <span className="font-normal text-text-secondary">(optional)</span></label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note..."
            className="p-3 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Split Method</label>
          <div className="flex bg-bg p-1 rounded-xl border border-border">
            {(["equal", "custom", "percentage"] as SplitMethod[]).map((method) => (
              <button key={method} type="button" onClick={() => setSplitMethod(method)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition capitalize ${
                  splitMethod === method ? "bg-white text-slate-800 shadow-sm" : "text-text-secondary"
                }`}>
                {method === "equal" ? "Equal" : method === "custom" ? "Custom" : "Percentage"}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-bg rounded-xl p-4 border border-border">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest mb-3">Split Among</p>
          <div className="space-y-2">
            {activeMembers.map((m) => {
              const excluded = excludedMembers.includes(m.user_id);
              return (
                <label key={m.user_id} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!excluded}
                    onChange={() => toggleExclude(m.user_id)}
                    className="rounded border-slate-300 text-navy focus:ring-navy/20"
                  />
                  <span className="text-sm text-slate-700">{m.display_name}</span>
                  {m.role === "owner" && <span className="text-[10px] text-amber-500 font-medium">(owner)</span>}
                  {!excluded && splitMethod === "custom" && (
                    <input
                      type="number" step="0.01" placeholder="0.00"
                      value={customSplits[m.user_id] || ""}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setCustomSplits((prev) => ({ ...prev, [m.user_id]: e.target.value }))}
                      className="ml-auto w-24 p-1.5 border border-slate-200 rounded-lg text-xs text-right"
                    />
                  )}
                  {!excluded && splitMethod === "percentage" && (
                    <div className="ml-auto flex items-center gap-1">
                      <input
                        type="number" step="0.01" placeholder="0"
                        value={percentageSplits[m.user_id] || ""}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setPercentageSplits((prev) => ({ ...prev, [m.user_id]: e.target.value }))}
                        className="w-20 p-1.5 border border-slate-200 rounded-lg text-xs text-right"
                      />
                      <span className="text-xs text-slate-400">%</span>
                    </div>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-3 border border-border text-text-secondary rounded-xl hover:bg-bg transition text-sm font-medium">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 bg-navy text-white px-4 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/20 transition-all text-sm disabled:opacity-50">
            {saving ? "Saving..." : editTx ? "Update" : "Add Transaction"}
          </button>
        </div>
      </form>
    </div>
  );
};
