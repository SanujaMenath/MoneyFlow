import type { Transaction } from "../types/transaction";

/**
 * Escapes a single CSV field according to RFC 4180 rules.
 */
function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports an array of transactions to a CSV string.
 */
export function exportTransactionsToCsv(transactions: Transaction[]): string {
  const headers = ["ID", "Date", "Category", "Type", "Amount", "Description", "RecurringFrequency"];
  const rows = transactions.map((t) => [
    escapeCsvField(t.id ?? ""),
    escapeCsvField(t.date),
    escapeCsvField(t.category),
    escapeCsvField(t.type),
    escapeCsvField((t.amount / 100).toFixed(2)),
    escapeCsvField(t.description ?? ""),
    escapeCsvField(t.recurringFrequency ?? "none"),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  return csvContent;
}

/**
 * Parses a single CSV line honoring quotes.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parses a CSV string into a partial Transaction array.
 */
export function parseTransactionsFromCsv(csvText: string): Partial<Transaction>[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const dateIdx = headers.findIndex((h) => h === "date");
  const catIdx = headers.findIndex((h) => h === "category");
  const typeIdx = headers.findIndex((h) => h === "type");
  const amountIdx = headers.findIndex((h) => h === "amount");
  const descIdx = headers.findIndex((h) => h === "description");
  const recurIdx = headers.findIndex((h) => h.includes("recurring"));

  const transactions: Partial<Transaction>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    if (fields.length === 0) continue;

    const rawDate = dateIdx !== -1 ? fields[dateIdx] : "";
    const rawCategory = catIdx !== -1 ? fields[catIdx] : "Other Expense";
    const rawType = typeIdx !== -1 && fields[typeIdx].toLowerCase() === "income" ? "income" : "expense";
    const rawAmount = amountIdx !== -1 ? parseFloat(fields[amountIdx]) : 0;
    const rawDesc = descIdx !== -1 ? fields[descIdx] : "";
    const rawRecur = recurIdx !== -1 ? fields[recurIdx] : "none";

    if (!rawDate || isNaN(rawAmount) || rawAmount <= 0) continue;

    transactions.push({
      date: rawDate,
      category: rawCategory || (rawType === "income" ? "Other Income" : "Other Expense"),
      type: rawType,
      amount: Math.round(rawAmount * 100),
      description: rawDesc || null,
      recurringFrequency: (rawRecur as any) || "none",
    });
  }

  return transactions;
}
