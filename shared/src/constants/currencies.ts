export interface Currency {
  code: string;
  symbol: string;
  name: string;
  locale: string;
  decimals: number;
}

export const currencies: Currency[] = [
  { code: "LKR", symbol: "Rs.", name: "Sri Lankan Rupee", locale: "si-LK", decimals: 2 },
  { code: "USD", symbol: "$",   name: "US Dollar",         locale: "en-US", decimals: 2 },
  { code: "EUR", symbol: "€",   name: "Euro",              locale: "de-DE", decimals: 2 },
  { code: "GBP", symbol: "£",   name: "British Pound",     locale: "en-GB", decimals: 2 },
  { code: "INR", symbol: "₹",   name: "Indian Rupee",      locale: "en-IN", decimals: 2 },
  { code: "AUD", symbol: "A$",  name: "Australian Dollar",  locale: "en-AU", decimals: 2 },
  { code: "JPY", symbol: "¥",   name: "Japanese Yen",      locale: "ja-JP", decimals: 0 },
  { code: "CAD", symbol: "C$",  name: "Canadian Dollar",   locale: "en-CA", decimals: 2 },
];

export const defaultCurrency = currencies[0];
