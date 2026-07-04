import { PieChart, Pie, ResponsiveContainer, Tooltip } from "recharts";
import { useCurrency } from "../../../context/CurrencyContext";

interface AnalyticsDonutProps {
  income: number;
  expenses: number;
}

const AnalyticsDonut = ({ income, expenses }: AnalyticsDonutProps) => {
  const { format } = useCurrency();

  const COLORS = ["#10b981", "#f43f5e"];


 const data = [
    { name: "Income", value: income, fill: COLORS[0] }, 
    { name: "Expenses", value: expenses, fill: COLORS[1] },
  ];

  
  const savings = income - expenses;
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;

  return (
    <div className="flex flex-col lg:flex-row items-center justify-around w-full gap-8">
      {/* Chart Container */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={110}
              paddingAngle={8}
              dataKey="value"
              stroke="none"
            >
            </Pie>
            <Tooltip
              formatter={(value: any) => format(value)}
              contentStyle={{
                borderRadius: "12px",
                border: "none",
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-text-secondary text-xs font-bold uppercase tracking-wider">
            Saved
          </span>
          <span
            className={`text-4xl font-black ${savingsRate >= 0 ? "text-income" : "text-expense"}`}
          >
            {savingsRate}%
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-sm font-semibold text-emerald-900">
              Total Income
            </span>
          </div>
          <span className="font-bold text-emerald-700">{format(income)}</span>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="text-sm font-semibold text-rose-900">
              Total Expenses
            </span>
          </div>
          <span className="font-bold text-rose-700">{format(expenses)}</span>
        </div>

        <p className="text-xs text-text-secondary text-center italic mt-2">
          {savingsRate > 20
            ? "🔥 Great job! You're saving more than 20% of your income."
            : "💡 Keep an eye on your expenses to increase your savings rate."}
        </p>
      </div>
    </div>
  );
};

export default AnalyticsDonut;
