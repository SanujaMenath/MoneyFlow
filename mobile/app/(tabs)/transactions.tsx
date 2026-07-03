import { useState, useCallback, useMemo } from "react";
import {
  View, Text, FlatList, ActivityIndicator, TouchableOpacity,
  RefreshControl, StyleSheet, Alert, AlertButton, Platform,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { processRecurringTransactions } from "../../services/transactionService";
import { fromDB } from "../../types/transaction";
import type { Transaction } from "../../types/transaction";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCurrency } from "../../context/CurrencyContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import DatePicker from "../../components/DatePicker";

const PRESETS = [
  { label: "All Time", key: "all" as const },
  { label: "This Month", key: "this" as const },
  { label: "Last Month", key: "last" as const },
];

const fabShadow = Platform.select({
  web: { boxShadow: "0 8px 16px rgba(37,99,235,0.3)" },
  default: { elevation: 8, shadowColor: "#2563eb", shadowOpacity: 0.3, shadowRadius: 8 },
});

const getMonthRange = (offset: number) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + offset;
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
};

export default function TransactionsScreen() {
  const { format } = useCurrency();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const fetchData = async () => {
    try {
      await processRecurringTransactions();
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setTransactions((data || []).map(fromDB));
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;
      return true;
    });
  }, [transactions, startDate, endDate]);

  const totalIncome = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const handlePreset = (key: "all" | "this" | "last") => {
    if (key === "all") { setStartDate(""); setEndDate(""); }
    else {
      const range = getMonthRange(key === "this" ? 0 : -1);
      setStartDate(range.start);
      setEndDate(range.end);
    }
  };

  const isFiltered = startDate !== "" || endDate !== "";

  const handleDelete = async (id: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { Alert.alert("Error", "You must be signed in to delete transactions."); return; }

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) Alert.alert("Error", error.message);
    else fetchData();
  };

  const handleStopRecurring = async (id: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { Alert.alert("Error", "You must be signed in."); return; }

    const { error } = await supabase
      .from("transactions")
      .update({ recurring_frequency: "none" })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) Alert.alert("Error", error.message);
    else fetchData();
  };

  const showActionMenu = (item: Transaction) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    const buttons: AlertButton[] = [
      {
        text: "Delete", style: "destructive",
        onPress: () =>
          Alert.alert("Delete", "Are you sure?", [
            { text: "Cancel" },
            { text: "Delete", onPress: () => handleDelete(item.id!) },
          ]),
      },
    ];
    if (item.recurringFrequency && item.recurringFrequency !== "none") {
      buttons.unshift({
        text: "Stop Recurring", style: "default",
        onPress: () =>
          Alert.alert("Stop Recurring", "Future occurrences will stop. Past records remain.", [
            { text: "Cancel" },
            { text: "Stop", onPress: () => handleStopRecurring(item.id!) },
          ]),
      });
    }
    buttons.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Transaction Options", `${item.category}: ${format(item.amount)}`, buttons);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.subtitle}>{filtered.length} of {transactions.length} records</Text>
      </View>

      {/* Summary Strip */}
      {filtered.length > 0 && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryValue, { color: "#10b981" }]}>+{format(totalIncome)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Expenses</Text>
            <Text style={[styles.summaryValue, { color: "#ef4444" }]}>-{format(totalExpense)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Saving</Text>
            <Text style={[styles.summaryValue, { color: totalIncome - totalExpense >= 0 ? "#1e293b" : "#ef4444" }]}>
              {totalIncome - totalExpense >= 0 ? "+" : "-"}{format(Math.abs(totalIncome - totalExpense))}
            </Text>
          </View>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filterRow}>
        <View style={styles.presetRow}>
          {PRESETS.map((p) => {
            const active = p.key === "all" ? !isFiltered
              : p.key === "this" ? startDate === getMonthRange(0).start
              : startDate === getMonthRange(-1).start;
            return (
              <TouchableOpacity key={p.key} style={[styles.pill, active && styles.pillActive]} onPress={() => handlePreset(p.key)}>
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.dateInputRow}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStartPicker(true)}>
            <Ionicons name="calendar" size={14} color="#94a3b8" />
            <Text style={styles.dateBtnText}>{startDate || "From"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEndPicker(true)}>
            <Ionicons name="calendar" size={14} color="#94a3b8" />
            <Text style={styles.dateBtnText}>{endDate || "To"}</Text>
          </TouchableOpacity>
          {isFiltered && (
            <TouchableOpacity onPress={() => { setStartDate(""); setEndDate(""); }}>
              <Ionicons name="close-circle" size={20} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <DatePicker value={startDate ? new Date(startDate) : new Date()} onChange={(d) => setStartDate(d.toISOString().split("T")[0])} show={showStartPicker} onClose={() => setShowStartPicker(false)} />
      <DatePicker value={endDate ? new Date(endDate) : new Date()} onChange={(d) => setEndDate(d.toISOString().split("T")[0])} show={showEndPicker} onClose={() => setShowEndPicker(false)} />

      {/* List */}
      <FlatList
        data={filtered}
        contentContainerStyle={{ paddingBottom: 100 }}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onLongPress={() => showActionMenu(item)} delayLongPress={500} activeOpacity={0.7}>
            <View style={styles.cardLeft}>
              <Text style={styles.category}>{item.category}</Text>
              <View style={styles.cardMeta}>
                <Text style={styles.date}>{item.date}</Text>
                {item.recurringFrequency && item.recurringFrequency !== "none" && (
                  <View style={styles.recurringBadge}>
                    <Ionicons name="repeat" size={10} color="#2563eb" />
                    <Text style={styles.recurringText}>{item.recurringFrequency}</Text>
                  </View>
                )}
              </View>
            </View>
            <Text style={[styles.amount, { color: item.type === "expense" ? "#ef4444" : "#10b981" }]}>
              {item.type === "expense" ? "-" : "+"}{format(item.amount)}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>{isFiltered ? "No transactions found for this date range." : "No transactions yet."}</Text>}
      />

      <TouchableOpacity style={[styles.fab, { bottom: Math.max(insets.bottom, 80) }, fabShadow]} onPress={() => router.push("/add")}>
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: "800", color: "#1e293b" },
  subtitle: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  summaryRow: { flexDirection: "row", marginHorizontal: 20, marginVertical: 8, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0", overflow: "hidden" },
  summaryItem: { flex: 1, padding: 12, alignItems: "center", borderRightWidth: 1, borderRightColor: "#f1f5f9" },
  summaryLabel: { fontSize: 10, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: 0.5 },
  summaryValue: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  filterRow: { paddingHorizontal: 20, paddingVertical: 8, gap: 8 },
  presetRow: { flexDirection: "row", gap: 6 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0" },
  pillActive: { backgroundColor: "#1e293b", borderColor: "#1e293b" },
  pillText: { fontSize: 11, fontWeight: "600", color: "#64748b" },
  pillTextActive: { color: "#fff" },
  dateInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#e2e8f0", flex: 1 },
  dateBtnText: { fontSize: 12, color: "#64748b", fontWeight: "500" },
  card: { marginHorizontal: 20, marginVertical: 4, padding: 16, backgroundColor: "#fff", borderRadius: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#f1f5f9" },
  cardLeft: { flex: 1 },
  category: { fontSize: 15, fontWeight: "600", color: "#1e293b" },
  cardMeta: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  date: { fontSize: 12, color: "#64748b" },
  recurringBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#dbeafe", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
  recurringText: { fontSize: 10, color: "#2563eb", fontWeight: "700", marginLeft: 3, textTransform: "uppercase" as const },
  amount: { fontSize: 16, fontWeight: "700" },
  emptyText: { textAlign: "center", marginTop: 40, color: "#94a3b8", fontSize: 15 },
  fab: { position: "absolute", right: 20, backgroundColor: "#2563eb", width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center" },
});
