import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useCurrency } from "../../context/CurrencyContext";
import { useTheme } from "../../context/ThemeContext";
import { useThemeColors } from "../../context/useThemeColors";
import { supabase } from "../../lib/supabase";
import { getTransactions } from "../../services/transactionService";
import type { Transaction } from "@moneyflow/shared";
import { Ionicons } from "@expo/vector-icons";
import SavingsGoalCard from "../../components/SavingsGoalCard";
import AnalyticsDonut from "../../components/AnalyticsDonut";

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { format } = useCurrency();
  const { resolvedTheme } = useTheme();
  const colors = useThemeColors();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState("");

  const s = makeStyles(colors, insets);

  const loadTransactions = useCallback(async () => {
    try {
      const data = await getTransactions();
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserName(user.email.split("@")[0]);
    });
  }, [loadTransactions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTransactions();
  }, [loadTransactions]);

  const totalIncome = transactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpenses = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const balance = totalIncome - totalExpenses;
  const healthScore = totalIncome > 0
    ? Math.round((1 - totalExpenses / totalIncome) * 100)
    : 0;

  const getHealthEmoji = () => {
    if (healthScore >= 50) return "🟢";
    if (healthScore >= 25) return "🟡";
    return "🔴";
  };

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={[s.header, { paddingTop: insets.top + 20 }]}>
        <View>
          <Text style={s.greeting}>Hi, {userName || "User"}</Text>
          <Text style={s.title}>{t("dashboard.title")}</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => router.push("/add")}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ paddingVertical: 60, alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {/* Balance Card */}
          <View style={s.balanceCard}>
            <Text style={s.balanceLabel}>{t("dashboard.totalBalance")}</Text>
            <Text style={s.balanceAmount}>{format(balance)}</Text>
            <View style={s.balanceRow}>
              <View style={s.balanceItem}>
                <Text style={s.balanceItemLabel}>{t("dashboard.income")}</Text>
                <Text style={[s.balanceItemValue, { color: colors.income }]}>{format(totalIncome)}</Text>
              </View>
              <View style={s.balanceDivider} />
              <View style={s.balanceItem}>
                <Text style={s.balanceItemLabel}>{t("dashboard.expenses")}</Text>
                <Text style={[s.balanceItemValue, { color: colors.expense }]}>{format(totalExpenses)}</Text>
              </View>
            </View>
          </View>

          {/* Health Score */}
          <View style={s.card}>
            <Text style={s.cardTitle}>{t("dashboard.healthScore")}</Text>
            <View style={s.healthRow}>
              <Text style={s.healthEmoji}>{getHealthEmoji()}</Text>
              <Text style={s.healthScoreText}>{healthScore}%</Text>
            </View>
            <View style={s.healthBar}>
              <View style={[s.healthFill, { width: `${Math.max(0, Math.min(100, healthScore))}%`, backgroundColor: healthScore >= 50 ? colors.income : healthScore >= 25 ? "#f59e0b" : colors.expense }]} />
            </View>
          </View>

          {/* Chart */}
          {transactions.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>{t("dashboard.incomeVsExpenses")}</Text>
              <AnalyticsDonut income={totalIncome} expenses={totalExpenses} />
            </View>
          )}

          {/* Savings Goal */}
          <SavingsGoalCard
            income={totalIncome}
            expenses={totalExpenses}
          />

          {/* AI Insight */}
          <View style={s.card}>
            <Text style={s.cardTitle}>{t("dashboard.aiInsight")}</Text>
            {totalIncome > 0 || totalExpenses > 0 ? (
              <Text style={s.insightText}>
                {totalIncome > totalExpenses
                  ? `${t("components.greatSavingsRate")} ${t("components.surplus", { amount: format(totalIncome - totalExpenses) })}`
                  : t("components.saveAtLeast20")}
              </Text>
            ) : (
              <Text style={s.insightText}>{t("dashboard.emptyInsight")}</Text>
            )}
          </View>

          <TouchableOpacity style={s.viewAllBtn} onPress={() => router.push("/transactions")}>
            <Text style={s.viewAllText}>{t("dashboard.viewAll")}</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: any, insets: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  greeting: { fontSize: 14, color: colors.textMuted, fontWeight: "500" },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  addBtn: { backgroundColor: colors.primary, width: 48, height: 48, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  balanceCard: { backgroundColor: colors.primary, padding: 24, borderRadius: 24, marginBottom: 16 },
  balanceLabel: { fontSize: 13, color: "#bfdbfe", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  balanceAmount: { fontSize: 36, fontWeight: "900", color: "#fff", marginVertical: 8 },
  balanceRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 16, padding: 16, marginTop: 8 },
  balanceItem: { flex: 1, alignItems: "center" },
  balanceItemLabel: { fontSize: 11, color: "#bfdbfe", fontWeight: "600", textTransform: "uppercase" },
  balanceItemValue: { fontSize: 18, fontWeight: "800", marginTop: 4 },
  balanceDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)", marginHorizontal: 8 },
  card: { backgroundColor: colors.card, padding: 20, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.cardBorder },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  healthRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  healthEmoji: { fontSize: 32 },
  healthScoreText: { fontSize: 32, fontWeight: "900", color: colors.text },
  healthBar: { height: 8, backgroundColor: colors.surfaceAlt, borderRadius: 4, overflow: "hidden" },
  healthFill: { height: 8, borderRadius: 4 },
  insightText: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  viewAllBtn: { backgroundColor: colors.surfaceAlt, padding: 16, borderRadius: 16, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  viewAllText: { color: colors.primary, fontWeight: "700", fontSize: 15 },
});
