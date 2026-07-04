import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { storage } from "../lib/storage";

export interface Currency {
  code: string;
  symbol: string;
  locale: string;
}

const currencies: Currency[] = [
  { code: "LKR", symbol: "Rs.", locale: "si-LK" },
  { code: "USD", symbol: "$", locale: "en-US" },
  { code: "EUR", symbol: "€", locale: "de-DE" },
  { code: "GBP", symbol: "£", locale: "en-GB" },
  { code: "INR", symbol: "₹", locale: "en-IN" },
  { code: "AUD", symbol: "A$", locale: "en-AU" },
  { code: "JPY", symbol: "¥", locale: "ja-JP" },
  { code: "CAD", symbol: "C$", locale: "en-CA" },
];

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  format: (cents: number) => string;
  currencies: Currency[];
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
};

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<Currency>(currencies[0]);

  useEffect(() => {
    storage.getItem("mf_currency").then((saved) => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const match = currencies.find((c) => c.code === parsed.code);
          if (match) setCurrencyState(match);
        } catch {
          // ignore parse errors for saved currency
        }
      }
    });
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    storage.setItem("mf_currency", JSON.stringify(c));
  };

  const format = (cents: number): string => {
    const amount = cents / 100;
    try {
      return `${currency.symbol}${amount.toLocaleString(currency.locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    } catch {
      return `${currency.symbol}${amount.toFixed(2)}`;
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, format, currencies }}>
      {children}
    </CurrencyContext.Provider>
  );
};
