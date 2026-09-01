import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../context/CurrencyContext";
import { useSavingsGoal } from "../context/SavingsGoalContext";
import { useThemeColors } from "../context/useThemeColors";

interface Props {
  income: number;
  expenses: number;
}

export default function SavingsGoalCard({ income, expenses }: Props) {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const { savingsGoalPercent } = useSavingsGoal();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const goalAmount = income > 0 ? Math.round(income * (savingsGoalPercent / 100)) : 0;
  const actuallySaved = income - expenses;
  const progress = goalAmount > 0 ? Math.max(0, Math.min(100, (actuallySaved / goalAmount) * 100)) : 0;

  let statusText = t("components.needsAttention");
  let statusColor = colors.expense;
  if (progress >= 100) { statusText = t("components.onTrack"); statusColor = colors.income; }
  else if (progress >= 50) { statusText = t("components.almostThere"); statusColor = "#f59e0b"; }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t("components.savingsGoal", { percent: savingsGoalPercent })}</Text>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: statusColor }]} />
      </View>
      <View style={styles.row}>
        <View>
          <Text style={styles.label}>{t("components.goal")}</Text>
          <Text style={styles.value}>{format(goalAmount)}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.label}>{t("components.saved")}</Text>
          <Text style={[styles.value, { color: actuallySaved >= goalAmount ? colors.income : colors.expense }]}>
            {format(actuallySaved)}
          </Text>
        </View>
      </View>
      <Text style={[styles.status, { color: statusColor }]}>{statusText}</Text>
      {actuallySaved > goalAmount && (
        <Text style={styles.surplus}>
          {t("components.surplus", { amount: format(actuallySaved - goalAmount) })}
        </Text>
      )}
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    card: { backgroundColor: colors.card, padding: 20, borderRadius: 20, marginTop: 16, borderWidth: 1, borderColor: colors.cardBorder },
    title: { fontSize: 14, fontWeight: "700", color: colors.textSecondary, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },
    progressBarBg: { height: 8, backgroundColor: colors.surfaceAlt, borderRadius: 4, overflow: "hidden" },
    progressBarFill: { height: 8, borderRadius: 4 },
    row: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
    label: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
    value: { fontSize: 16, fontWeight: "800", color: colors.text, marginTop: 2 },
    status: { fontSize: 13, fontWeight: "700", marginTop: 12, textAlign: "center" },
    surplus: { fontSize: 12, color: colors.income, marginTop: 8, textAlign: "center", fontWeight: "500" },
  });
