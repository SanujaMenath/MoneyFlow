export type RecurringFrequency = "none" | "daily" | "weekly" | "monthly" | "yearly";

export interface Transaction {
  id?: number;
  /** Amount stored as integer cents (e.g. $12.34 → 1234) */
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string; // YYYY-MM-DD
  description?: string | null;
  createdAt: string; // ISO-8601
  updatedAt?: string | null; // ISO-8601
  recurringFrequency?: RecurringFrequency;
  recurringEndDate?: string | null;
  /** Set on generated recurrences; points to the original template transaction id */
  parentTransactionId?: number | null;
}
