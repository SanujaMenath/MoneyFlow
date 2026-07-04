import type { RecurringFrequency } from "../types/transaction";

export interface FrequencyOption {
  value: RecurringFrequency;
  label: string;
  key: string;
}

export const frequencies: FrequencyOption[] = [
  { value: "none",    label: "One-time",  key: "frequency.none" },
  { value: "daily",   label: "Daily",     key: "frequency.daily" },
  { value: "weekly",  label: "Weekly",    key: "frequency.weekly" },
  { value: "monthly", label: "Monthly",   key: "frequency.monthly" },
  { value: "yearly",  label: "Yearly",    key: "frequency.yearly" },
];
