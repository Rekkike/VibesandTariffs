// Rate-fetch removal rider pins (spec v0.4.0, the v0.3.2 reversal).
//
// The product owner removed the runtime rate fetch on live evidence: the
// v0.3.5 fallback chain performed exactly as engineered but failed in the
// reporting user's real browser with every endpoint named —
// api.frankfurter.app (network error), www.ecb.europa.eu daily XML
// (network error), data-api.ecb.europa.eu SDMX (no parseable rate; the
// Myra bot-check interstitial confirmed in a real browser, 2026-10-01).
// A runtime fetch whose every candidate endpoint fails in the target
// environment is replaced by the static-plus-manual-plus-link design:
// the pinned default (static, versioned data — the model's rate), the
// manual override input (unchanged behavior), and a plain anchor to the
// ECB's published euro reference rates page. A link cannot fail and
// needs no fetch machinery.
//
// Pins:
//   - the rate block renders default + override + the ECB link;
//   - the link's href is the ECB's published-rates page, opening in a
//     new tab;
//   - no fetch code remains (module absence + dead-source check);
//   - the pinned default's rendering and the override's behavior are
//     byte-identical to the pre-removal contract (re-homed from the
//     v0.3.2 rateRefresh suite);
//   - no hardcoded frankfurter string ships anywhere in the web source
//     (the v0.2.31 removal pin re-asserted);
//   - isolation both directions: the rider touches only the rate block
//     (the per-port amounts unchanged), and the port expansion touches
//     nothing in the rate block beyond its own declared movement.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { ComparisonView, __setMobileQueryForTests } from './App';
import portsRegistry from './data/ports.json';
import { DEFAULT_VESSEL, defaultCall } from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core/types';
import { resolveExchangeRate } from './conversion';

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
  pair?: string; from_currency: string; to_currency: string; rate: number; as_of: string; source: string;
}[];
const eurSek = exchangeRates.find(r => r.from_currency === 'EUR' && r.to_currency === 'SEK')!;

const ECB_RATES_PAGE =
  'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html';

