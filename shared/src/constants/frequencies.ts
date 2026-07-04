import type { RecurringFrequency } from "../types/transaction";

export interface FrequencyOption {
  value: RecurringFrequency;
  label: string;
}

export const frequencies: FrequencyOption[] = [
  { value: "none",    label: "One-time" },
  { value: "daily",   label: "Daily" },
  { value: "weekly",  label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly",  label: "Yearly" },
];
