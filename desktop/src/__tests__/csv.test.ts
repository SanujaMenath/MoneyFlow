import { describe, it, expect } from "vitest";
import { exportTransactionsToCsv, parseTransactionsFromCsv } from "@moneyflow/shared";
import type { Transaction } from "@moneyflow/shared/types/transaction";

describe("CSV Export and Import Utilities", () => {
  it("exports transactions to RFC 4180 compliant CSV format", () => {
    const transactions: Transaction[] = [
      {
        id: 1,
        date: "2026-03-01",
        category: "Groceries",
        type: "expense",
        amount: 4550, // $45.50
        description: "Supermarket run, with eggs",
        recurringFrequency: "none",
      },
      {
        id: 2,
        date: "2026-03-02",
        category: "Salary",
        type: "income",
        amount: 300000, // $3000.00
        description: 'Monthly "Bonus" pay',
        recurringFrequency: "monthly",
      },
    ];

    const csv = exportTransactionsToCsv(transactions);

    expect(csv).toContain("ID,Date,Category,Type,Amount,Description,RecurringFrequency");
    expect(csv).toContain('1,2026-03-01,Groceries,expense,45.50,"Supermarket run, with eggs",none');
    expect(csv).toContain('2,2026-03-02,Salary,income,3000.00,"Monthly ""Bonus"" pay",monthly');
  });

  it("parses CSV correctly and handles escaped quotes and commas", () => {
    const csv = `ID,Date,Category,Type,Amount,Description,RecurringFrequency\r\n` +
      `1,2026-03-01,Food & Dining,expense,25.75,"Coffee, sandwich & snack",none\r\n` +
      `2,2026-03-02,Freelance,income,500.00,"Client project ""Alpha""",weekly`;

    const parsed = parseTransactionsFromCsv(csv);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({
      date: "2026-03-01",
      category: "Food & Dining",
      type: "expense",
      amount: 2575,
      description: "Coffee, sandwich & snack",
      recurringFrequency: "none",
    });

    expect(parsed[1]).toEqual({
      date: "2026-03-02",
      category: "Freelance",
      type: "income",
      amount: 50000,
      description: 'Client project "Alpha"',
      recurringFrequency: "weekly",
    });
  });

  it("handles empty or invalid lines gracefully", () => {
    const csv = `Date,Category,Type,Amount\r\n\r\n,,,invalid\r\n2026-03-05,Rent,expense,1200.00`;
    const parsed = parseTransactionsFromCsv(csv);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].amount).toBe(120000);
    expect(parsed[0].category).toBe("Rent");
  });
});
