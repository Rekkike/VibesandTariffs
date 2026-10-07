// Print suite (spec v0.6.2): pins for the comparison's print/PDF export.
// The settled break constant and the page-composition model
// (printPages.ts), the print header/footer/continuation content
// (printComparisonPages.tsx), the export button's presence and its own
// print-stylesheet hiding, the print stylesheet's screen-view suppression
// (the print surface is the table, only the table), the pagination
// break-integrity rules, and the no-flag-section-in-print ruling. Red
// proofs per the standing discipline: the constant was mutated 3 -> 2 and
// 3 -> 4 and both composition pins observed red before being trusted,
// then restored; the v0.6.2 defect pins (the #root hiding, the page-level
// break-inside) were observed red against the v0.6.1 stylesheet before
// being trusted.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import * as reactDom from 'react-dom';
import * as fs from 'fs';
import * as path from 'path';
import App from './App';
import { ComparisonView } from './App';
import { buildRuleNamesByPort, buildRuleAttributesByPort, buildRowsBySegment } from './comparisonModel';
import { PrintComparisonPages, printRateBasisNote } from './printComparisonPages';
import { PRINT_COLUMNS_PER_PAGE, printContinuationNote, printPagesFor } from './printPages';
import portsRegistry from './data/ports.json';
import { DEFAULT_VESSEL, defaultCall, calculatePortCallCost } from '@port-cost/core';
import { APP_VERSION } from './version';
import type { CallInput, PortDefinition, VesselInput } from '@port-cost/core/types';

const cssSource = fs.readFileSync(path.join(__dirname, 'index.css'), 'utf8');
const printPagesSource = fs.readFileSync(path.join(__dirname, 'printPages.ts'), 'utf8');
const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const DECLARED_ROWS = ((portsRegistry as any).exchange_rates ?? []) as {
  from_currency: string; to_currency: string; rate: number; as_of: string; source: string;
}[];
// The synthetic nine-port fixture: a ninth registry-shaped port (the
// portGeneralization suite's Finland precedent - a country with no real
// port yet) so the 3+3+3 composition pins on exactly nine columns, the
// settled constant's first full page set.
const SYNTHETIC_NINTH: { id: string; name: string } = {
  id: 'synthetic_print_ninth',
  name: 'Synthetic Ninth Port (print fixture)'
};
const eightPorts = LOADED_PORTS.map(p => ({ id: p.metadata.id, name: p.metadata.name }));
const ninePorts = [...eightPorts, SYNTHETIC_NINTH];

jest.setTimeout(30000);

describe('print page composition — the settled 3+3+3 constant (spec v0.6.2)', () => {
  it('the break constant is three port columns per page, documented in-code as settled and never derived', () => {
    // The pin's letter: the constant is a fixed typographic decision - the
    // in-code settlement comment is part of the contract, and the value
    // itself is pinned by the composition tests below (never by reading
    // the constant back for the arithmetic).
    expect(PRINT_COLUMNS_PER_PAGE).toBe(3);
    expect(printPagesSource).toMatch(/SETTLED/);
    expect(printPagesSource).toMatch(/never derived/);
  });

  it('eight ports compose 3 + 3 + 2 — the current registry slices into two full pages and one honest short page', () => {
    expect(LOADED_PORTS.length).toBe(8);
    const pages = printPagesFor(eightPorts);
    expect(pages.length).toBe(3);
    expect(pages[0].ports.length).toBe(3);
    expect(pages[1].ports.length).toBe(3);
    expect(pages[2].ports.length).toBe(2);
    expect(pages[0].ports.map(p => p.id)).toEqual(
      ['aarhus', 'bremerhaven', 'gavle']
    );
    expect(pages[1].ports.map(p => p.id)).toEqual(
      ['gothenburg', 'hamburg', 'helsingborg']
    );
    expect(pages[2].ports.map(p => p.id)).toEqual(
      ['norrkoping', 'norvik']
    );
    expect(pages.map(p => p.pageNumber)).toEqual([1, 2, 3]);
    expect(pages.every(p => p.totalPages === 3)).toBe(true);
  });

  it('the synthetic nine-port fixture composes exactly 3 + 3 + 3', () => {
    const pages = printPagesFor(ninePorts);
    expect(pages.length).toBe(3);
    expect(pages.map(p => p.ports.length)).toEqual([3, 3, 3]);
    expect(pages[2].ports[2].id).toBe(SYNTHETIC_NINTH.id);
  });

  it('a comparison of six or fewer ports stays on one page (the cap means a single printed page at the drawer cap)', () => {
    const six = printPagesFor(eightPorts.slice(0, 6));
    expect(six.length).toBe(2);
    expect(six[0].ports.length).toBe(3);
    expect(six[1].ports.length).toBe(3);
    expect(six[0].pageNumber).toBe(1);
    expect(six[0].totalPages).toBe(2);
    expect(printContinuationNote(six[1], 6)).toBe('continued \u2014 ports 4\u20136 of 6');
  });

  it('the continuation note: blank on page 1, "continued — ports 4–6 of 8" on page 2, "continued — ports 7–8 of 8" on page 3', () => {
    const pages = printPagesFor(eightPorts);
    expect(printContinuationNote(pages[0], 8)).toBe('');
    expect(printContinuationNote(pages[1], 8)).toBe('continued \u2014 ports 4\u20136 of 8');
    expect(printContinuationNote(pages[2], 8)).toBe('continued \u2014 ports 7\u20138 of 8');
    // The nine-port fixture's page 3 note names all nine.
    const nine = printPagesFor(ninePorts);
    expect(printContinuationNote(nine[2], 9)).toBe('continued \u2014 ports 7\u20139 of 9');
  });
});

