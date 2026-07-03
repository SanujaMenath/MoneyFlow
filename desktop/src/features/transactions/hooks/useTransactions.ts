import { useState, useEffect, useCallback } from "react";
import type { Transaction } from "../../../types/transaction";
import { supabase } from "../../../lib/supabase"; 
import {
  getTransactions,
  deleteTransaction,
  updateTransaction,
  processRecurringTransactions,
} from "../services/transactionService";

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);


  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTransactions();
      setTransactions(data);
    } catch {
      console.error("Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await processRecurringTransactions();
      refresh();
    };
    init();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);


  const remove = useCallback(async (id: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this transaction?");
    if (!confirmed) return;

    try {
      await deleteTransaction(id);
      refresh();
    } catch (error) {
      alert("Failed to delete transaction. Please try again.");
    }
  }, [refresh]);

  const stopRecurring = useCallback(async (id: number) => {
    const confirmed = window.confirm(
      "This will stop future occurrences of this transaction. Past records will remain. Continue?"
    );
    if (!confirmed) return;

    try {
      await updateTransaction(id, { recurringFrequency: "none"});
      refresh();
    } catch (error) {
      alert("Failed to stop recurrence. Please try again.");
    }
  }, [refresh]);

  return {
    transactions,
    loading,
    refresh,
    remove,
    stopRecurring, 
  };
};