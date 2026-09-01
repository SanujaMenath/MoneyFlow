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
    const monthlyData: Record<number, Record<string, number | string>> = {};
    const categories = new Set<string>();

    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const d = new Date(t.date);
        const monthIdx = d.getMonth();
        if (!monthlyData[monthIdx]) {
          monthlyData[monthIdx] = {
            name: d.toLocaleString("default", { month: "short" }),
            _order: monthIdx,
          };
        }
        monthlyData[monthIdx][t.category] =
          ((monthlyData[monthIdx][t.category] as number) || 0) + t.amount;
        categories.add(t.category);
      });

    return {
      data: Object.values(monthlyData).sort((a, b) => (a._order as number) - (b._order as number)),
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
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData.data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border, #E5E7EB)" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-text-secondary, #9ca3af)", fontSize: 12 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-text-secondary, #9ca3af)", fontSize: 11 }}
            width={72}
            tickFormatter={(value) => format(value)}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid var(--color-border, #E5E7EB)",
              boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
              backgroundColor: "var(--color-card, #ffffff)",
              color: "var(--color-text-primary, #111827)",
              fontSize: "12px",
            }}
            itemStyle={{ color: "var(--color-text-primary, #111827)" }}
            labelStyle={{ color: "var(--color-text-primary, #111827)", fontWeight: 600 }}
            formatter={(value) => [typeof value === "number" ? format(value) : "", ""]}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingTop: "16px", fontSize: "12px", color: "var(--color-text-secondary, #6b7280)" }}
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