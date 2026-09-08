import { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Alert,
  AlertButton,
  Platform,
  Modal,
  TextInput,
} from "react-native";
import {
  processRecurringTransactions,
  getTransactionsPaginated,
  deleteTransaction,
  updateTransaction,
} from "../../services/transactionService";
import { toLocalDate, formatDateString } from "@moneyflow/shared/utils/date";
import type { Transaction } from "../../types/transaction";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../../context/CurrencyContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../../context/useThemeColors";
import { useTheme } from "../../context/ThemeContext";
import * as Haptics from "expo-haptics";
import DatePicker from "../../components/DatePicker";

const PAGE_SIZE = 50;

const PRESETS = (t: (key: string) => string) => [
  { label: t("transactions.allTime"), key: "all" as const },
  { label: t("transactions.thisMonth"), key: "this" as const },
  { label: t("transactions.lastMonth"), key: "last" as const },
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
    start: formatDateString(start),
    end: formatDateString(end),
  };
};

export default function TransactionsScreen() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { resolvedTheme } = useTheme();
  const styles = makeStyles(colors, insets);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const recurringDone = useRef(false);

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchPage = useCallback(async (p: number, replace = false, sDate?: string, eDate?: string) => {
    try {
      if (!recurringDone.current) {
        await processRecurringTransactions();
        recurringDone.current = true;
      }
      const s = sDate !== undefined ? sDate : startDate;
      const e = eDate !== undefined ? eDate : endDate;
      const result = await getTransactionsPaginated(p, PAGE_SIZE, {
        startDate: s || undefined,
        endDate: e || undefined,
      });
      if (replace) {
        setTransactions(result.data);
      } else {
        setTransactions((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          const newItems = result.data.filter((t) => !existingIds.has(t.id));
          return [...prev, ...newItems];
        });
      }
      setTotal(result.total);
      setHasMore(p < result.totalPages);
      setPage(p);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [startDate, endDate]);

  const refreshData = useCallback(() => {
    setLoading(true);
    setPage(1);
    recurringDone.current = false;
    fetchPage(1, true);
  }, [fetchPage]);

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    recurringDone.current = false;
    fetchPage(1, true);
  }, [fetchPage]);

  const onEndReached = useCallback(() => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      fetchPage(page + 1, false);
    }
  }, [loadingMore, hasMore, page, fetchPage]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;
      return true;
    });
  }, [transactions, startDate, endDate]);

  const totalIncome = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const handlePreset = (key: "all" | "this" | "last") => {
    let s = "";
    let e = "";
    if (key === "this") {
      const range = getMonthRange(0);
      s = range.start;
      e = range.end;
    } else if (key === "last") {
      const range = getMonthRange(-1);
      s = range.start;
      e = range.end;
    }
    setStartDate(s);
    setEndDate(e);
    setLoading(true);
    setPage(1);
    fetchPage(1, true, s, e);
  };

  const handleStartEdit = (item: Transaction) => {
    setEditingTx(item);
    setEditAmount((item.amount / 100).toFixed(2));
    setEditCategory(item.category);
    setEditDescription(item.description || "");
  };

  const handleSaveEdit = async () => {
    if (!editingTx) return;
    const num = parseFloat(editAmount);
    if (isNaN(num) || num <= 0) {
      Alert.alert(t("common.error"), t("add.invalidAmount"));
      return;
    }
    setSavingEdit(true);
    try {
      await updateTransaction(editingTx.id!, {
        amount: Math.round(num * 100),
        category: editCategory,
        description: editDescription.trim() || null,
      });
      setEditingTx(null);
      refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("common.error");
      Alert.alert(t("common.error"), msg);
    } finally {
      setSavingEdit(false);
    }
  };

  const isFiltered = startDate !== "" || endDate !== "";

  const handleDelete = async (id: number) => {
    if (Platform.OS === "web") {
      if (!window.confirm(t("transactions.areYouSure", "Are you sure you want to delete this transaction?"))) {
        return;
      }
    }
    try {
      await deleteTransaction(id);
      refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("common.error");
      Alert.alert(t("common.error"), msg);
    }
  };

  const handleStopRecurring = async (id: number) => {
    if (Platform.OS === "web") {
      if (!window.confirm(t("transactions.stopRecurringDesc", "This will stop future occurrences of this transaction."))) {
        return;
      }
    }
    try {
      await updateTransaction(id, { recurringFrequency: "none" });
      refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("common.error");
      Alert.alert(t("common.error"), msg);
    }
  };

  const showActionMenu = (item: Transaction) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    if (Platform.OS === "web") {
      const action = window.prompt(
        `${item.category}: ${format(item.amount)}\nType "edit" to edit, "delete" to delete${
          item.recurringFrequency && item.recurringFrequency !== "none" ? ', or "stop" to stop recurrence' : ""
        }:`,
        ""
      );
      if (action?.toLowerCase() === "delete") {
        handleDelete(item.id!);
      } else if (action?.toLowerCase() === "stop" && item.recurringFrequency && item.recurringFrequency !== "none") {
        handleStopRecurring(item.id!);
      } else if (action?.toLowerCase() === "edit") {
        handleStartEdit(item);
      }
      return;
    }
    const buttons: AlertButton[] = [
      {
        text: t("common.edit", "Edit"),
        style: "default",
        onPress: () => handleStartEdit(item),
      },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () =>
          Alert.alert(t("common.delete"), t("transactions.areYouSure"), [
            { text: t("common.cancel") },
            { text: t("common.delete"), onPress: () => handleDelete(item.id!) },
          ]),
      },
    ];
    if (item.recurringFrequency && item.recurringFrequency !== "none") {
      buttons.splice(1, 0, {
        text: t("transactions.stopRecurring"),
        style: "default",
        onPress: () =>
          Alert.alert(t("transactions.stopRecurring"), t("transactions.stopRecurringDesc"), [
            { text: t("common.cancel") },
            { text: t("common.stop"), onPress: () => handleStopRecurring(item.id!) },
          ]),
      });
    }
    buttons.push({ text: t("common.cancel"), style: "cancel" });
    Alert.alert(
      t("transactions.transactionOptions"),
      `${item.category}: ${format(item.amount)}`,
      buttons,
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.title}>{t("transactions.title")}</Text>
        <Text style={styles.subtitle}>
          {filtered.length} {t("transactions.of")} {total} {t("transactions.records")}
        </Text>
      </View>

      {/* Summary Strip */}
      {filtered.length > 0 && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{t("transactions.income")}</Text>
            <Text style={[styles.summaryValue, { color: colors.income }]}>+{format(totalIncome)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{t("transactions.expenses")}</Text>
            <Text style={[styles.summaryValue, { color: colors.expense }]}>-{format(totalExpense)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{t("transactions.saving")}</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: totalIncome - totalExpense >= 0 ? colors.text : colors.expense },
              ]}
            >
              {totalIncome - totalExpense >= 0 ? "+" : "-"}
              {format(Math.abs(totalIncome - totalExpense))}
            </Text>
          </View>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filterRow}>
        <View style={styles.presetRow}>
          {PRESETS(t).map((p) => {
            const active =
              p.key === "all"
                ? !isFiltered
                : p.key === "this"
                  ? startDate === getMonthRange(0).start
                  : startDate === getMonthRange(-1).start;
            return (
              <TouchableOpacity
                key={p.key}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => handlePreset(p.key)}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.dateInputRow}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStartPicker(true)}>
            <Ionicons name="calendar" size={14} color={colors.textMuted} />
            <Text style={styles.dateBtnText}>{startDate || t("transactions.from")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEndPicker(true)}>
            <Ionicons name="calendar" size={14} color={colors.textMuted} />
            <Text style={styles.dateBtnText}>{endDate || t("transactions.to")}</Text>
          </TouchableOpacity>
          {isFiltered && (
            <TouchableOpacity
              onPress={() => {
                setStartDate("");
                setEndDate("");
              }}
            >
              <Ionicons name="close-circle" size={20} color={colors.expense} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <DatePicker
        value={startDate ? toLocalDate(startDate) : new Date()}
        onChange={(d) => setStartDate(formatDateString(d))}
        show={showStartPicker}
        onClose={() => setShowStartPicker(false)}
      />
      <DatePicker
        value={endDate ? toLocalDate(endDate) : new Date()}
        onChange={(d) => setEndDate(formatDateString(d))}
        show={showEndPicker}
        onClose={() => setShowEndPicker(false)}
      />

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => showActionMenu(item)}
            onLongPress={() => showActionMenu(item)}
            delayLongPress={500}
            activeOpacity={0.7}
          >
            <View style={styles.cardLeft}>
              <Text style={styles.category}>{item.category}</Text>
              <View style={styles.cardMeta}>
                <Text style={styles.date}>{item.date}</Text>
                {item.recurringFrequency && item.recurringFrequency !== "none" && (
                  <View style={styles.recurringBadge}>
                    <Ionicons name="repeat" size={10} color={colors.primary} />
                    <Text style={styles.recurringText}>{item.recurringFrequency}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.cardRight}>
              <Text
                style={[styles.amount, { color: item.type === "expense" ? colors.expense : colors.income }]}
              >
                {item.type === "expense" ? "-" : "+"}
                {format(item.amount)}
              </Text>
              <Ionicons name="ellipsis-vertical" size={16} color={colors.textMuted} style={styles.optionsIcon} />
            </View>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <View style={{ paddingBottom: Math.max(insets.bottom, 100) }}>
            {loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : !hasMore && transactions.length > 0 ? (
              <Text style={styles.footerText}>{t("transactions.allLoaded")}</Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {isFiltered ? t("transactions.noTransactionsRange") : t("transactions.noTransactions")}
          </Text>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: Math.max(insets.bottom, 80) }, fabShadow]}
        onPress={() => router.push("/add")}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

      {/* Edit Transaction Modal */}
      <Modal
        visible={editingTx !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingTx(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("transactions.editTransaction", "Edit Transaction")}</Text>
              <TouchableOpacity onPress={() => setEditingTx(null)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>{t("add.amount", "Amount")}</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="decimal-pad"
              value={editAmount}
              onChangeText={setEditAmount}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.inputLabel}>{t("add.category", "Category")}</Text>
            <TextInput
              style={styles.modalInput}
              value={editCategory}
              onChangeText={setEditCategory}
              placeholder={t("add.category", "Category")}
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.inputLabel}>{t("add.description", "Description")}</Text>
            <TextInput
              style={styles.modalInput}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder={t("add.descriptionPlaceholder", "Optional note")}
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setEditingTx(null)}
                disabled={savingEdit}
              >
                <Text style={styles.cancelBtnText}>{t("common.cancel", "Cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleSaveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{t("common.save", "Save")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: any, insets: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
    header: { paddingHorizontal: 20, paddingBottom: 8 },
    title: { fontSize: 28, fontWeight: "800", color: colors.text },
    subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    summaryRow: {
      flexDirection: "row",
      marginHorizontal: 20,
      marginVertical: 8,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: "hidden",
    },
    summaryItem: {
      flex: 1,
      padding: 12,
      alignItems: "center",
      borderRightWidth: 1,
      borderRightColor: colors.borderLight,
    },
    summaryLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.textMuted,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
    },
    summaryValue: { fontSize: 13, fontWeight: "700", marginTop: 2 },
    filterRow: { paddingHorizontal: 20, paddingVertical: 8, gap: 8 },
    presetRow: { flexDirection: "row", gap: 6 },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    pillText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
    pillTextActive: { color: "#fff" },
    dateInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    dateBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      flex: 1,
    },
    dateBtnText: { fontSize: 12, color: colors.textSecondary, fontWeight: "500" },
    card: {
      marginHorizontal: 20,
      marginVertical: 4,
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 16,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cardLeft: { flex: 1 },
    cardRight: { flexDirection: "row", alignItems: "center", gap: 8 },
    optionsIcon: { opacity: 0.6 },
    category: { fontSize: 15, fontWeight: "600", color: colors.text },
    cardMeta: { flexDirection: "row", alignItems: "center", marginTop: 4 },
    date: { fontSize: 12, color: colors.textMuted },
    recurringBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      marginLeft: 8,
    },
    recurringText: {
      fontSize: 10,
      color: colors.primary,
      fontWeight: "700",
      marginLeft: 3,
      textTransform: "uppercase" as const,
    },
    amount: { fontSize: 16, fontWeight: "700" },
    emptyText: { textAlign: "center", marginTop: 40, color: colors.textMuted, fontSize: 15 },
    footerLoader: { paddingVertical: 20, alignItems: "center" },
    footerText: { textAlign: "center", paddingVertical: 16, color: colors.textMuted, fontSize: 12 },
    fab: {
      position: "absolute",
      right: 20,
      backgroundColor: colors.primary,
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: "center",
      alignItems: "center",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: Math.max(insets.bottom + 16, 32),
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 6,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
    },
    modalInput: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      padding: 14,
      fontSize: 15,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    modalButtons: {
      flexDirection: "row",
      gap: 12,
      marginTop: 8,
    },
    modalBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelBtn: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelBtnText: {
      color: colors.textSecondary,
      fontWeight: "600",
      fontSize: 15,
    },
    saveBtn: {
      backgroundColor: colors.primary,
    },
    saveBtnText: {
      color: "#fff",
      fontWeight: "600",
      fontSize: 15,
    },
  });
