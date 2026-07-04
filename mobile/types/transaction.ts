import type { Transaction, RecurringFrequency } from "@moneyflow/shared";
import { incomeCategories, expenseCategories } from "@moneyflow/shared/constants/categories";
import { frequencies } from "@moneyflow/shared/constants/frequencies";

export type { Transaction, RecurringFrequency };
export { incomeCategories, expenseCategories, frequencies };

export interface TransactionDB {
  id: number;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  created_at: string;
  recurring_frequency?: RecurringFrequency;
  recurring_end_date?: string | null;
  user_id?: string;
}

export const toDB = (t: Transaction): any => ({
  amount: t.amount,
  type: t.type,
  category: t.category,
  date: t.date,
  created_at: t.createdAt,
  recurring_frequency: t.recurringFrequency || "none",
  recurring_end_date: t.recurringEndDate || null,
});

export const fromDB = (r: any): Transaction => ({
  id: r.id,
  amount: r.amount,
  type: r.type as "income" | "expense",
  category: r.category,
  date: r.date,
  createdAt: r.created_at,
  recurringFrequency: (r.recurring_frequency as RecurringFrequency) || "none",
  recurringEndDate: r.recurring_end_date || null,
});
