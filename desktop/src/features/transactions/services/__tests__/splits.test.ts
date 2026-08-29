import { describe, it, expect } from "vitest";
import { computeSplits } from "@moneyflow/shared/utils/splits";


describe("computeSplits", () => {

  describe("equal", () => {
    it("splits evenly when divisible", () => {
      const result = computeSplits(1000, "equal", [
        { user_id: "a" },
        { user_id: "b" },
      ]);
      expect(result.map((r) => r.amount)).toEqual([500, 500]);
      expect(result.reduce((s, r) => s + r.amount, 0)).toBe(1000);
    });

    it("allocates remainder to first participant", () => {
      // 100 cents / 3 = 33 each, remainder 1 → first gets 34
      const result = computeSplits(100, "equal", [
        { user_id: "a" },
        { user_id: "b" },
        { user_id: "c" },
      ]);
      expect(result[0].amount).toBe(34);
      expect(result[1].amount).toBe(33);
      expect(result[2].amount).toBe(33);
      expect(result.reduce((s, r) => s + r.amount, 0)).toBe(100);
    });

    it("handles single participant", () => {
      const result = computeSplits(999, "equal", [{ user_id: "a" }]);
      expect(result[0].amount).toBe(999);
    });
  });

  // --- percentage split ---
  describe("percentage", () => {
    it("splits 50/50 correctly", () => {
      const result = computeSplits(200, "percentage", [
        { user_id: "a", percentage: 50 },
        { user_id: "b", percentage: 50 },
      ]);
      expect(result.reduce((s, r) => s + r.amount, 0)).toBe(200);
      expect(result[0].amount).toBe(100);
      expect(result[1].amount).toBe(100);
    });

    it("reconciles rounding error — always sums to totalAmount", () => {
      const result = computeSplits(1, "percentage", [
        { user_id: "a", percentage: 33 },
        { user_id: "b", percentage: 33 },
        { user_id: "c", percentage: 34 },
      ]);
      const sum = result.reduce((s, r) => s + r.amount, 0);
      expect(sum).toBe(1);
    });

    it("never over-pays", () => {
      const result = computeSplits(10001, "percentage", [
        { user_id: "a", percentage: 33.3 },
        { user_id: "b", percentage: 33.3 },
        { user_id: "c", percentage: 33.4 },
      ]);
      const sum = result.reduce((s, r) => s + r.amount, 0);
      expect(sum).toBe(10001);
    });

    it("preserves percentage on result", () => {
      const result = computeSplits(500, "percentage", [
        { user_id: "a", percentage: 60 },
        { user_id: "b", percentage: 40 },
      ]);
      expect(result[0].percentage).toBe(60);
      expect(result[1].percentage).toBe(40);
      expect(result.reduce((s, r) => s + r.amount, 0)).toBe(500);
    });
  });

  // --- custom split ---
  describe("custom", () => {
    it("uses caller-supplied amounts verbatim", () => {
      const result = computeSplits(700, "custom", [
        { user_id: "a", amount: 400 },
        { user_id: "b", amount: 300 },
      ]);
      expect(result[0].amount).toBe(400);
      expect(result[1].amount).toBe(300);
    });
  });

  // --- edge cases ---
  describe("edge cases", () => {
    it("returns empty array for empty splits", () => {
      expect(computeSplits(500, "equal", [])).toEqual([]);
    });

    it("handles zero total amount", () => {
      const result = computeSplits(0, "equal", [{ user_id: "a" }, { user_id: "b" }]);
      expect(result.every((r) => r.amount === 0)).toBe(true);
    });
  });
});
