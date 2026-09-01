import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../context/CurrencyContext";
import { useThemeColors } from "../context/useThemeColors";

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
  const colors = useThemeColors();
  const styles = makeStyles(colors);
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

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: { gap: 10 },
    emptyContainer: { padding: 40, alignItems: "center" },
    emptyText: { fontSize: 14, color: colors.textMuted, fontWeight: "500" },
    row: { flexDirection: "row", alignItems: "center", gap: 8 },
    label: { width: 100, fontSize: 12, fontWeight: "600", color: colors.textSecondary },
    barWrapper: { flex: 1, height: 20, backgroundColor: colors.surfaceAlt, borderRadius: 6, overflow: "hidden" },
    bar: { height: 20, borderRadius: 6 },
    value: { width: 80, fontSize: 11, fontWeight: "700", color: colors.text, textAlign: "right" as const },
  });
