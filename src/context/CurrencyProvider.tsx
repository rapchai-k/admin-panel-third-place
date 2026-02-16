import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { formatCurrency as fmt, getSymbolFor } from '@/lib/currency';

interface CurrencyState {
  code: string; // ISO code, e.g., 'INR'
}

interface CurrencyContextType {
  code: string;
  symbol: string;
  isLoading: boolean;
  currencies: { code: string; name: string; symbol: string }[];
  formatCurrency: (value: number, codeOverride?: string, opts?: Intl.NumberFormatOptions) => string;
  setCurrency: (code: string) => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [, setState] = useState<CurrencyState>({ code: 'INR' });
  const [isLoading] = useState(false);

  // Currency selection is removed; keep empty list for compatibility
  const currencies = useMemo(() => [], []);

  // Always use INR symbol
  const symbol = useMemo(() => getSymbolFor('INR'), []);

  // No-op setter to satisfy existing callers
  const setCurrency = useCallback(async (_code: string) => {
    setState({ code: 'INR' });
  }, []);

  // Always format using INR regardless of override
  const formatCurrency = useCallback((value: number, _codeOverride?: string, opts?: Intl.NumberFormatOptions) => {
    return fmt(value, 'INR', opts);
  }, []);

  const value = useMemo<CurrencyContextType>(() => ({
    code: 'INR',
    symbol,
    isLoading,
    currencies,
    formatCurrency,
    setCurrency,
  }), [symbol, isLoading, currencies, formatCurrency, setCurrency]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
  return ctx;
};

