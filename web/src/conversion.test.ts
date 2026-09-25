// Cross-currency comparison contract tests (spec v0.2.31, commit A).
//
// Pins:
//  - the rate resolution: user rate used when valid; blank/invalid falls
//    back to the documented default with the fallback flag;
//  - conversion: SEK passes through unconverted (native primary only),
//    EUR converts to the SEK comparison basis;
//  - ranking integrity: ordering uses the converted basis — Hamburg's EUR
//    total ranks most expensive against larger SEK figures at any realistic
//    rate, and a rate change re-ranks correctly;
//  - the removed control: the v0.2.20 "express totals in one currency"
//    control (ECB fetch, display-currency select, converted-totals table)
//    is absent from the rendered comparison view;
//  - per-port result views contain no converted figures (native only).

import {
  DEFAULT_EXCHANGE_RATE,
  resolveExchangeRate,
  toComparisonBasis,
  conversionLabel,
  formatRate,
  rankByConvertedBasis,
  ExchangeRateInfo
} from './conversion';
import App from './App';
import { readDecomposedAppSource } from './appSource';

const dataRate = { rate: 11.275, date: '2026-09-21', source: 'ECB euro reference rate (SEK per EUR)' };

const rate = (r: number, isDefault = false): ExchangeRateInfo => ({
  rate: r,
  date: '2026-09-21',
  source: isDefault ? 'ECB euro reference rate (SEK per EUR)' : 'User-entered rate',
  is_default: isDefault
});

describe('rate resolution (spec v0.2.31)', () => {
  it('blank input resolves to the documented data default, flagged as default', () => {
    const info = resolveExchangeRate('', dataRate);
    expect(info.rate).toBe(11.275);
    expect(info.date).toBe('2026-09-21');
    expect(info.source).toContain('ECB');
    expect(info.is_default).toBe(true);
  });

  it('invalid input (zero, negative, non-numeric) falls back to the default with the flag', () => {
    for (const bad of ['0', '-5', 'abc', '  ']) {
      const info = resolveExchangeRate(bad, dataRate);
      expect(info.rate).toBe(11.275);
      expect(info.is_default).toBe(true);
    }
  });

  it('a valid user rate takes effect and is not flagged as default', () => {
    const info = resolveExchangeRate('10.5', dataRate);
    expect(info.rate).toBe(10.5);
    expect(info.is_default).toBe(false);
    expect(info.source).toBe('User-entered rate');
  });

  it('missing data block degrades to the module default, never to an unconverted comparison', () => {
    const info = resolveExchangeRate('', undefined);
    expect(info.rate).toBe(DEFAULT_EXCHANGE_RATE.rate);
    expect(info.is_default).toBe(true);
  });
});

describe('conversion to the comparison basis (spec v0.2.31)', () => {
  it('SEK amounts pass through unconverted (native primary only)', () => {
    const r = rate(11.275, true);
    expect(toComparisonBasis(1_000_000, 'SEK', r)).toEqual({ amount: 1_000_000, converted: false });
  });

  it('EUR amounts convert to SEK at the resolved rate', () => {
    const r = rate(11.275, true);
    expect(toComparisonBasis(802_180, 'EUR', r)).toEqual({ amount: 802_180 * 11.275, converted: true });
  });

  it('every converted figure carries its rate and date (formatRate / conversionLabel)', () => {
    const r = rate(11.275, true);
    expect(formatRate(r)).toBe('at 11.275 kr/EUR, 2026-09-21');
    expect(conversionLabel(r)).toContain('at 11.275 kr/EUR, 2026-09-21');
    expect(conversionLabel(r)).toContain('charges are incurred in native currency');
  });
});

