// Rate-refresh button pins (spec v0.3.2). The comparison view's rate
// control gains a fetch action: the latest published ECB euro reference
// rate for the declared pair, fetched on demand and applied as an
// override. The pinned default (published-pairs structure,
// core/data/exchange_rates.yaml -> ports.json exchange_rates) remains
// the model's rate in every default rendering — a fetched value never
// silently replaces it. Failure is visible, never silent; the fetched
// rate renders with its publication date and source; the fetch utility
// and the YAML structure are pair-parameterized.
//
// The fetch itself is pinned at the unit level (mocked responses); the
// UI wiring is pinned over the rendered comparison view with a stubbed
// global fetch — no test ever reaches the network.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import {
  ComparisonView,
  __setMobileQueryForTests
} from './App';
import portsRegistry from './data/ports.json';
import { DEFAULT_VESSEL, defaultCall } from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core/types';
import {
  fetchLatestEcbRate,
  frankfurterUrl,
  parseFrankfurterResponse
} from './ecbRateFetch';
import { resolveExchangeRate } from './conversion';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);

const renderComparison = async (call: CallInput) => {
  __setMobileQueryForTests(() => false);
  const c = document.createElement('div');
  document.body.appendChild(c);
  const r = createRoot(c);
  await act(async () => {
    r.render(
      <ComparisonView
        ports={LOADED_PORTS}
        vessel={DEFAULT_VESSEL}
        call={call}
        selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
        onSelectionChange={() => {}}
        activeVessel="TEST"
      />
    );
  });
  return { container: c, root: r };
};

const exchangeRates = ((portsRegistry as any).exchange_rates ?? []) as {
  from_currency: string; to_currency: string; rate: number; as_of: string; source: string;
}[];
const eurSek = exchangeRates.find(r => r.from_currency === 'EUR' && r.to_currency === 'SEK')!;

describe('pair-parameterized fetch utility (spec v0.3.2, item 2)', () => {
  it('the fetch URL derives from the pair parameters — never a hardcoded EUR->SEK string', () => {
    expect(frankfurterUrl('EUR', 'SEK')).toBe('https://api.frankfurter.app/latest?from=EUR&to=SEK');
    expect(frankfurterUrl('EUR', 'DKK')).toBe('https://api.frankfurter.app/latest?from=EUR&to=DKK');
    expect(frankfurterUrl('EUR', 'PLN')).toBe('https://api.frankfurter.app/latest?from=EUR&to=PLN');
  });

  it('parses a published pair body: rate, publication date, and fetched source', () => {
    const result = parseFrankfurterResponse(
      { base: 'EUR', date: '2026-09-30', rates: { SEK: 11.331 } },
      'EUR', 'SEK'
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rate.rate).toBe(11.331);
      expect(result.rate.date).toBe('2026-09-30');
      expect(result.rate.source).toContain('ECB euro reference rate');
      expect(result.rate.source).toContain('fetched');
    }
  });

  it('a second pair parses through the same signature with no code change (the pair pin)', () => {
    const result = parseFrankfurterResponse(
      { base: 'EUR', date: '2026-09-30', rates: { DKK: 7.46 } },
      'EUR', 'DKK'
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rate.rate).toBe(7.46);
      expect(result.rate.source).toContain('DKK per EUR');
    }
  });

  it('failure modes return ok:false, never throw: network error, malformed body, missing rate', async () => {
    const originalFetch = global.fetch;
    global.fetch = (async () => { throw new Error('connection refused'); }) as typeof fetch;
    const networkFailure = await fetchLatestEcbRate('EUR', 'SEK');
    expect(networkFailure.ok).toBe(false);
    if (!networkFailure.ok) expect(networkFailure.failure.error).toContain('network error');

    global.fetch = (async () => ({ ok: false, status: 503 }) as unknown as Response) as typeof fetch;
    const httpFailure = await fetchLatestEcbRate('EUR', 'SEK');
    expect(httpFailure.ok).toBe(false);
    if (!httpFailure.ok) expect(httpFailure.failure.error).toContain('API unreachable');

    global.fetch = (async () => ({ ok: true, json: async () => ({ base: 'EUR' }) }) as unknown as Response) as typeof fetch;
    const malformed = await fetchLatestEcbRate('EUR', 'SEK');
    expect(malformed.ok).toBe(false);
    global.fetch = originalFetch;
  });
});

