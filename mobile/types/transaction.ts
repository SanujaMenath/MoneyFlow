import type { Transaction, RecurringFrequency } from "@moneyflow/shared";
import { incomeCategories, expenseCategories, categoryI18nKeys } from "@moneyflow/shared/constants/categories";
import { frequencies } from "@moneyflow/shared/constants/frequencies";

export type { Transaction, RecurringFrequency };
export { incomeCategories, expenseCategories, frequencies, categoryI18nKeys };

// ---------------------------------------------------------------------------
// Typed DB row shape (Supabase snake_case → camelCase Transaction)
// M-01 / L-04 fix: no `any` types; toDB/fromDB are fully typed.
// ---------------------------------------------------------------------------

export interface TransactionDB {
  id: number;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  description?: string | null;
  created_at: string;
  updated_at?: string | null;
  recurring_frequency?: RecurringFrequency;
  recurring_end_date?: string | null;
  parent_transaction_id?: number | null;
  user_id?: string;
}

export const toDB = (t: Transaction): Omit<TransactionDB, "id" | "user_id"> => ({
  amount: t.amount,
  type: t.type,
  category: t.category,
  date: t.date,
  description: t.description ?? null,
  created_at: t.createdAt,
  updated_at: t.updatedAt ?? new Date().toISOString(),
  recurring_frequency: t.recurringFrequency ?? "none",
  recurring_end_date: t.recurringEndDate ?? null,
  parent_transaction_id: t.parentTransactionId ?? null,
});

export const fromDB = (r: TransactionDB): Transaction => ({
  id: r.id,
  amount: r.amount,
  type: r.type,
  category: r.category,
  date: r.date,
  description: r.description ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at ?? null,
  recurringFrequency: r.recurring_frequency ?? "none",
  recurringEndDate: r.recurring_end_date ?? null,
  parentTransactionId: r.parent_transaction_id ?? null,
});
