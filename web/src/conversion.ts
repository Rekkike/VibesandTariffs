// Cross-currency comparison contract (spec v0.2.31, commit A).
//
// The comparison view compares ports that bill in different currencies
// (SEK at the Swedish ports, EUR at Hamburg). Raw amounts are never
// compared: every cross-port aggregate row renders the native-currency
// figure as primary and a converted figure as secondary ("802,180 EUR ≈
// 9,042,000 kr"), and any ordering or ranking of ports uses the converted
// basis. Per-port result views keep native currency exclusively.
//
// The rate is a user-editable kr-per-EUR input with a documented default
// stored in the data (ports.json exchange_rate block, emitted by the
// conversion script from core/data). No runtime API calls — the rate is
// static, versioned data. Blank or invalid input falls back to the default
// with a visible flag; a converted figure never appears without its rate
// and date.
//
// This module is pure presentation logic — it never touches computation.

export interface ExchangeRateInfo {
  rate: number;          // kr per EUR
  date: string;          // as-of date of the recorded rate
  source: string;        // recorded source of the rate
  is_default: boolean;   // true when the default (not a user-entered value) is in effect
}

// Fallback default, identical to the value the conversion script emits into
// ports.json. The data block is the source of truth; this constant exists so
// the module is testable without the registry and so a missing data block
// degrades to the documented default rather than an unconverted comparison.
export const DEFAULT_EXCHANGE_RATE: ExchangeRateInfo = {
  rate: 11.275,
  date: '2026-09-21',
  source: 'ECB euro reference rate (SEK per EUR)',
  is_default: true
};

export function resolveExchangeRate(
  userInput: string | undefined,
  dataRate?: { rate: number; date: string; source: string }
): ExchangeRateInfo {
  const trimmed = (userInput ?? '').trim();
  if (trimmed === '') {
    return dataRate
      ? { rate: dataRate.rate, date: dataRate.date, source: dataRate.source, is_default: true }
      : { ...DEFAULT_EXCHANGE_RATE };
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return dataRate
      ? { rate: dataRate.rate, date: dataRate.date, source: dataRate.source, is_default: true }
      : { ...DEFAULT_EXCHANGE_RATE };
  }
  return {
    rate: parsed,
    date: dataRate?.date ?? DEFAULT_EXCHANGE_RATE.date,
    source: 'User-entered rate',
    is_default: false
  };
}

// Convert a native amount into the comparison basis currency. The comparison
// basis is SEK: the Swedish ports are native SEK (rate 1, no conversion), and
// EUR amounts are converted at the resolved kr-per-EUR rate.
export function toComparisonBasis(
  amount: number,
  currency: string,
  rate: ExchangeRateInfo
): { amount: number; converted: boolean } {
  if (currency === 'SEK') {
    return { amount, converted: false };
  }
  if (currency === 'EUR') {
    return { amount: amount * rate.rate, converted: true };
  }
  return { amount, converted: false };
}

export function formatRate(rate: ExchangeRateInfo): string {
  return `at ${rate.rate} kr/EUR, ${rate.date}`;
}

export function conversionLabel(rate: ExchangeRateInfo): string {
  return `figures converted at the shown rate for comparability; charges are incurred in native currency (${formatRate(rate)})`;
}

// Ranking on the converted basis (spec v0.2.31): ordering and cheapest /
// most-expensive determination never compare raw amounts across currencies.
// Pure function so ordering integrity is directly testable.
export function rankByConvertedBasis(
  totals: { portId: string; amount: number; currency: string }[],
  rate: ExchangeRateInfo
): { cheapestPortId: string | null; mostExpensivePortId: string | null } {
  if (totals.length < 2) {
    return { cheapestPortId: null, mostExpensivePortId: null };
  }
  let cheapest: string | null = null;
  let cheapestBasis = Infinity;
  let mostExpensive: string | null = null;
  let mostExpensiveBasis = -Infinity;
  for (const t of totals) {
    const basis = toComparisonBasis(t.amount, t.currency, rate).amount;
    if (basis < cheapestBasis) {
      cheapestBasis = basis;
      cheapest = t.portId;
    }
    if (basis > mostExpensiveBasis) {
      mostExpensiveBasis = basis;
      mostExpensive = t.portId;
    }
  }
  return { cheapestPortId: cheapest, mostExpensivePortId: mostExpensive };
}
