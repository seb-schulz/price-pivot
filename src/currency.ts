export const currencies = ["EUR", "USD", "SEK", "DKK", "GBP", "CHF", "CAD"];

export type Currency = "EUR" | "USD" | "SEK" | "DKK" | "GBP" | "CHF" | "CAD";
export type CurrencyTable = { [key in Currency]?: number };

export const isCurrency = (c: string) => {
  return currencies.includes(c);
};

export const SYNC_TAG = "currency-data";