describe('print header content — the unfalsifiability rule (spec v0.6.2)', () => {
  const renderPrintPages = async (selectedPortIds: string[], vessel: VesselInput = DEFAULT_VESSEL) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const ports = LOADED_PORTS.filter(p => selectedPortIds.includes(p.metadata.id));
    const call = defaultCall('gothenburg');
    const portResults = ports.map(port => {
      const merged = { ...defaultCall(port.metadata.id), ...call, port_id: port.metadata.id } as CallInput;
      try {
        return { port, result: calculatePortCallCost(port, { vessel, call: merged }) };
      } catch {
        return { port, result: null };
      }
    });
    const rateInfo = { rate: 11.2525, date: '2026-10-05', source: 'ECB euro reference rate (SEK per EUR)', is_default: true };
    await act(async () => {
      root!.render(
        <PrintComparisonPages
          ports={ports}
          portResults={portResults as never}
          rowsByStage={[] as never}
          vessel={vessel}
          call={call}
          rateInfo={rateInfo}
          comparisonBasisContext={{ basis: 'SEK', rows: DECLARED_ROWS }}
          declaredRows={DECLARED_ROWS}
          activeVessel="MAREN MAERSK (IMO 9632129)"
          formatCurrency={(amount, currency) =>
            new Intl.NumberFormat('sv-SE', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)}
          derivationsVisible={true}
          conversionsVisible={true}
          containerThroughVisible={false}
          hinterlandMode={"truck"}
        />
      );
    });
    return { container, root };
  };

  it('every page carries the mandatory header: version, tariff year, both published rate pairs, vessel profile, ESI, and the rate-basis note', async () => {
    const { container, root } = await renderPrintPages(LOADED_PORTS.map(p => p.metadata.id));
    try {
      // The pages portal to the document body (spec v0.6.2) - the pins
      // read the body, never the screen container: no screen content in
      // the print DOM.
      const headers = document.body.querySelectorAll('.print-header');
      expect(headers.length).toBe(3);
      headers.forEach(h => {
        const text = h.textContent ?? '';
        // The printed version is the single web-layer constant (the chip's
        // own source); the version-guard ritual pins it against the spec
        // header - this suite never carries a second version literal.
        expect(text).toContain(`Version: ${APP_VERSION}`);
        expect(APP_VERSION).toBe('v0.6.5');
        expect(text).toContain('Tariff year: 2026');
        expect(text).toContain('Vessel profile: MAREN MAERSK (IMO 9632129)');
        expect(text).toContain('ESI:');
        // Both published pairs render with their as_of.
        expect(text).toContain('EUR\u2192SEK 11.2525 (2026-10-05)');
        expect(text).toContain('EUR\u2192DKK 7.4745 (2026-10-05)');
        expect(text).toContain('Rate basis:');
      });
    } finally {
      await act(async () => { root!.unmount(); });
      container.remove();
    }
  });

  // The four-line structured header (spec v0.6.3, unit 3): the header is a
  // compact four-line block, never a run-on. Line 1 app name, version,
  // tariff year; line 2 vessel profile (name, IMO, GT, TEU), ESI, and the
  // classes exactly as the screen context strip states them; line 3 the
  // call parameters as set (live values); line 4 the rate basis, both
  // published pairs with their as_of dates. All four lines on every page.
  // Red proof per the standing discipline: the structural pin was observed
  // red against the v0.6.2 run-on header (one title paragraph plus a single
  // space-joined span run, no .print-header-line blocks) before being
  // trusted, then restored green.
  it('the header renders as the four-line block on every page - line 1: app, version, tariff year', async () => {
    const { container, root } = await renderPrintPages(LOADED_PORTS.map(p => p.metadata.id));
    try {
      const lines = document.body.querySelectorAll('.print-header .print-header-line');
      // Exactly four lines per header, three headers - and the structural
      // pin: the run-on v0.6.2 shape (no line blocks) is red by this count.
      expect(lines.length).toBe(12);
      document.body.querySelectorAll('.print-header').forEach(h => {
        expect(h.querySelectorAll('.print-header-line').length).toBe(4);
      });
      // Line 1 on every page: app name, version, tariff year.
      document.body.querySelectorAll('[data-testid="print-header-line-1"]').forEach(l => {
        const text = l.textContent ?? '';
        expect(text).toContain('Port Call Cost Analyzer — Port Comparison (printed)');
        expect(text).toContain(`Version: ${APP_VERSION}`);
        expect(text).toContain('Tariff year: 2026');
      });
    } finally {
      await act(async () => { root!.unmount(); });
      container.remove();
    }
  });

  it('line 2: vessel profile (name, IMO, GT, TEU), ESI, and the classes as the screen context strip states them', async () => {
    const { container, root } = await renderPrintPages(LOADED_PORTS.map(p => p.metadata.id));
    try {
      document.body.querySelectorAll('[data-testid="print-header-line-2"]').forEach(l => {
        const text = l.textContent ?? '';
        expect(text).toContain('Vessel profile: MAREN MAERSK (IMO 9632129)');
        expect(text).toContain('GT: 194,849');
        expect(text).toContain('TEU capacity: 19,076');
        expect(text).toContain('ESI: not entered');
        // The classes exactly as the screen context strip states them.
        expect(text).toContain('CSI: not entered');
        expect(text).toContain('Sjöfartsverket class: E (default — not registered)');
      });
    } finally {
      await act(async () => { root!.unmount(); });
      container.remove();
    }
  });

  it('line 3: the call parameters as set (live values), line 4: the rate basis with both published pairs and as_of dates', async () => {
    const { container, root } = await renderPrintPages(LOADED_PORTS.map(p => p.metadata.id));
    try {
      document.body.querySelectorAll('[data-testid="print-header-line-3"]').forEach(l => {
        const text = l.textContent ?? '';
        // Live values per the unit 1.2 pin: the default call's 4,000 moves
        // and 50 h lay time, stated as the session's own call.
        expect(text).toContain('Container moves: 4,000 (loaded + discharged)');
        expect(text).toContain('Lay time: 50 h at berth');
      });
      document.body.querySelectorAll('[data-testid="print-header-line-4"]').forEach(l => {
        const text = l.textContent ?? '';
        expect(text).toContain('Rate basis: EUR\u2192SEK 11.2525 (2026-10-05); EUR\u2192DKK 7.4745 (2026-10-05)');
        expect(text).toContain('Comparison basis:');
        // The JSX-escape trap: the printed text carries the real arrow
        // character, never a literal backslash-u sequence.
        expect(text).not.toContain('\\u2192');
      });
      // The whole printed surface is free of literal escape sequences -
      // the known trap from the prior session, pinned here.
      expect(document.body.textContent ?? '').not.toContain('\\u2192');
      expect(document.body.textContent ?? '').not.toContain('\\u2014');
      expect(document.body.textContent ?? '').not.toContain('\\u00b7');
    } finally {
      await act(async () => { root!.unmount(); });
      container.remove();
    }
  });

  it('the rate-basis note names both published pairs with their as_of dates', () => {
    const note = printRateBasisNote(DECLARED_ROWS);
    expect(note).toBe('Rate basis: EUR\u2192SEK 11.2525 (2026-10-05); EUR\u2192DKK 7.4745 (2026-10-05)');
  });

  it('every page carries the N-of-M footer', async () => {
    const { container, root } = await renderPrintPages(LOADED_PORTS.map(p => p.metadata.id));
    try {
      const footers = document.body.querySelectorAll('.print-footer');
      expect(footers.length).toBe(3);
      expect(footers[0].textContent).toContain('Page 1 of 3');
      expect(footers[1].textContent).toContain('Page 2 of 3');
      expect(footers[2].textContent).toContain('Page 3 of 3');
    } finally {
      await act(async () => { root!.unmount(); });
      container.remove();
    }
  });

  it('the continuation note renders from page 2 onward and not on page 1', async () => {
    const { container, root } = await renderPrintPages(LOADED_PORTS.map(p => p.metadata.id));
    try {
      expect(document.body.querySelector('[data-testid="print-continuation-1"]')).toBeNull();
      const c2 = document.body.querySelector('[data-testid="print-continuation-2"]');
      expect(c2?.textContent).toBe('continued \u2014 ports 4\u20136 of 8');
      const c3 = document.body.querySelector('[data-testid="print-continuation-3"]');
      expect(c3?.textContent).toBe('continued \u2014 ports 7\u20138 of 8');
    } finally {
      await act(async () => { root!.unmount(); });
      container.remove();
    }
  });
});

