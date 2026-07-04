export type RecurringFrequency = "none" | "daily" | "weekly" | "monthly" | "yearly";

export interface Transaction {
  id?: number;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  createdAt: string;
  recurringFrequency?: RecurringFrequency;
  recurringEndDate?: string | null;
}
