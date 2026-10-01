// ECB rate fetch (spec v0.3.2, the rate-refresh button; v0.3.5 the fallback
// chain): a user-initiated UI-layer action that fetches the latest ECB euro
// reference rate for a currency pair on demand and applies it as an
// override. The pinned default (core/data/exchange_rates.yaml, mirrored
// into ports.json as exchange_rates) remains the model's rate in every
// default rendering — a fetched value never silently replaces it.
//
// v0.3.5 defect fix: the v0.3.2 fetch pinned a single third-party domain
// (api.frankfurter.app) with no fallback, and its pins were network-stubbed
// — the browser-side failure class (CORS/blocking) shipped unverified and
// the fetch fails for real users while the URL answers non-browser
// clients (docs/RATE_FETCH_FALLBACK_AUDIT.md §1). fetchLatestEcbRate is
// now a chain over ordered endpoints (the audit's §5 verdict): the
// Frankfurter mirror first (unchanged primary), then the ECB's own daily
// reference-rate XML, then the ECB SDMX data API. Any per-endpoint failure
// (network error, non-OK status, parse failure, missing rate) falls
// through to the next endpoint; only when all endpoints fail does the
// caller render the failure note, naming every endpoint and reason.
//
// Pair-parameterized by contract: every URL and parser derives from the
// from/to currencies passed in — never a hardcoded EUR->SEK string. A
// second published pair uses the same chain with no code change.
//
// The ECB publishes reference rates on TARGET business days only. The
// fetched result carries its publication date and the endpoint that
// answered; the UI renders both so weekend/holiday lag and the serving
// source are visible, never mistaken.

export interface FetchedRate {
  rate: number;
  date: string;
  source: string;
  endpoint: string;
}

export interface FetchFailure {
  error: string;
  attempts: { endpoint: string; reason: string }[];
}

export type FetchRateResult =
  | { ok: true; rate: FetchedRate }
  | { ok: false; failure: FetchFailure };

// The ordered endpoint chain (the audit's §5 verdict): primary unchanged,
// then the ECB's own publication surfaces. Each entry names its host for
// the per-endpoint failure note and carries a URL builder and response
// parser, both pair-parameterized.
export interface RateEndpoint {
  name: string;
  url: (fromCurrency: string, toCurrency: string) => string;
  parse: (
    bodyText: string,
    fromCurrency: string,
    toCurrency: string
  ) => { rate: number; date: string } | null;
}

// The Frankfurter API documents the ECB euro reference rates
// (https://frankfurter.app); the pair is always a parameter.
export function frankfurterUrl(fromCurrency: string, toCurrency: string): string {
  return `https://api.frankfurter.app/latest?from=${encodeURIComponent(fromCurrency)}&to=${encodeURIComponent(toCurrency)}`;
}

export function parseFrankfurterResponse(
  json: unknown,
  fromCurrency: string,
  toCurrency: string
): { rate: number; date: string } | null {
  if (!json || typeof json !== 'object') {
    return null;
  }
  const body = json as { base?: unknown; date?: unknown; rates?: unknown };
  if (body.base !== fromCurrency || typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return null;
  }
  const rates = body.rates as Record<string, unknown> | undefined;
  const value = rates?.[toCurrency];
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return { rate: value, date: body.date };
}

// The ECB's own daily reference-rate XML (the primary source Frankfurter
// mirrors): a gesmes:Envelope whose inner Cube carries the publication
// date and one Cube per currency with its rate. Verified live 2026-10-01
// (audit §2.2). A DOM parser is not available in every jsdom snapshot and
// this file is also imported by node-side unit pins, so the parse is a
// targeted scan of the Cube elements for the requested pair — strict
// (exact attribute quotes, exact date shape) but never a whole-document
// schema assumption.
export function ecbDailyXmlUrl(): string {
  return 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
}

