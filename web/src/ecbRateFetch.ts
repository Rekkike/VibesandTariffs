// ECB rate fetch (spec v0.3.2, the rate-refresh button): a user-initiated
// UI-layer action that fetches the latest ECB euro reference rate for a
// currency pair on demand and applies it as an override. The pinned
// default (core/data/exchange_rates.yaml, mirrored into ports.json as
// exchange_rates) remains the model's rate in every default rendering —
// a fetched value never silently replaces it.
//
// Pair-parameterized by contract: the URL derives from the from/to
// currencies passed in — never a hardcoded EUR->SEK string. The module
// supports any pair the ECB publishes (EUR-anchored; DKK/PLN activate at
// the Aarhus/Gdynia expansion as data-only additions).
//
// The ECB publishes reference rates on TARGET business days only. The
// fetched result carries its publication date; the UI must render it so
// weekend/holiday lag is visible, never mistaken for same-day data.

export interface FetchedRate {
  rate: number;
  date: string;
  source: string;
}

export interface FetchFailure {
  error: string;
}

export type FetchRateResult =
  | { ok: true; rate: FetchedRate }
  | { ok: false; failure: FetchFailure };

// The Frankfurter API documents the ECB euro reference rates
// (https://frankfurter.app); the pair is always a parameter.
export function frankfurterUrl(fromCurrency: string, toCurrency: string): string {
  return `https://api.frankfurter.app/latest?from=${encodeURIComponent(fromCurrency)}&to=${encodeURIComponent(toCurrency)}`;
}

export function parseFrankfurterResponse(
  json: unknown,
  fromCurrency: string,
  toCurrency: string
): FetchRateResult {
  if (!json || typeof json !== 'object') {
    return { ok: false, failure: { error: 'unexpected response shape' } };
  }
  const body = json as { base?: unknown; date?: unknown; rates?: unknown };
  if (body.base !== fromCurrency || typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return { ok: false, failure: { error: 'unexpected response shape' } };
  }
  const rates = body.rates as Record<string, unknown> | undefined;
  const value = rates?.[toCurrency];
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return { ok: false, failure: { error: `no published ${fromCurrency}->${toCurrency} rate in the response` } };
  }
  return {
    ok: true,
    rate: {
      rate: value,
      date: body.date,
      source: `ECB euro reference rate (${toCurrency} per ${fromCurrency}) — fetched ${new Date().toISOString().slice(0, 10)}`
    }
  };
}

// Fetch the latest published ECB rate for the pair. Never throws: every
// failure mode (network error, non-OK status, malformed body, missing
// rate) returns ok:false with the error string so the caller can surface
// a visible failure note and stay on the current value.
export async function fetchLatestEcbRate(
  fromCurrency: string,
  toCurrency: string
): Promise<FetchRateResult> {
  let response: Response;
  try {
    response = await fetch(frankfurterUrl(fromCurrency, toCurrency));
  } catch (e) {
    return { ok: false, failure: { error: `network error: ${(e as Error).message}` } };
  }
  if (!response.ok) {
    return { ok: false, failure: { error: `API unreachable (HTTP ${response.status})` } };
  }
  let json: unknown;
  try {
    json = await response.json();
  } catch (e) {
    return { ok: false, failure: { error: `malformed response: ${(e as Error).message}` } };
  }
  return parseFrankfurterResponse(json, fromCurrency, toCurrency);
}
