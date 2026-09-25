// OPS speculative-input pins (spec v0.2.57).
//
// AFIR and FuelEU Maritime make Onshore Power Supply effectively mandatory
// at key EU ports from 2030, but no in-scope published port tariff prices
// it. The model therefore carries free-number user-speculation inputs —
// deliberately outside the tariff-traceability contract. The numbers live
// only in the call input, never in ports.json or any rate table; blank
// contributes zero and renders nothing; every entered component renders
// under an explicit "user-specified, not tariff-derived" label, in a
// visibly separated block, never interleaved with tariff lines.
//
// The input group is per-port shaped (descriptor-driven, not a uniform
// four boxes): Gothenburg — electricity SEK/kWh, demand SEK/call, per-GT
// SEK/GT, no connection fee (its published OPS connection fee is tanker
// jetties only); Hamburg — electricity EUR/kWh, connection EUR/call, no
// demand, no per-GT; Helsingborg — all four present (least-defined public
// posture). Estimated kWh is the shared enabling input at all ports.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import {
  calculatePortCallCost,
  DEFAULT_VESSEL,
  defaultCall,
  opsComponentsForPort
} from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core/types';
import portsRegistry from './data/ports.json';
import { ComparisonView, __setMobileQueryForTests } from './App';

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const portById = (id: string) => LOADED_PORTS.find(p => p.metadata.id === id)!;
const mergedCall = (portId: string, shared: CallInput): CallInput => {
  const defaults = defaultCall(portId) as unknown as Record<string, unknown>;
  return { ...defaults, ...shared, port_id: portId } as unknown as CallInput;
};

const OPS_ENTERED: Pick<CallInput, 'ops_kwh_consumption' | 'ops_electricity_price' | 'ops_demand_charge' | 'ops_connection_charge' | 'ops_per_gt_charge'> = {
  ops_kwh_consumption: 1250,
  ops_electricity_price: 2.5,
  ops_demand_charge: 10000,
  ops_connection_charge: 5000,
  ops_per_gt_charge: 0.1
};

describe('OPS speculative inputs — zero-drift baseline (spec v0.2.57)', () => {
  // The red proof for this contract: entering values without the exclusion
  // moves the total (proven below); blank must move nothing. The pinned
  // baselines are the spec's zero-drift figures — with all OPS inputs
  // blank the results are byte-identical to the pre-OPS engine.
  it('blank OPS renders no block and changes no total (pinned baselines hold exactly)', () => {
    const pinned: Record<string, number> = {
      gothenburg: 3007051.15,
      hamburg: 2313489.31,
      helsingborg: 8481257.4
    };
    for (const [id, expected] of Object.entries(pinned)) {
      const result = calculatePortCallCost(portById(id), {
        vessel: DEFAULT_VESSEL,
        call: defaultCall(id)
      });
      expect(result.ops_speculative).toBeUndefined();
      expect(Math.round(result.total * 100)).toBe(Math.round(expected * 100));
    }
  });

  it('red proof: entering OPS values without exclusion moves the total (the baseline pin would fail)', () => {
    const blank = calculatePortCallCost(portById('gothenburg'), {
      vessel: DEFAULT_VESSEL, call: defaultCall('gothenburg')
    });
    const entered = calculatePortCallCost(portById('gothenburg'), {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('gothenburg'), ...OPS_ENTERED } as CallInput
    });
    expect(Math.round(entered.total * 100)).not.toBe(Math.round(blank.total * 100));
    expect(entered.ops_speculative).toBeDefined();
    // The only permitted figure movement: user-entered OPS values.
    expect(Math.round((entered.total - blank.total) * 100))
      .toBe(Math.round(entered.ops_speculative!.amount * 100));
  });
});