describe('ranking integrity (spec v0.2.31): ordering uses the converted basis', () => {
  // Canonical default call totals (v0.2.30 report): Gothenburg and
  // Helsingborg in SEK, Hamburg in EUR. Hamburg's raw 861,430.56 is
  // numerically smaller than both SEK totals — the raw-amount defect the
  // pass repairs.
  const canonicalTotals = [
    { portId: 'gothenburg', amount: 1_534_126, currency: 'SEK' },
    { portId: 'hamburg', amount: 861_430.56, currency: 'EUR' },
    { portId: 'helsingborg', amount: 4_114_795, currency: 'SEK' }
  ];

  it('at the default rate Hamburg ranks most expensive, not cheapest', () => {
    const ranking = rankByConvertedBasis(canonicalTotals, rate(11.275, true));
    expect(ranking.mostExpensivePortId).toBe('hamburg');
    expect(ranking.cheapestPortId).toBe('gothenburg');
  });

  it('Hamburg ranks most expensive at any realistic rate (9–12 kr/EUR)', () => {
    for (const r of [9, 10, 11.275, 12]) {
      const ranking = rankByConvertedBasis(canonicalTotals, rate(r, true));
      expect(ranking.mostExpensivePortId).toBe('hamburg');
    }
  });

  it('a rate change re-ranks correctly', () => {
    // At an extreme low rate (1 kr/EUR) Hamburg's converted total
    // (861,430) drops below Gothenburg's (1,534,126) and it becomes the
    // cheapest port while Helsingborg (4.1m SEK) is most expensive; at an
    // extreme high rate (50 kr/EUR) Hamburg dominates. The ranking
    // follows the converted basis in both directions.
    const low = rankByConvertedBasis(canonicalTotals, rate(1));
    expect(low.mostExpensivePortId).toBe('helsingborg');
    expect(low.cheapestPortId).toBe('hamburg');
    const high = rankByConvertedBasis(canonicalTotals, rate(50));
    expect(high.mostExpensivePortId).toBe('hamburg');
    expect(high.cheapestPortId).toBe('gothenburg');
  });

  it('fewer than two ports yields no ranking', () => {
    const ranking = rankByConvertedBasis([{ portId: 'gothenburg', amount: 1, currency: 'SEK' }], rate(11.275, true));
    expect(ranking.cheapestPortId).toBeNull();
    expect(ranking.mostExpensivePortId).toBeNull();
  });
});

describe('removed control and native-only per-port views (spec v0.2.31)', () => {
  it('the v0.2.20 conversion control is gone: no ECB fetch, no display-currency select, no converted-totals table', () => {
    // The removed control's code paths: fetchEcbRates, the ECB endpoint,
    // the localStorage cache key, the display-currency select, and the
    // converted-totals table. None may appear in the app source.
    const appSource = readDecomposedAppSource();
    expect(appSource).not.toContain('fetchEcbRates');
    expect(appSource).not.toContain('frankfurter.app');
    expect(appSource).not.toContain('ecb_rates_cache');
    expect(appSource).not.toContain('conversionCurrency');
    expect(appSource).not.toContain('manualRate');
    expect(appSource).not.toContain('convertedTotals');
    expect(appSource).not.toContain('express totals in one currency');
  });

  it('the rate input renders with its documented default and fallback flag', () => {
    const appSource = readDecomposedAppSource();
    expect(appSource).toContain('Exchange rate (kr per EUR)');
    expect(appSource).toContain('default rate in effect (editable)');
    expect(appSource).toContain('Blank uses the default.');
  });

  it('per-port result views contain no converted figures: toComparisonBasis is used only inside ComparisonView', () => {
    // The per-port workspace (PortWorkspace) never imports or calls
    // conversion helpers; converted figures appear only in the comparison
    // view. The conversion module is imported once at module top; assert
    // the per-port total strip and segment rendering contain no converted
    // basis markers.
    // Re-pointed at the v0.2.60 decomposition (disclosed deviation): the
    // slice between 'const PortWorkspace' and 'const ComparisonView' was a
    // single-file boundary; the workspace now spans its own modules, so the
    // pin reads exactly those modules and asserts the same three markers.
    const fs = require('fs');
    const path = require('path');
    const workspaceModules = ['portWorkspace.tsx', 'portWorkspaceInputs.tsx', 'disclosureCard.tsx', 'envGuideHelp.tsx'];
    const workspace = workspaceModules
      .map(m => fs.readFileSync(path.join(__dirname, m), 'utf8'))
      .join('\n');
    expect(workspace).not.toContain('toComparisonBasis');
    expect(workspace).not.toContain('comparison-converted-tag');
    expect(workspace).not.toContain('convCell');
  });
});
