// Test-layer exchange-rate helper (v0.13.1 converted-pin test doctrine,
// user ruling 2026-11-11). Reads core/data/exchange_rates.yaml directly
// via fs + yaml.load - never the generated ports.json registry - so a
// stale registry stays detectable: expectations derived here follow the
// YAML source of truth while the app under test renders from the
// registry, and the registry rows are pinned to agree with the YAML.
//
// Exposes the EUR-SEK rate, the EUR-DKK rate, the as_of date(s), a
// full-precision converted(native, currency) (EUR direct at the EUR-SEK
// rate; DKK through the derived cross rate/dkkRate, never a stored
// cross; SEK passes through), and displayRounded, the display-rounding
// wrapper (whole units, sv-SE currency format, matching the app's
// formatCurrency). A rate pass therefore never touches this file: the
// byte-pinned rate-of-record pins live in rateRefresh.test.tsx and
// core/test/aarhus.test.ts, and the two golden byte-pinned rendered
// strings (one EUR-direct, one DKK-cross) live in discountLine.test.tsx.
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { ExchangeRateInfo } from './conversion';

const YAML_PATH = path.join(__dirname, '..', '..', 'core', 'data', 'exchange_rates.yaml');

interface PublishedPair {
  pair: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  as_of: string | Date;
  source: string;
}

const pair = (name: string): PublishedPair => {
  const raw = yaml.load(fs.readFileSync(YAML_PATH, 'utf8')) as { published_pairs: PublishedPair[] };
  const row = raw.published_pairs.find(p => p.pair === name);
  if (!row) {
    throw new Error(`testRates: pair '${name}' missing from core/data/exchange_rates.yaml`);
  }
  return row;
};

export const eurSekRate = (): number => pair('EUR-SEK').rate;
export const eurDkkRate = (): number => pair('EUR-DKK').rate;
// js-yaml parses the bare as_of date as a timestamp; normalize to the
// ISO date string the registry and the app carry.
const asOfString = (p: PublishedPair): string =>
  p.as_of instanceof Date ? p.as_of.toISOString().slice(0, 10) : String(p.as_of);
export const asOf = (): string => asOfString(pair('EUR-SEK'));
export const dkkAsOf = (): string => asOfString(pair('EUR-DKK'));

// Full precision, rounded at display only - the same contract as
// toComparisonBasis in conversion.ts.
export const converted = (native: number, currency: string): number => {
  if (currency === 'SEK') return native;
  if (currency === 'EUR') return native * eurSekRate();
  if (currency === 'DKK') return native * (eurSekRate() / eurDkkRate());
  throw new Error(`testRates.converted: unsupported currency '${currency}'`);
};

export const displayRounded = (amount: number, currency = 'SEK'): string =>
  new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);

export const perGt = (native: number, currency: string, gt: number): string =>
  (converted(native, currency) / gt).toFixed(2);

export const rateBasisText = (): string => `at ${eurSekRate()} kr/EUR, ${asOf()}`;

export const defaultRateInfo = (): ExchangeRateInfo => ({
  rate: eurSekRate(),
  date: asOf(),
  source: pair('EUR-SEK').source,
  is_default: true
});
