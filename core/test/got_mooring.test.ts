// GOT mooring disclosure pins (spec v0.3.1, the mooring-disclosure pass).
//
// The last known service gap at Gothenburg: mooring. AB Klippans
// Båtmansstation (est. 1972, org.nr 556132-5233, four mooring boats) holds
// the city-lease mooring concession (arrendeavtal with Göteborgs Stad);
// mooring is mandatory for commercial calls per Sjöfartsverket's båtmän
// instruction (obligatorisk for LOA >= 80 m — the entire modeled domain),
// is billed separately from the Port of Gothenburg tariff, and has no
// published rate anywhere. The deliverables: a zero-amount service-gap
// notice visible at every GOT call, plus an optional user-specified
// mooring charge (blank default, adds exactly the entered amount).
// HAM and HEL crew-handle lines — no mooring surface exists at either.
//
// Authorities of record: docs/GOT_MOORING_DISCLOSURE_AUDIT.md (the
// adjudications) and docs/sources/sweden/gothenburg/klippan/ (the
// archived sources). No figure is invented anywhere: the notice encodes
// none, the charge is the user's own entry.

import { calculatePortCallCost } from '../src/engine';
import { loadAndValidatePort } from '../src/loader';
import { DEFAULT_VESSEL, defaultCall } from '../src/defaults';
import { classifyRule } from '../src/classification';
import { PortDefinition } from '../src/types';
import * as path from 'path';

const DATA = path.join(__dirname, '..', 'data');

function loadPort(file: string): PortDefinition {
  return loadAndValidatePort(path.join(DATA, file)).port;
}

function feeByRule(result: ReturnType<typeof calculatePortCallCost>, ruleId: string) {
  return result.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === ruleId);
}

function gotCall(overrides: Record<string, unknown>) {
  return { ...defaultCall('gothenburg'), ...overrides } as never;
}

describe('GOT mooring disclosure — the notice pins (spec v0.3.1)', () => {
  it('the GOT file carries exactly the two mooring rules (notice + user-specified charge), no other port carries any', () => {
    const got = loadPort('gothenburg_2026.yaml');
    const mooringRules = got.fee_rules.filter(r => r.fee_family === 'mooring');
    expect(mooringRules.map(r => r.id).sort()).toEqual(['gothenburg_mooring_charge', 'gothenburg_mooring_notice']);
    for (const file of ['hamburg_2026.yaml', 'helsingborg_2026.yaml']) {
      const port = loadPort(file);
      expect(port.fee_rules.filter(r => r.fee_family === 'mooring')).toEqual([]);
      expect(port.fee_rules.some(r => /mooring|klippan|båtmansstation|förtöjning/i.test(r.id + r.name + r.biller))).toBe(false);
    }
  });

  it('the notice renders zero-amount with the service_gap_notice flag at every GOT call (blank input)', () => {
    const port = loadPort('gothenburg_2026.yaml');
    const r = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: gotCall({}) });
    const notice = feeByRule(r, 'gothenburg_mooring_notice')!;
    expect(notice).toBeDefined();
    expect(notice.amount).toBe(0);
    const flag = notice.quality_flags.find(f => f.type === 'service_gap_notice');
    expect(flag).toBeDefined();
    // The exclusion is disclosed: the biller, the concession, the
    // mandatory fact, the separate billing, the no-published-rate fact,
    // and the total's exclusion.
    expect(flag!.description).toContain('AB Klippans Båtmansstation');
    expect(flag!.description).toContain('city-lease mooring concession');
    expect(flag!.description).toContain('mandatory');
    expect(flag!.description).toContain('billed separately');
    expect(flag!.description).toContain('no published rate');
    expect(flag!.description).toContain('total excludes it');
    expect(flag!.severity).toBe('info');
  });

  it('the notice is structural: no amount-bearing surface exists (the rate structure is flat zero, never an estimate of any figure)', () => {
    const got = loadPort('gothenburg_2026.yaml');
    const notice = got.fee_rules.find(r => r.id === 'gothenburg_mooring_notice')!;
    const rs = notice.rate_structure as { type: string; amount: number; amount_input?: string; ets_product?: unknown };
    expect(rs.type).toBe('flat');
    expect(rs.amount).toBe(0);
    expect(rs.amount_input).toBeUndefined();
    expect(rs.ets_product).toBeUndefined();
    expect(notice.service_gap_notice).toBeDefined();
    expect(notice.estimated_parameter).toBeUndefined();
    expect(notice.applicable_conditions === undefined || Object.keys(notice.applicable_conditions).length === 0).toBe(true);
  });

  it('the notice biller is the factual one (never normalized) and joins the GOT billers list; HAM/HEL carry no Klippan biller', () => {
    const got = loadPort('gothenburg_2026.yaml');
    const klippan = got.billers.find(b => b.id === 'klippans_batmansstation')!;
    expect(klippan).toBeDefined();
    expect(klippan.name).toBe('AB Klippans Båtmansstation');
    const notice = got.fee_rules.find(r => r.id === 'gothenburg_mooring_notice')!;
    expect(notice.biller).toBe('AB Klippans Båtmansstation');
    for (const file of ['hamburg_2026.yaml', 'helsingborg_2026.yaml']) {
      const port = loadPort(file);
      expect(port.billers.some(b => /klippan/i.test(b.id + b.name))).toBe(false);
    }
  });

  it('the mooring family maps to the vessel_call segment and classifies as purchased_service (the audit\'s stage adjudication)', () => {
    const noticeInfo = classifyRule('gothenburg_mooring_notice')!;
    const chargeInfo = classifyRule('gothenburg_mooring_charge')!;
    expect(noticeInfo).toBeDefined();
    expect(chargeInfo).toBeDefined();
    expect(noticeInfo.functional_class).toBe('purchased_service');
    expect(chargeInfo.functional_class).toBe('purchased_service');
    expect(noticeInfo.basis_note).toContain('no published rate');
    expect(chargeInfo.basis_note).toContain('user-specified');
  });
});

