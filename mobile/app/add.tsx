import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, ScrollView, Platform,
} from "react-native";
import { createTransaction } from "../services/transactionService";
import type { RecurringFrequency } from "../types/transaction";
import { incomeCategories, expenseCategories, frequencies, categoryI18nKeys } from "../types/transaction";
import { useTranslation } from "react-i18next";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../context/useThemeColors";
import { useTheme } from "../context/ThemeContext";
import DatePicker from "../components/DatePicker";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

import { formatDateString } from "@moneyflow/shared/utils/date";

export default function AddTransactionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { resolvedTheme } = useTheme();
  const s = makeStyles(colors);

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
      Alert.alert(t("common.error"), t("add.invalidAmount"));
      return;
    }
    const finalCategory = (category === "Other Income" || category === "Other Expense") && customCategory.trim()
      ? customCategory.trim()
      : category;
    if (!finalCategory) {
      Alert.alert(t("common.error"), t("add.selectCategory"));
      return;
    }

    setLoading(true);
    try {
      await createTransaction({
        amount: Math.round(numericAmount * 100),
        type,
        category: finalCategory,
        date: formatDateString(date),
        createdAt: new Date().toISOString(),
        recurringFrequency: frequency,
        recurringEndDate: endDate ? formatDateString(endDate) : null,
      });

      if (Platform.OS === "web") {
        window.alert(t("add.recorded"));
        router.back();
      } else {
        Alert.alert(t("common.success"), t("add.recorded"), [
          { text: t("common.ok"), onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} backgroundColor={colors.background} />
      <Stack.Screen
        options={{
          title: t("add.title"),
          headerShown: true,
          headerTitleAlign: "center",
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            color: colors.text,
            fontWeight: "700",
            fontSize: 18,
          },
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{ paddingRight: 8 }}
            >
              <Ionicons
                name={Platform.OS === "ios" ? "chevron-back" : "arrow-back"}
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={s.container}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: insets.bottom + 40,
        }}
      >
        <View style={s.row}>
        <TouchableOpacity
          style={[s.typeBtn, type === "expense" && s.expenseActive]}
          onPress={() => setType("expense")}
        >
          <Text style={[s.typeText, type === "expense" && s.whiteText]}>{t("add.expense")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.typeBtn, type === "income" && s.incomeActive]}
          onPress={() => setType("income")}
        >
          <Text style={[s.typeText, type === "income" && s.whiteText]}>{t("add.income")}</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.label}>{t("add.amount")}</Text>
      <TextInput
        style={s.input}
        placeholder={t("add.amountPlaceholder")}
        placeholderTextColor={colors.placeholder}
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
      />

      <Text style={s.label}>{t("add.category")}</Text>
      <View style={s.categoryGrid}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[s.categoryChip, category === cat && (type === "income" ? s.incomeChipActive : s.expenseChipActive)]}
            onPress={() => {
              setCategory(cat);
              if (cat !== "Other Income" && cat !== "Other Expense") setCustomCategory("");
            }}
          >
            <Text style={[s.categoryChipText, category === cat && s.whiteText]}>
              {t(categoryI18nKeys[cat])}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {(category === "Other Income" || category === "Other Expense" || category === "Other") && (
        <TextInput
          style={[s.input, { marginTop: 10 }]}
          placeholder={t("add.customCategoryPlaceholder")}
          placeholderTextColor={colors.placeholder}
          value={customCategory}
          onChangeText={setCustomCategory}
        />
      )}

      <Text style={s.label}>{t("add.date")}</Text>
      <TouchableOpacity
        style={s.datePicker}
        onPress={() => (Platform.OS === "android" ? showAndroidPicker(false) : setShowDatePicker(true))}
      >
        <Text style={s.dateText}>{date.toDateString()}</Text>
      </TouchableOpacity>
      {Platform.OS !== "android" && showDatePicker && (
        <DatePicker value={date} onChange={setDate} show={showDatePicker} onClose={() => setShowDatePicker(false)} />
      )}

      <Text style={s.label}>{t("add.recurring")}</Text>
      <View style={s.frequencyRow}>
        {frequencies.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[s.freqBtn, frequency === f.value && s.freqActive]}
            onPress={() => setFrequency(f.value)}
          >
            <Text style={[s.freqText, frequency === f.value && s.whiteText]}>{t(f.key)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {frequency !== "none" && (
        <>
          <Text style={s.label}>{t("add.endDate")}</Text>
          <TouchableOpacity
            style={s.datePicker}
            onPress={() => (Platform.OS === "android" ? showAndroidPicker(true) : setShowEndDatePicker(true))}
          >
            <Text style={s.dateText}>{endDate ? endDate.toDateString() : t("add.noEndDate")}</Text>
          </TouchableOpacity>
          {Platform.OS !== "android" && showEndDatePicker && (
            <DatePicker value={endDate || new Date()} onChange={(d) => setEndDate(d)} show={showEndDatePicker} onClose={() => setShowEndDatePicker(false)} />
          )}
        </>
      )}

      <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>{t("add.save")}</Text>}
      </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  label: { fontSize: 14, fontWeight: "700", color: colors.textSecondary, marginBottom: 10, marginTop: 20, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: colors.inputBorder, padding: 16, borderRadius: 14, fontSize: 16, backgroundColor: colors.inputBg, color: colors.text },
  row: { flexDirection: "row", gap: 10, marginBottom: 10 },
  typeBtn: { flex: 1, padding: 16, borderRadius: 14, alignItems: "center", backgroundColor: colors.surfaceAlt },
  expenseActive: { backgroundColor: colors.expense },
  incomeActive: { backgroundColor: colors.income },
  typeText: { fontWeight: "700", color: colors.textSecondary },
  whiteText: { color: "#fff" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  categoryChipText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  incomeChipActive: { backgroundColor: colors.income, borderColor: colors.income },
  expenseChipActive: { backgroundColor: colors.expense, borderColor: colors.expense },
  datePicker: { padding: 16, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 14, backgroundColor: colors.inputBg },
  dateText: { fontSize: 16, color: colors.text, fontWeight: "500" },
  frequencyRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  freqBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  freqActive: { backgroundColor: colors.primary },
  freqText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  saveBtn: { backgroundColor: colors.primary, padding: 18, borderRadius: 16, alignItems: "center", marginTop: 40 },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 18 },
});