export function parseEcbDailyXml(
  xml: unknown,
  _fromCurrency: string,
  toCurrency: string
): { rate: number; date: string } | null {
  if (typeof xml !== 'string') return null;
  const timeMatch = xml.match(/<Cube\s+time='(\d{4}-\d{2}-\d{2})'>/);
  if (!timeMatch) return null;
  const currencyRe = new RegExp(`<Cube\\s+currency='${toCurrency}'\\s+rate='([0-9.]+)'\\s*/>`);
  const curMatch = xml.match(currencyRe);
  if (!curMatch) return null;
  const value = Number(curMatch[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return { rate: value, date: timeMatch[1] };
}

// The ECB SDMX data API, series EXR/D.{TO}.{FROM}.SP00.A (the euro
// reference-rate series), latest observation, JSON. Bot-checked for
// automated clients (observed 2026-10-01, audit §2.3) — a per-endpoint
// failure here simply falls through; a browser that passes the check
// gets served.
export function ecbSdmxUrl(fromCurrency: string, toCurrency: string): string {
  return `https://data-api.ecb.europa.eu/service/data/EXR/D.${encodeURIComponent(toCurrency)}.${encodeURIComponent(fromCurrency)}.SP00.A?lastNObservations=1&format=jsondata`;
}

export function parseEcbSdmxResponse(
  json: unknown,
  _fromCurrency: string,
  toCurrency: string
): { rate: number; date: string } | null {
  if (!json || typeof json !== 'object') return null;
  const body = json as {
    data?: { cubes?: unknown[] } & Record<string, unknown>;
  };
  const cubes = body.data?.cubes;
  if (!Array.isArray(cubes) || cubes.length === 0) return null;
  const cube = cubes[cubes.length - 1] as Record<string, unknown>;
  if (typeof cube.TIME_PERIOD !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(cube.TIME_PERIOD)) return null;
  const value = cube[toCurrency];
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return { rate: value, date: cube.TIME_PERIOD };
}

export const RATE_ENDPOINTS: RateEndpoint[] = [
  {
    name: 'api.frankfurter.app',
    url: frankfurterUrl,
    parse: (bodyText: string, fromCurrency: string, toCurrency: string) => {
      let json: unknown;
      try {
        json = JSON.parse(bodyText);
      } catch {
        return null;
      }
      return parseFrankfurterResponse(json, fromCurrency, toCurrency);
    }
  },
  {
    name: 'www.ecb.europa.eu (daily reference-rate XML)',
    url: () => ecbDailyXmlUrl(),
    parse: parseEcbDailyXml
  },
  {
    name: 'data-api.ecb.europa.eu (SDMX)',
    url: ecbSdmxUrl,
    parse: (bodyText: string, fromCurrency: string, toCurrency: string) => {
      let json: unknown;
      try {
        json = JSON.parse(bodyText);
      } catch {
        return null;
      }
      return parseEcbSdmxResponse(json, fromCurrency, toCurrency);
    }
  }
];

// Fetch the latest published ECB rate for the pair, trying each endpoint
// in order. Never throws: every per-endpoint failure mode (network error,
// non-OK status, malformed body, missing rate) is collected and the chain
// falls through; only when all endpoints fail does this return ok:false
// with every attempt recorded, so the caller can surface a visible
// failure note naming what was tried and stay on the current value.
export async function fetchLatestEcbRate(
  fromCurrency: string,
  toCurrency: string
): Promise<FetchRateResult> {
  const attempts: { endpoint: string; reason: string }[] = [];
  for (const endpoint of RATE_ENDPOINTS) {
    const url = endpoint.url(fromCurrency, toCurrency);
    let response: Response;
    try {
      response = await fetch(url);
    } catch (e) {
      attempts.push({ endpoint: endpoint.name, reason: `network error: ${(e as Error).message}` });
      continue;
    }
    if (!response.ok) {
      attempts.push({ endpoint: endpoint.name, reason: `API unreachable (HTTP ${response.status})` });
      continue;
    }
    let bodyText: string;
    try {
      bodyText = await response.text();
    } catch (e) {
      attempts.push({ endpoint: endpoint.name, reason: `malformed response: ${(e as Error).message}` });
      continue;
    }
    const parsed = endpoint.parse(bodyText, fromCurrency, toCurrency);
    if (!parsed) {
      attempts.push({
        endpoint: endpoint.name,
        reason: `no published ${fromCurrency}->${toCurrency} rate in the response`
      });
      continue;
    }
    return {
      ok: true,
      rate: {
        rate: parsed.rate,
        date: parsed.date,
        source: `ECB euro reference rate (${toCurrency} per ${fromCurrency}) — fetched ${new Date().toISOString().slice(0, 10)}`,
        endpoint: endpoint.name
      }
    };
  }
  return {
    ok: false,
    failure: {
      error: `all rate endpoints failed (${attempts.map(a => `${a.endpoint}: ${a.reason}`).join('; ')})`,
      attempts
    }
  };
}