describe('rate-fetch removal (spec v0.4.0 rider — the v0.3.2/v0.3.5 reversal)', () => {
  let container: HTMLElement | null = null;
  let root: Root | null = null;
  afterEach(async () => {
    if (root) {
      await act(async () => { root!.unmount(); });
    }
    container?.remove();
    container = null;
    root = null;
  });

  it('the fetch module is gone: ecbRateFetch.ts does not exist (red proof: a reintroduced fetch module fails)', () => {
    expect(fs.existsSync(path.join(__dirname, 'ecbRateFetch.ts'))).toBe(false);
  });

  it('no fetch reference remains in the web source: the comparison view and every non-test source file carry no fetchLatestEcbRate call (red proof: a fetch reference reappearing fails)', () => {
    const srcFiles = fs.readdirSync(__dirname)
      .filter(f => (f.endsWith('.ts') || f.endsWith('.tsx')) && !f.includes('.test.'));
    for (const f of srcFiles) {
      const text = fs.readFileSync(path.join(__dirname, f), 'utf8');
      expect(text.includes('fetchLatestEcbRate')).toBe(false);
      expect(text.includes("from './ecbRateFetch'")).toBe(false);
    }
  });

  it('the v0.2.31 removal pin re-asserts: no hardcoded frankfurter string ships in the web source', () => {
    const srcFiles = fs.readdirSync(__dirname)
      .filter(f => (f.endsWith('.ts') || f.endsWith('.tsx')) && !f.includes('.test.'));
    for (const f of srcFiles) {
      const text = fs.readFileSync(path.join(__dirname, f), 'utf8');
      expect(text.toLowerCase().includes('frankfurter')).toBe(false);
    }
  });

  it('the rate block renders default + override input + the ECB link (pinned; red proof: the link removed fails)', async () => {
    ({ container, root } = await renderComparison(defaultCall('gothenburg') as CallInput));
    const block = container!.querySelector('.comparison-conversion')!;
    expect(block).not.toBeNull();
    expect(block.querySelector('input[aria-label="Exchange rate, kronor per euro"]')).not.toBeNull();
    const link = block.querySelector('a[data-testid="ecb-rates-link"]') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe(ECB_RATES_PAGE);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.textContent).toContain("ECB's published euro reference rates");
  });

  it('the link label states the ECB context: published rates, TARGET business days, the daily XML alongside (the spec amendment recorded in the rendering)', async () => {
    ({ container, root } = await renderComparison(defaultCall('gothenburg') as CallInput));
    const block = container!.querySelector('.comparison-conversion')!;
    const text = block.textContent ?? '';
    expect(text).toContain('published on TARGET business days');
    expect(text).toContain('machine-readable daily XML');
    expect(text).toContain("model's pinned default is verified against them at each pass");
  });

  it('no fetch button remains in the rate block (red proof: a reintroduced button fails)', async () => {
    ({ container, root } = await renderComparison(defaultCall('gothenburg') as CallInput));
    const block = container!.querySelector('.comparison-conversion')!;
    expect(block.querySelector('button[aria-label="Fetch latest ECB rate"]')).toBeNull();
    expect(block.textContent).not.toContain('Fetch latest ECB rate');
  });

  it('default state byte-identical (re-homed from the v0.3.2 suite): the pinned default renders with its rate, as_of, and source; no fetched note; no failure note (red proof: a changed default rendering fails)', async () => {
    ({ container, root } = await renderComparison(defaultCall('gothenburg') as CallInput));
    const block = container!.querySelector('.comparison-conversion')!;
    expect(block.textContent).toContain(`Default: ${eurSek.rate} kr/EUR (${eurSek.source}, ${eurSek.as_of})`);
    expect(block.textContent).toContain('default rate in effect (editable)');
    expect(block.querySelector('[data-testid="rate-fetched-note"]')).toBeNull();
    expect(block.querySelector('[data-testid="rate-fetch-failure-note"]')).toBeNull();
  });

  it('the override behavior is unchanged (re-homed): a manual entry renders as the user rate in effect', async () => {
    ({ container, root } = await renderComparison(defaultCall('gothenburg') as CallInput));
    const block = container!.querySelector('.comparison-conversion')!;
    const input = block.querySelector('input[aria-label="Exchange rate, kronor per euro"]') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set;
      setter!.call(input, '11.4');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(block.textContent).toContain('User rate 11.4 kr/EUR in effect');
  });

  it('resolveExchangeRate default contract (re-homed): an empty input resolves to the pinned rate with its as_of', () => {
    const info = resolveExchangeRate('', { rate: eurSek.rate, date: eurSek.as_of, source: eurSek.source });
    expect(info.is_default).toBe(true);
    expect(info.rate).toBe(eurSek.rate);
    expect(info.date).toBe(eurSek.as_of);
  });

  it('resolveExchangeRate manual override (re-homed): a manual entry keeps the existing behavior (registry date, user-entered source)', () => {
    const info = resolveExchangeRate('11.2', { rate: eurSek.rate, date: eurSek.as_of, source: eurSek.source });
    expect(info.is_default).toBe(false);
    expect(info.rate).toBe(11.2);
    expect(info.date).toBe(eurSek.as_of);
    expect(info.source).toBe('User-entered rate');
  });

  it('isolation, rider-to-ports direction: the per-port amounts are untouched by the rider — the GOT grand total renders the pinned native figure beside the rate block', async () => {
    ({ container, root } = await renderComparison(defaultCall('gothenburg') as CallInput));
    const totalRow = Array.from(container!.querySelectorAll('.comparison-total-row'))
      .find(r => (r.textContent ?? '').includes('Grand Total'));
    expect(totalRow).toBeDefined();
    const text = totalRow!.textContent ?? '';
    expect(text).toContain('3');
    expect(text).toContain('275');
    expect(text).toContain('851');
  });

  it('isolation, ports-to-rider direction: with all six ports selected the rate block still renders exactly one default, one input, one link — no port surface leaked into it', async () => {
    ({ container, root } = await renderComparison(defaultCall('gothenburg') as CallInput));
    const block = container!.querySelector('.comparison-conversion')!;
    expect(block.querySelectorAll('input[aria-label="Exchange rate, kronor per euro"]')).toHaveLength(1);
    expect(block.querySelectorAll('a[data-testid="ecb-rates-link"]')).toHaveLength(1);
  });

  it('the published-pairs structure stays exactly as is (data architecture, not fetch machinery): the YAML carries the single EUR-SEK pair the registry mirrors', () => {
    const yamlText = fs.readFileSync(
      path.join(__dirname, '..', '..', 'core', 'data', 'exchange_rates.yaml'), 'utf8'
    );
    expect(yamlText.includes('published_pairs:')).toBe(true);
    // v0.4.6 ritual re-baseline (in-test attribution): 11.29 as of
    // 2026-10-02 (was 11.331, 2026-09-30) — conversion-only figures move
    // with the standing rate re-verification.
    expect(yamlText.includes('rate: 11.29')).toBe(true);
    expect(yamlText.includes('as_of: 2026-10-02')).toBe(true);
    expect(exchangeRates).toHaveLength(1);
    expect(eurSek.pair ?? eurSek.from_currency + '-' + eurSek.to_currency).toBe('EUR-SEK');
  });
});
