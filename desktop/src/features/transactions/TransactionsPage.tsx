import { useState, useMemo } from "react";
import { Trash2, Plus, Calendar, FilterX, Clock, XCircle, ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { Transaction } from "../../types/transaction";
import { useCurrency } from "../../context/CurrencyContext";
import { getDatePresets } from "../../utils/date";

interface TransactionsPageProps {
  transactions: Transaction[];
  remove: (id: number) => Promise<void>;
  stopRecurring: (id: number) => Promise<void>;
  onAddClick: () => void;
  loading: boolean;
  page?: number;
  totalPages?: number;
  total?: number;
  onPageChange?: (page: number) => void;
}

const TransactionsPage = ({
  onAddClick,
  transactions,
  remove,
  stopRecurring,
  loading,
  page = 1,
  totalPages = 1,
  total = 0,
  onPageChange,
}: TransactionsPageProps) => {
  const { format } = useCurrency();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const presets = getDatePresets();

  const handlePreset = (type: "this" | "last" | "all") => {
    if (type === "all") {
      setStartDate("");
      setEndDate("");
    } else if (type === "this") {
      setStartDate(presets.thisMonth.start);
      setEndDate(presets.thisMonth.end);
    } else if (type === "last") {
      setStartDate(presets.lastMonth.start);
      setEndDate(presets.lastMonth.end);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;
      return true;
    });
  }, [transactions, startDate, endDate]);

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  const isFiltered = startDate !== "" || endDate !== "";

  const totalIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="px-6 py-5 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-semibold text-text-primary text-base tracking-tight">
            Transactions
          </h3>
          <p className="text-text-secondary text-xs mt-0.5">
            {filteredTransactions.length} of {total} records
          </p>
        </div>

        <button
          onClick={onAddClick}
          className="shrink-0 bg-navy text-white px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
        >
          <Plus size={15} />
          Add Transaction
        </button>
      </div>

      {/* ── Summary Strip ───────────────────────────────────────────── */}
      {filteredTransactions.length > 0 && (
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
      <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-end gap-4">

        <div className="flex items-center gap-1.5">
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
        </div>

        <div className="flex items-end gap-2 ml-auto">
          {(["From", "To"] as const).map((label) => {
            const val = label === "From" ? startDate : endDate;
            const setter = label === "From" ? setStartDate : setEndDate;
            return (
              <div key={label} className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest px-0.5">{label}</span>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" size={13} />
                  <input
                    type="date"
                    value={val}
                    onChange={(e) => setter(e.target.value)}
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
        ) : filteredTransactions.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-text-secondary text-sm">
              {isFiltered
                ? "No transactions found for this date range."
                : "No transactions yet. Start tracking your cash flow!"}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-160">
            <thead>
              <tr className="border-b border-border">
                {["Date", "Category", "Type", "Amount", "Recurring", "Actions"].map((h, i) => (
                  <th
                    key={h}
                    className={`px-5 py-3 text-[10px] font-semibold text-text-secondary uppercase tracking-widest bg-bg ${
                      i === 3 ? "text-right" : i >= 4 ? "text-center" : ""
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredTransactions.map((t: Transaction) => (
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
                      <span className="inline-block bg-slate-100 text-text-secondary text-[10px] font-semibold px-2.5 py-0.5 rounded-full capitalize tracking-wide">
                        {t.recurringFrequency}
                      </span>
                    ) : (
                      <span className="text-border text-sm select-none">—</span>
                    )}
                  </td>

                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
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
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const startPage = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p = startPage + i;
              if (p > totalPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => onPageChange?.(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                    p === page
                      ? "bg-navy text-white"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;