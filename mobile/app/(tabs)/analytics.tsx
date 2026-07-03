import { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { supabase } from "../../lib/supabase";
import { fromDB } from "../../types/transaction";
import type { Transaction } from "../../types/transaction";
import { useFocusEffect } from "expo-router";
import { useCurrency } from "../../context/CurrencyContext";
import CategoryBarChart from "../../components/CategoryBarChart";

export default function AnalyticsScreen() {
  const { format } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      setTransactions((data || []).map(fromDB));
    } catch (e) {
      console.error("Failed to load analytics data:", e);
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
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
      </View>

      {/* Category Breakdown */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Expenses by Category</Text>
        <CategoryBarChart data={categoryData} />
      </View>

      {/* Key Insights */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Key Spending Insights</Text>
        {topTwo.length > 0 && (
          <>
            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Biggest Expense</Text>
              <Text style={styles.insightValue}>{topTwo[0].category}</Text>
              <Text style={styles.insightPct}>{biggestPct}% of total</Text>
            </View>
            {topTwo.length > 1 && (
              <View style={styles.insightRow}>
                <Text style={styles.insightLabel}>Second Biggest</Text>
                <Text style={styles.insightValue}>{topTwo[1].category}</Text>
                <Text style={styles.insightPct}>
                  {Math.round((topTwo[1].amount / totalSpend) * 100)}% of total
                </Text>
              </View>
            )}
          </>
        )}
        <View style={[styles.insightRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.insightLabel}>Total Tracked Spend</Text>
          <Text style={[styles.insightValue, { color: "#ef4444", fontSize: 18 }]}>{format(totalSpend)}</Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { marginTop: 60, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "800", color: "#1e293b" },
  card: { backgroundColor: "#fff", padding: 20, borderRadius: 20, marginTop: 16, borderWidth: 1, borderColor: "#e2e8f0" },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#64748b", marginBottom: 16, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  insightRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", gap: 8 },
  insightLabel: { fontSize: 13, color: "#64748b", fontWeight: "500", flex: 1 },
  insightValue: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  insightPct: { fontSize: 12, fontWeight: "600", color: "#2563eb", minWidth: 70, textAlign: "right" as const },
});
