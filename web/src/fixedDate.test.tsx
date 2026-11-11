// Fixed-date test baselines and the Gavle winter window disclosure (spec
// v0.11.3; user ruling 2026-10-22). The web suites anchor calendar today at
// the fixed date through setupTests (fixedClock.ts), the twin of the core
// anchor; the Gavle workspace's Date field states the winter period and its
// effect, derived from the port's own data and absent at every other port.
//
// Red proofs of record (build copy): the hint removed turns the presence pin
// red; a wrong window boundary turns the content pin red; the figure guard is
// unaffected by the hint.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { PortWorkspace, ComparisonView, __setMobileQueryForTests } from './App';
import { LOADED_PORTS as RENDERED_PORTS } from './portRegistry';
import { PrintComparisonPages } from './printComparisonPages';
import portsRegistry from './data/ports.json';
import { calculatePortCallCost, DEFAULT_VESSEL, defaultCall } from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core/types';
import { FIXED_TEST_DATE } from './fixedClock';
import { defaultRateInfo } from './testRates';
import { checkCallDate, callDateDisclosure, engineCallDate } from './callDate';
import * as fs from 'fs';
import * as path from 'path';

jest.setTimeout(60000);

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const portOf = (id: string) => LOADED_PORTS.find(p => p.metadata.id === id)!;

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
const settle = async (ms = 650) => { await act(async () => { await new Promise(r => setTimeout(r, ms)); }); };
const renderWorkspace = async (portId: string) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <PortWorkspace
        port={portOf(portId)}
        vessel={DEFAULT_VESSEL}
        call={defaultCall(portId) as CallInput}
        onVesselChange={() => {}}
        onCallChange={() => {}}
        onActiveVesselChange={() => {}}
      />
    );
  });
  await settle();
};
// The helper text under the Date field.
const dateHint = (): string | null => {
  const label = Array.from(container!.querySelectorAll('label')).find(l => (l.textContent ?? '').trim() === 'Date');
  const forId = label?.getAttribute('for');
  if (!forId) return null;
  const input = container!.querySelector(`[id="${forId.replace(/([^a-zA-Z0-9_-])/g, '\\$1')}"]`);
  const help = input?.closest('.MuiFormControl-root')?.querySelector('.MuiFormHelperText-root');
  return help ? (help.textContent ?? '') : null;
};

describe('fixed-date test baselines - the web anchor (spec v0.11.3)', () => {
  it('the baseline call\'s date is the fixed date, and the web twin agrees with the core anchor constant', () => {
    expect(FIXED_TEST_DATE).toBe('2026-06-15');
    expect((defaultCall('gavle') as CallInput).date).toBe(FIXED_TEST_DATE);
    expect(new Date().toISOString().split('T')[0]).toBe(FIXED_TEST_DATE);
    const core = fs.readFileSync(path.join(__dirname, '..', '..', 'core', 'test', 'fixed_clock.ts'), 'utf8');
    expect(core).toContain(`FIXED_TEST_DATE = '${FIXED_TEST_DATE}'`);
  });
});