describe('GOT mooring disclosure — the input pins (spec v0.3.1)', () => {
  it('blank mooring_charge renders a clean zero line: amount 0, no quality flags, no estimated_parameter on the rule — the collapsible profile the web layer pins (isCollapsibleZeroLine), nothing estimated, nothing defaulted', () => {
    const port = loadPort('gothenburg_2026.yaml');
    const r = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: gotCall({}) });
    const charge = feeByRule(r, 'gothenburg_mooring_charge')!;
    expect(charge).toBeDefined();
    expect(charge.amount).toBe(0);
    expect(charge.quality_flags).toEqual([]);
    const rule = port.fee_rules.find(x => x.id === 'gothenburg_mooring_charge')!;
    expect(rule.estimated_parameter).toBeUndefined();
    expect(rule.applicable_conditions === undefined || Object.keys(rule.applicable_conditions).length === 0).toBe(true);
    expect(feeByRule(r, 'gothenburg_mooring_notice')).toBeDefined();
  });

  it('an entered mooring_charge adds exactly the entered amount, exactly once, and moves no other line (the additive contract)', () => {
    const port = loadPort('gothenburg_2026.yaml');
    const before = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: gotCall({}) });
    const after = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: gotCall({ mooring_charge: 25000 }) });
    expect(after.total).toBe(round(before.total + 25000));
    const charge = feeByRule(after, 'gothenburg_mooring_charge')!;
    expect(charge).toBeDefined();
    expect(charge.amount).toBe(25000);
    expect(charge.fee_family).toBe('mooring');
    // The notice stays zero-amount at the entered state (no double-count).
    const notice = feeByRule(after, 'gothenburg_mooring_notice')!;
    expect(notice.amount).toBe(0);
    // Every non-mooring line is byte-identical.
    const beforeLines = before.billers.flatMap(b => b.fees).filter(f => f.fee_family !== 'mooring');
    const afterLines = after.billers.flatMap(b => b.fees).filter(f => f.fee_family !== 'mooring');
    expect(afterLines.length).toBe(beforeLines.length);
    for (let i = 0; i < beforeLines.length; i++) {
      expect(afterLines[i].amount).toBe(beforeLines[i].amount);
      expect(afterLines[i].fee_rule_id).toBe(beforeLines[i].fee_rule_id);
    }
  });

  it('the entered charge carries the user-specified flag: labeled user-specified, never estimated, never tariff-derived (the audit\'s honesty contract)', () => {
    const port = loadPort('gothenburg_2026.yaml');
    const r = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: gotCall({ mooring_charge: 25000 }) });
    const charge = feeByRule(r, 'gothenburg_mooring_charge')!;
    const flag = charge.quality_flags.find(f => f.type === 'user_specified_amount');
    expect(flag).toBeDefined();
    expect(flag!.description).toContain('user-specified');
    expect(flag!.description).toContain('no published rate exists');
    expect(flag!.description).toContain("the user's own");
    expect(flag!.description).toContain('never estimated or tariff-derived');
    expect(charge.quality_flags.some(f => f.type === 'estimated_parameter')).toBe(false);
  });

  it('a zero entry is blank-equivalent: the line renders the clean zero profile with no user-specified flag (a 0 entry is not a figure)', () => {
    const port = loadPort('gothenburg_2026.yaml');
    const r = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: gotCall({ mooring_charge: 0 }) });
    const charge = feeByRule(r, 'gothenburg_mooring_charge')!;
    expect(charge.amount).toBe(0);
    expect(charge.quality_flags).toEqual([]);
    expect(r.total).toBe(3275851.15);
  });
});

describe('GOT mooring disclosure — isolation and zero-drift pins (spec v0.3.1)', () => {
  it('the pre-existing baselines hold byte-identically with the mooring block present: GOT 3,275,851.15 / HAM 2,204,910.90 / HEL 8,750,057.40 (blank input, both states pinned)', () => {
    for (const [file, id, expected] of [
      ['gothenburg_2026.yaml', 'gothenburg', 3275851.15],
      ['hamburg_2026.yaml', 'hamburg', 2204910.90],
      ['helsingborg_2026.yaml', 'helsingborg', 8750057.40]
    ] as [string, string, number][]) {
      const port = loadPort(file);
      const r = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: defaultCall(id) });
      expect(r.total).toBe(expected);
    }
  });

  it('a mooring_charge entry at HAM/HEL moves nothing: the field routes per-port (an entry at another port is inert data)', () => {
    for (const [file, id, expected] of [
      ['hamburg_2026.yaml', 'hamburg', 2204910.90],
      ['helsingborg_2026.yaml', 'helsingborg', 8750057.40]
    ] as [string, string, number][]) {
      const port = loadPort(file);
      const call = { ...defaultCall(id), mooring_charge: 25000 } as never;
      const r = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call });
      expect(r.total).toBe(expected);
      expect(r.billers.flatMap(b => b.fees).some(f => f.fee_family === 'mooring')).toBe(false);
    }
  });

  it('mooring_charge joins GOT\'s reset_fields exactly (per-port routing, the §7 union sentence honored)', () => {
    const got = loadPort('gothenburg_2026.yaml');
    expect(got.input_profile!.reset_fields).toContain('mooring_charge');
    for (const file of ['hamburg_2026.yaml', 'helsingborg_2026.yaml']) {
      const port = loadPort(file);
      expect(port.input_profile!.reset_fields).not.toContain('mooring_charge');
    }
  });
});

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
