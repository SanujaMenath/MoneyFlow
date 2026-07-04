import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../context/CurrencyContext";

const COLORS = ["#2563eb", "#7c3aed", "#db2777", "#d97706", "#10b981", "#ef4444"];

interface CategoryData {
  category: string;
  amount: number;
}

interface Props {
  data: CategoryData[];
}

export default function CategoryBarChart({ data }: Props) {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const maxAmount = data.length > 0 ? Math.max(...data.map((d) => d.amount)) : 1;

  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t("components.noExpenseCategories")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {data.map((item, idx) => (
        <View key={item.category} style={styles.row}>
          <Text style={styles.label} numberOfLines={1}>{item.category}</Text>
          <View style={styles.barWrapper}>
            <View
              style={[
                styles.bar,
                {
                  width: `${Math.max((item.amount / maxAmount) * 100, 2)}%`,
                  backgroundColor: COLORS[idx % COLORS.length],
                },
              ]}
            />
          </View>
          <Text style={styles.value}>{format(item.amount)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  emptyContainer: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 14, color: "#94a3b8", fontWeight: "500" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { width: 100, fontSize: 12, fontWeight: "600", color: "#475569" },
  barWrapper: { flex: 1, height: 20, backgroundColor: "#f1f5f9", borderRadius: 6, overflow: "hidden" },
  bar: { height: 20, borderRadius: 6 },
  value: { width: 80, fontSize: 11, fontWeight: "700", color: "#1e293b", textAlign: "right" as const },
});
