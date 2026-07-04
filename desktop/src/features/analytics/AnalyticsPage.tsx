import { useMemo } from "react";
import type { Transaction } from "../../types/transaction";
import CategoryBarChart from "./components/CategoryBarChart";
import SeasonalTrendChart from "../dashboard/components/SeasonalTrendChart";
import { ListFilter, TrendingUp, TrendingDown } from "lucide-react";
import { useCurrency } from "../../context/CurrencyContext";

const AnalyticsPage = ({ transactions }: { transactions: Transaction[] }) => {
  const { format } = useCurrency();

  const expensesOnly = useMemo(
    () => transactions.filter((t) => t.type === "expense"),
    [transactions]
  );

  const categoryData = useMemo(() => {
    const totals: Record<string, number> = {};
    expensesOnly.forEach((t) => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
    return Object.entries(totals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [expensesOnly]);

  const totalSpend = categoryData.reduce((s, c) => s + c.amount, 0);
  const topTwo = categoryData.slice(0, 2);

  return (
    <div className="space-y-6 pb-10">
      {/* Bar chart + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Bar Chart */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-border shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <ListFilter size={18} />
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-sm sm:text-base">
                Expenses by Category
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Where is your money going?
              </p>
            </div>
          </div>
          <CategoryBarChart data={categoryData} />
        </div>

        {/* Insights Panel */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-border shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp size={18} />
            </div>
            <h3 className="font-bold text-text-primary text-sm sm:text-base">
              Key Spending Insights
            </h3>
          </div>

          {categoryData.length > 0 ? (
            <>
              {/* Biggest expense */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-[10px] text-text-secondary uppercase font-bold tracking-wider mb-1">
                  Biggest Expense
                </p>
                <p className="text-xl font-black text-text-primary">
                  {topTwo[0].category}
                </p>
                <p className="text-sm text-text-secondary mt-0.5">
                  {format(topTwo[0].amount)} spent
                  {totalSpend > 0 && (
                    <span className="ml-1 font-semibold text-text-primary">
                      ({Math.round((topTwo[0].amount / totalSpend) * 100)}% of total)
                    </span>
                  )}
                </p>
              </div>

              {/* Top 2 categories breakdown */}
              <div className="flex flex-col gap-2">
                {topTwo.map((item, i) => (
                  <div key={item.category} className="flex items-center gap-3">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: i === 0 ? "#3b82f6" : "#8b5cf6" }}
                    />
                    <span className="text-sm text-text-primary font-medium flex-1 truncate">
                      {item.category}
                    </span>
                    <span className="text-sm text-text-secondary font-semibold">
                      {format(item.amount)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <TrendingDown size={14} />
                  <span>Total tracked spend</span>
                </div>
                <span className="text-sm font-bold text-expense">
                  {format(totalSpend)}
                </span>
              </div>
            </>
          ) : (
            <p className="flex-1 flex items-center justify-center text-text-secondary italic text-sm">
              Add some expenses to see insights!
            </p>
          )}
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-border shadow-sm">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <TrendingUp size={18} />
          </div>
          <div>
            <h3 className="font-bold text-text-primary text-sm sm:text-base">
              Seasonal Spending Trends
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Category spending month by month
            </p>
          </div>
        </div>
        <SeasonalTrendChart transactions={transactions} />
      </div>
    </div>
  );
};

export default AnalyticsPage;