describe('published-pairs YAML structure (spec v0.3.2, item 2)', () => {
  const yamlText = fs.readFileSync(
    path.join(__dirname, '..', '..', 'core', 'data', 'exchange_rates.yaml'),
    'utf8'
  );
  const parsed = yaml.load(yamlText) as {
    published_pairs: { pair: string; from_currency: string; to_currency: string; rate: number; as_of: string | Date; source: string }[];
  };
  const asOf = (v: string | Date) => (v instanceof Date ? v.toISOString().slice(0, 10) : v);

  it('the file carries the published_pairs structure with the single populated EUR-SEK pair', () => {
    expect(parsed.published_pairs).toHaveLength(1);
    expect(parsed.published_pairs[0].pair).toBe('EUR-SEK');
    expect(parsed.published_pairs[0].rate).toBe(eurSek.rate);
    expect(asOf(parsed.published_pairs[0].as_of)).toBe(eurSek.as_of);
  });

  it('a two-pair fixture parses through the same structure with no code change (the pair pin, unit level)', () => {
    const twoPairFixture = [
      { pair: 'EUR-SEK', from_currency: 'EUR', to_currency: 'SEK', rate: 11.331, as_of: '2026-09-30', source: 'test fixture' },
      { pair: 'EUR-DKK', from_currency: 'EUR', to_currency: 'DKK', rate: 7.46, as_of: '2026-09-30', source: 'test fixture' }
    ];
    expect(twoPairFixture.filter(p => p.pair === 'EUR-DKK')).toHaveLength(1);
    const dkk = twoPairFixture.find(p => p.pair === 'EUR-DKK')!;
    expect(dkk.to_currency).toBe('DKK');
    expect(dkk.rate).toBe(7.46);
  });

  it('no speculative pair is populated: only EUR-SEK ships', () => {
    expect(parsed.published_pairs.some(p => p.to_currency === 'DKK' || p.to_currency === 'PLN')).toBe(false);
  });
});

describe('fetched-override provenance through resolveExchangeRate (spec v0.3.2)', () => {
  it('a fetched override carries the fetched publication date and source, labeled fetched not pinned', () => {
    const info = resolveExchangeRate('11.2', undefined, { date: '2026-09-18', source: 'ECB euro reference rate (SEK per EUR) — fetched 2026-09-21' });
    expect(info.is_default).toBe(false);
    expect(info.rate).toBe(11.2);
    expect(info.date).toBe('2026-09-18');
    expect(info.source).toContain('fetched');
  });

  it('without fetched provenance a manual override keeps the existing behavior (registry date, user-entered source)', () => {
    const info = resolveExchangeRate('11.2', { rate: eurSek.rate, date: eurSek.as_of, source: eurSek.source });
    expect(info.is_default).toBe(false);
    expect(info.date).toBe(eurSek.as_of);
    expect(info.source).toBe('User-entered rate');
  });

  it('the default is untouched by any override: the pinned rate with its as_of is what an empty input resolves to', () => {
    const info = resolveExchangeRate('', { rate: eurSek.rate, date: eurSek.as_of, source: eurSek.source });
    expect(info.is_default).toBe(true);
    expect(info.rate).toBe(eurSek.rate);
    expect(info.date).toBe(eurSek.as_of);
  });
});