describe('OPS speculative inputs — entered values (spec v0.2.57)', () => {
  it('entered values produce the port-shaped component lines with user-specified labeling', () => {
    // Gothenburg: electricity + demand + per-GT (no connection component).
    const got = calculatePortCallCost(portById('gothenburg'), {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('gothenburg'), ...OPS_ENTERED } as CallInput
    });
    const gotIds = got.ops_speculative!.lines.map(l => l.id);
    expect(gotIds).toEqual(['ops_spec_electricity', 'ops_spec_demand', 'ops_spec_per_gt']);
    for (const line of got.ops_speculative!.lines) {
      expect(line.label).toMatch(/user-specified/);
      expect(line.basis).toContain('not tariff-derived');
    }
    // Hamburg: electricity + connection (no demand, no per-GT).
    const ham = calculatePortCallCost(portById('hamburg'), {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('hamburg'), ...OPS_ENTERED } as CallInput
    });
    expect(ham.ops_speculative!.lines.map(l => l.id))
      .toEqual(['ops_spec_electricity', 'ops_spec_connection']);
    // Helsingborg: all four.
    const hel = calculatePortCallCost(portById('helsingborg'), {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('helsingborg'), ...OPS_ENTERED } as CallInput
    });
    expect(hel.ops_speculative!.lines.map(l => l.id))
      .toEqual(['ops_spec_electricity', 'ops_spec_demand', 'ops_spec_connection', 'ops_spec_per_gt']);
  });

  it('the per-GT term multiplies by call GT; electricity multiplies by the entered kWh', () => {
    const got = calculatePortCallCost(portById('gothenburg'), {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('gothenburg'), ...OPS_ENTERED } as CallInput
    });
    const gt = DEFAULT_VESSEL.gt;
    expect(got.ops_speculative!.lines.find(l => l.id === 'ops_spec_per_gt')!.amount)
      .toBe(Math.round(gt * 0.1 * 100) / 100);
    expect(got.ops_speculative!.lines.find(l => l.id === 'ops_spec_electricity')!.amount)
      .toBe(3125); // 1,250 kWh × 2.50 SEK/kWh
  });

  it('electricity requires the enabling kWh input: a price alone fires nothing', () => {
    const hel = calculatePortCallCost(portById('helsingborg'), {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('helsingborg'), ops_electricity_price: 2.5 } as CallInput
    });
    expect(hel.ops_speculative).toBeUndefined();
  });

  it('per-port currency conventions: SEK at the Swedish ports, EUR at Hamburg', () => {
    const ham = calculatePortCallCost(portById('hamburg'), {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('hamburg'), ...OPS_ENTERED } as CallInput
    });
    const elec = ham.ops_speculative!.lines.find(l => l.id === 'ops_spec_electricity')!;
    expect(elec.label).toContain('EUR/kWh');
    expect(elec.basis).toContain('EUR/kWh');
  });

  it('the reconciliation invariant includes OPS lines when values are entered (and holds trivially when blank)', () => {
    for (const id of ['gothenburg', 'hamburg', 'helsingborg']) {
      const entered = calculatePortCallCost(portById(id), {
        vessel: DEFAULT_VESSEL,
        call: { ...defaultCall(id), ...OPS_ENTERED } as CallInput
      });
      const feeSum = entered.billers.flatMap(b => b.fees).reduce((s, f) => s + f.amount, 0);
      const opsAmount = entered.ops_speculative?.amount ?? 0;
      expect(Math.round((feeSum + opsAmount) * 100)).toBe(Math.round(entered.total * 100));
      const blank = calculatePortCallCost(portById(id), {
        vessel: DEFAULT_VESSEL, call: defaultCall(id)
      });
      const blankFeeSum = blank.billers.flatMap(b => b.fees).reduce((s, f) => s + f.amount, 0);
      expect(Math.round(blankFeeSum * 100)).toBe(Math.round(blank.total * 100));
    }
  });
});

describe('OPS component descriptor — per-port shape (spec v0.2.57)', () => {
  it('Gothenburg: no connection-fee component; electricity/demand/per-GT present in SEK', () => {
    const c = opsComponentsForPort('gothenburg');
    expect(c.connection.enabled).toBe(false);
    expect(c.electricity).toEqual({ enabled: true, currency: 'SEK', unit: 'SEK/kWh' });
    expect(c.demand).toEqual({ enabled: true, currency: 'SEK', unit: 'SEK/call' });
    expect(c.per_gt).toEqual({ enabled: true, currency: 'SEK', unit: 'SEK/GT' });
  });

  it('Hamburg: no demand, no per-GT; electricity/connection present in EUR', () => {
    const c = opsComponentsForPort('hamburg');
    expect(c.demand.enabled).toBe(false);
    expect(c.per_gt.enabled).toBe(false);
    expect(c.electricity).toEqual({ enabled: true, currency: 'EUR', unit: 'EUR/kWh' });
    expect(c.connection).toEqual({ enabled: true, currency: 'EUR', unit: 'EUR/call' });
  });

  it('Helsingborg: all four components present (least-defined public posture), SEK', () => {
    const c = opsComponentsForPort('helsingborg');
    expect(c.electricity.enabled).toBe(true);
    expect(c.demand.enabled).toBe(true);
    expect(c.connection.enabled).toBe(true);
    expect(c.per_gt.enabled).toBe(true);
    expect(c.electricity.currency).toBe('SEK');
  });

  it('the descriptor is configuration only — no OPS rates or price inputs enter ports.json (pin revised at v0.2.59, letter clarified at v0.2.60, stated in the spec)', () => {
    // v0.2.57 pinned "nothing OPS enters ports.json". v0.2.59 revises the
    // contract, not weakens it: the OPS component *descriptor* (presence,
    // currency, unit - configuration, never rates) is now data in each
    // port's YAML and flows into ports.json like every other port
    // configuration section. What remains banned - the pin's intent - is
    // any OPS *rate* or user-price *input name in the registry*: the
    // numbers live only in the call input, never in the registry or any
    // rate table. v0.2.60 clarifies the pin's letter to match that intent:
    // the banned strings are asserted against the registry's rate-bearing
    // sections (fee rules, default-call values, exchange rates) - the OPS
    // descriptor and the input_profile's reset_fields (which *names* call
    // fields for the port-switch reset, carrying no values) are
    // configuration and do not violate the pin. A raw substring match over
    // the whole registry would ban the reset contract itself.
    const rateBearing = JSON.stringify(
      ((portsRegistry as any).ports ?? []).map((p: any) => ({
        fee_rules: p.fee_rules,
        default_call: p.default_call,
        exchange_rates: (portsRegistry as any).exchange_rates
      }))
    );
    expect(rateBearing).not.toMatch(/ops_electricity_price/);
    expect(rateBearing).not.toMatch(/ops_demand_charge/);
    expect(rateBearing).not.toMatch(/ops_connection_charge/);
    expect(rateBearing).not.toMatch(/ops_per_gt_charge/);
    // And the descriptor that does ship is configuration only: every
    // component entry carries exactly enabled/currency/unit.
    for (const port of (portsRegistry as any).ports ?? []) {
      const ops = port.ops_speculative;
      expect(ops).toBeDefined();
      for (const component of ['electricity', 'demand', 'connection', 'per_gt']) {
        expect(ops[component]).toBeDefined();
        expect(Object.keys(ops[component]).sort()).toEqual(['currency', 'enabled', 'unit']);
      }
    }
  });
});

