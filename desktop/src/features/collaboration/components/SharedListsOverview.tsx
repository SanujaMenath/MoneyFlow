import { Users, Plus, Trash2, ChevronRight, Clock } from "lucide-react";
import type { SharedList } from "../../../types/collaboration";

interface SharedListsOverviewProps {
  lists: SharedList[];
  onCreateClick: () => void;
  onSelectList: (list: SharedList) => void;
  onDeleteList: (id: string) => void;
  loading: boolean;
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export const SharedListsOverview = ({
  lists, onCreateClick, onSelectList, onDeleteList, loading,
}: SharedListsOverviewProps) => {

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800 text-base tracking-tight">
            Shared Expense Lists
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            {lists.length} list{lists.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={onCreateClick}
          className="shrink-0 bg-navy text-white px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 hover:bg-navy/90"
        >
          <Plus size={15} />
          New List
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm animate-pulse">
          Loading shared lists...
        </div>
      ) : lists.length === 0 ? (
        <div className="py-20 text-center">
          <Users size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-400 text-sm">No shared lists yet.</p>
          <p className="text-slate-300 text-xs mt-1">Create one to start collaborating!</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {lists.map((list) => (
            <div
              key={list.id}
              className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/60 transition-colors group cursor-pointer"
              onClick={() => onSelectList(list)}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-navy/5 flex items-center justify-center shrink-0">
                  <Users size={18} className="text-navy/40" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {list.name}
                  </p>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Clock size={11} />
                    {formatDate(list.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteList(list.id); }}
                  className="p-2 text-text-secondary hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-75 sm:opacity-0 sm:group-hover:opacity-100"
                  title="Delete list"
                >
                  <Trash2 size={15} />
                </button>
                <ChevronRight size={16} className="text-text-secondary" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