describe('the export button and chrome hiding (spec v0.6.2, units 1 and 3)', () => {
  let container: HTMLElement | null = null;
  let root: Root | null = null;
  afterEach(async () => {
    if (root) {
      const r = root;
      await act(async () => { r.unmount(); });
    }
    container?.remove();
    container = null;
    root = null;
  });

  it('the comparison renders the Print / Save as PDF button opening the print dialog (spec v0.6.5, unit 1)', async () => {
    const printSpy = jest.spyOn(window, 'print').mockImplementation(() => {});
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <ComparisonView
          ports={LOADED_PORTS}
          vessel={DEFAULT_VESSEL}
          call={defaultCall('gothenburg')}
          selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
          activeVessel="TEST"
        />
      );
    });
    // The view-level export button is gone (unit 2 moved it to the app
    // header); the dialog opens through the print-request handshake.
    expect(container.querySelector('[data-testid="print-export-button"]')).toBeNull();
    await act(async () => {
      root!.render(
        <ComparisonView
          ports={LOADED_PORTS}
          vessel={DEFAULT_VESSEL}
          call={defaultCall('gothenburg')}
          selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
          activeVessel="TEST"
          printRequest={1}
        />
      );
    });
    expect(printSpy).not.toHaveBeenCalled();
    const dialog = container.querySelector('[data-testid="print-dialog"]');
    expect(dialog).not.toBeNull();
    printSpy.mockRestore();
  });

  it('the print stylesheet hides every interactive chrome class and the export button itself', () => {
    // The print surface is the table, only the table (spec v0.6.2, unit 1):
    // the entire screen view (#root) is hidden — the print pages are the
    // complete printed output. This pin was observed red against the
    // v0.6.1 stylesheet (no #root rule) before being trusted.
    const printBlock = cssSource.match(/@media print\s*\{[\s\S]*\n\}/)![0];
    expect(printBlock).toMatch(/#root\s*\{\s*display:\s*none\s*!important;\s*\}/);
    // Chrome-hidden assertions: the @media print block suppresses inputs,
    // buttons, the drawer, and the hover-dependent disclosure headers; the
    // export button hides in its own print output.
    expect(printBlock).toMatch(/\.port-drawer/);
    expect(printBlock).toMatch(/button/);
    expect(printBlock).toMatch(/input/);
    expect(printBlock).toMatch(/select/);
    expect(printBlock).toMatch(/\.print-export-button/);
    expect(printBlock).toMatch(/\.disclosure-header/);
    // The print-only blocks stay hidden on screen (the flags class is
    // pinned to stay hidden on paper too - the no-flag-section ruling).
    const screenBlock = cssSource.match(/\.print-page,\n\.print-header,\n\.print-footer,\n\.print-continuation,\n\.print-grand-total-footnote\s*\{\s*display:\s*none;\s*\}/);
    expect(screenBlock).not.toBeNull();
    // A4 portrait is the page size.
    expect(printBlock).toMatch(/size:\s*A4 portrait/);
    // No flag section in print at all (spec v0.6.2, the user ruling): the
    // print stylesheet suppresses the flag surfaces should they ever
    // render into the print DOM.
    expect(printBlock).toMatch(/\.print-flag-row,\n\s*\.print-flag-text\s*\{\s*display:\s*none\s*!important;\s*\}/);
    // Pagination completeness (spec v0.6.4, unit 1): the page's own table
    // is NOT kept on one sheet (break-inside: auto). A table-level avoid
    // is unsatisfiable whenever a detail-ON group's table outgrows one A4
    // sheet, and Chromium's fragmentation pass then degrades — the observed
    // v0.6.3 printout lost every port group after the first (three
    // columns, "Page 1 of 2"). This pin was observed red against the
    // v0.6.3 stylesheet (the table-level avoid still present) before
    // being trusted; the row-level keeps-whole rules below are what make
    // the flowing table safe.
    expect(printBlock).toMatch(/\.print-page \.comparison-table\s*\{\s*break-inside:\s*auto/);
    expect(printBlock).not.toMatch(/\.print-page \.comparison-table\s*\{\s*break-inside:\s*avoid/);
    expect(printBlock).toMatch(/break-before:\s*page/);
    // Row-level break integrity (spec v0.6.3, unit 2): the page block does
    // NOT carry break-inside: avoid - with detail toggled ON a page can
    // outgrow one sheet, and an unsatisfiable page-level avoid is what
    // permitted the observed mid-cell fragmentation (the Berth-dues
    // description splitting across pages 1-2, the Grand Total annotation
    // running past the visible area). The page keeps its forced break-before
    // and flows when taller than a sheet; the row-level avoid holds: a row
    // taller than the remaining space moves whole to the next sheet, never
    // splitting mid-cell. The page-block pin was observed red against the
    // v0.6.2 stylesheet (the page-level avoid present) before being trusted.
    expect(printBlock).not.toMatch(/\.print-page\s*\{[^}]*break-inside/);
    expect(printBlock).toMatch(/\.print-page\s*\{[^}]*break-before:\s*page/);
    expect(printBlock).toMatch(/\.print-page \.comparison-table tr,\n\s*\.print-page \.comparison-table tr td,\n\s*\.print-page \.comparison-table tr th\s*\{\s*break-inside:\s*avoid/);
    // The multi-paragraph detail blocks (the toggle-ON line detail and its
    // derivation subtitle) never split mid-block.
    expect(printBlock).toMatch(/\.print-line-detail,\n\s*\.print-page \.comparison-table \.print-derivation-detail\s*\{\s*break-inside:\s*avoid/);
  });

  it('the print page set mounts on beforeprint and unmounts on afterprint — the screen DOM stays byte-identical otherwise', async () => {
    const flushSync = (reactDom as unknown as { flushSync?: (fn: () => void) => void }).flushSync;
    expect(flushSync).toBeDefined();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <ComparisonView
          ports={LOADED_PORTS}
          vessel={DEFAULT_VESSEL}
          call={defaultCall('gothenburg')}
          selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
          activeVessel="TEST"
        />
      );
    });
    expect(container.querySelector('.print-page')).toBeNull();
    await act(async () => {
      window.dispatchEvent(new Event('beforeprint'));
    });
    // The pages mount OUTSIDE the screen container — a direct child of the
    // document body (the portal is what lets the print stylesheet hide the
    // entire screen view): no screen content in the print DOM, and the
    // screen container itself stays empty of print pages.
    expect(container.querySelector('.print-page')).toBeNull();
    const pages = document.querySelectorAll('body > .print-pages .print-page');
    expect(pages.length).toBe(3);
    await act(async () => {
      window.dispatchEvent(new Event('afterprint'));
    });
    expect(container.querySelector('.print-page')).toBeNull();
    expect(document.querySelectorAll('body > .print-pages').length).toBe(0);
  });
});

describe('currency, annotations, and figures on paper (spec v0.6.2, unit 4)', () => {
  it('the Aarhus printed cell carries the native DKK figure with the SEK-basis conversion, exactly as the screen renders', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const ports = LOADED_PORTS.filter(p => p.metadata.id === 'aarhus');
    const call = defaultCall('gothenburg');
    const portResults = ports.map(port => {
      const merged = { ...defaultCall(port.metadata.id), ...call, port_id: port.metadata.id } as CallInput;
      return { port, result: calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: merged }) };
    });
    const rateInfo = { rate: 11.2525, date: '2026-10-05', source: 'ECB euro reference rate (SEK per EUR)', is_default: true };
    await act(async () => {
      root!.render(
        <PrintComparisonPages
          ports={ports}
          portResults={portResults as never}
          rowsByStage={[] as never}
          vessel={DEFAULT_VESSEL}
          call={call}
          rateInfo={rateInfo}
          comparisonBasisContext={{ basis: 'SEK', rows: DECLARED_ROWS }}
          declaredRows={DECLARED_ROWS}
          activeVessel="MAREN MAERSK (IMO 9632129)"
          formatCurrency={(amount, currency) =>
            new Intl.NumberFormat('sv-SE', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)}
          derivationsVisible={true}
          conversionsVisible={true}
          containerThroughVisible={false}
          hinterlandMode={"truck"}
        />
      );
    });
    try {
      // The pages portal to the document body (spec v0.6.2) — the pins read
      // the body, never the screen container.
      const text = document.body.textContent ?? '';
      // Native first, converted second — the screen convention, printed.
      expect(text).toContain('6\u00a0348\u00a0361');
      expect(text).toContain('\u2248 9\u00a0557\u00a0152');
      // The per-GT disclosure prints (the self-contained page contract).
      expect(text).toContain('32.58 DKK/GT effective');
    } finally {
      await act(async () => { root!.unmount(); });
      container.remove();
    }
  });

  it('no flag section in the print output (spec v0.6.2, the user ruling) — flags are an interactive-surface feature; the table stays self-describing', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const ports = LOADED_PORTS.filter(p => ['gavle', 'gothenburg'].includes(p.metadata.id));
    const call = defaultCall('gothenburg');
    const portResults = ports.map(port => {
      const merged = { ...defaultCall(port.metadata.id), ...call, port_id: port.metadata.id } as CallInput;
      return { port, result: calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: merged }) };
    });
    // Ports that carry flags on screen (the assumed-tug default fires at
    // these ports) still print a table with no flag surfaces at all.
    expect(portResults.some(pr => (pr.result?.quality_flags ?? []).length > 0)).toBe(true);
    const rateInfo = { rate: 11.2525, date: '2026-10-05', source: 'ECB euro reference rate (SEK per EUR)', is_default: true };
    await act(async () => {
      root!.render(
        <PrintComparisonPages
          ports={ports}
          portResults={portResults as never}
          rowsByStage={[] as never}
          vessel={DEFAULT_VESSEL}
          call={call}
          rateInfo={rateInfo}
          comparisonBasisContext={{ basis: 'SEK', rows: DECLARED_ROWS }}
          declaredRows={DECLARED_ROWS}
          activeVessel="MAREN MAERSK (IMO 9632129)"
          formatCurrency={(amount, currency) =>
            new Intl.NumberFormat('sv-SE', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)}
          derivationsVisible={true}
          conversionsVisible={true}
          containerThroughVisible={false}
          hinterlandMode={"truck"}
        />
      );
    });
    try {
      // No flag section in print at all: no printed flag text, no flag row
      // header — even for ports that carry flags on screen.
      expect(document.body.querySelectorAll('.print-flag-text').length).toBe(0);
      expect(document.body.querySelectorAll('.print-flag-row').length).toBe(0);
      expect(document.body.textContent ?? '').not.toContain('Flags (printed text');
      // The in-cell annotations stay (the table remains self-describing):
      // the derived-not-published per-GT note prints.
      expect(document.body.textContent ?? '').toContain('derived, not a published rate');
    } finally {
      await act(async () => { root!.unmount(); });
      container.remove();
    }
  });

  it('no new dependency and no programmatic PDF generation — the export is the browser print pipeline', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    expect(Object.keys(pkg.dependencies)).not.toContain('jspdf');
    expect(Object.keys(pkg.dependencies)).not.toContain('pdfmake');
    expect(Object.keys(pkg.dependencies)).not.toContain('html2canvas');
    const viewSource = fs.readFileSync(path.join(__dirname, 'comparisonView.tsx'), 'utf8');
    expect(viewSource).toMatch(/window\.print\(\)/);
    expect(viewSource).not.toMatch(/jspdf/i);
  });
});

