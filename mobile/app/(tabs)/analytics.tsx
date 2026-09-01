import { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { supabase } from "../../lib/supabase";
import { useTranslation } from "react-i18next";
import { fromDB } from "../../types/transaction";
import type { Transaction } from "../../types/transaction";
import { useFocusEffect } from "expo-router";
import { useCurrency } from "../../context/CurrencyContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../../context/useThemeColors";
import { processRecurringTransactions } from "../../services/transactionService";
import CategoryBarChart from "../../components/CategoryBarChart";

export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = makeStyles(colors, insets);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      await processRecurringTransactions();
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      setTransactions((data || []).map(fromDB));
    } catch (err) {
      console.error("Failed to fetch analytics data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const expensesOnly = useMemo(() => transactions.filter((t) => t.type === "expense"), [transactions]);

  const categoryData = useMemo(() => {
    const totals: Record<string, number> = {};
    expensesOnly.forEach((t) => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
    return Object.entries(totals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [expensesOnly]);

  const totalSpend = expensesOnly.reduce((s, t) => s + t.amount, 0);
  const topTwo = categoryData.slice(0, 2);
  const biggestPct = totalSpend > 0 && topTwo.length > 0 ? Math.round((topTwo[0].amount / totalSpend) * 100) : 0;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
    >
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.title}>{t("analytics.title")}</Text>
      </View>

      {/* Category Breakdown */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t("analytics.expensesByCategory")}</Text>
        <CategoryBarChart data={categoryData} />
      </View>

      {/* Key Insights */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t("analytics.keyInsights")}</Text>
        {topTwo.length > 0 && (
          <>
            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>{t("analytics.biggestExpense")}</Text>
              <Text style={styles.insightValue}>{topTwo[0].category}</Text>
              <Text style={styles.insightPct}>{biggestPct}{t("analytics.percentOfTotal")}</Text>
            </View>
            {topTwo.length > 1 && (
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>{t("analytics.secondBiggest")}</Text>
                <Text style={styles.insightValue}>{topTwo[1].category}</Text>
                <Text style={styles.insightPct}>
                  {Math.round((topTwo[1].amount / totalSpend) * 100)}{t("analytics.percentOfTotal")}
                </Text>
              </View>
            )}
          </>
        )}
        <View style={[styles.insightRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.insightLabel}>{t("analytics.totalTrackedSpend")}</Text>
          <Text style={[styles.insightValue, { color: colors.expense, fontSize: 18 }]}>{format(totalSpend)}</Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const makeStyles = (colors: any, insets: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
    header: { marginBottom: 20 },
    title: { fontSize: 28, fontWeight: "800", color: colors.text },
    card: { backgroundColor: colors.card, padding: 20, borderRadius: 20, marginTop: 16, borderWidth: 1, borderColor: colors.cardBorder },
    sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.textSecondary, marginBottom: 16, textTransform: "uppercase" as const, letterSpacing: 0.5 },
    insightRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight, gap: 8 },
    insightLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: "500", flex: 1 },
    insightValue: { fontSize: 14, fontWeight: "700", color: colors.text },
    insightPct: { fontSize: 12, fontWeight: "600", color: colors.primary, minWidth: 70, textAlign: "right" as const },
  });
