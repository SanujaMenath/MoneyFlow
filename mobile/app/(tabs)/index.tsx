import { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fromDB } from '../../types/transaction';
import type { Transaction } from '../../types/transaction';
import { useCurrency } from '../../context/CurrencyContext';
import { processRecurringTransactions } from '../../services/transactionService';
import AnalyticsDonut from '../../components/AnalyticsDonut';
import SavingsGoalCard from '../../components/SavingsGoalCard';

const mainCardShadow = Platform.select({
  web: { boxShadow: "0 5px 10px rgba(37,99,235,0.3)" },
  default: { elevation: 5, shadowColor: '#2563eb', shadowOpacity: 0.3, shadowRadius: 10 },
});

export default function DashboardScreen() {
  const router = useRouter();
  const { format } = useCurrency();
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      await processRecurringTransactions();
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTransactions((data || []).map(fromDB));
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const stats = useMemo(() => {
    return transactions.reduce(
      (acc, t) => {
        if (t.type === "income") { acc.income += t.amount; acc.balance += t.amount; }
        else { acc.expenses += t.amount; acc.balance -= t.amount; }
        return acc;
      },
      { balance: 0, income: 0, expenses: 0 }
    );
  }, [transactions]);

  const healthScore = stats.income > 0
    ? Math.max(0, Math.round(((stats.income - stats.expenses) / stats.income) * 100))
    : 0;

  const aiInsight = stats.expenses > stats.income
    ? "Your spending this period has exceeded your income. Try identifying non-essential recurring expenses to balance your flow."
    : stats.income === 0
    ? "Start logging your income and expenses to get personalised financial insights."
    : "Great job! You are living below your means. This is a perfect time to set aside your surplus for long-term investments.";

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: insets.bottom }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Dashboard</Text>
        <TouchableOpacity onPress={() => router.push('/add')}>
          <Ionicons name="add-circle" size={40} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {/* Total Balance */}
      <View style={[styles.mainCard, mainCardShadow]}>
        <Text style={styles.cardLabel}>Total Balance</Text>
        <Text style={styles.balanceText}>{format(stats.balance)}</Text>
      </View>

      {/* Income / Expense Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: '#dcfce7' }]}>
          <Ionicons name="arrow-down-circle" size={24} color="#166534" />
          <Text style={styles.statLabel}>Income</Text>
          <Text style={[styles.statValue, { color: '#166534' }]}>+{format(stats.income)}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: '#fee2e2' }]}>
          <Ionicons name="arrow-up-circle" size={24} color="#991b1b" />
          <Text style={styles.statLabel}>Expenses</Text>
          <Text style={[styles.statValue, { color: '#991b1b' }]}>-{format(stats.expenses)}</Text>
        </View>
      </View>

      {/* Donut Chart + AI Insight */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Income vs Expenses</Text>
        <AnalyticsDonut income={stats.income} expenses={stats.expenses} />
      </View>

      {/* AI Insight */}
      <View style={styles.aiCard}>
        <View style={styles.aiHeader}>
          <Ionicons name="bulb" size={20} color="#fbbf24" />
          <Text style={styles.aiTitle}>AI Insight</Text>
        </View>
        <Text style={styles.aiText}>{aiInsight}</Text>
        <View style={styles.healthRow}>
          <Text style={styles.healthLabel}>Financial Health Score</Text>
          <Text style={styles.healthValue}>{healthScore}%</Text>
        </View>
      </View>

      {/* Savings Goal */}
      <SavingsGoalCard income={stats.income} expenses={stats.expenses} />

      {/* Quick link to transactions */}
      <TouchableOpacity style={styles.linkCard} onPress={() => router.push('/transactions')}>
        <Text style={styles.linkText}>View All Transactions</Text>
        <Ionicons name="chevron-forward" size={20} color="#64748b" />
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  greeting: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
  mainCard: { backgroundColor: '#2563eb', padding: 30, borderRadius: 24 },
  cardLabel: { color: '#bfdbfe', fontSize: 14, fontWeight: '600', textTransform: 'uppercase' as const },
  balanceText: { color: '#fff', fontSize: 36, fontWeight: '900', marginTop: 5 },
  statsRow: { flexDirection: 'row', gap: 15, marginTop: 20 },
  statBox: { flex: 1, padding: 20, borderRadius: 20 },
  statLabel: { fontSize: 12, color: '#64748b', fontWeight: '700', marginTop: 10, textTransform: 'uppercase' as const },
  statValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 20, marginTop: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#64748b', marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  aiCard: { backgroundColor: '#1e293b', padding: 20, borderRadius: 20, marginTop: 20 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  aiTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  aiText: { fontSize: 13, color: '#94a3b8', lineHeight: 20 },
  healthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#334155' },
  healthLabel: { fontSize: 10, color: '#60a5fa', fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: 1 },
  healthValue: { fontSize: 22, fontWeight: '900', color: '#fff' },
  linkCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderRadius: 16, marginTop: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  linkText: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
});
