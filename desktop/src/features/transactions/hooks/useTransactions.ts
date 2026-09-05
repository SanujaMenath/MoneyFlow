import { useState, useEffect, useCallback, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Transaction } from "../../../types/transaction";
import type { FinancialSummary } from "@moneyflow/shared";
import { supabase } from "../../../lib/supabase";
import { sync } from "../../../lib/syncService";
import {
  getTransactions,
  deleteTransaction,
  updateTransaction,
  processRecurringTransactions,
  getFinancialSummary,
} from "../services/transactionService";
import type { TransactionFilters } from "../services/transactionService";

const PAGE_SIZE = 50;

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFiltersState] = useState<TransactionFilters>({});
  const [summary, setSummary] = useState<FinancialSummary>({ balance: 0, income: 0, expenses: 0 });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const pageRef = useRef(page);
  const filtersRef = useRef(filters);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const refreshSummary = useCallback(async (activeFilters?: TransactionFilters) => {
    try {
      const f = activeFilters ?? filtersRef.current;
      const sum = await getFinancialSummary(f.startDate, f.endDate);
      setSummary(sum);
    } catch (err) {
      console.error("Failed to fetch financial summary:", err);
    }
  }, []);

  const refresh = useCallback(async (p = 1, customFilters?: TransactionFilters) => {
    setLoading(true);
    try {
      const activeFilters = customFilters ?? filtersRef.current;
      const [result] = await Promise.all([
        getTransactions(p, PAGE_SIZE, activeFilters),
        refreshSummary(activeFilters),
      ]);
      setTransactions(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setPage(result.page);
    } catch (err) {
      console.error("Failed to refresh transactions:", err);
    } finally {
      setLoading(false);
    }
  }, [refreshSummary]);

  const setFilters = useCallback((newFilters: TransactionFilters | ((prev: TransactionFilters) => TransactionFilters)) => {
    setFiltersState((prev) => {
      const resolved = typeof newFilters === "function" ? newFilters(prev) : newFilters;
      filtersRef.current = resolved;
      refresh(1, resolved);
      return resolved;
    });
  }, [refresh]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      sync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      await processRecurringTransactions();
      await sync();
      refresh(1);

      const { data: { session } } = await supabase.auth.getSession();
      const userId = (session as Session | null)?.user?.id ?? null;
      userIdRef.current = userId;

      const filterStr = userId ? `user_id=eq.${userId}` : undefined;

      channel = supabase
        .channel("schema-db-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "transactions",
            ...(filterStr ? { filter: filterStr } : {}),
          },
          () => {
            refresh(pageRef.current);
          },
        )
        .subscribe();
    };

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [refresh]);

  const goToPage = useCallback(
    (p: number) => {
      if (p >= 1 && p <= totalPages) {
        refresh(p);
      }
    },
    [refresh, totalPages],
  );

  const remove = useCallback(
    async (id: number) => {
      const confirmed = window.confirm("Are you sure you want to delete this transaction?");
      if (!confirmed) return;

      try {
        await deleteTransaction(id);
        refresh(page);
      } catch {
        alert("Failed to delete transaction. Please try again.");
      }
    },
    [refresh, page],
  );

  const edit = useCallback(
    async (id: number, updates: Partial<Transaction>) => {
      try {
        await updateTransaction(id, updates);
        refresh(page);
      } catch {
        alert("Failed to update transaction. Please try again.");
      }
    },
    [refresh, page],
  );

  const stopRecurring = useCallback(
    async (id: number) => {
      const confirmed = window.confirm(
        "This will stop future occurrences of this transaction. Past records will remain. Continue?",
      );
      if (!confirmed) return;

      try {
        await updateTransaction(id, { recurringFrequency: "none" });
        refresh(page);
      } catch {
        alert("Failed to stop recurrence. Please try again.");
      }
    },
    [refresh, page],
  );

  return {
    transactions,
    loading,
    page,
    totalPages,
    total,
    filters,
    setFilters,
    summary,
    isOnline,
    refresh,
    goToPage,
    remove,
    edit,
    stopRecurring,
  };
};