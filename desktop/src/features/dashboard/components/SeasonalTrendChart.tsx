import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useCurrency } from "../../../context/CurrencyContext";
import type { Transaction } from "../../../types/transaction";

interface SeasonalTrendChartProps {
  transactions: Transaction[];
}

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

const SeasonalTrendChart = ({ transactions }: SeasonalTrendChartProps) => {

  const { format } = useCurrency();

  const chartData = useMemo(() => {
    const monthlyData: Record<string, Record<string, number | string>> = {};
    const categories = new Set<string>();

    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const month = new Date(t.date).toLocaleString("default", { month: "short" });
        if (!monthlyData[month]) monthlyData[month] = { name: month };
        monthlyData[month][t.category] =
          ((monthlyData[month][t.category] as number) || 0) + t.amount;
        categories.add(t.category);
      });

    return {
      data: Object.values(monthlyData),
      keys: Array.from(categories),
    };
  }, [transactions]);

  if (chartData.data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-text-secondary text-sm italic">
        No expense data to display yet.
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="mb-5">
        <h4 className="text-text-primary font-bold text-base">Expense Trends</h4>
        <p className="text-text-secondary text-xs mt-0.5">Category spending over time</p>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData.data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            width={72}
            tickFormatter={(value) => format(value)}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "none",
              boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
              fontSize: "12px",
            }}
            formatter={(value) => [typeof value === "number" ? format(value) : "", ""]}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingTop: "16px", fontSize: "12px", color: "#6b7280" }}
          />
          {chartData.keys.map((category, i) => (
            <Line
              key={category}
              type="monotone"
              dataKey={category}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2.5}
              dot={{ r: 3.5, strokeWidth: 2, fill: "#fff" }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SeasonalTrendChart;