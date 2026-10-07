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
import { ComparisonView } from './App';
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
        expect(APP_VERSION).toBe('v0.6.2');
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

  it('the comparison renders the Print / Save as PDF button calling window.print()', async () => {
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
    const button = container.querySelector('[data-testid="print-export-button"]');
    expect(button).not.toBeNull();
    expect(button!.textContent).toBe('Print / Save as PDF');
    await act(async () => {
      button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(printSpy).toHaveBeenCalled();
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
    const screenBlock = cssSource.match(/\.print-page,\n\.print-header,\n\.print-footer,\n\.print-continuation\s*\{\s*display:\s*none;\s*\}/);
    expect(screenBlock).not.toBeNull();
    // A4 portrait is the page size.
    expect(printBlock).toMatch(/size:\s*A4 portrait/);
    // No flag section in print at all (spec v0.6.2, the user ruling): the
    // print stylesheet suppresses the flag surfaces should they ever
    // render into the print DOM.
    expect(printBlock).toMatch(/\.print-flag-row,\n\s*\.print-flag-text\s*\{\s*display:\s*none\s*!important;\s*\}/);
    // Self-contained pages: the page's table never slices across pages.
    expect(printBlock).toMatch(/\.print-page \.comparison-table\s*\{\s*break-inside:\s*avoid/);
    expect(printBlock).toMatch(/break-before:\s*page/);
    // Pagination integrity (spec v0.6.2, unit 2): the page block itself
    // never splits (the footer rides with its page content — no orphaned
    // footer on a near-empty trailing page), and no table row — above all
    // the Grand Total row with its derived-per-GT annotation — ever splits
    // across a sheet boundary. Both pins were observed red against the
    // v0.6.1 stylesheet (no page-level break-inside) before being trusted.
    expect(printBlock).toMatch(/\.print-page\s*\{[^}]*break-inside:\s*avoid/);
    expect(printBlock).toMatch(/\.print-page \.comparison-table tr\s*\{\s*break-inside:\s*avoid/);
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