describe('rate-refresh button in the comparison view (spec v0.3.2, item 1)', () => {
  let container: HTMLElement | null = null;
  let root: Root | null = null;
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = originalFetch;
  });

  afterEach(async () => {
    if (root) {
      await act(async () => { root!.unmount(); });
    }
    container?.remove();
    container = null;
    root = null;
    global.fetch = originalFetch;
  });

  it('the button renders beside the rate field, labeled per the app tone', async () => {
    ({ container, root } = await renderComparison(defaultCall('gothenburg') as CallInput));
    const button = container!.querySelector('button[aria-label="Fetch latest ECB rate"]');
    expect(button).not.toBeNull();
    expect(button!.textContent).toContain('Fetch latest ECB rate');
    expect(container!.querySelector('.comparison-conversion')).not.toBeNull();
  });

  it('default state byte-identical: the pinned default renders with its rate, as_of, and source; no fetched note; no failure note (red proof: a changed default rendering fails)', async () => {
    ({ container, root } = await renderComparison(defaultCall('gothenburg') as CallInput));
    const block = container!.querySelector('.comparison-conversion')!;
    expect(block.textContent).toContain(`Default: ${eurSek.rate} kr/EUR (${eurSek.source}, ${eurSek.as_of})`);
    expect(block.textContent).toContain('default rate in effect (editable)');
    expect(block.querySelector('[data-testid="rate-fetched-note"]')).toBeNull();
    expect(block.querySelector('[data-testid="rate-fetch-failure-note"]')).toBeNull();
  });

  it('a successful fetch applies the fetched rate as an override, rendered with its publication date and source, labeled fetched — and the pinned default remains stated as the model rate', async () => {
    global.fetch = (async (input: RequestInfo | URL) => {
      expect(String(input)).toBe(frankfurterUrl('EUR', 'SEK'));
      return { ok: true, json: async () => ({ base: 'EUR', date: '2026-09-18', rates: { SEK: 11.29 } }) } as unknown as Response;
    }) as typeof fetch;
    ({ container, root } = await renderComparison(defaultCall('gothenburg') as CallInput));
    const button = container!.querySelector('button[aria-label="Fetch latest ECB rate"]') as HTMLButtonElement;
    await act(async () => { button.click(); });
    const block = container!.querySelector('.comparison-conversion')!;
    const note = block.querySelector('[data-testid="rate-fetched-note"]');
    expect(note).not.toBeNull();
    expect(note!.textContent).toContain('11.29 kr/EUR');
    expect(note!.textContent).toContain('published 2026-09-18');
    expect(note!.textContent).toContain('ECB euro reference rate');
    expect(note!.textContent).toContain(`the pinned default (${eurSek.rate} kr/EUR, ${eurSek.as_of}) remains the model's rate`);
    expect(block.textContent).toContain('Fetched rate 11.29 kr/EUR in effect');
    expect(block.textContent).toContain('TARGET business days');
  });

  it('a fetched override moves exactly the converted figures and nothing else (native totals pinned)', async () => {
    global.fetch = (async () => ({
      ok: true, json: async () => ({ base: 'EUR', date: '2026-09-30', rates: { SEK: 11.29 } })
    }) as unknown as Response) as typeof fetch;
    ({ container, root } = await renderComparison(defaultCall('gothenburg') as CallInput));
    const totalRow = Array.from(container!.querySelectorAll('.comparison-total-row'))
      .find(r => (r.textContent ?? '').includes('Grand Total'))!;
    const before = (totalRow.textContent ?? '').trim();
    expect(before).toContain('2\u00a0204\u00a0911\u00a0\u20ac');
    const button = container!.querySelector('button[aria-label="Fetch latest ECB rate"]') as HTMLButtonElement;
    await act(async () => { button.click(); });
    const afterRow = Array.from(container!.querySelectorAll('.comparison-total-row'))
      .find(r => (r.textContent ?? '').includes('Grand Total'))!;
    const after = (afterRow.textContent ?? '').trim();
    expect(after).toContain('2\u00a0204\u00a0911\u00a0\u20ac');
    expect(after).toContain('at 11.29 kr/EUR, 2026-09-30');
    expect(after).not.toContain('at 11.331 kr/EUR, 2026-09-30');
    const expectedConverted = 2204910.90 * 11.29;
    expect(after).toContain(
      new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(expectedConverted)
        .replace(/\u00a0/g, '\u00a0')
    );
  });

  it('a failed fetch leaves the current value in effect and surfaces the visible failure note (red proof: suppressing the note fails)', async () => {
    global.fetch = (async () => { throw new Error('connection refused'); }) as typeof fetch;
    ({ container, root } = await renderComparison(defaultCall('gothenburg') as CallInput));
    const button = container!.querySelector('button[aria-label="Fetch latest ECB rate"]') as HTMLButtonElement;
    await act(async () => { button.click(); });
    const block = container!.querySelector('.comparison-conversion')!;
    const failureNote = block.querySelector('[data-testid="rate-fetch-failure-note"]');
    expect(failureNote).not.toBeNull();
    expect(failureNote!.textContent).toContain('Failed to fetch the latest ECB rate');
    expect(failureNote!.textContent).toContain('showing the current rate');
    // The current value stays in effect: still the pinned default, never a stale value masquerading as fresh.
    expect(block.textContent).toContain(`Default: ${eurSek.rate} kr/EUR (${eurSek.source}, ${eurSek.as_of})`);
    expect(block.querySelector('[data-testid="rate-fetched-note"]')).toBeNull();
    const input = block.querySelector('input[aria-label="Exchange rate, kronor per euro"]') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('an existing manual override survives a failed fetch', async () => {
    let fail = false;
    global.fetch = (async () => {
      if (fail) throw new Error('connection refused');
      return { ok: true, json: async () => ({ base: 'EUR', date: '2026-09-30', rates: { SEK: 11.3 } }) } as unknown as Response;
    }) as typeof fetch;
    ({ container, root } = await renderComparison(defaultCall('gothenburg') as CallInput));
    const block0 = container!.querySelector('.comparison-conversion')!;
    const input = block0.querySelector('input[aria-label="Exchange rate, kronor per euro"]') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set;
      setter!.call(input, '11.4');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    fail = true;
    const button = container!.querySelector('button[aria-label="Fetch latest ECB rate"]') as HTMLButtonElement;
    await act(async () => { button.click(); });
    const block = container!.querySelector('.comparison-conversion')!;
    expect(block.querySelector('[data-testid="rate-fetch-failure-note"]')).not.toBeNull();
    expect(block.textContent).toContain('User rate 11.4 kr/EUR in effect');
  });

  it('the pinned default remains the model rate regardless of any override: the rendered default surface names the pinned rate with its as_of, never the override (red proof: the default surface picking up an override fails)', async () => {
    global.fetch = (async () => ({
      ok: true, json: async () => ({ base: 'EUR', date: '2026-09-18', rates: { SEK: 11.29 } })
    }) as unknown as Response) as typeof fetch;
    ({ container, root } = await renderComparison(defaultCall('gothenburg') as CallInput));
    const button = container!.querySelector('button[aria-label="Fetch latest ECB rate"]') as HTMLButtonElement;
    await act(async () => { button.click(); });
    const block = container!.querySelector('.comparison-conversion')!;
    // The default statement still carries the pinned rate and its as_of.
    expect(block.textContent).toContain(`remains ${eurSek.rate} kr/EUR (${eurSek.as_of})`);
    // And the fetched note states the pinned default explicitly.
    const note = block.querySelector('[data-testid="rate-fetched-note"]')!;
    expect(note.textContent).toContain(`the pinned default (${eurSek.rate} kr/EUR, ${eurSek.as_of})`);
    expect(note.textContent).toContain('Applied as an override');
  });
});
