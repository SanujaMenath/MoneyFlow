import { supabase } from "../../../lib/supabase";
import { getDB } from "../../../lib/db";
import { enqueue } from "../../../lib/syncService";
import type { Transaction, RecurringFrequency } from "../../../types/transaction";
import { addPeriod, formatDateString, toLocalDate } from "@moneyflow/shared/utils/date";

// Module-level guard: prevents concurrent recurring-processing runs
let _processing = false;

// ---------------------------------------------------------------------------
// Row mapping helpers
// ---------------------------------------------------------------------------

interface TransactionRow {
  id: number;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  description?: string | null;
  created_at: string;
  updated_at?: string | null;
  recurring_frequency?: string;
  recurring_end_date?: string | null;
  parent_transaction_id?: number | null;
  synced_id?: string | null;
}

function mapRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    amount: row.amount,
    type: row.type,
    category: row.category,
    date: row.date,
    description: row.description ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
    recurringFrequency: (row.recurring_frequency as RecurringFrequency) || "none",
    recurringEndDate: row.recurring_end_date ?? null,
    parentTransactionId: row.parent_transaction_id ?? null,
  };
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface PaginationResult {
  data: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const getTransactionCount = async (): Promise<number> => {
  try {
    const db = await getDB();
    const [row] = await db.select<{ count: number }[]>(
      "SELECT COUNT(*) as count FROM transactions WHERE is_deleted = 0",
    );
    return row?.count ?? 0;
  } catch {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    const { count, error } = await supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (error) return 0;
    return count ?? 0;
  }
};

export const getTransactions = async (page = 1, pageSize = 50): Promise<PaginationResult> => {
  try {
    const db = await getDB();
    const offset = (page - 1) * pageSize;

    const [rows, [countRow]] = await Promise.all([
      db.select<TransactionRow[]>(
        "SELECT * FROM transactions WHERE is_deleted = 0 ORDER BY date DESC, created_at DESC LIMIT $1 OFFSET $2",
        [pageSize, offset],
      ),
      db.select<{ count: number }[]>(
        "SELECT COUNT(*) as count FROM transactions WHERE is_deleted = 0",
      ),
    ]);

    const total = countRow?.count ?? 0;
    return {
      data: rows.map(mapRow),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  } catch {
    return getTransactionsFromCloud(page, pageSize);
  }
};

async function getTransactionsFromCloud(page: number, pageSize: number): Promise<PaginationResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required.");

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const [listResult, countResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  if (listResult.error) throw listResult.error;

  const data = (listResult.data ?? []).map((r) => ({
    id: r.id,
    amount: r.amount,
    type: r.type as "income" | "expense",
    category: r.category,
    date: r.date,
    description: r.description ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? null,
    recurringFrequency: (r.recurring_frequency as RecurringFrequency) ?? "none",
    recurringEndDate: r.recurring_end_date ?? null,
    parentTransactionId: r.parent_transaction_id ?? null,
  }));

  return {
    data,
    total: countResult.count ?? 0,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((countResult.count ?? 0) / pageSize)),
  };
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export const createTransaction = async (data: Transaction): Promise<Transaction> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required to save transactions.");

  const now = new Date().toISOString();
  const dbData = {
    amount: data.amount,
    type: data.type,
    category: data.category,
    date: data.date,
    description: data.description ?? null,
    created_at: data.createdAt || now,
    updated_at: now,
    recurring_frequency: data.recurringFrequency ?? "none",
    recurring_end_date: data.recurringEndDate ?? null,
    parent_transaction_id: data.parentTransactionId ?? null,
  };

  try {
    const db = await getDB();
    const result = await db.execute(
      `INSERT INTO transactions
         (amount, type, category, date, description, created_at, updated_at,
          recurring_frequency, recurring_end_date, parent_transaction_id, synced_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        dbData.amount, dbData.type, dbData.category, dbData.date, dbData.description,
        dbData.created_at, dbData.updated_at, dbData.recurring_frequency,
        dbData.recurring_end_date, dbData.parent_transaction_id, now,
      ],
    );
    const localId = result.lastInsertId;

    await enqueue("create", localId, dbData);

    return { id: localId, ...data, updatedAt: now };
  } catch {
    const { data: created, error } = await supabase
      .from("transactions")
      .insert([{ ...dbData, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;

    return {
      id: created.id,
      amount: created.amount,
      type: created.type,
      category: created.category,
      date: created.date,
      description: created.description ?? null,
      createdAt: created.created_at,
      updatedAt: created.updated_at ?? null,
      recurringFrequency: created.recurring_frequency ?? "none",
      recurringEndDate: created.recurring_end_date ?? null,
    };
  }
};

export const deleteTransaction = async (id: number) => {
  const now = new Date().toISOString();
  try {
    const db = await getDB();
    await db.execute(
      "UPDATE transactions SET is_deleted = 1, updated_at = $1, synced_at = $1 WHERE id = $2",
      [now, id],
    );
    await enqueue("delete", id);
  } catch {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw error;
  }
};

export const updateTransaction = async (id: number, updates: Partial<Transaction>) => {
  const now = new Date().toISOString();
  const dbUpdates: Record<string, unknown> = { updated_at: now };

  if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.date !== undefined) dbUpdates.date = updates.date;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.recurringFrequency !== undefined) dbUpdates.recurring_frequency = updates.recurringFrequency;
  if (updates.recurringEndDate !== undefined) dbUpdates.recurring_end_date = updates.recurringEndDate;

  try {
    const db = await getDB();
    const keys = Object.keys(dbUpdates);
    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const values = [...Object.values(dbUpdates), id];

    await db.execute(
      `UPDATE transactions SET ${setClauses} WHERE id = $${values.length}`,
      values,
    );

    await enqueue("update", id, dbUpdates);
  } catch {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required.");

    const supabaseUpdates: Record<string, unknown> = {};
    if (updates.amount !== undefined) supabaseUpdates.amount = updates.amount;
    if (updates.type !== undefined) supabaseUpdates.type = updates.type;
    if (updates.category !== undefined) supabaseUpdates.category = updates.category;
    if (updates.date !== undefined) supabaseUpdates.date = updates.date;
    if (updates.description !== undefined) supabaseUpdates.description = updates.description;
    if (updates.recurringFrequency !== undefined) supabaseUpdates.recurring_frequency = updates.recurringFrequency;
    if (updates.recurringEndDate !== undefined) supabaseUpdates.recurring_end_date = updates.recurringEndDate;
    supabaseUpdates.updated_at = now;

    const { error } = await supabase
      .from("transactions")
      .update(supabaseUpdates)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
  }
};

// ---------------------------------------------------------------------------
// Recurring transaction generation
// C-02 fix: deduplication now uses parent_transaction_id + date instead of
// fragile value-matching (amount+type+category+date).
// H-03 fix: uses shared addPeriod with clampToMonthEnd.
// M-06 fix: queries only the authenticated user's templates.
// ---------------------------------------------------------------------------

export const processRecurringTransactions = async (): Promise<number> => {
  if (_processing) return 0;
  _processing = true;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    // M-06: filter by user_id to avoid cross-user reads
    const { data: templates, error: fetchError } = await supabase
      .from("transactions")
      .select("id, user_id, amount, type, category, date, description, recurring_frequency, recurring_end_date")
      .eq("user_id", user.id)
      .neq("recurring_frequency", "none")
      .is("parent_transaction_id", null); // only original templates, not generated copies

    if (fetchError || !templates || templates.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let created = 0;

    for (const template of templates) {
      const frequency = template.recurring_frequency as RecurringFrequency;
      const endDate = template.recurring_end_date ? toLocalDate(template.recurring_end_date) : null;
      const templateDate = toLocalDate(template.date);

      // Compute all dates that should have been generated
      const candidateDates: string[] = [];
      let current = addPeriod(templateDate, templateDate, frequency);
      let iterations = 0;
      const MAX_ITERATIONS = 730; // 2 years maximum catch-up

      while (current <= today && iterations < MAX_ITERATIONS) {
        iterations++;
        if (endDate && current > endDate) break;
        candidateDates.push(formatDateString(current));
        current = addPeriod(current, templateDate, frequency);
      }

      if (candidateDates.length === 0) continue;

      // C-02 fix: fetch already-generated occurrences by parent_transaction_id
      // (not by value-matching which falsely deduplicates unrelated transactions)
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
          // C-02 fix: link generated occurrences back to the template
          parent_transaction_id: template.id,
        })),
      );

      if (!insertError) created += toCreate.length;
    }

    return created;
  } finally {
    _processing = false;
  }
};