import { supabase } from "../lib/supabase";
import type { Transaction, RecurringFrequency } from "../types/transaction";
import { fromDB, toDB } from "../types/transaction";

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
    case "daily": result.setDate(result.getDate() + 1); break;
    case "weekly": result.setDate(result.getDate() + 7); break;
    case "monthly": result.setMonth(result.getMonth() + 1); break;
    case "yearly": result.setFullYear(result.getFullYear() + 1); break;
  }
  return result;
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
  return (data || []).map(fromDB);
};

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
  const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
};

export const updateTransaction = async (id: number, updates: Partial<Transaction>) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required.");
  const dbUpdates: any = {};
  if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.date !== undefined) dbUpdates.date = updates.date;
  if (updates.recurringFrequency !== undefined) dbUpdates.recurring_frequency = updates.recurringFrequency;
  if (updates.recurringEndDate !== undefined) dbUpdates.recurring_end_date = updates.recurringEndDate;

  const { error } = await supabase.from("transactions").update(dbUpdates).eq("id", id).eq("user_id", user.id);
  if (error) throw error;
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
      const endDate = template.recurring_end_date ? toLocalDate(template.recurring_end_date) : null;
      const startDate = toLocalDate(template.date);

      const candidateDates: string[] = [];
      let current = addPeriod(startDate, frequency);

      while (current <= today) {
        if (endDate && current > endDate) break;
        const dateStr = formatDate(current);
        if (dateStr !== template.date) candidateDates.push(dateStr);
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
