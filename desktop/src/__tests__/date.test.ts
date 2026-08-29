import { describe, it, expect } from "vitest";

import { addPeriod, clampToMonthEnd, formatDateString, toLocalDate } from "@moneyflow/shared/utils/date";

describe("toLocalDate / formatDateString", () => {
  it("round-trips YYYY-MM-DD without UTC shift", () => {
    const input = "2024-01-31";
    expect(formatDateString(toLocalDate(input))).toBe(input);
  });

  it("parses leap-day correctly", () => {
    const d = toLocalDate("2024-02-29");
    expect(d.getMonth()).toBe(1); // February (0-indexed)
    expect(d.getDate()).toBe(29);
  });
});

describe("clampToMonthEnd", () => {
  it("clamps Jan-31 → Feb target to Feb-28 in a non-leap year", () => {
    const original = new Date(2023, 0, 31); // Jan 31 2023
    const result = clampToMonthEnd(original, new Date(2023, 1, 1));
    expect(result.getDate()).toBe(28);
    expect(result.getMonth()).toBe(1);
  });

  it("clamps Jan-31 → Feb target to Feb-29 in a leap year", () => {
    const original = new Date(2024, 0, 31);
    const result = clampToMonthEnd(original, new Date(2024, 1, 1));
    expect(result.getDate()).toBe(29);
    expect(result.getMonth()).toBe(1);
  });

  it("does not clamp when day fits in target month", () => {
    const original = new Date(2024, 0, 15); // Jan 15
    const result = clampToMonthEnd(original, new Date(2024, 1, 1));
    expect(result.getDate()).toBe(15);
  });
});

describe("addPeriod", () => {
  it("monthly: Jan-31 → Feb-28 (non-leap)", () => {
    const base = toLocalDate("2023-01-31");
    const next = addPeriod(base, base, "monthly");
    expect(formatDateString(next)).toBe("2023-02-28");
  });

  it("monthly: Jan-31 → Feb-29 (leap year)", () => {
    const base = toLocalDate("2024-01-31");
    const next = addPeriod(base, base, "monthly");
    expect(formatDateString(next)).toBe("2024-02-29");
  });

  it("monthly: Feb-29 → Mar-29 (leap year source)", () => {
    const base = toLocalDate("2024-02-29");
    const next = addPeriod(base, base, "monthly");
    expect(formatDateString(next)).toBe("2024-03-29");
  });

  it("monthly: Mar-31 → Apr-30", () => {
    const base = toLocalDate("2024-03-31");
    const next = addPeriod(base, base, "monthly");
    expect(formatDateString(next)).toBe("2024-04-30");
  });

  it("yearly: Feb-29 leap → Feb-28 non-leap", () => {
    const base = toLocalDate("2024-02-29");
    const next = addPeriod(base, base, "yearly");
    expect(formatDateString(next)).toBe("2025-02-28");
  });

  it("yearly: Feb-29 → Feb-29 after 4 years (next leap)", () => {
    const base = toLocalDate("2024-02-29");
    let current = base;
    for (let i = 0; i < 4; i++) current = addPeriod(current, base, "yearly");
    expect(formatDateString(current)).toBe("2028-02-29");
  });

  it("daily: advances by exactly 1 day", () => {
    const base = toLocalDate("2024-03-01");
    expect(formatDateString(addPeriod(base, base, "daily"))).toBe("2024-03-02");
  });

  it("weekly: advances by exactly 7 days", () => {
    const base = toLocalDate("2024-03-01");
    expect(formatDateString(addPeriod(base, base, "weekly"))).toBe("2024-03-08");
  });

  it("daily: crosses month boundary correctly", () => {
    const base = toLocalDate("2024-01-31");
    expect(formatDateString(addPeriod(base, base, "daily"))).toBe("2024-02-01");
  });
});
