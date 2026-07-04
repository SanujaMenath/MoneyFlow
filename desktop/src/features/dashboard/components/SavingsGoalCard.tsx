import {
  Target,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useCurrency } from "../../../context/CurrencyContext";
import { useSavingsGoal } from "../../../context/SavingsGoalContext";

interface SavingsGoalCardProps {
  income: number;
  expenses: number;
}

const SavingsGoalCard = ({ income, expenses }: SavingsGoalCardProps) => {
  const { format } = useCurrency();
  const { savingsGoalPercent } = useSavingsGoal();

  const goalAmount = (income * savingsGoalPercent) / 100;
  const actuallySaved = income - expenses;
  const progress =
    goalAmount > 0 ? Math.max(0, (actuallySaved / goalAmount) * 100) : 0;
  const cappedProgress = Math.min(100, progress);

  let status = {
    label: "Needs attention",
    color: "text-expense",
    bg: "bg-rose-500",
  };
  if (progress >= 100) {
    status = {
      label: "On track",
      color: "text-income",
      bg: "bg-emerald-500",
    };
  } else if (progress >= 50) {
    status = {
      label: "Almost there",
      color: "text-amber-500",
      bg: "bg-amber-500",
    };
  }

  if (income <= 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${progress >= 100 ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-primary"}`}
          >
            <Target size={20} />
          </div>
          <div>
            <h4 className="font-bold text-text-primary text-sm sm:text-base">
              Savings Goal
            </h4>
            <p className="text-xs text-text-secondary">
              Target: {savingsGoalPercent}% of income
            </p>
          </div>
        </div>

        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${status.bg} text-white`}
        >
          {progress >= 100 ? (
            <CheckCircle2 size={12} />
          ) : (
            <AlertCircle size={12} />
          )}
          {status.label}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div>
          <p className="text-xs text-text-secondary mb-1">Goal Amount</p>
          <p className="text-lg font-bold text-text-primary">
            {format(goalAmount)}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-secondary mb-1">Actually Saved</p>
          <p
            className={`text-lg font-bold ${actuallySaved >= goalAmount ? "text-income" : "text-text-primary"}`}
          >
            {format(actuallySaved)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-out ${status.bg}`}
            style={{ width: `${cappedProgress}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-xs">
          <p className="text-text-secondary flex items-center gap-1">
            {actuallySaved < goalAmount ? (
              <>
                You are
                <span className="font-bold text-expense">
                  {format(goalAmount - actuallySaved)}
                </span>
                away from your goal
                <TrendingDown size={14} className="text-rose-500" />
              </>
            ) : (
              <>
                Goal met! You saved
                <span className="font-bold text-income">
                  {format(actuallySaved - goalAmount)}
                </span>
                extra
                <TrendingUp size={14} className="text-emerald-500" />
              </>
            )}
          </p>
          <span className="font-black text-text-primary">
            {Math.round(progress)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default SavingsGoalCard;
