import { useState, useMemo } from "react";
import {
  Trash2, Plus, Calendar, FilterX, Clock, XCircle, ArrowDownLeft, ArrowUpRight,
  ChevronLeft, ChevronRight, Pencil, Download, Search, X, Check,
} from "lucide-react";
import type { Transaction } from "../../types/transaction";
import { useCurrency } from "../../context/CurrencyContext";
import { getDatePresets } from "../../utils/date";
import { exportTransactionsToCsv } from "@moneyflow/shared";
import { getAllTransactionsForExport } from "./services/transactionService";
import type { TransactionFilters } from "./services/transactionService";
import { incomeCategories, expenseCategories } from "@moneyflow/shared";

interface TransactionsPageProps {
  transactions: Transaction[];
  remove: (id: number) => Promise<void>;
  edit?: (id: number, updates: Partial<Transaction>) => Promise<void>;
  stopRecurring: (id: number) => Promise<void>;
  onAddClick: () => void;
  loading: boolean;
  page?: number;
  totalPages?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  filters?: TransactionFilters;
  onFilterChange?: (filters: TransactionFilters) => void;
}

const TransactionsPage = ({
  onAddClick,
  transactions,
  remove,
  edit,
  stopRecurring,
  loading,
  page = 1,
  totalPages = 1,
  total = 0,
  onPageChange,
  filters,
  onFilterChange,
}: TransactionsPageProps) => {
  const { format } = useCurrency();
  const [startDate, setStartDate] = useState(filters?.startDate || "");
  const [endDate, setEndDate] = useState(filters?.endDate || "");
  const [search, setSearch] = useState(filters?.search || "");
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editType, setEditType] = useState<"income" | "expense">("expense");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [exporting, setExporting] = useState(false);

  const presets = getDatePresets();

  const applyFilters = (newStart: string, newEnd: string, newSearch: string) => {
    if (onFilterChange) {
      onFilterChange({
        startDate: newStart || undefined,
        endDate: newEnd || undefined,
        search: newSearch || undefined,
      });
    }
  };

  const handlePreset = (type: "this" | "last" | "all") => {
    let s = "";
    let e = "";
    if (type === "this") {
      s = presets.thisMonth.start;
      e = presets.thisMonth.end;
    } else if (type === "last") {
      s = presets.lastMonth.start;
      e = presets.lastMonth.end;
    }
    setStartDate(s);
    setEndDate(e);
    applyFilters(s, e, search);
  };

  const handleDateChange = (type: "start" | "end", val: string) => {
    if (type === "start") {
      setStartDate(val);
      applyFilters(val, endDate, search);
    } else {
      setEndDate(val);
      applyFilters(startDate, val, search);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    applyFilters(startDate, endDate, val);
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSearch("");
    applyFilters("", "", "");
  };

  const isFiltered = startDate !== "" || endDate !== "" || search !== "";

  // Fallback in-memory filter if parent doesn't handle database-level filtering
  const displayTransactions = useMemo(() => {
    if (onFilterChange) return transactions;
    return transactions.filter((t) => {
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchCat = t.category.toLowerCase().includes(q);
        const matchDesc = (t.description || "").toLowerCase().includes(q);
        if (!matchCat && !matchDesc) return false;
      }
      return true;
    });
  }, [transactions, startDate, endDate, search, onFilterChange]);

  const totalIncome = displayTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = displayTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const handleStartEdit = (t: Transaction) => {
    setEditingTx(t);
    setEditAmount((t.amount / 100).toFixed(2));
    setEditType(t.type);
    setEditCategory(t.category);
    setEditDate(t.date);
    setEditDescription(t.description || "");
  };

  const handleSaveEdit = async () => {
    if (!editingTx || !edit) return;
    const num = parseFloat(editAmount);
    if (isNaN(num) || num <= 0) {
      alert("Please enter a valid amount greater than 0.");
      return;
    }
    if (!editCategory.trim()) {
      alert("Please select a category.");
      return;
    }

    setSavingEdit(true);
    try {
      await edit(editingTx.id!, {
        amount: Math.round(num * 100),
        type: editType,
        category: editCategory.trim(),
        date: editDate,
        description: editDescription.trim() || null,
      });
      setEditingTx(null);
    } catch {
      alert("Failed to save transaction.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const allTx = await getAllTransactionsForExport({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search || undefined,
      });
      const csv = exportTransactionsToCsv(allTx.length > 0 ? allTx : displayTransactions);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `moneyflow_transactions_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export transactions to CSV.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="px-6 py-5 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-semibold text-text-primary text-base tracking-tight">
            Transactions
          </h3>
          <p className="text-text-secondary text-xs mt-0.5">
            {displayTransactions.length} of {total} records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="shrink-0 bg-card hover:bg-bg border border-border text-text-primary px-3.5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            title="Export transactions to CSV"
          >
            <Download size={15} />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>

          <button
            onClick={onAddClick}
            className="shrink-0 bg-navy text-white px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus size={15} />
            Add Transaction
          </button>
        </div>
      </div>

      {/* ── Summary Strip ───────────────────────────────────────────── */}
      {displayTransactions.length > 0 && (
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
          <div className="px-6 py-3.5 flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Income</span>
            <span className="text-sm font-semibold text-income">+ {format(totalIncome)}</span>
          </div>
          <div className="px-6 py-3.5 flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Expenses</span>
            <span className="text-sm font-semibold text-expense">− {format(totalExpense)}</span>
          </div>
          <div className="px-6 py-3.5 flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Saving</span>
            <span className={`text-sm font-semibold ${totalIncome - totalExpense >= 0 ? "text-text-primary" : "text-expense"}`}>
              {totalIncome - totalExpense >= 0 ? "+" : "−"} {format(Math.abs(totalIncome - totalExpense))}
            </span>
          </div>
        </div>
      )}

      {/* ── Filter Section ──────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-border flex flex-col lg:flex-row lg:items-end justify-between gap-4">

        <div className="flex flex-wrap items-center gap-2">
          <Clock size={13} className="text-text-secondary shrink-0" />
          {[
            { label: "All Time", type: "all" as const, active: !startDate && !endDate },
            { label: "This Month", type: "this" as const, active: startDate === presets.thisMonth.start },
            { label: "Last Month", type: "last" as const, active: startDate === presets.lastMonth.start },
          ].map(({ label, type, active }) => (
            <button
              key={type}
              onClick={() => handlePreset(type)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all border ${
                active
                  ? "bg-navy text-white border-navy"
                  : "bg-card text-text-secondary border-border hover:border-text-secondary hover:text-text-primary"
              }`}
            >
              {label}
            </button>
          ))}

          {/* Search box */}
          <div className="relative ml-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" size={13} />
            <input
              type="text"
              placeholder="Search description..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8 pr-3 py-1 bg-card border border-border rounded-lg text-xs text-text-primary focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all w-40 sm:w-48"
            />
          </div>
        </div>

        <div className="flex items-end gap-2">
          {(["From", "To"] as const).map((label) => {
            const val = label === "From" ? startDate : endDate;
            const handler = (newVal: string) => handleDateChange(label === "From" ? "start" : "end", newVal);
            return (
              <div key={label} className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest px-0.5">{label}</span>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" size={13} />
                  <input
                    type="date"
                    value={val}
                    placeholder="YYYY-MM-DD"
                    onChange={(e) => handler(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-card border border-border rounded-lg text-xs text-text-primary focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all w-36"
                  />
                </div>
              </div>
            );
          })}

          {isFiltered && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-expense hover:bg-rose-50 rounded-lg text-xs font-medium transition-colors border border-transparent hover:border-rose-100 mb-0"
            >
              <FilterX size={13} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="py-20 text-center text-text-secondary text-sm animate-pulse">
            Loading transactions…
          </div>
        ) : displayTransactions.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-text-secondary text-sm">
              {isFiltered
                ? "No transactions found for this filter."
                : "No transactions yet. Start tracking your cash flow!"}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-160">
            <thead>
              <tr className="border-b border-border">
                {["Date", "Category", "Description", "Type", "Amount", "Recurring", "Actions"].map((h, i) => (
                  <th
                    key={h}
                    className={`px-5 py-3 text-[10px] font-semibold text-text-secondary uppercase tracking-widest bg-bg ${
                      i === 4 ? "text-right" : i >= 5 ? "text-center" : ""
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {displayTransactions.map((t: Transaction) => (
                <tr
                  key={t.id}
                  className="border-b border-border hover:bg-bg transition-colors group"
                >
                  <td className="px-5 py-3.5 text-xs text-text-secondary whitespace-nowrap tabular-nums">
                    {t.date}
                  </td>

                  <td className="px-5 py-3.5">
                    <span className="text-sm font-medium text-text-primary">{t.category}</span>
                  </td>

                  <td className="px-5 py-3.5">
                    <span className="text-xs text-text-secondary line-clamp-1 max-w-xs">{t.description || "—"}</span>
                  </td>

                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-semibold rounded-md tracking-wide ${
                        t.type === "income"
                          ? "bg-emerald-50 text-income"
                          : "bg-rose-50 text-expense"
                      }`}
                    >
                      {t.type === "income"
                        ? <ArrowDownLeft size={10} />
                        : <ArrowUpRight size={10} />}
                      {t.type.toUpperCase()}
                    </span>
                  </td>

                  <td
                    className={`px-5 py-3.5 text-sm font-semibold text-right whitespace-nowrap tabular-nums ${
                      t.type === "income" ? "text-income" : "text-expense"
                    }`}
                  >
                    {t.type === "income" ? "+" : "−"} {format(t.amount)}
                  </td>

                  <td className="px-5 py-3.5 text-center">
                    {t.recurringFrequency && t.recurringFrequency !== "none" ? (
                      <span className="inline-block bg-bg border border-border text-text-secondary text-[10px] font-semibold px-2.5 py-0.5 rounded-full capitalize tracking-wide">
                        {t.recurringFrequency}
                      </span>
                    ) : (
                      <span className="text-border text-sm select-none">—</span>
                    )}
                  </td>

                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1 opacity-75 sm:opacity-50 sm:group-hover:opacity-100 transition-opacity">
                      {edit && (
                        <button
                          onClick={() => handleStartEdit(t)}
                          title="Edit Transaction"
                          className="p-1.5 text-text-secondary hover:text-primary hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      {t.recurringFrequency && t.recurringFrequency !== "none" && (
                        <button
                          onClick={() => stopRecurring(t.id!)}
                          title="Stop Recurrence"
                          className="p-1.5 text-text-secondary hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                        >
                          <XCircle size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => remove(t.id!)}
                        title="Delete Transaction"
                        className="p-1.5 text-text-secondary hover:text-expense hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-border flex items-center justify-between">
          <span className="text-[11px] text-text-secondary tabular-nums">
            Page {page} of {totalPages}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange && onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-bg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => onPageChange && onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-bg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Edit Modal ──────────────────────────────────────────────────── */}
      {editingTx && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setEditingTx(null)}
        >
          <div
            className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h4 className="font-bold text-text-primary text-base">Edit Transaction</h4>
              <button
                onClick={() => setEditingTx(null)}
                className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 p-1 bg-bg rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setEditType("expense")}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    editType === "expense" ? "bg-card shadow-sm text-expense" : "text-text-secondary"
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setEditType("income")}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    editType === "income" ? "bg-card shadow-sm text-income" : "text-text-secondary"
                  }`}
                >
                  Income
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-xl text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-xl text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {(editType === "income" ? incomeCategories : expenseCategories).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-xl text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Description / Notes</label>
                <input
                  type="text"
                  placeholder="Optional notes..."
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-xl text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:bg-bg border border-border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-blue-600 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check size={14} />
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;