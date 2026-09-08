import { useMemo } from "react";
import type { Transaction } from "../../types/transaction";
import StatsCard from "./components/StatsCard";
import { TrendingUp, TrendingDown, Wallet, Lightbulb } from "lucide-react";
import AnalyticsDonut from "./components/AnalyticsDonut";
import SeasonalTrendChart from "./components/SeasonalTrendChart";
import SavingsGoalCard from "./components/SavingsGoalCard";

import type { FinancialSummary } from "@moneyflow/shared";

interface DashboardViewProps {
  transactions?: Transaction[];
  summary?: FinancialSummary;
}

const DashboardView = ({ transactions = [], summary }: DashboardViewProps) => {
  const stats = useMemo(() => {
    if (summary) {
      return summary;
    }
    return transactions.reduce(
      (acc, t) => {
        if (t.type === "income") {
          acc.income += t.amount;
          acc.balance += t.amount;
        } else {
          acc.expenses += t.amount;
          acc.balance -= t.amount;
        }
        return acc;
      },
      { balance: 0, income: 0, expenses: 0 }
    );
  }, [transactions, summary]);

  const healthScore =
    stats.income > 0
      ? Math.max(0, Math.round(((stats.income - stats.expenses) / stats.income) * 100))
      : 0;

  return (
    <div className="space-y-6 pb-10">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <StatsCard title="Total Balance"  amount={stats.balance}  type="balance" icon={Wallet}      />
        <StatsCard title="Total Income"   amount={stats.income}   type="income"  icon={TrendingUp}  />
        <StatsCard title="Total Expenses" amount={stats.expenses} type="expense" icon={TrendingDown} />
      </div>
      {stats.income > 0 && (
        <SavingsGoalCard income={stats.income} expenses={stats.expenses} />
      )}

      {/* Donut + Insight */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 bg-white p-6 sm:p-8 rounded-3xl border border-border shadow-sm">
          <div className="mb-6">
            <h4 className="text-text-primary font-bold text-lg">Monthly Ratio</h4>
            <p className="text-text-secondary text-sm">Income vs Expense balance</p>
          </div>
          <AnalyticsDonut income={stats.income} expenses={stats.expenses} />
        </div>

        <div className="xl:col-span-2 bg-navy text-white p-6 sm:p-8 rounded-3xl shadow-lg shadow-blue-900/10 flex flex-col justify-between">
          <div>
            <div className="bg-white/20 w-10 h-10 rounded-2xl flex items-center justify-center mb-5">
              <Lightbulb className="text-white" size={20} />
            </div>
            <h4 className="text-lg font-bold mb-2">AI Insight</h4>
            <p className="text-blue-50 text-sm leading-relaxed">
              {stats.expenses > stats.income
                ? "Your spending this period has exceeded your income. Try identifying non-essential recurring expenses to balance your flow."
                : stats.income === 0
                ? "Start logging your income and expenses to get personalised financial insights."
                : "Great job! You are living below your means. This is a perfect time to set aside your surplus for long-term investments."}
            </p>
          </div>
          <div className="mt-6 pt-5 border-t border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200">
              Financial Health Score
            </span>
            <div className="text-3xl font-black mt-1">{healthScore}%</div>
          </div>
        </div>
      </div>

      {/* Trend Chart — ✅ Fixed: single card, SeasonalTrendChart no longer adds its own */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-border shadow-sm">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <TrendingUp size={18} />
          </div>
          <div>
            <h4 className="font-bold text-text-primary text-sm sm:text-base">
              Monthly Spending Trends
            </h4>
            <p className="text-text-secondary text-xs mt-0.5">
              Category breakdown over time
            </p>
          </div>
        </div>
        <SeasonalTrendChart transactions={transactions} />
      </div>
    </div>
  );
};

export default DashboardView;