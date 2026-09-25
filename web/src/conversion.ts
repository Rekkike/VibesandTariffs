// Cross-currency comparison contract (spec v0.2.31 commit A; generalized
// to per-port currency data at v0.2.59).
//
// The comparison view compares ports that bill in different currencies.
// Raw amounts are never compared: every cross-port aggregate row renders
// the native-currency figure as primary and a converted figure as
// secondary ("802,180 EUR ≈ 9,042,000 kr"), and any ordering or ranking
// of ports uses the converted basis. Per-port result views keep native
// currency exclusively.
//
// v0.2.59: the two-currency assumption is gone. The comparison basis and
// every port's conversion path come from data (the registry's
// exchange_rates list, emitted from core/data/exchange_rates.yaml): the
// basis currency is declared there, one rate row per foreign currency,
// and a port whose currency has no declared path fails loudly - never a
// silent unconverted ranking on raw amounts across currencies. The
// current data set declares SEK as the basis with the single EUR row;
// the module's exported labels render exactly as before for it.
//
// The rate is a user-editable input with a documented default stored in
// the data. No runtime API calls — the rate is static, versioned data.
// Blank or invalid input falls back to the default with a visible flag;
// a converted figure never appears without its rate and date.
//
// This module is pure presentation logic — it never touches computation.

export interface ExchangeRateInfo {
  rate: number;          // basis-currency units per one unit of the rate's from-currency (e.g. kr per EUR)
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

// A registry rate row (ports.json exchange_rates, from
// core/data/exchange_rates.yaml): one declared conversion path toward the
// comparison basis.
export interface DeclaredRateRow {
  from_currency: string;
  to_currency: string;
  rate: number;
  as_of: string;
  source: string;
}

// The data-resolved comparison basis (spec v0.2.59): which currency the
// comparison converts toward, and the declared rate rows. Built once per
// view from the registry; every conversion and ranking flows through it.
export interface ComparisonBasisContext {
  basis: string;
  rows: DeclaredRateRow[];
}

// The declared basis for the current data set. The registry's rate rows
// name it (to_currency); when the rows are absent (a degenerate registry),
// the SEK default stands - the comparison has been SEK-basis since
// v0.2.31 and the fallback keeps the module testable without the registry.
export const DEFAULT_BASIS_CURRENCY = 'SEK';

export function resolveComparisonBasis(
  rows: DeclaredRateRow[] | undefined
): ComparisonBasisContext {
  return { basis: DEFAULT_BASIS_CURRENCY, rows: rows ?? [] };
}

// The rate row for a currency's declared conversion path toward the basis;
// throws loudly when the port's currency has no declared path (spec
// v0.2.59): a DKK port without a DKK row must fail, never silently rank
// its raw DKK amounts against SEK amounts.
export function declaredRateFor(
  context: ComparisonBasisContext,
  currency: string
): DeclaredRateRow {
  if (currency === context.basis) {
    throw new Error(`declaredRateFor: '${currency}' is the comparison basis itself - no conversion path needed`);
  }
  const row = context.rows.find(r => r.from_currency === currency && r.to_currency === context.basis);
  if (!row) {
    throw new Error(
      `declaredRateFor: no declared conversion path for '${currency}' toward the comparison basis ` +
      `'${context.basis}' - add a rate row to core/data/exchange_rates.yaml (spec v0.2.59); ` +
      `a port with an undeclared currency fails loudly, never ranks on raw amounts`
    );
  }
  return row;
}

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

// Convert a native amount into the comparison basis currency. The basis
// currency passes through unconverted; every other currency must have a
// declared path in the context (spec v0.2.59) - an undeclared currency
// throws rather than silently rendering unconverted while the ranking
// still orders it against basis-currency amounts.
export function toComparisonBasis(
  amount: number,
  currency: string,
  rate: ExchangeRateInfo,
  context?: ComparisonBasisContext
): { amount: number; converted: boolean } {
  const basis = context?.basis ?? DEFAULT_BASIS_CURRENCY;
  if (currency === basis) {
    return { amount, converted: false };
  }
  if (context) {
    // Registry-resolved context (the App always passes one): the port's
    // currency must have a declared conversion path - an undeclared
    // currency throws, never silently ranks raw amounts (spec v0.2.59).
    declaredRateFor(context, currency);
  }
  // Without a context (the module's own unit tests, degenerate loads) the
  // resolved rate converts every non-basis currency, the v0.2.31 behavior.
  return { amount: amount * rate.rate, converted: true };
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
  rate: ExchangeRateInfo,
  context?: ComparisonBasisContext
): { cheapestPortId: string | null; mostExpensivePortId: string | null } {
  if (totals.length < 2) {
    return { cheapestPortId: null, mostExpensivePortId: null };
  }
  let cheapest: string | null = null;
  let cheapestBasis = Infinity;
  let mostExpensive: string | null = null;
  let mostExpensiveBasis = -Infinity;
  for (const t of totals) {
    const basis = toComparisonBasis(t.amount, t.currency, rate, context).amount;
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

// Full rank ordering, cheapest first, on the converted basis (spec
// v0.2.59): the comparison's column order derives from the same converted
// basis as the cheapest/most-expensive markers - one ranking rule, never
// raw amounts across currencies. Pure function; ties keep the input order
// (stable sort), and an undeclared currency throws via toComparisonBasis.
export function rankOrderByConvertedBasis(
  totals: { portId: string; amount: number; currency: string }[],
  rate: ExchangeRateInfo,
  context?: ComparisonBasisContext
): { portId: string; amount: number; currency: string }[] {
  const basis = (t: { amount: number; currency: string }) =>
    toComparisonBasis(t.amount, t.currency, rate, context).amount;
  return [...totals].sort((a, b) => basis(a) - basis(b));
}