// Fee-derivation detail toggle follow-through on the print path (spec
// v0.6.3, unit 1): the paper inherits the session state - the print output
// carries the fee-derivation subtitles exactly when the comparison
// screen's toggle is ON, and charge-line names only when it is OFF. The
// print path reads the toggle from live state (the prop), never applying
// its own default. Red proofs per the standing discipline: the OFF pin was
// observed red by forcing the component's default to ON (the print path
// applying its own default), the ON pin by forcing it OFF; both restored.
describe('fee-derivation toggle follow-through on paper (spec v0.6.3, unit 1)', () => {
  const buildRealRowsByStage = () => {
    const ports = LOADED_PORTS.filter(p => ['gothenburg', 'gavle'].includes(p.metadata.id));
    const call = defaultCall('gothenburg');
    const portResults = ports.map(port => {
      const merged = { ...defaultCall(port.metadata.id), ...call, port_id: port.metadata.id } as CallInput;
      return { port, result: calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: merged }) };
    });
    const ruleNames = buildRuleNamesByPort(ports);
    const ruleAttrs = buildRuleAttributesByPort(ports);
    return { ports, portResults, rowsByStage: buildRowsBySegment(portResults as never, ruleNames, ruleAttrs, DEFAULT_VESSEL.gt).rowsByStage };
  };

  const renderWithToggle = async (derivationsVisible: boolean) => {
    const { ports, portResults, rowsByStage } = buildRealRowsByStage();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const rateInfo = { rate: 11.2525, date: '2026-10-05', source: 'ECB euro reference rate (SEK per EUR)', is_default: true };
    await act(async () => {
      root!.render(
        <PrintComparisonPages
          ports={ports}
          portResults={portResults as never}
          rowsByStage={rowsByStage as never}
          vessel={DEFAULT_VESSEL}
          call={defaultCall('gothenburg')}
          rateInfo={rateInfo}
          comparisonBasisContext={{ basis: 'SEK', rows: DECLARED_ROWS }}
          declaredRows={DECLARED_ROWS}
          activeVessel="MAREN MAERSK (IMO 9632129)"
          formatCurrency={(amount, currency) =>
            new Intl.NumberFormat('sv-SE', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)}
          derivationsVisible={derivationsVisible}
          conversionsVisible={true}
          containerThroughVisible={false}
          hinterlandMode={"truck"}
        />
      );
    });
    return { container, root };
  };

  it('toggle ON: the printed fee rows carry their derivation subtitles (the screen\'s own condensed text)', async () => {
    const { container, root } = await renderWithToggle(true);
    try {
      const details = document.body.querySelectorAll('.print-derivation-detail');
      expect(details.length).toBeGreaterThan(0);
      // The subtitle uses the screen's own strings - the condensed
      // derivation's structure label, never a print-only rewording.
      const text = document.body.textContent ?? '';
      expect(details[0].textContent?.length ?? 0).toBeGreaterThan(0);
      // Per-line detail rows render beneath the figures (name · biller).
      expect(document.body.querySelectorAll('.print-line-detail').length).toBeGreaterThan(0);
      expect(details[0].closest('.print-line-detail')?.textContent ?? '').toContain('\u00b7');
    } finally {
      await act(async () => { root!.unmount(); });
      container.remove();
    }
  });

  it('detail OFF: the Grand Total renders compact - the per-GT derivation annotations become a footnote block beneath the table, not in-cell padding', async () => {
    const { container, root } = await renderWithToggle(false);
    try {
      const footnote = document.body.querySelector('[data-testid="print-grand-total-footnote-1"]');
      expect(footnote).not.toBeNull();
      expect(footnote!.textContent).toContain('derived, not a published rate');
      // The Grand Total row itself stays compact: no in-cell per-GT annotation.
      const totalRow = document.body.querySelector('.comparison-total-row');
      expect(totalRow!.textContent ?? '').not.toContain('derived, not a published rate');
    } finally {
      await act(async () => { root!.unmount(); });
      container.remove();
    }
  });

  it('detail ON: the per-GT derivation annotations render inline in the Grand Total cell - no footnote block', async () => {
    const { container, root } = await renderWithToggle(true);
    try {
      expect(document.body.querySelector('[data-testid="print-grand-total-footnote-1"]')).toBeNull();
      const totalRow = document.body.querySelector('.comparison-total-row');
      expect(totalRow!.textContent ?? '').toContain('derived, not a published rate');
    } finally {
      await act(async () => { root!.unmount(); });
      container.remove();
    }
  });

  it('toggle OFF: the printed fee rows carry charge-line names only, clean - no derivation text', async () => {
    const { container, root } = await renderWithToggle(false);
    try {
      expect(document.body.querySelectorAll('.print-derivation-detail').length).toBe(0);
      expect(document.body.querySelectorAll('.print-line-detail').length).toBe(0);
    } finally {
      await act(async () => { root!.unmount(); });
      container.remove();
    }
  });
});

// Printed call parameters as actually set (spec v0.6.3, unit 1.2): the
// paper is a snapshot of the session - the header's call parameters print
// the live call values, byte-for-byte as the screen states them. The moves
// pin: an altered call (3,200 moves instead of the 4,000 default) prints
// 3,200, never the default. Red proof: observed red before the header
// carried the moves parameter at all (the v0.6.2 header printed none).
describe('printed call parameters as set (spec v0.6.3, unit 1)', () => {
  it('an altered moves value prints altered, not the 4,000 default - the header states the session\'s own call', async () => {
    const ports = LOADED_PORTS.filter(p => p.metadata.id === 'gothenburg');
    const call = {
      ...defaultCall('gothenburg'),
      containers_loaded_le20ft: 400, containers_loaded_gt20ft: 1200,
      containers_discharged_le20ft: 400,
      containers_discharged_gt20ft: 1200
    } as CallInput;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const rateInfo = { rate: 11.2525, date: '2026-10-05', source: 'ECB euro reference rate (SEK per EUR)', is_default: true };
    await act(async () => {
      root!.render(
        <PrintComparisonPages
          ports={ports}
          portResults={[] as never}
          rowsByStage={[] as never}
          vessel={DEFAULT_VESSEL}
          call={call}
          rateInfo={rateInfo}
          comparisonBasisContext={{ basis: 'SEK', rows: DECLARED_ROWS }}
          declaredRows={DECLARED_ROWS}
          activeVessel="MAREN MAERSK (IMO 9632129)"
          formatCurrency={(amount, currency) =>
            new Intl.NumberFormat('sv-SE', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)}
          derivationsVisible={false}
          conversionsVisible={true}
          containerThroughVisible={false}
          hinterlandMode={"truck"}
        />
      );
    });
    try {
      const header = document.body.querySelector('.print-header');
      expect(header).not.toBeNull();
      const text = header!.textContent ?? '';
      expect(text).toContain('Container moves: 3,200 (loaded + discharged)');
      expect(text).not.toContain('4,000');
      // Lay time as set (the default call's 50 h) still prints.
      expect(text).toContain('Lay time: 50 h at berth');
    } finally {
      await act(async () => { root!.unmount(); });
      container.remove();
    }
  });
});

