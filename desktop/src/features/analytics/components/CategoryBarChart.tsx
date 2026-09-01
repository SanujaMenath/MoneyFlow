import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import { useCurrency } from "../../../context/CurrencyContext";

interface CategoryData {
  category: string;
  amount: number;
}

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#ef4444"];

const CategoryBarChart = ({ data }: { data: CategoryData[] }) => {
  const { format } = useCurrency();

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-text-secondary text-sm italic">
        No expense categories yet.
      </div>
    );
  }

  const chartHeight = Math.max(240, data.length * 48 + 40);

  return (
    <div style={{ height: chartHeight }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 8, right: 48, top: 4, bottom: 4 }}
        >
          <XAxis type="number" hide />
          <YAxis
            dataKey="category"
            type="category"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-text-secondary, #6b7280)", fontSize: 12, fontWeight: 500 }}
            width={130}
          />
          <Tooltip
            cursor={{ fill: "rgba(128, 128, 128, 0.08)" }}
            formatter={(value: ValueType | undefined) =>
              typeof value === "number" ? [format(value), "Amount"] : [String(value), "Amount"]
            }
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
          />
          <Bar dataKey="amount" radius={[0, 8, 8, 0]} barSize={22}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CategoryBarChart;