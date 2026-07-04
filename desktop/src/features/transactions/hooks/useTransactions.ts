import { useState, useEffect, useCallback, useRef } from "react";
import type { Transaction } from "../../../types/transaction";
import { supabase } from "../../../lib/supabase"; 
import { sync } from "../../../lib/syncService";
import {
  getTransactions,
  deleteTransaction,
  updateTransaction,
  processRecurringTransactions,
} from "../services/transactionService";
import type { PaginationResult } from "../services/transactionService";

const PAGE_SIZE = 50;

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const pageRef = useRef(page);

  const refresh = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const result: PaginationResult = await getTransactions(p, PAGE_SIZE);
      setTransactions(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setPage(result.page);
    } catch (err) {
      console.error("Failed to refresh transactions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

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
    const init = async () => {
      await processRecurringTransactions();
      await sync();
      refresh(1);
    };
    init();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          refresh(pageRef.current);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const goToPage = useCallback((p: number) => {
    if (p >= 1 && p <= totalPages) {
      refresh(p);
    }
  }, [refresh, totalPages]);

  const remove = useCallback(async (id: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this transaction?");
    if (!confirmed) return;

    try {
      await deleteTransaction(id);
      refresh(page);
    } catch (error) {
      alert("Failed to delete transaction. Please try again.");
    }
  }, [refresh, page]);

  const stopRecurring = useCallback(async (id: number) => {
    const confirmed = window.confirm(
      "This will stop future occurrences of this transaction. Past records will remain. Continue?"
    );
    if (!confirmed) return;

    try {
      await updateTransaction(id, { recurringFrequency: "none"});
      refresh(page);
    } catch (error) {
      alert("Failed to stop recurrence. Please try again.");
    }
  }, [refresh, page]);

  return {
    transactions,
    loading,
    page,
    totalPages,
    total,
    isOnline,
    refresh,
    goToPage,
    remove,
    stopRecurring, 
  };
};