// Port-group completeness (spec v0.6.4, unit 1): with N selected ports,
// every selected port appears in the printed output - the groups follow the
// print pagination doctrine (3 columns per group; 6 -> 3+3, 8 -> 3+3+2),
// the numbering counts every group page, and each group's page carries
// the header, the Grand Total, and the footnote block. The regression this
// pins: the v0.6.3 printout at six ports carried three columns only
// (Helsingborg, Norrköping, Norvik absent) - the unsatisfiable table-level
// break-inside: avoid made Chromium's fragmentation pass drop every port
// group after the first. Red proof per the standing discipline: with the
// component rendering only the first page's slice (the regression shape),
// this pin was observed red; restored green.
describe('port-group completeness on paper (spec v0.6.4, unit 1)', () => {
  // The user's own six-port selection (the fresh print-through evidence).
  const SIX_PORT_IDS = ['aarhus', 'gavle', 'gothenburg', 'helsingborg', 'norrkoping', 'norvik'];

  const renderSixPortPrint = async (derivationsVisible: boolean) => {
    const ports = LOADED_PORTS.filter(p => SIX_PORT_IDS.includes(p.metadata.id));
    const call = defaultCall('gothenburg');
    const portResults = ports.map(port => {
      const merged = { ...defaultCall(port.metadata.id), ...call, port_id: port.metadata.id } as CallInput;
      try {
        return { port, result: calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: merged }) };
      } catch {
        return { port, result: null };
      }
    });
    const ruleNames = buildRuleNamesByPort(ports);
    const ruleAttrs = buildRuleAttributesByPort(ports);
    const rowsByStage = buildRowsBySegment(portResults as never, ruleNames, ruleAttrs, DEFAULT_VESSEL.gt).rowsByStage;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const rateInfo = { rate: 11.2525, date: '2026-10-05', source: 'ECB euro reference rate (SEK per EUR)', is_default: true };
    await act(async () => {
      root.render(
        <PrintComparisonPages
          ports={ports}
          portResults={portResults as never}
          rowsByStage={rowsByStage as never}
          vessel={DEFAULT_VESSEL}
          call={call}
          rateInfo={rateInfo}
          comparisonBasisContext={{ basis: 'SEK', rows: DECLARED_ROWS }}
          declaredRows={DECLARED_ROWS}
          activeVessel="MAREN MAERSK (IMO 9632129)"
          formatCurrency={(amount, currency) =>
            new Intl.NumberFormat('sv-SE', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)}
          derivationsVisible={derivationsVisible}
          conversionsVisible={true}
          containerThroughVisible={false}
          hinterlandMode={"truck"}
        />
      );
    });
    return { container, root };
  };

  it('six selected ports print as two groups (3+3) - every port name present, numbering Page 1 of 2 / Page 2 of 2', async () => {
    const { container, root } = await renderSixPortPrint(false);
    try {
      const pages = document.body.querySelectorAll('body > .print-pages .print-page');
      expect(pages.length).toBe(2);
      // Every group carries exactly three port columns - all six names print.
      const page1Names = Array.from(pages[0].querySelectorAll('.comparison-port-name')).map(n => n.textContent);
      const page2Names = Array.from(pages[1].querySelectorAll('.comparison-port-name')).map(n => n.textContent);
      expect(page1Names).toEqual(['Port of Aarhus', 'Port of Gävle', 'Port of Gothenburg']);
      expect(page2Names).toEqual(['Port of Helsingborg', 'Port of Norrköping', 'Stockholm Norvik Port']);
      // The numbering counts both group pages.
      expect(pages[0].querySelector('.print-footer')?.textContent).toContain('Page 1 of 2');
      expect(pages[1].querySelector('.print-footer')?.textContent).toContain('Page 2 of 2');
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });

  it('each group page is self-contained: header and continuation note per group, Grand Total and footnote on every page', async () => {
    const { container, root } = await renderSixPortPrint(false);
    try {
      const pages = document.body.querySelectorAll('body > .print-pages .print-page');
      // The header prints on every page.
      expect(pages[0].querySelector('.print-header')).not.toBeNull();
      expect(pages[1].querySelector('.print-header')).not.toBeNull();
      // The continuation note carries per group (page 2 states its ports).
      expect(pages[0].querySelector('[data-testid="print-continuation-1"]')).toBeNull();
      expect(pages[1].querySelector('[data-testid="print-continuation-2"]')?.textContent)
        .toBe('continued \u2014 ports 4\u20136 of 6');
      // The Grand Total row renders on every group's page, for that group's ports.
      pages.forEach(page => {
        const totalRow = page.querySelector('.comparison-total-row');
        expect(totalRow).not.toBeNull();
        expect(totalRow!.textContent).toContain('Grand Total');
      });
      // The footnote block renders on every group's page (detail OFF shape).
      expect(document.body.querySelector('[data-testid="print-grand-total-footnote-1"]')).not.toBeNull();
      expect(document.body.querySelector('[data-testid="print-grand-total-footnote-2"]')).not.toBeNull();
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });

  it('detail ON at six ports: the same two-group completeness holds - the tall-row path never loses a group', async () => {
    const { container, root } = await renderSixPortPrint(true);
    try {
      const pages = document.body.querySelectorAll('body > .print-pages .print-page');
      expect(pages.length).toBe(2);
      const names = Array.from(document.body.querySelectorAll('.print-page .comparison-port-name')).map(n => n.textContent);
      expect(names).toContain('Port of Helsingborg');
      expect(names).toContain('Port of Norrköping');
      expect(names).toContain('Stockholm Norvik Port');
      expect(pages[1].querySelector('.print-footer')?.textContent).toContain('Page 2 of 2');
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });
});

// Break-integrity for the tallest detail rows (spec v0.6.4, unit 2): a
// detail-ON Cargo-dues row is taller than one A4 sheet, so no rule can keep
// the row whole - the degradation must be explicit and readable (a cut at
// block or line boundaries, the remainder on the next sheet), never a
// mid-phrase split (the observed "...per" / "loaded container)" split of
// the citation description). The label cell's own blocks carry the
// break-inside: avoid so the fragmentation pass cuts between blocks, not
// inside one. Red proof per the standing discipline: with the block-level
// selector rule reverted (the v0.6.3 stylesheet shape), the pin was
// observed red; restored green.
describe('break-integrity for the tallest detail rows (spec v0.6.4, unit 2)', () => {
  it('the label-cell blocks (charge-type label, citation description, family label) carry break-inside: avoid - the degradation cut lands between blocks, never mid-phrase', () => {
    const printBlock = cssSource.match(/@media print\s*\{[\s\S]*\n\}/)![0];
    expect(printBlock).toMatch(
      /\.print-page \.comparison-table \.comparison-chargetype-label,\n\s*\.print-page \.comparison-table \.comparison-chargetype-desc,\n\s*\.print-page \.comparison-table \.comparison-family-label\s*\{\s*break-inside:\s*avoid/
    );
    // The row-level keeps-whole rules stay (a row that fits a sheet still
    // moves whole) - the unit 2a selectors unchanged.
    expect(printBlock).toMatch(/\.print-page \.comparison-table tr,\n\s*\.print-page \.comparison-table tr td,\n\s*\.print-page \.comparison-table tr th\s*\{\s*break-inside:\s*avoid/);
  });

  it('the tall Cargo dues row renders its citation description as a distinct block in the label cell (the DOM shape the avoid cuts along)', async () => {
    const ports = LOADED_PORTS.filter(p => ['helsingborg', 'norrkoping'].includes(p.metadata.id));
    const call = defaultCall('gothenburg');
    const portResults = ports.map(port => {
      const merged = { ...defaultCall(port.metadata.id), ...call, port_id: port.metadata.id } as CallInput;
      return { port, result: calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: merged }) };
    });
    const ruleNames = buildRuleNamesByPort(ports);
    const ruleAttrs = buildRuleAttributesByPort(ports);
    const rowsByStage = buildRowsBySegment(portResults as never, ruleNames, ruleAttrs, DEFAULT_VESSEL.gt).rowsByStage;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const rateInfo = { rate: 11.2525, date: '2026-10-05', source: 'ECB euro reference rate (SEK per EUR)', is_default: true };
    await act(async () => {
      root.render(
        <PrintComparisonPages
          ports={ports}
          portResults={portResults as never}
          rowsByStage={rowsByStage as never}
          vessel={DEFAULT_VESSEL}
          call={call}
          rateInfo={rateInfo}
          comparisonBasisContext={{ basis: 'SEK', rows: DECLARED_ROWS }}
          declaredRows={DECLARED_ROWS}
          activeVessel="MAREN MAERSK (IMO 9632129)"
          formatCurrency={(amount, currency) =>
            new Intl.NumberFormat('sv-SE', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)}
          derivationsVisible={true}
          conversionsVisible={true}
          containerThroughVisible={false}
          hinterlandMode={"truck"}
        />
      );
    });
    try {
      // The Cargo dues row exists with detail ON (the tall shape).
      const cargoRow = Array.from(document.body.querySelectorAll('.comparison-chargetype-row'))
        .find(r => r.querySelector('.comparison-chargetype-label')?.textContent === 'Cargo dues');
      expect(cargoRow).toBeDefined();
      // The citation description renders as its own block element, separate
      // from the label - the fragmentation pass cuts between these blocks.
      const label = cargoRow!.querySelector('.comparison-chargetype-label');
      const desc = cargoRow!.querySelector('.comparison-chargetype-desc');
      expect(label).not.toBeNull();
      expect(desc).not.toBeNull();
      // The citation is the user's observed split text, whole in one block.
      expect(desc!.textContent).toContain('225.00 DKK per loaded container');
      // The detail machinery rides the row (the per-line blocks, each
      // individually avoid-guarded by the unit 2a rule).
      expect(cargoRow!.querySelectorAll('.print-line-detail').length).toBeGreaterThan(0);
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });
});

// Toggle follow-through, generalized (spec v0.6.4, unit 3): every
// print-relevant state control on the screen carries through to print -
// the paper inherits the session state, never imposes defaults. The audit
// found three controls beyond the fee-derivation toggle (already v0.6.3):
// the derived/converted sums toggle (conversionsVisible - the observed
// defect: the Grand Total printed the converted figure regardless of
// screen state), and the compare container-through surface (its toggle and
// the hinterland-mode selector). Red proofs per the standing discipline:
// the print path forcing each default makes the opposite pin red - the
// always-convert v0.6.3 shape fails the OFF pin, the never-convert shape
// fails the ON pin, the always-render container-through shape fails the
// OFF pin; all restored green.
describe('derived/converted sums toggle follow-through on paper (spec v0.6.4, unit 3)', () => {
  const renderConverted = async (conversionsVisible: boolean) => {
    const ports = LOADED_PORTS.filter(p => ['aarhus', 'gothenburg'].includes(p.metadata.id));
    const call = defaultCall('gothenburg');
    const portResults = ports.map(port => {
      const merged = { ...defaultCall(port.metadata.id), ...call, port_id: port.metadata.id } as CallInput;
      return { port, result: calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: merged }) };
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const rateInfo = { rate: 11.2525, date: '2026-10-05', source: 'ECB euro reference rate (SEK per EUR)', is_default: true };
    await act(async () => {
      root.render(
        <PrintComparisonPages
          ports={ports}
          portResults={portResults as never}
          rowsByStage={[] as never}
          vessel={DEFAULT_VESSEL}
          call={call}
          rateInfo={rateInfo}
          comparisonBasisContext={{ basis: 'SEK', rows: DECLARED_ROWS }}
          declaredRows={DECLARED_ROWS}
          activeVessel="MAREN MAERSK (IMO 9632129)"
          formatCurrency={(amount, currency) =>
            new Intl.NumberFormat('sv-SE', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)}
          derivationsVisible={false}
          conversionsVisible={conversionsVisible}
          containerThroughVisible={false}
          hinterlandMode={"truck"}
        />
      );
    });
    return { container, root };
  };

  it('converted ON: the Grand Total prints the converted comparison-basis sum beside the native figure', async () => {
    const { container, root } = await renderConverted(true);
    try {
      const totalRow = document.body.querySelector('.comparison-total-row');
      expect(totalRow).not.toBeNull();
      // The Aarhus native DKK figure with its converted SEK secondary -
      // exactly the screen's ON state (native primary, converted secondary).
      expect(totalRow!.textContent).toContain('6\u00a0348\u00a0361');
      expect(totalRow!.textContent).toContain('\u2248');
      expect(totalRow!.textContent).toContain('9\u00a0557\u00a0152');
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });

  it('converted OFF: the converted sums do not print - the native figures stand alone, exactly the screen\'s OFF state', async () => {
    const { container, root } = await renderConverted(false);
    try {
      const totalRow = document.body.querySelector('.comparison-total-row');
      expect(totalRow).not.toBeNull();
      // The native figure prints; the converted secondary does not.
      expect(totalRow!.textContent).toContain('6\u00a0348\u00a0361');
      expect(totalRow!.textContent).not.toContain('\u2248');
      expect(totalRow!.textContent).not.toContain('9\u00a0557\u00a0152');
      // No converted figure anywhere on the printed page (the toggle is a
      // class, not a single pin: the whole page inherits the OFF state).
      expect(document.body.textContent ?? '').not.toContain('converted \u2014');
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });
});

describe('compare container-through follow-through on paper (spec v0.6.4, unit 3)', () => {
  const renderContainerThrough = async (visible: boolean, mode: 'truck' | 'rail') => {
    const ports = LOADED_PORTS.filter(p => ['gavle', 'norrkoping', 'gothenburg'].includes(p.metadata.id));
    const call = defaultCall('gothenburg');
    const portResults = ports.map(port => {
      const merged = { ...defaultCall(port.metadata.id), ...call, port_id: port.metadata.id } as CallInput;
      return { port, result: calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: merged }) };
    });
    const ruleNames = buildRuleNamesByPort(ports);
    const ruleAttrs = buildRuleAttributesByPort(ports);
    const rowsByStage = buildRowsBySegment(portResults as never, ruleNames, ruleAttrs, DEFAULT_VESSEL.gt).rowsByStage;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const rateInfo = { rate: 11.2525, date: '2026-10-05', source: 'ECB euro reference rate (SEK per EUR)', is_default: true };
    await act(async () => {
      root.render(
        <PrintComparisonPages
          ports={ports}
          portResults={portResults as never}
          rowsByStage={rowsByStage as never}
          vessel={DEFAULT_VESSEL}
          call={call}
          rateInfo={rateInfo}
          comparisonBasisContext={{ basis: 'SEK', rows: DECLARED_ROWS }}
          declaredRows={DECLARED_ROWS}
          activeVessel="MAREN MAERSK (IMO 9632129)"
          formatCurrency={(amount, currency) =>
            new Intl.NumberFormat('sv-SE', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)}
          derivationsVisible={false}
          conversionsVisible={true}
          containerThroughVisible={visible}
          hinterlandMode={mode}
        />
      );
    });
    return { container, root };
  };

  it('toggle ON: the container-through row prints with the session\'s hinterland mode and per-port legs', async () => {
    const { container, root } = await renderContainerThrough(true, 'rail');
    try {
      const row = document.body.querySelector('[data-testid="print-container-through-row"]');
      expect(row).not.toBeNull();
      expect(row!.textContent).toContain('Container-through addition');
      // The session's own mode states on paper (rail), never a default.
      expect(row!.textContent).toContain('Hinterland mode: rail stack');
      // The per-port legs print: Norrköping's rail rates, Gävle's honest
      // bundled note - the screen's own row content.
      expect(row!.textContent).toContain('bundled');
      expect(row!.querySelector('[data-testid="print-container-through-norrkoping"]')?.textContent).toContain('526');
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });

  it('toggle OFF: the container-through row does not print - the screen\'s default-off state', async () => {
    const { container, root } = await renderContainerThrough(false, 'truck');
    try {
      expect(document.body.querySelector('[data-testid="print-container-through-row"]')).toBeNull();
      expect(document.body.textContent ?? '').not.toContain('Container-through addition');
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });

  it('the audit pin: every print-relevant screen control is wired through the view\'s print path - no print-side default exists', () => {
    // The comparison view wires its own live state into PrintComparisonPages:
    // the fee-derivation toggle, the converted-sums toggle, the
    // container-through toggle and its hinterland mode, plus the live rate
    // input (rateInfo). The print component takes them as required props -
    // no default parameter anywhere in its signature.
    const viewSource = fs.readFileSync(path.join(__dirname, 'comparisonView.tsx'), 'utf8');
    const printSource = fs.readFileSync(path.join(__dirname, 'printComparisonPages.tsx'), 'utf8');
    // The view wires its own live state into PrintComparisonPages through
    // the dialog-override coalescing (spec v0.6.5, unit 1): the pages read
    // the dialog selections when printing went through the dialog, the
    // live screen state otherwise.
    expect(viewSource).toMatch(/printSelectionOverride \? printSelectionOverride\.derivations : derivationsVisible/);
    expect(viewSource).toMatch(/printSelectionOverride \? printSelectionOverride\.conversions : conversionsVisible/);
    expect(viewSource).toMatch(/printSelectionOverride \? printSelectionOverride\.containerThrough : containerThroughVisible/);
    expect(viewSource).toMatch(/hinterlandMode=\{hinterlandMode\}/);
    // The print component never defaults a toggle (a default would be a
    // print-side state imposition - the defect class this unit closes).
    expect(printSource).not.toMatch(/derivationsVisible[^?]*=\s*(true|false)\b/);
    expect(printSource).not.toMatch(/conversionsVisible[^?]*=\s*(true|false)\b/);
    expect(printSource).not.toMatch(/containerThroughVisible[^?]*=\s*(true|false)\b/);
  });
});

// Print dialog (spec v0.6.5, unit 1): the Print control opens a modal
// before printing - one checkbox per print-relevant screen control, each
// defaulting to the live state, each with a one-line hint of what the
// paper shows. The pages read the dialog selections, not the raw screen
// state. Red proofs per the standing discipline: forcing each checkbox
// default (ignoring the live state) makes the defaults pin red; forcing
// the print path to ignore the dialog selections (always the live state)
// makes the opposite-direction selection pins red.
describe('print dialog (spec v0.6.5, unit 1)', () => {
  let currentRoot: Root | null = null;
  const renderView = async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    currentRoot = root;
    await act(async () => {
      root.render(
        <ComparisonView
          ports={LOADED_PORTS}
          vessel={DEFAULT_VESSEL}
          call={defaultCall('gothenburg')}
          selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
          activeVessel="TEST"
        />
      );
    });
    return { container, root };
  };
  let nextPrintRequestId = 0;
  const rerenderWithPrintRequest = (container: HTMLDivElement) => {
    const request = ++nextPrintRequestId;
    // Re-render with a nonzero request id: the view opens the dialog and
    // confirms handling (App resets the id; the view is idempotent here).
    act(() => {
      currentRoot!.render(
        <ComparisonView
          ports={LOADED_PORTS}
          vessel={DEFAULT_VESSEL}
          call={defaultCall('gothenburg')}
          selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
          activeVessel="TEST"
          printRequest={request}
        />
      );
    });
  };
  const openDialog = async (container: HTMLDivElement) => {
    // The Print control lives in the app header since unit 2; the dialog
    // opens through the print-request handshake. The test drives the
    // view's own prop (exactly what App passes on the header press).
    rerenderWithPrintRequest(container);
    return container.querySelector('[data-testid="print-dialog"]')!;
  };
  const setScreenToggles = async (container: HTMLDivElement, derivations: boolean, conversions: boolean) => {
    const derivButton = container.querySelector('[aria-controls="comparison-derivation-panel"]') as HTMLButtonElement | null;
    if (derivButton) {
      await act(async () => { derivButton.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    }
    // The conversion toggle is mobile-only (a disclosure inside the cards
    // view); on the desktop DOM it is reached by its state default. The
    // dialog-defaults pin below therefore exercises the live derivations
    // toggle plus the default-off conversions state, which is exactly the
    // screen state the dialog must inherit.
    return derivations;
  };
  it('the dialog opens on the Print button press, with a Print and a Cancel control', async () => {
    const { container, root } = await renderView();
    try {
      const dialog = await openDialog(container);
      expect(dialog).not.toBeNull();
      expect(dialog.querySelector('[data-testid="print-dialog-print"]')).not.toBeNull();
      expect(dialog.querySelector('[data-testid="print-dialog-cancel"]')).not.toBeNull();
      // One-line hints present for each option.
      expect(dialog.querySelectorAll('.print-dialog-hint').length).toBe(3);
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });
  it('each checkbox defaults to the live screen toggle state', async () => {
    const { container, root } = await renderView();
    try {
      // Turn the fee-derivation toggle ON on screen first.
      await setScreenToggles(container, true, false);
      const dialog = await openDialog(container);
      const deriv = dialog.querySelector('[data-testid="print-dialog-derivations"]') as HTMLInputElement;
      const conv = dialog.querySelector('[data-testid="print-dialog-conversions"]') as HTMLInputElement;
      const ct = dialog.querySelector('[data-testid="print-dialog-container-through"]') as HTMLInputElement;
      // Derivations ON (the live state); the other two default OFF (the
      // live default-off states).
      expect(deriv.checked).toBe(true);
      expect(conv.checked).toBe(false);
      expect(ct.checked).toBe(false);
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });
  it('Cancel closes the dialog without printing', async () => {
    const printSpy = jest.spyOn(window, 'print').mockImplementation(() => {});
    const { container, root } = await renderView();
    try {
      const dialog = await openDialog(container);
      await act(async () => {
        (dialog.querySelector('[data-testid="print-dialog-cancel"]') as HTMLElement).dispatchEvent(
          new MouseEvent('click', { bubbles: true })
        );
      });
      expect(container.querySelector('[data-testid="print-dialog"]')).toBeNull();
      expect(printSpy).not.toHaveBeenCalled();
    } finally {
      printSpy.mockRestore();
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });
  it('Print in the dialog triggers the browser print with the pages reading the dialog selections - derivations ON while the screen is OFF', async () => {
    const printSpy = jest.spyOn(window, 'print').mockImplementation(() => {});
    const { container, root } = await renderView();
    try {
      // Screen OFF; the dialog flips derivations ON; the paper carries the
      // derivation subtitles (the opposite direction of the screen state).
      const dialog = await openDialog(container);
      await act(async () => {
        (dialog.querySelector('[data-testid="print-dialog-derivations"]') as HTMLInputElement)
          .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      await act(async () => {
        (dialog.querySelector('[data-testid="print-dialog-print"]') as HTMLElement).dispatchEvent(
          new MouseEvent('click', { bubbles: true })
        );
      });
      expect(printSpy).toHaveBeenCalled();
      await act(async () => {
        window.dispatchEvent(new Event('beforeprint'));
      });
      const detail = document.body.querySelector('.print-derivation-detail');
      expect(detail).not.toBeNull();
      await act(async () => {
        window.dispatchEvent(new Event('afterprint'));
      });
    } finally {
      printSpy.mockRestore();
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });
  it('dialog selections OFF while the screen is ON - the paper omits what the dialog turned off', async () => {
    const printSpy = jest.spyOn(window, 'print').mockImplementation(() => {});
    const { container, root } = await renderView();
    try {
      // Screen derivations ON; the dialog turns it OFF; the paper stays
      // clean (no derivation subtitles) - the pages read the dialog, not
      // the raw screen state.
      await setScreenToggles(container, true, false);
      const dialog = await openDialog(container);
      const deriv = dialog.querySelector('[data-testid="print-dialog-derivations"]') as HTMLInputElement;
      expect(deriv.checked).toBe(true);
      await act(async () => {
        deriv.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      await act(async () => {
        (dialog.querySelector('[data-testid="print-dialog-print"]') as HTMLElement).dispatchEvent(
          new MouseEvent('click', { bubbles: true })
        );
      });
      expect(printSpy).toHaveBeenCalled();
      await act(async () => {
        window.dispatchEvent(new Event('beforeprint'));
      });
      expect(document.body.querySelector('.print-derivation-detail')).toBeNull();
      await act(async () => {
        window.dispatchEvent(new Event('afterprint'));
      });
    } finally {
      printSpy.mockRestore();
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });
  it('the converted-sums selection prints in both directions: ON adds the converted sum, OFF keeps it off the paper', async () => {
    const printSpy = jest.spyOn(window, 'print').mockImplementation(() => {});
    const { container, root } = await renderView();
    try {
      // Direction 1: screen OFF, dialog ON - the Grand Total carries the
      // converted SEK sum.
      let dialog = await openDialog(container);
      await act(async () => {
        (dialog.querySelector('[data-testid="print-dialog-conversions"]') as HTMLInputElement)
          .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      await act(async () => {
        (dialog.querySelector('[data-testid="print-dialog-print"]') as HTMLElement).dispatchEvent(
          new MouseEvent('click', { bubbles: true })
        );
      });
      await act(async () => {
        window.dispatchEvent(new Event('beforeprint'));
      });
      let totalRow = document.body.querySelector('body > .print-pages .comparison-total-row');
      expect(totalRow).not.toBeNull();
      expect(totalRow!.textContent).toContain('\u2248');
      await act(async () => {
        window.dispatchEvent(new Event('afterprint'));
      });
      // Direction 2: dialog OFF (the default-off screen state) - the
      // converted sum is on no page.
      dialog = await openDialog(container);
      const conv = dialog.querySelector('[data-testid="print-dialog-conversions"]') as HTMLInputElement;
      expect(conv.checked).toBe(false);
      await act(async () => {
        (dialog.querySelector('[data-testid="print-dialog-print"]') as HTMLElement).dispatchEvent(
          new MouseEvent('click', { bubbles: true })
        );
      });
      await act(async () => {
        window.dispatchEvent(new Event('beforeprint'));
      });
      totalRow = document.body.querySelector('body > .print-pages .comparison-total-row');
      expect(totalRow).not.toBeNull();
      expect(totalRow!.textContent).not.toContain('\u2248');
      await act(async () => {
        window.dispatchEvent(new Event('afterprint'));
      });
    } finally {
      printSpy.mockRestore();
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });
  it('the container-through selection prints in both directions: ON adds the row, OFF keeps it absent', async () => {
    const printSpy = jest.spyOn(window, 'print').mockImplementation(() => {});
    const { container, root } = await renderView();
    try {
      // Direction 1: dialog ON - the landside legs row prints.
      let dialog = await openDialog(container);
      await act(async () => {
        (dialog.querySelector('[data-testid="print-dialog-container-through"]') as HTMLInputElement)
          .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      await act(async () => {
        (dialog.querySelector('[data-testid="print-dialog-print"]') as HTMLElement).dispatchEvent(
          new MouseEvent('click', { bubbles: true })
        );
      });
      await act(async () => {
        window.dispatchEvent(new Event('beforeprint'));
      });
      expect(document.body.querySelector('[data-testid="print-container-through-row"]')).not.toBeNull();
      await act(async () => {
        window.dispatchEvent(new Event('afterprint'));
      });
      // Direction 2: dialog OFF (the screen default) - no row on paper.
      dialog = await openDialog(container);
      const ct = dialog.querySelector('[data-testid="print-dialog-container-through"]') as HTMLInputElement;
      expect(ct.checked).toBe(false);
      await act(async () => {
        (dialog.querySelector('[data-testid="print-dialog-print"]') as HTMLElement).dispatchEvent(
          new MouseEvent('click', { bubbles: true })
        );
      });
      await act(async () => {
        window.dispatchEvent(new Event('beforeprint'));
      });
      expect(document.body.querySelector('[data-testid="print-container-through-row"]')).toBeNull();
      await act(async () => {
        window.dispatchEvent(new Event('afterprint'));
      });
    } finally {
      printSpy.mockRestore();
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });
  it('the override clears after printing - a later Ctrl+P prints the live screen state again', async () => {
    const printSpy = jest.spyOn(window, 'print').mockImplementation(() => {});
    const { container, root } = await renderView();
    try {
      const dialog = await openDialog(container);
      await act(async () => {
        (dialog.querySelector('[data-testid="print-dialog-derivations"]') as HTMLInputElement)
          .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      await act(async () => {
        (dialog.querySelector('[data-testid="print-dialog-print"]') as HTMLElement).dispatchEvent(
          new MouseEvent('click', { bubbles: true })
        );
      });
      await act(async () => {
        window.dispatchEvent(new Event('beforeprint'));
      });
      expect(document.body.querySelector('.print-derivation-detail')).not.toBeNull();
      await act(async () => {
        window.dispatchEvent(new Event('afterprint'));
      });
      // The override is gone: the browser's own print path (no dialog)
      // reads the live screen state (derivations OFF).
      await act(async () => {
        window.dispatchEvent(new Event('beforeprint'));
      });
      expect(document.body.querySelector('.print-derivation-detail')).toBeNull();
      await act(async () => {
        window.dispatchEvent(new Event('afterprint'));
      });
    } finally {
      printSpy.mockRestore();
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });
});

// Header print control (spec v0.6.5, unit 2): the Print / Save as PDF
// control renders in the app header bar, in the header-controls container
// beside the theme toggle. Red proof: removing the control turns the
// placement pin red.
describe('header print control placement (spec v0.6.5, unit 2)', () => {
  it('the Print control renders in the header beside the theme toggle, and opens the dialog through the handshake', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      await act(async () => {
        root.render(<App />);
      });
      // The default page is a port workspace: the control routes to the
      // comparison on click (the printed artifact is the comparison).
      const button = container.querySelector('[data-testid="print-export-button"]') as HTMLButtonElement;
      expect(button).not.toBeNull();
      expect(button.textContent).toBe('Print / Save as PDF');
      const controls = button.closest('.header-controls');
      expect(controls).not.toBeNull();
      expect(controls!.querySelector('.theme-toggle')).not.toBeNull();
      // The control sits inside the header bar.
      expect(button.closest('.header')).not.toBeNull();
      // From the port-workspace page the first press routes to the
      // comparison (the printed artifact); the mounted control then
      // requests the dialog through the handshake.
      await act(async () => {
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      const comparisonButton = container.querySelector('[data-testid="print-export-button"]') as HTMLButtonElement;
      expect(comparisonButton).not.toBeNull();
      await act(async () => {
        comparisonButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(container.querySelector('[data-testid="print-dialog"]')).not.toBeNull();
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });
});

// ---------------------------------------------------------------------------
// The conversion toggle renamed (spec v0.6.5, unit 3): the toggle's label is
// "Convert to SEK" everywhere it appears - the mobile disclosure's screen
// label and the print dialog's checkbox label carry the same wording. The
// disclosure's state is carried by aria-expanded, no longer by show/hide
// wording. The derivation toggle keeps its own name. Red proof: reverting
// the screen label to the old show/hide wording turns this pin red.
// ---------------------------------------------------------------------------
describe('the conversion toggle renamed to Convert to SEK (spec v0.6.5, unit 3)', () => {
  it('the screen label, the dialog checkbox label, and the source contract all read Convert to SEK; the derivation toggle keeps its name', async () => {
    const viewSource = fs.readFileSync(path.resolve(__dirname, 'comparisonView.tsx'), 'utf8');
    // The screen label is the static wording, never show/hide state text.
    expect(viewSource).toMatch(/Convert to SEK/);
    expect(viewSource).not.toMatch(/'Hide converted figures'|'Show converted figures'/);
    // The dialog's conversions checkbox label carries the same wording.
    expect(viewSource).toMatch(/\{' '\}Convert to SEK/);
    // The derivation toggle keeps its own name (untouched by the rename).
    expect(viewSource).toMatch(/'Hide fee derivations' : 'Show fee derivations'/);

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      await act(async () => {
        root.render(
          <ComparisonView
            ports={LOADED_PORTS}
            vessel={DEFAULT_VESSEL}
            call={defaultCall('gothenburg')}
            selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
            activeVessel="TEST"
            printRequest={1}
          />
        );
      });
      const dialog = container.querySelector('[data-testid="print-dialog"]')!;
      const convLabel = dialog.querySelector('[data-testid="print-dialog-conversions"]')!.closest('label')!;
      expect(convLabel.textContent).toContain('Convert to SEK');
      expect(convLabel.textContent).not.toContain('converted figures');
      const derivLabel = dialog.querySelector('[data-testid="print-dialog-derivations"]')!.closest('label')!;
      expect(derivLabel.textContent).toContain('Fee derivations');
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });
});
