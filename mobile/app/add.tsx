import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, ScrollView, Platform,
} from "react-native";
import { createTransaction } from "../services/transactionService";
import type { RecurringFrequency } from "../types/transaction";
import { incomeCategories, expenseCategories, frequencies } from "../types/transaction";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DatePicker from "../components/DatePicker";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";

const saveBtnShadow = Platform.select({
  web: { boxShadow: "0 5px 10px rgba(37,99,235,0.3)" },
  default: { elevation: 5, shadowColor: "#2563eb", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
});

export default function AddTransactionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [date, setDate] = useState(new Date());
  const [frequency, setFrequency] = useState<RecurringFrequency>("none");
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [customCategory, setCustomCategory] = useState("");

  const categories = type === "income" ? incomeCategories : expenseCategories;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCategory("");
    setCustomCategory("");
  }, [type]);

  const showAndroidPicker = (isEndDate: boolean) => {
    DateTimePickerAndroid.open({
      value: isEndDate ? (endDate || new Date()) : date,
      onChange: (_event: any, selectedDate?: Date) => {
        if (selectedDate) {
          if (isEndDate) setEndDate(selectedDate);
          else setDate(selectedDate);
        }
      },
      mode: "date",
    });
  };

  async function handleSave() {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount greater than 0.");
      return;
    }
    const finalCategory = (category === "Other Income" || category === "Other Expense") && customCategory.trim()
      ? customCategory.trim()
      : category;
    if (!finalCategory) {
      Alert.alert("Error", "Please select a category.");
      return;
    }

    setLoading(true);
    try {
      await createTransaction({
        amount: Math.round(numericAmount * 100),
        type,
        category: finalCategory,
        date: date.toISOString().split("T")[0],
        createdAt: new Date().toISOString(),
        recurringFrequency: frequency,
        recurringEndDate: endDate ? endDate.toISOString().split("T")[0] : null,
      });

      Alert.alert("Success", "Transaction recorded!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
      <Text style={[styles.title, { paddingTop: insets.top + 20 }]}>New Transaction</Text>

      {/* Type Selector */}
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.typeBtn, type === "expense" && styles.expenseActive]}
          onPress={() => setType("expense")}
        >
          <Text style={[styles.typeText, type === "expense" && styles.whiteText]}>Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeBtn, type === "income" && styles.incomeActive]}
          onPress={() => setType("income")}
        >
          <Text style={[styles.typeText, type === "income" && styles.whiteText]}>Income</Text>
        </TouchableOpacity>
      </View>

      {/* Amount */}
      <Text style={styles.label}>Amount</Text>
      <TextInput
        style={styles.input}
        placeholder="0.00"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
      />

      {/* Category */}
      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryGrid}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryChip,
              category === cat && (type === "income" ? styles.incomeChipActive : styles.expenseChipActive),
            ]}
            onPress={() => {
              setCategory(cat);
              if (cat !== "Other Income" && cat !== "Other Expense") setCustomCategory("");
            }}
          >
            <Text style={[styles.categoryChipText, category === cat && styles.whiteText]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {(category === "Other Income" || category === "Other Expense" || category === "Other") && (
        <TextInput
          style={[styles.input, { marginTop: 10 }]}
          placeholder="Type custom category..."
          value={customCategory}
          onChangeText={setCustomCategory}
        />
      )}

      {/* Date */}
      <Text style={styles.label}>Date</Text>
      <TouchableOpacity
        style={styles.datePicker}
        onPress={() => (Platform.OS === "android" ? showAndroidPicker(false) : setShowDatePicker(true))}
      >
        <Text style={styles.dateText}>{date.toDateString()}</Text>
      </TouchableOpacity>
      {Platform.OS !== "android" && showDatePicker && (
        <DatePicker value={date} onChange={setDate} show={showDatePicker} onClose={() => setShowDatePicker(false)} />
      )}

      {/* Recurring Frequency */}
      <Text style={styles.label}>Recurring</Text>
      <View style={styles.frequencyRow}>
        {frequencies.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.freqBtn, frequency === f.value && styles.freqActive]}
            onPress={() => setFrequency(f.value)}
          >
            <Text style={[styles.freqText, frequency === f.value && styles.whiteText]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recurring End Date */}
      {frequency !== "none" && (
        <>
          <Text style={styles.label}>End Date (optional)</Text>
          <TouchableOpacity
            style={styles.datePicker}
            onPress={() => (Platform.OS === "android" ? showAndroidPicker(true) : setShowEndDatePicker(true))}
          >
            <Text style={styles.dateText}>{endDate ? endDate.toDateString() : "No end date"}</Text>
          </TouchableOpacity>
          {Platform.OS !== "android" && showEndDatePicker && (
            <DatePicker value={endDate || new Date()} onChange={(d) => setEndDate(d)} show={showEndDatePicker} onClose={() => setShowEndDatePicker(false)} />
          )}
        </>
      )}

      {/* Save */}
      <TouchableOpacity style={[styles.saveBtn, saveBtnShadow]} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Transaction</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  title: { fontSize: 26, fontWeight: "900", color: "#1e293b", marginVertical: 20 },
  label: { fontSize: 14, fontWeight: "700", color: "#64748b", marginBottom: 10, marginTop: 20, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: "#e2e8f0", padding: 16, borderRadius: 14, fontSize: 16, backgroundColor: "#f8fafc" },
  row: { flexDirection: "row", gap: 10, marginBottom: 10 },
  typeBtn: { flex: 1, padding: 16, borderRadius: 14, alignItems: "center", backgroundColor: "#f1f5f9" },
  expenseActive: { backgroundColor: "#ef4444" },
  incomeActive: { backgroundColor: "#10b981" },
  typeText: { fontWeight: "700", color: "#64748b" },
  whiteText: { color: "#fff" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#e2e8f0" },
  categoryChipText: { fontSize: 13, fontWeight: "600", color: "#475569" },
  incomeChipActive: { backgroundColor: "#10b981", borderColor: "#10b981" },
  expenseChipActive: { backgroundColor: "#ef4444", borderColor: "#ef4444" },
  datePicker: { padding: 16, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 14, backgroundColor: "#f8fafc" },
  dateText: { fontSize: 16, color: "#1e293b", fontWeight: "500" },
  frequencyRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  freqBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: "#f1f5f9" },
  freqActive: { backgroundColor: "#2563eb" },
  freqText: { fontSize: 13, fontWeight: "600", color: "#475569" },
  saveBtn: { backgroundColor: "#2563eb", padding: 18, borderRadius: 16, alignItems: "center", marginTop: 40 },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 18 },
});
