import currencyCodes from 'currency-codes';

export type CurrencyCode = string; // ISO 4217 code like 'INR', 'USD'

export interface CurrencyMeta {
  code: CurrencyCode;
  number: string | undefined;
  digits: number | undefined;
  currency: string | undefined; // name
  countries: string[] | undefined;
  symbol: string; // derived using Intl
}

interface CurrencyCodeRow {
  code: string;
  number?: string;
  digits?: number;
  currency?: string;
  countries?: string[];
}

export function getSymbolFor(code: CurrencyCode): string {
  try {
    // Use Intl to reliably get symbol via parts
    const parts = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'symbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0);
    const sym = parts.find(p => p.type === 'currency')?.value;
    return sym ?? code;
  } catch {
    return code;
  }
}

export function getAllCurrencies(): CurrencyMeta[] {
  const all = (currencyCodes.data || []) as CurrencyCodeRow[];
  return all.map((c) => ({
    code: c.code,
    number: c.number,
    digits: c.digits,
    currency: c.currency,
    countries: c.countries,
    symbol: getSymbolFor(c.code),
  }));
}

export function formatCurrency(value: number, code: CurrencyCode, opts?: Intl.NumberFormatOptions) {
  const nf = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: code,
    // Default to 0-2 fraction digits typical for prices
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...opts,
  });
  return nf.format(value);
}
