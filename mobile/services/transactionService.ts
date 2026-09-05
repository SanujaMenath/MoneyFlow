import { supabase } from "../lib/supabase";
import type { Transaction, RecurringFrequency } from "../types/transaction";
import { fromDB, toDB } from "../types/transaction";
import { addPeriod, formatDateString, toLocalDate } from "@moneyflow/shared/utils/date";
import type { FinancialSummary } from "@moneyflow/shared";

export type { FinancialSummary };

// Module-level guard: prevents concurrent recurring-processing runs
let _processing = false;

// ---------------------------------------------------------------------------
// Pagination & read operations
// ---------------------------------------------------------------------------

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  type?: "income" | "expense";
  search?: string;
}

export interface PaginationResult {
  data: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const getTransactionCount = async (filters?: TransactionFilters): Promise<number> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  let query = supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (filters?.startDate) query = query.gte("date", filters.startDate);
  if (filters?.endDate) query = query.lte("date", filters.endDate);
  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.type) query = query.eq("type", filters.type);
  if (filters?.search) query = query.ilike("description", `%${filters.search}%`);

  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
};

export const getTransactionsPaginated = async (
  page = 1,
  pageSize = 50,
  filters?: TransactionFilters,
): Promise<PaginationResult> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], total: 0, page, pageSize, totalPages: 0 };

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id);

  if (filters?.startDate) query = query.gte("date", filters.startDate);
  if (filters?.endDate) query = query.lte("date", filters.endDate);
  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.type) query = query.eq("type", filters.type);
  if (filters?.search) query = query.ilike("description", `%${filters.search}%`);

  const [listResult, countResult] = await Promise.all([
    query
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to),
    getTransactionCount(filters),
  ]);

  if (listResult.error) throw listResult.error;

  return {
    data: (listResult.data ?? []).map(fromDB),
    total: countResult,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(countResult / pageSize)),
  };
};

export const getFinancialSummary = async (
  startDate?: string,
  endDate?: string,
): Promise<FinancialSummary> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { balance: 0, income: 0, expenses: 0 };

  try {
    const { data, error } = await supabase.rpc("get_financial_summary", {
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (!error && data) {
      const income = Number(data.income ?? 0);
      const expenses = Number(data.expenses ?? 0);
      const balance = Number(data.balance ?? (income - expenses));
      return { balance, income, expenses };
    }
  } catch {
    // Fall through
  }

  let query = supabase.from("transactions").select("type, amount").eq("user_id", user.id);
  if (startDate) query = query.gte("date", startDate);
  if (endDate) query = query.lte("date", endDate);

  const { data, error } = await query;
  if (error || !data) return { balance: 0, income: 0, expenses: 0 };

  let income = 0;
  let expenses = 0;
  for (const item of data) {
    if (item.type === "income") income += item.amount;
    else if (item.type === "expense") expenses += item.amount;
  }
  return { balance: income - expenses, income, expenses };
};

export const getTransactions = async (): Promise<Transaction[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(fromDB);
};

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export const createTransaction = async (data: Transaction) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required.");

  const { error } = await supabase.from("transactions").insert([
    { user_id: user.id, ...toDB(data) },
  ]);

  if (error) throw error;

  if (data.recurringFrequency && data.recurringFrequency !== "none") {
    await processRecurringTransactions();
  }
};

export const deleteTransaction = async (id: number) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required.");
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;
};

export const updateTransaction = async (id: number, updates: Partial<Transaction>) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required.");

  // M-01 fix: typed db updates object (no `any`)
  const dbUpdates: {
    amount?: number;
    type?: "income" | "expense";
    category?: string;
    date?: string;
    description?: string | null;
    recurring_frequency?: string;
    recurring_end_date?: string | null;
    updated_at: string;
  } = { updated_at: new Date().toISOString() };

  if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.date !== undefined) dbUpdates.date = updates.date;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.recurringFrequency !== undefined) dbUpdates.recurring_frequency = updates.recurringFrequency;
  if (updates.recurringEndDate !== undefined) dbUpdates.recurring_end_date = updates.recurringEndDate;

  const { error } = await supabase
    .from("transactions")
    .update(dbUpdates)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;
};

// ---------------------------------------------------------------------------
// Recurring transaction generation
// C-02 fix: deduplication now uses parent_transaction_id + date.
// H-03 fix: uses shared addPeriod with clampToMonthEnd.
// ---------------------------------------------------------------------------

export const processRecurringTransactions = async (): Promise<number> => {
  if (_processing) return 0;
  _processing = true;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data: templates, error: fetchError } = await supabase
      .from("transactions")
      .select("id, user_id, amount, type, category, date, description, recurring_frequency, recurring_end_date")
      .eq("user_id", user.id)
      .neq("recurring_frequency", "none")
      .is("parent_transaction_id", null); // only original templates

    if (fetchError || !templates || templates.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let created = 0;

    for (const template of templates) {
      const frequency = template.recurring_frequency as RecurringFrequency;
      const endDate = template.recurring_end_date ? toLocalDate(template.recurring_end_date) : null;
      const templateDate = toLocalDate(template.date);

      const candidateDates: string[] = [];
      let current = addPeriod(templateDate, templateDate, frequency);
      let iterations = 0;
      const MAX_ITERATIONS = 730; // 2-year catch-up cap

      while (current <= today && iterations < MAX_ITERATIONS) {
        iterations++;
        if (endDate && current > endDate) break;
        candidateDates.push(formatDateString(current));
        current = addPeriod(current, templateDate, frequency);
      }

      if (candidateDates.length === 0) continue;

      // C-02 fix: deduplicate by parent_transaction_id instead of value-match
      const { data: existing } = await supabase
        .from("transactions")
        .select("date")
        .eq("user_id", template.user_id)
        .eq("parent_transaction_id", template.id);

      const existingDates = new Set((existing ?? []).map((r) => r.date));
      const toCreate = candidateDates.filter((d) => !existingDates.has(d));

      if (toCreate.length === 0) continue;

      const { error: insertError } = await supabase.from("transactions").insert(
        toCreate.map((date) => ({
          user_id: template.user_id,
          amount: template.amount,
          type: template.type,
          category: template.category,
          date,
          description: template.description ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          recurring_frequency: "none",
          recurring_end_date: null,
          parent_transaction_id: template.id, // C-02 fix: link to template
        })),
      );

      if (!insertError) created += toCreate.length;
    }

    return created;
  } finally {
    _processing = false;
  }
};