describe('Gavle winter-window hint on the Date field (spec v0.11.3)', () => {
  it('presence and content at Gavle: the winter start and end, and the surcharge effect', async () => {
    await renderWorkspace('gavle');
    const hint = dateHint();
    expect(hint).not.toBeNull();
    expect(hint).toContain('1 December');   // winter start
    expect(hint).toContain('30 April');     // winter end
    expect(hint).toContain('winter surcharge');
    expect(hint).toContain('+100 %');
    expect(hint).toContain('hamnavgift');
    expect(hint).toContain('doubled');
    expect(hint).toContain('outside it prices the base rate');
  });
  it('absence at a port without a date window: Aarhus and Gothenburg carry no winter hint (v0.14.0: the field now always states the date in use)', async () => {
    for (const id of ['aarhus', 'gothenburg']) {
      await renderWorkspace(id);
      // v0.14.0 re-shape (in-test attribution): the helper is no longer null
      // at non-window ports - it states the call date in use; the winter
      // hint stays Gavle-only.
      expect(dateHint()).toContain(`Call date in use: ${FIXED_TEST_DATE}`);
      expect(dateHint()).not.toContain('Winter period');
      expect(container!.textContent ?? '').not.toContain('Winter period');
      await act(async () => { root!.unmount(); });
      container!.remove();
      root = null;
    }
  });
  it('no figure changes from the hint: the blank GOT default 3,275,851.15 SEK and the Gavle default 10,306,979.35 SEK are byte-identical in the engine and on the workspace', async () => {
    const total = (id: string) =>
      calculatePortCallCost(portOf(id), { vessel: DEFAULT_VESSEL, call: defaultCall(id) as CallInput }).total;
    expect(total('gothenburg')).toBe(3275851.15);
    expect(total('gavle')).toBe(10306979.35);
    await renderWorkspace('gavle');
    expect(container!.textContent ?? '').toContain('10\u00a0306\u00a0979');
    await act(async () => { root!.unmount(); });
    container!.remove();
    root = null;
    await renderWorkspace('gothenburg');
    expect(container!.textContent ?? '').toContain('3\u00a0275\u00a0851');
  });
});

// Call-date input (spec v0.14.0, the A-01 remediation, user ruling
// 2026-11-11): the Date field is the user-controlled call-date surface. It
// defaults to today (the production defaultCall stamp, untouched - under the
// test clock the fixed date), states the date in use, and validates
// fail-loud (callDate.ts): an entry that is not a real YYYY-MM-DD calendar
// date is never substituted - the input, the comparison context strip and
// the paper header name the defect, and no date-window rule fires. The
// selected date feeds CallInput.date through the single engine path.
//
// Red proofs of record (build copy, each observed red then restored green):
// the Date input's onChange not wired to 'date' turns the winter pin red;
// the context-strip item removed turns the strip disclosure pin red; the
// print-header disclosure removed turns the paper pin red.
const setInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};
const fieldByLabel = (label: string): HTMLInputElement | null => {
  const target = Array.from(container!.querySelectorAll('label')).find(l => (l.textContent ?? '').includes(label));
  const forId = target?.getAttribute('for');
  if (!forId) return null;
  return container!.querySelector(`[id="${forId.replace(/([^a-zA-Z0-9_-])/g, '\\$1')}"]`) as HTMLInputElement | null;
};
const DECLARED_ROWS = ((portsRegistry as any).exchange_rates ?? []) as { from_currency: string; to_currency: string; rate: number; as_of: string; source: string }[];

