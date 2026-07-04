export type SplitMethod = "equal" | "custom" | "percentage";

export interface SplitInput {
  user_id: string;
  amount?: number;
  percentage?: number;
}

export interface SplitResult {
  user_id: string;
  amount: number;
  percentage: number | null;
}

export function computeSplits(
  totalAmount: number,
  method: SplitMethod,
  splits: SplitInput[]
): SplitResult[] {
  if (method === "equal") {
    const perPerson = Math.floor(totalAmount / splits.length);
    const remainder = totalAmount - perPerson * splits.length;
    return splits.map((s, i) => ({
      user_id: s.user_id,
      amount: perPerson + (i === 0 ? remainder : 0),
      percentage: null,
    }));
  }

  if (method === "percentage") {
    return splits.map((s) => ({
      user_id: s.user_id,
      amount: Math.round(totalAmount * ((s.percentage || 0) / 100)),
      percentage: s.percentage || null,
    }));
  }

  return splits.map((s) => ({
    user_id: s.user_id,
    amount: s.amount || 0,
    percentage: null,
  }));
}
