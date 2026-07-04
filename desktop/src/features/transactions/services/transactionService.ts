import { supabase } from "../../../lib/supabase";
import { getDB } from "../../../lib/db";
import { enqueue } from "../../../lib/syncService";
import type { Transaction, RecurringFrequency } from "../../../types/transaction";

let _processing = false;

const toLocalDate = (s: string): Date => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const formatDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const addPeriod = (date: Date, frequency: RecurringFrequency): Date => {
  const result = new Date(date);
  switch (frequency) {
    case "daily":
      result.setDate(result.getDate() + 1);
      break;
    case "weekly":
      result.setDate(result.getDate() + 7);
      break;
    case "monthly":
      result.setMonth(result.getMonth() + 1);
      break;
    case "yearly":
      result.setFullYear(result.getFullYear() + 1);
      break;
  }
  return result;
};

function mapRow(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as number,
    amount: row.amount as number,
    type: row.type as "income" | "expense",
    category: row.category as string,
    date: row.date as string,
    createdAt: row.created_at as string,
    recurringFrequency: (row.recurring_frequency as RecurringFrequency) || "none",
    recurringEndDate: (row.recurring_end_date as string) || null,
  };
}

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
    return count || 0;
  }
};

export const getTransactions = async (page = 1, pageSize = 50): Promise<PaginationResult> => {
  try {
    const db = await getDB();
    const offset = (page - 1) * pageSize;

    const [rows, [countRow]] = await Promise.all([
      db.select<Record<string, unknown>[]>(
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

  const data = (listResult.data || []).map((r) => ({
    id: r.id,
    amount: r.amount,
    type: r.type as "income" | "expense",
    category: r.category,
    date: r.date,
    createdAt: r.created_at,
    recurringFrequency: (r.recurring_frequency as RecurringFrequency) || "none",
    recurringEndDate: r.recurring_end_date || null,
  }));

  return {
    data,
    total: countResult.count || 0,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((countResult.count || 0) / pageSize)),
  };
}

export const createTransaction = async (data: Transaction): Promise<Transaction> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required to save transactions.");

  const now = new Date().toISOString();
  const dbData = {
    amount: data.amount,
    type: data.type,
    category: data.category,
    date: data.date,
    created_at: data.createdAt || now,
    recurring_frequency: data.recurringFrequency || "none",
    recurring_end_date: data.recurringEndDate || null,
  };

  try {
    const db = await getDB();
    const result = await db.execute(
      `INSERT INTO transactions (amount, type, category, date, created_at, recurring_frequency, recurring_end_date, synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [dbData.amount, dbData.type, dbData.category, dbData.date, dbData.created_at,
       dbData.recurring_frequency, dbData.recurring_end_date, now],
    );
    const localId = result.lastInsertId;

    await enqueue("create", localId, dbData);

    return {
      id: localId,
      amount: dbData.amount,
      type: dbData.type,
      category: dbData.category,
      date: dbData.date,
      createdAt: dbData.created_at,
      recurringFrequency: dbData.recurring_frequency,
      recurringEndDate: dbData.recurring_end_date,
    };
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
      createdAt: created.created_at,
      recurringFrequency: created.recurring_frequency || "none",
      recurringEndDate: created.recurring_end_date || null,
    };
  }
};

export const deleteTransaction = async (id: number) => {
  try {
    const db = await getDB();
    await db.execute("UPDATE transactions SET is_deleted = 1, synced_at = $1 WHERE id = $2", [
      new Date().toISOString(), id,
    ]);
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
  const dbUpdates: Record<string, unknown> = {};
  if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.date !== undefined) dbUpdates.date = updates.date;
  if (updates.recurringFrequency !== undefined) dbUpdates.recurring_frequency = updates.recurringFrequency;
  if (updates.recurringEndDate !== undefined) dbUpdates.recurring_end_date = updates.recurringEndDate;

  try {
    const db = await getDB();
    const setClauses = Object.keys(dbUpdates).map((k, i) => `${k} = $${i + 1}`).join(", ");
    const values = Object.values(dbUpdates);
    values.push(new Date().toISOString(), id);

    await db.execute(
      `UPDATE transactions SET ${setClauses}, synced_at = $${values.length - 1} WHERE id = $${values.length}`,
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
    if (updates.recurringFrequency !== undefined) supabaseUpdates.recurring_frequency = updates.recurringFrequency;
    if (updates.recurringEndDate !== undefined) supabaseUpdates.recurring_end_date = updates.recurringEndDate;

    const { error } = await supabase
      .from("transactions")
      .update(supabaseUpdates)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
  }
};

export const processRecurringTransactions = async (): Promise<number> => {
  if (_processing) return 0;
  _processing = true;

  try {
    const { data: templates, error: fetchError } = await supabase
      .from("transactions")
      .select("id, user_id, amount, type, category, date, recurring_frequency, recurring_end_date")
      .neq("recurring_frequency", "none");

    if (fetchError || !templates || templates.length === 0) return 0;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let created = 0;

    for (const template of templates) {
      const frequency = template.recurring_frequency as RecurringFrequency;
      const endDateStr = template.recurring_end_date;
      const endDate = endDateStr ? toLocalDate(endDateStr) : null;

      const startDate = toLocalDate(template.date);

      const candidateDates: string[] = [];
      let current = addPeriod(startDate, frequency);
      let iterations = 0;
      const MAX_ITERATIONS = 365;

      while (current <= today && iterations < MAX_ITERATIONS) {
        iterations++;
        if (endDate && current > endDate) break;

        const dateStr = formatDate(current);
        if (dateStr !== template.date) {
          candidateDates.push(dateStr);
        }

        current = addPeriod(current, frequency);
      }

      if (candidateDates.length === 0) continue;

      const { data: existing } = await supabase
        .from("transactions")
        .select("date")
        .eq("user_id", template.user_id)
        .eq("amount", template.amount)
        .eq("type", template.type)
        .eq("category", template.category)
        .neq("id", template.id);

      const existingDates = new Set((existing || []).map((r) => r.date));

      const toCreate = candidateDates.filter((d) => !existingDates.has(d));

      if (toCreate.length === 0) continue;

      const { error: insertError } = await supabase.from("transactions").insert(
        toCreate.map((date) => ({
          user_id: template.user_id,
          amount: template.amount,
          type: template.type,
          category: template.category,
          date,
          created_at: new Date().toISOString(),
          recurring_frequency: "none",
          recurring_end_date: null,
        }))
      );

      if (!insertError) created += toCreate.length;
    }

    return created;
  } finally {
    _processing = false;
  }
};