describe('Call-date input (spec v0.14.0, the A-01 remediation)', () => {
  let currentCall: CallInput | null = null;
  const mountWorkspace = async (portId: string) => {
    await act(async () => {
      root!.render(
        <PortWorkspace
          port={portOf(portId)}
          vessel={DEFAULT_VESSEL}
          call={currentCall!}
          onVesselChange={() => {}}
          onCallChange={(c) => { currentCall = c; }}
          onActiveVesselChange={() => {}}
        />
      );
    });
    await settle();
  };
  const renderWorkspaceControlled = async (portId: string) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    currentCall = defaultCall(portId) as CallInput;
    await mountWorkspace(portId);
  };
  const enterDate = async (portId: string, value: string) => {
    const input = fieldByLabel('Date');
    expect(input).not.toBeNull();
    await act(async () => { setInputValue(input!, value); });
    await mountWorkspace(portId);
  };
  const renderComparison = async (call: CallInput) => {
    __setMobileQueryForTests(() => false);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <ComparisonView
          ports={RENDERED_PORTS}
          vessel={DEFAULT_VESSEL}
          call={call}
          selectedPortIds={RENDERED_PORTS.map(p => p.metadata.id)}
          activeVessel="TEST"
        />
      );
    });
    await settle();
  };
  const renderPrintPages = async (call: CallInput) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    const portResults = RENDERED_PORTS.map(port => {
      const merged = { ...defaultCall(port.metadata.id), ...call, port_id: port.metadata.id } as CallInput;
      try {
        return { port, result: calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: merged }) };
      } catch {
        return { port, result: null };
      }
    });
    await act(async () => {
      root!.render(
        <PrintComparisonPages
          ports={RENDERED_PORTS}
          portResults={portResults as never}
          rowsByStage={[] as never}
          vessel={DEFAULT_VESSEL}
          call={call}
          rateInfo={defaultRateInfo()}
          comparisonBasisContext={{ basis: 'SEK', rows: DECLARED_ROWS }}
          declaredRows={DECLARED_ROWS}
          activeVessel="MAREN MAERSK (IMO 9632129)"
          formatCurrency={(amount, currency) =>
            new Intl.NumberFormat('sv-SE', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)}
          derivationsVisible={true}
          conversionsVisible={true}
          containerThroughVisible={false}
          hinterlandMode={'truck'}
        />
      );
    });
    await settle();
  };
  const stripDate = () => container!.querySelector('[data-testid="comparison-context-date"]')?.textContent ?? '';
  const paperLine3 = () => document.body.querySelector('[data-testid="print-header-line-3"]')?.textContent ?? '';
  const unmount = async () => {
    await act(async () => { root!.unmount(); });
    container!.remove(); root = null; container = null;
  };

  it('the Date field renders with the fixed-clock default date and states the date in use', async () => {
    await renderWorkspaceControlled('gothenburg');
    const input = fieldByLabel('Date');
    expect(input).not.toBeNull();
    expect(input!.value).toBe(FIXED_TEST_DATE);
    expect(dateHint()).toContain(`Call date in use: ${FIXED_TEST_DATE}`);
  });

  it('the date in use carries to the comparison context strip and the paper header (screen and print)', async () => {
    await renderComparison(defaultCall('gothenburg') as CallInput);
    expect(stripDate()).toContain(`Call date: ${FIXED_TEST_DATE}`);
    await unmount();
    await renderComparison({ ...defaultCall('gothenburg'), date: '2026-12-15' } as CallInput);
    expect(stripDate()).toContain('Call date: 2026-12-15');
    await unmount();
    await renderPrintPages(defaultCall('gothenburg') as CallInput);
    expect(paperLine3()).toContain(`Call date: ${FIXED_TEST_DATE}`);
    await unmount();
    await renderPrintPages({ ...defaultCall('gothenburg'), date: '2026-12-15' } as CallInput);
    expect(paperLine3()).toContain('Call date: 2026-12-15');
  });

  it('winter NAMED test: entering 2026-12-15 at Gavle prices the winter figures of record through the input', async () => {
    await renderWorkspaceControlled('gavle');
    // summer default first: the base hamnavgift, no winter line
    expect(container!.textContent ?? '').toContain('10\u00a0306\u00a0979');
    await enterDate('gavle', '2026-12-15');
    const text = container!.textContent ?? '';
    // winter figures of record: total 10,885,680.88 (rendered rounded
    // 10 885 681 kr); winter hamnavgift 1,157,403.06 (the doubled rate);
    // delta 578,701.53; summer total gone.
    expect(text).toContain('10\u00a0885\u00a0681');
    expect(text).toContain('1\u00a0157\u00a0403');
    expect(text).not.toContain('10\u00a0306\u00a0979');
    expect(dateHint()).toContain('Call date in use: 2026-12-15');
    // engine cross-check at the same date (the single path the input feeds):
    const res = calculatePortCallCost(portOf('gavle'), {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('gavle'), date: '2026-12-15' } as CallInput
    });
    expect(res.total).toBe(10885680.88);
    const ham = res.billers.flatMap(b => b.fees).find(f => /hamnavgift/.test(f.fee_rule_id))!;
    expect(ham.fee_rule_id).toBe('gvh_hamnavgift_container_winter');
    expect(ham.amount).toBe(1157403.06);
    expect(ham.amount - 578701.53).toBeCloseTo(578701.53, 2);
  });

  it('the comparison ranking at 2026-12-15 is pinned as its own expectation', async () => {
    await renderComparison({ ...defaultCall('gothenburg'), date: '2026-12-15' } as CallInput);
    const headerCells = Array.from(container!.querySelectorAll('.comparison-table thead th'))
      .map(th => th.textContent ?? '');
    expect(headerCells).toHaveLength(RENDERED_PORTS.length + 1);
    // cheapest-first on the converted basis at the winter date: the winter
    // surcharge does not reorder the default call, and this pin says so at
    // this date explicitly (the reorder potential is honest behavior of a
    // date-dependent model - now the effect of the selected date, never of
    // the run date).
    expect(headerCells[1]).toContain('Gothenburg');
    expect(headerCells[2]).toContain('Norrk\u00f6ping');
    expect(headerCells[3]).toContain('Helsingborg');
    expect(headerCells[4]).toContain('Aarhus');
    expect(headerCells[5]).toContain('G\u00e4vle');
    expect(headerCells[6]).toContain('Norvik');
    expect(headerCells[7]).toContain('Bremerhaven');
    expect(headerCells[8]).toContain('Hamburg');
    expect(container!.textContent ?? '').toContain('10\u00a0885\u00a0681');
  });

  it('an invalid date fails loud at the input, the context strip and the paper header, and no window rule fires', async () => {
    // unit-level validation contract (callDate.ts): shape plus calendar
    // validity - 2026-02-30 passes the YYYY-MM-DD shape but is not a date.
    expect(checkCallDate('2026-12-15').state).toBe('valid');
    expect(checkCallDate('2026-02-30').state).toBe('invalid');
    expect(checkCallDate('2026-13-01').state).toBe('invalid');
    expect(checkCallDate('').state).toBe('blank');
    expect(callDateDisclosure('2026-02-30')).toContain('not a valid calendar date');
    // A type=date field sanitizes a non-calendar entry to blank in the
    // browser, so the UI-reachable invalid entry is the cleared field: it is
    // named, never substituted, and the year-round figure prices (the winter
    // rule fires nothing).
    await renderWorkspaceControlled('gavle');
    await enterDate('gavle', '2026-02-30');
    expect(fieldByLabel('Date')!.value).toBe('');
    expect(dateHint()).toContain('not entered - no date-window rule fires');
    expect(container!.textContent ?? '').toContain('10\u00a0306\u00a0979');
    // the web layer feeds an invalid entry to the engine as blank, never as
    // a date: no date-window rule fires (the engine's fail-closed blank
    // behavior), and the raw entry is never substituted with another date.
    expect(engineCallDate('2026-02-30')).toBe('');
    expect(engineCallDate('2026-12-15')).toBe('2026-12-15');
    const res = calculatePortCallCost(portOf('gavle'), {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('gavle'), date: engineCallDate('2026-02-30') } as CallInput
    });
    expect(res.total).toBe(10306979.35);
    const ham = res.billers.flatMap(b => b.fees).find(f => /hamnavgift/.test(f.fee_rule_id))!;
    expect(ham.fee_rule_id).toBe('gvh_hamnavgift_container');
    // a call carrying a non-calendar date (set programmatically) names the
    // invalid defect on the comparison context strip and the paper header:
    await unmount();
    await renderComparison({ ...defaultCall('gothenburg'), date: '2026-02-30' } as CallInput);
    expect(stripDate()).toContain('not a valid calendar date');
    expect(stripDate()).toContain('no date-window rule fires');
    await unmount();
    await renderPrintPages({ ...defaultCall('gothenburg'), date: '2026-02-30' } as CallInput);
    expect(paperLine3()).toContain('not a valid calendar date');
    expect(paperLine3()).toContain('no date-window rule fires');
    // a cleared field names its own state on the strip:
    await unmount();
    await renderComparison({ ...defaultCall('gothenburg'), date: '' } as CallInput);
    expect(stripDate()).toContain('not entered');
    expect(stripDate()).toContain('no date-window rule fires');
  });
});
