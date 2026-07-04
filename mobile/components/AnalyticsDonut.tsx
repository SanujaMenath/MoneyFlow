import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, G } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../context/CurrencyContext";

interface Props {
  income: number;
  expenses: number;
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angle = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

export default function AnalyticsDonut({ income, expenses }: Props) {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const total = income + expenses;
  const incomeRatio = total > 0 ? income / total : 0.5;
  const expenseRatio = total > 0 ? expenses / total : 0.5;
  const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;

  const incomeAngle = incomeRatio * 360;
  const expenseAngle = expenseRatio * 360;

  return (
    <View style={styles.container}>
      <View style={styles.chartRow}>
        <View style={styles.svgContainer}>
          <Svg width={160} height={160} viewBox="0 0 160 160">
            <G>
              {expenseAngle > 0 && (
                <Path
                  d={describeArc(80, 80, 70, 0, expenseAngle)}
                  fill="#ef4444"
                />
              )}
              {incomeAngle > 0 && (
                <Path
                  d={describeArc(80, 80, 70, expenseAngle, expenseAngle + incomeAngle)}
                  fill="#10b981"
                />
              )}
              <Path d={describeArc(80, 80, 45, 0, 360)} fill="#fff" />
            </G>
          </Svg>
          <View style={styles.centerLabel}>
            <Text style={styles.savingsRateText}>{savingsRate}%</Text>
            <Text style={styles.savingsLabel}>{t("components.savings")}</Text>
          </View>
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: "#10b981" }]} />
            <Text style={styles.legendLabel}>{t("components.income")}</Text>
            <Text style={styles.legendValue}>{format(income)}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: "#ef4444" }]} />
            <Text style={styles.legendLabel}>{t("components.expenses")}</Text>
            <Text style={styles.legendValue}>{format(expenses)}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.insight}>
        {savingsRate > 20
          ? t("components.greatSavingsRate")
          : t("components.saveAtLeast20")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 20 },
  chartRow: { flexDirection: "row", alignItems: "center" },
  svgContainer: { width: 160, height: 160, justifyContent: "center", alignItems: "center" },
  centerLabel: { position: "absolute", alignItems: "center" },
  savingsRateText: { fontSize: 24, fontWeight: "900", color: "#1e293b" },
  savingsLabel: { fontSize: 11, color: "#64748b", fontWeight: "600", marginTop: -2 },
  legend: { flex: 1, marginLeft: 16, gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 13, color: "#64748b", fontWeight: "500", flex: 1 },
  legendValue: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  insight: { fontSize: 13, color: "#64748b", marginTop: 16, lineHeight: 18, fontStyle: "italic" },
});
