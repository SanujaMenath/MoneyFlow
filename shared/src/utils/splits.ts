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

/**
 * Compute per-participant split amounts in integer cents.
 *
 * H-01 fix: percentage splits are rounded via Math.floor() then the
 * rounding remainder (0 or 1 cent) is added to the first participant,
 * guaranteeing split totals always equal totalAmount exactly.
 */
export function computeSplits(
  totalAmount: number,
  method: SplitMethod,
  splits: SplitInput[],
): SplitResult[] {
  if (splits.length === 0) return [];

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
    // Floor each participant's share, then reconcile rounding error to first participant.
    const computed = splits.map((s) => ({
      user_id: s.user_id,
      percentage: s.percentage ?? 0,
      amount: Math.floor(totalAmount * ((s.percentage ?? 0) / 100)),
    }));
    const sumComputed = computed.reduce((acc, c) => acc + c.amount, 0);
    const remainder = totalAmount - sumComputed; // always 0 or positive (floor)
    return computed.map((c, i) => ({
      user_id: c.user_id,
      amount: c.amount + (i === 0 ? remainder : 0),
      percentage: c.percentage || null,
    }));
  }

  // "custom": trust caller-supplied amounts as-is
  return splits.map((s) => ({
    user_id: s.user_id,
    amount: s.amount ?? 0,
    percentage: null,
  }));
}
