import React, { useState, useMemo } from "react";
import { X } from "lucide-react";
import { createTransaction } from "./services/transactionService";
import { Transaction, RecurringFrequency } from "../../types/transaction";

interface AddTransactionFormProps {
  onClose: () => void;
  onSave: (data: Transaction) => void;
}

const incomeCategories = [
  "Salary", "Freelance", "Investment", "Business", "Gift", "Other Income",
] as const;

const expenseCategories = [
  "Food & Dining", "Transport", "Housing & Rent", "Bills & Utilities",
  "Shopping", "Healthcare", "Entertainment", "Education", "Travel",
  "Installments/Loans", "Other Expense",
] as const;

const frequencies: { value: RecurringFrequency; label: string }[] = [
  { value: "none", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const AddTransactionForm = ({ onClose, onSave }: AddTransactionFormProps) => {
  const today = new Date().toISOString().split("T")[0];

  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(today);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>("none");
  const [recurringEndDate, setRecurringEndDate] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const availableCategories = useMemo(() => {
    return type === "income" ? incomeCategories : expenseCategories;
  }, [type]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert("Please enter a valid amount greater than 0.");
      return;
    }

    const transactionData: Transaction = {
      amount: Math.round(numericAmount * 100),
      type,
      category: category.trim(),
      date,
      createdAt: new Date().toISOString(),
      recurringFrequency,
      recurringEndDate: recurringEndDate || null,
    };

    setSaving(true);
    try {
      const saved = await createTransaction(transactionData);
      onSave(saved);
      setAmount("");
      setCategory("");
      setDate(today);
      setType("expense");
      setRecurringFrequency("none");
      setRecurringEndDate("");
      onClose();
    } catch (e) {
      console.error("Failed to save transaction:", e);
      setError("Failed to save transaction. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-5 sm:p-6 bg-white rounded-t-2xl sm:rounded-2xl">
      <div className="flex items-center justify-between mb-5 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-bold text-text-primary">
          New Transaction
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5">
        {/* Amount */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Amount</label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="p-3 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm sm:text-base"
            required
          />
        </div>

        {/* Type Toggle */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Transaction Type</label>
          <div className="flex bg-bg p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => { setType("income"); setCategory(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                type === "income"
                  ? "bg-white text-income shadow-sm"
                  : "text-text-secondary"
              }`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => { setType("expense"); setCategory(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                type === "expense"
                  ? "bg-white text-expense shadow-sm"
                  : "text-text-secondary"
              }`}
            >
              Expense
            </button>
          </div>
        </div>

        {/* Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Category</label>
            <select
              value={category}
              title="Select category"
              onChange={(e) => setCategory(e.target.value)}
              className="p-3 border border-border rounded-xl text-sm sm:text-base bg-white"
              required
            >
              <option value="">Select category</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="Select date"
              className="p-3 border border-border rounded-xl focus:ring-2 focus:ring-primary text-sm sm:text-base"
              required
            />
          </div>
        </div>

        {/* Recurring */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Recurring</label>
          <select
            value={recurringFrequency}
            title="Select recurring frequency"
            onChange={(e) => setRecurringFrequency(e.target.value as RecurringFrequency)}
            className="p-3 border border-border rounded-xl text-sm sm:text-base bg-white"
          >
            {frequencies.map((freq) => (
              <option key={freq.value} value={freq.value}>{freq.label}</option>
            ))}
          </select>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Recurring End Date */}
        {recurringFrequency !== "none" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">
              End Date <span className="text-text-secondary font-normal">(optional)</span>
            </label>
            <input
              type="date"
              value={recurringEndDate}
              onChange={(e) => setRecurringEndDate(e.target.value)}
              placeholder="Select end date"
              className="p-3 border border-border rounded-xl focus:ring-2 focus:ring-primary text-sm sm:text-base"
            />
            <p className="text-xs text-text-secondary">
              Leave empty for indefinite recurring
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-2 sm:mt-4 pb-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-border text-text-secondary rounded-xl hover:bg-bg transition text-sm sm:text-base font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-navy text-white px-4 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/20 transition-all text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Transaction"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddTransactionForm;