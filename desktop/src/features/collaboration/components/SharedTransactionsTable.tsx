import { Trash2, Edit3, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { SharedTransaction } from "../../../types/collaboration";
import { useCurrency } from "../../../context/CurrencyContext";

interface SharedTransactionsTableProps {
  transactions: SharedTransaction[];
  currentUserId: string;
  isOwner: boolean;
  onEdit: (tx: SharedTransaction) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

export const SharedTransactionsTable = ({
  transactions, currentUserId, isOwner, onEdit, onDelete, loading,
}: SharedTransactionsTableProps) => {
  const { format } = useCurrency();

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
        Loading transactions...
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-400 text-sm">No shared transactions yet.</p>
        <p className="text-slate-300 text-xs mt-1">Add one to start splitting expenses!</p>
      </div>
    );
  }

  const canEdit = (tx: SharedTransaction) => isOwner || tx.creator_id === currentUserId;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-160">
        <thead>
          <tr className="border-b border-slate-100">
            {["Date", "Category", "Added By", "Type", "Amount", "Split", "Actions"].map((h, i) => (
              <th
                key={h}
                className={`px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest bg-slate-50/60 ${
                  i === 4 ? "text-right" : i === 6 ? "text-center" : ""
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx, idx) => (
            <tr
              key={tx.id}
              className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors group"
              style={{ animationDelay: `${idx * 20}ms` }}
            >
              <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap tabular-nums">
                {tx.date}
              </td>
              <td className="px-5 py-3.5">
                <span className="text-sm font-medium text-slate-700">{tx.category}</span>
              </td>
              <td className="px-5 py-3.5 text-xs text-slate-400">
                {tx.creator_name}
              </td>
              <td className="px-5 py-3.5">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-semibold rounded-md tracking-wide ${
                  tx.type === "income"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-rose-50 text-rose-500"
                }`}>
                  {tx.type === "income" ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                  {tx.type.toUpperCase()}
                </span>
              </td>
              <td className={`px-5 py-3.5 text-sm font-semibold text-right whitespace-nowrap tabular-nums ${
                tx.type === "income" ? "text-emerald-600" : "text-rose-500"
              }`}>
                {tx.type === "income" ? "+" : "−"} {format(tx.amount)}
              </td>
              <td className="px-5 py-3.5 text-center">
                <span className="inline-block bg-bg border border-border text-text-secondary text-[10px] font-semibold px-2.5 py-0.5 rounded-full capitalize tracking-wide">
                  {tx.split_method}
                </span>
              </td>
              <td className="px-5 py-3.5 text-center">
                <div className="flex items-center justify-center gap-1 opacity-75 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  {canEdit(tx) && (
                    <button
                      onClick={() => onEdit(tx)}
                      className="p-1.5 text-text-secondary hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                      title="Edit"
                    >
                      <Edit3 size={14} />
                    </button>
                  )}
                  {canEdit(tx) && (
                    <button
                      onClick={() => onDelete(tx.id)}
                      className="p-1.5 text-text-secondary hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