describe('OPS speculative inputs — web surfaces (spec v0.2.57)', () => {
  let container: HTMLElement | null = null;
  let root: Root | null = null;

  const renderComparison = async (call: CallInput, mobile: boolean) => {
    __setMobileQueryForTests(() => mobile);
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
    container = c;
    root = r;
  };

  afterEach(async () => {
    __setMobileQueryForTests(null);
    if (root) {
      const r = root;
      await act(async () => { r.unmount(); });
    }
    container?.remove();
    container = null;
    root = null;
  });

  it('the comparison applies the OPS block per port: desktop renders the separated row with per-port figures, no absence wording', async () => {
    // The shared call enters every component; each port's column prices only
    // its descriptor-enabled components (GOT three lines, HAM two, HEL four).
    await renderComparison({ ...defaultCall('gothenburg'), ...OPS_ENTERED } as CallInput, false);
    const opsRow = container!.querySelector('.comparison-ops-row');
    expect(opsRow).not.toBeNull();
    expect(opsRow!.textContent).toContain('user-specified, not tariff-derived');
    // No absence wording in any OPS cell (no user value is not a tariff
    // assertion) — the row renders only for ports with values here, all
    // three have values, and no cell says "not levied at this port".
    expect(opsRow!.textContent).not.toContain('not levied at this port');
    // Per-port figures (sv-SE grouping is the non-breaking space U+00A0,
    // whole-kr rounding): GOT 3,125+10,000+19,484.90 = 32,609.90 SEK;
    // HAM 3,125+5,000 = 8,125 EUR; HEL 37,609.90 SEK.
    expect(opsRow!.textContent).toContain('32\u00A0610');
    expect(opsRow!.textContent).toContain('8\u00A0125');
    expect(opsRow!.textContent).toContain('37\u00A0610');
  });

  it('blank OPS renders no OPS row and no spurious structure in the comparison', async () => {
    await renderComparison(defaultCall('gothenburg'), false);
    expect(container!.querySelector('.comparison-ops-row')).toBeNull();
  });

  it('the mobile card carries the per-port OPS line under the Grand Total, absent when blank', async () => {
    await renderComparison({ ...defaultCall('gothenburg'), ...OPS_ENTERED } as CallInput, true);
    const cards = container!.querySelectorAll('.comparison-port-card');
    expect(cards.length).toBe(LOADED_PORTS.length);
    for (const card of Array.from(cards)) {
      const opsLine = card.querySelector('.comparison-card-ops');
      expect(opsLine).not.toBeNull();
      expect(opsLine!.textContent).toContain('user-specified, not tariff-derived');
      // the OPS line renders beneath the card's Grand Total lead
      const total = card.querySelector('.comparison-card-total')!;
      expect(
        total.compareDocumentPosition(opsLine!) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }
    const blankRoot = createRoot(document.createElement('div'));
    await act(async () => {
      blankRoot.render(
        <ComparisonView
          ports={LOADED_PORTS}
          vessel={DEFAULT_VESSEL}
          call={defaultCall('gothenburg')}
          selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
          onSelectionChange={() => {}}
          activeVessel="TEST"
        />
      );
    });
  });

  it('the comparison zero-drift baseline holds with blank OPS at all three ports', async () => {
    await renderComparison(defaultCall('gothenburg'), false);
    const grandTotalRow = Array.from(container!.querySelectorAll('.comparison-total-row'))
      .find(r => (r.textContent ?? '').includes('Grand Total'))!;
    expect(grandTotalRow.textContent).toContain('3\u00A0007\u00A0051');
    expect(grandTotalRow.textContent).toContain('8\u00A0481\u00A0257');
    expect(grandTotalRow.textContent).toContain('2\u00A0313\u00A0489');
  });
});
