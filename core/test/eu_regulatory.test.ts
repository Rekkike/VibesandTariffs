// EU regulatory block pins (spec v0.2.69, the regulatory-block pass).
//
// The block: one ETS allowances rule and one FuelEU notice rule per port file
// (the silo transcription of the EU-wide instruments, the Sjofartsverket
// convention), a new `regulatory` fee family, a min_gt applicability gate
// mirroring the instruments' 5,000 GT threshold, a flat-rate ets_product
// extension (emissions x price x phase-in fraction over two user inputs),
// and a regulatory_notice flag (the FuelEU annual-balance disclosure).
//
// Authorities of record: docs/sources/eu/ (E1-E8 per the extraction
// reference); the figures cited here are the instruments' own.
import { calculatePortCallCost, evaluateFeeRule } from '../src/engine';
import { loadAndValidatePort } from '../src/loader';
import { DEFAULT_VESSEL, defaultCall } from '../src/defaults';
import { classifyRule } from '../src/classification';
import { CostCalculationInput, PortDefinition, FeeRule } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

const DATA = path.join(__dirname, '..', 'data');
const PORT_FILES: [string, string][] = [
  ['gothenburg_2026.yaml', 'gothenburg'],
  ['hamburg_2026.yaml', 'hamburg'],
  ['helsingborg_2026.yaml', 'helsingborg']
];

function loadPort(file: string): PortDefinition {
  return loadAndValidatePort(path.join(DATA, file)).port;
}

function callWith(overrides: Record<string, unknown>) {
  return { ...defaultCall('gothenburg'), ...overrides } as never;
}

function feeByRule(result: ReturnType<typeof calculatePortCallCost>, ruleId: string) {
  return result.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === ruleId);
}

function regRules(port: PortDefinition): FeeRule[] {
  return port.fee_rules.filter(r => r.fee_family === 'regulatory');
}

// The four library vessels (registry-verified particulars, spec 3.4).
const HELGAFELL = { gt: 8890, nt: 3200, loa_m: 137.5, teu_capacity: 909, built_year: 2005, name: 'HELGAFELL', imo: '9306017' };
const MSC_KYUNGMIN = { gt: 21979, nt: 8000, loa_m: 171.92, teu_capacity: 2600, built_year: 2024, name: 'MSC KYUNGMIN', imo: '9967005' };
const VISTULA = { gt: 34882, nt: 13000, loa_m: 200, teu_capacity: 3596, built_year: 2018, name: 'VISTULA MAERSK', imo: '9775737' };
const MAREN = { gt: 194849, nt: 70000, loa_m: 399, teu_capacity: 19076, built_year: 2014, name: 'MAREN MAERSK', imo: '9632129' };

describe('EU regulatory block — applicability pins (spec v0.2.69)', () => {
  it('each port file carries its own ETS and FuelEU rules under per-port rule ids (the silo transcription)', () => {
    const expected: Record<string, [string, string]> = {
      gothenburg: ['gothenburg_eu_ets_allowances', 'gothenburg_fueleu_notice'],
      hamburg: ['hamburg_eu_ets_allowances', 'hamburg_fueleu_notice'],
      helsingborg: ['helsingborg_eu_ets_allowances', 'helsingborg_fueleu_notice']
    };
    for (const [file, id] of PORT_FILES) {
      const port = loadPort(file);
      const rules = regRules(port);
      expect(rules.map(r => r.id).sort()).toEqual(expected[id]);
      // The regulatory family is declared in the loader's known set.
      const raw = fs.readFileSync(path.join(DATA, file), 'utf8');
      expect(raw).toContain('fee_family: regulatory');
    }
  });

  it('the min_gt gate: at or above 5,000 GT the rules apply; below 5,000 GT the exemption is entire (both instruments)', () => {
    const port = loadPort('gothenburg_2026.yaml');
    const at = calculatePortCallCost(port, { vessel: { ...DEFAULT_VESSEL, gt: 5000 }, call: callWith({ ets_emissions_tco2: 100, ets_allowance_price: 70 }) });
    const below = calculatePortCallCost(port, { vessel: { ...DEFAULT_VESSEL, gt: 4999 }, call: callWith({ ets_emissions_tco2: 100, ets_allowance_price: 70 }) });
    expect(feeByRule(at, 'gothenburg_fueleu_notice')).toBeDefined();
    expect(feeByRule(at, 'gothenburg_eu_ets_allowances')).toBeDefined(); // at-threshold: the rule applies and computes
    expect(feeByRule(below, 'gothenburg_fueleu_notice')).toBeUndefined();
    expect(feeByRule(below, 'gothenburg_eu_ets_allowances')).toBeUndefined();
    // An in-scope vessel with entered inputs below the threshold still computes nothing.
    const belowWithInputs = calculatePortCallCost(port, {
      vessel: { ...DEFAULT_VESSEL, gt: 4999 },
      call: callWith({ ets_emissions_tco2: 1000, ets_allowance_price: 70 })
    });
    expect(feeByRule(belowWithInputs, 'gothenburg_eu_ets_allowances')).toBeUndefined();
  });

  it('the default vessels: all four are at or above 5,000 GT (HELGAFELL 8,890 and MSC KYUNGMIN 21,979 included) — none is exempt; the applicability is vessel-size, not vessel-name', () => {
    // Correcting the directive premise with the registry-verified library:
    // HELGAFELL is 8,890 GT and MSC KYUNGMIN is 21,979 GT — both above the
    // 5,000 GT line. The <5,000 GT exemption applies to no library vessel;
    // it is pinned at the threshold itself (the pin above).
    const port = loadPort('gothenburg_2026.yaml');
    for (const v of [HELGAFELL, MSC_KYUNGMIN, VISTULA, MAREN]) {
      const r = calculatePortCallCost(port, { vessel: { ...DEFAULT_VESSEL, ...v }, call: callWith({}) });
      expect(feeByRule(r, 'gothenburg_fueleu_notice')).toBeDefined();
    }
  });

  it('the phase-in fraction is the instrument\'s own, keyed to the reporting year (40/70/100 percent of 2024/2025/2026-reported emissions)', () => {
    for (const [file] of PORT_FILES) {
      const port = loadPort(file);
      const ets = regRules(port).find(r => r.id.endsWith('_eu_ets_allowances'))!;
      const product = (ets.rate_structure as { ets_product?: { phase_in_pct: number; phase_in_fraction: number } }).ets_product!;
      // The model's calls are dated 2026 (the 2026 tariff set): 2026-reported
      // emissions surrender at 100 percent (Commission FAQ E2: "2027 and
      // beyond: 100% of reported emissions" — the surrender year follows the
      // reporting year by one).
      expect(product.phase_in_pct).toBe(100);
      expect(product.phase_in_fraction).toBe(1.0);
    }
  });
});

describe('EU regulatory block — the ETS arithmetic pins (spec v0.2.69)', () => {
  const port = loadPort('gothenburg_2026.yaml');

  it('allowances = emissions x phase-in fraction x price: 1,000 tCO2 at 100 percent and 70 EUR/t = 70,000.00', () => {
    const r = calculatePortCallCost(port, {
      vessel: DEFAULT_VESSEL,
      call: callWith({ ets_emissions_tco2: 1000, ets_allowance_price: 70 })
    });
    const line = feeByRule(r, 'gothenburg_eu_ets_allowances')!;
    expect(line.amount).toBe(70000.00);
    expect(line.rate_applied).toContain('1000 tCO2');
    expect(line.rate_applied).toContain('100% phase-in');
    expect(line.rate_applied).toContain('70 EUR/t');
    // The derived-basis flag rides the line (never verified data).
    expect(line.quality_flags.some(f => f.type === 'ets_user_specified_basis')).toBe(true);
  });

  it('the line carries the leg-scope attribution disclosure (the instrument\'s own 50/100 percent split, keyed to the shared arrival-origin selector)', () => {
    const r = calculatePortCallCost(port, {
      vessel: DEFAULT_VESSEL,
      call: callWith({ ets_emissions_tco2: 1000, ets_allowance_price: 70 })
    });
    const line = feeByRule(r, 'gothenburg_eu_ets_allowances')!;
    expect(line.band_or_basis).toContain('user-specified, not tariff-derived');
    expect(line.band_or_basis).toContain('Art. 3gb(1)');
    expect(line.band_or_basis).toContain('50 percent of voyage emissions + 100 percent in-port');
    expect(line.band_or_basis).toContain('intra-EU: 100 percent');
  });

  it('fractional products round to the cent: 33.7 tCO2 at 68.35 EUR/t = 2,303.40', () => {
    const r = calculatePortCallCost(port, {
      vessel: DEFAULT_VESSEL,
      call: callWith({ ets_emissions_tco2: 33.7, ets_allowance_price: 68.35 })
    });
    expect(feeByRule(r, 'gothenburg_eu_ets_allowances')!.amount).toBe(2303.40);
  });

  it('the data fraction is applied, not displayed: a synthetic 70-percent rule computes 1,000 tCO2 x 0.7 x 70 = 49,000.00 (the phase-in is in the arithmetic, the 2025-reported case)', () => {
    // The 2026 data fraction is 1.0, so the pins above cannot distinguish
    // "fraction applied" from "fraction ignored". This pin uses a synthetic
    // rule at the 2025-reported fraction (70 percent) to prove the engine
    // multiplies it in — the same engine path, the same data shape.
    const synthetic: FeeRule = {
      id: 'synthetic_ets',
      fee_family: 'regulatory',
      biller: 'EU (European Union) — shipping company\'s administering authority',
      name: 'Synthetic ETS',
      rate_structure: {
        type: 'flat',
        amount: 0,
        ets_product: {
          emissions_input: 'ets_emissions_tco2',
          price_input: 'ets_allowance_price',
          phase_in_fraction: 0.7,
          phase_in_pct: 70,
          basis_note: 'synthetic 2025-reported case'
        }
      },
      source_reference: {
        document_name: 'faq-maritime-ets.html.md',
        document_url: 'docs/sources/eu/ets/faq-maritime-ets.html.md',
        document_issued: '2023-05-10',
        page: 'Timing & scope',
        clause: 'synthetic',
        verified_on: '2026-09-29',
        verified_by: 'vibe-session-eu-regulatory'
      }
    };
    const flags: never[] = [];
    const line = evaluateFeeRule(synthetic, {
      vessel: DEFAULT_VESSEL,
      call: callWith({ ets_emissions_tco2: 1000, ets_allowance_price: 70 })
    } as never, flags as never, 'SEK');
    expect(line!.amount).toBe(49000.00);
    expect(line!.rate_applied).toContain('700 allowances');
  });

  it('blank or partial inputs render no line (both factors required for an honest figure)', () => {
    for (const overrides of [
      {},
      { ets_emissions_tco2: 1000 },
      { ets_allowance_price: 70 },
      { ets_emissions_tco2: 0, ets_allowance_price: 70 },
      { ets_emissions_tco2: 1000, ets_allowance_price: 0 }
    ]) {
      const r = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: callWith(overrides) });
      expect(feeByRule(r, 'gothenburg_eu_ets_allowances')).toBeUndefined();
    }
  });
});

describe('EU regulatory block — the FuelEU notice pins (spec v0.2.69)', () => {
  it('the notice renders zero-amount with the regulatory_notice flag, at every port, for an in-scope vessel', () => {
    for (const [file, id] of PORT_FILES) {
      const port = loadPort(file);
      const r = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: callWith({}) });
      const notice = feeByRule(r, `${id}_fueleu_notice`)!;
      expect(notice).toBeDefined();
      expect(notice.amount).toBe(0);
      const flag = notice.quality_flags.find(f => f.type === 'regulatory_notice');
      expect(flag).toBeDefined();
      // The notice carries the instrument's own figures (the exclusion-verdict deliverable).
      expect(flag!.description).toContain('91.16 gCO2e/MJ');
      expect(flag!.description).toContain('89.34');
      expect(flag!.description).toContain('2,400 EUR');
      expect(flag!.description).toContain('ANNUAL');
    }
  });

  it('no per-call FuelEU charge exists anywhere in the model: the ETS rule is the only amount-bearing regulatory rule', () => {
    for (const [file] of PORT_FILES) {
      const port = loadPort(file);
      const notice = regRules(port).find(r => r.id.endsWith('_fueleu_notice'))!;
      const rs = notice.rate_structure as { type: string; amount: number; ets_product?: unknown };
      expect(rs.type).toBe('flat');
      expect(rs.amount).toBe(0);
      expect(rs.ets_product).toBeUndefined();
    }
  });
});

describe('EU regulatory block — isolation and zero-drift pins (spec v0.2.69)', () => {
  it('the pre-existing baselines hold byte-identically with the block present: GOT 3,275,851.15 / HAM 2,204,910.90 / HEL 8,750,057.40 (the block is additive; blank inputs add nothing)', () => {
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

  it('an entered ETS figure adds to the total by exactly the ETS amount and moves no pre-existing line', () => {
    const port = loadPort('gothenburg_2026.yaml');
    const before = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: defaultCall('gothenburg') });
    const after = calculatePortCallCost(port, {
      vessel: DEFAULT_VESSEL,
      call: callWith({ ets_emissions_tco2: 1000, ets_allowance_price: 70 })
    });
    expect(after.total).toBe(round(before.total + 70000.00));
    // Every non-regulatory line is byte-identical.
    const beforeLines = before.billers.flatMap(b => b.fees).filter(f => f.fee_family !== 'regulatory');
    const afterLines = after.billers.flatMap(b => b.fees).filter(f => f.fee_family !== 'regulatory');
    expect(afterLines.length).toBe(beforeLines.length);
    for (let i = 0; i < beforeLines.length; i++) {
      expect(afterLines[i].amount).toBe(beforeLines[i].amount);
      expect(afterLines[i].fee_rule_id).toBe(beforeLines[i].fee_rule_id);
    }
  });

  it('the regulatory family classifies to the environmental class and never enters the vessel-access aggregate', () => {
    const etsInfo = classifyRule('gothenburg_eu_ets_allowances')!;
    const noticeInfo = classifyRule('gothenburg_fueleu_notice')!;
    expect(etsInfo.functional_class).toBe('waste_environmental');
    expect(noticeInfo.functional_class).toBe('waste_environmental');
    const port = loadPort('gothenburg_2026.yaml');
    const r = calculatePortCallCost(port, {
      vessel: DEFAULT_VESSEL,
      call: callWith({ ets_emissions_tco2: 1000, ets_allowance_price: 70 })
    });
    expect(r.vessel_access!.rule_ids).not.toContain('gothenburg_eu_ets_allowances');
    expect(r.vessel_access!.rule_ids).not.toContain('gothenburg_fueleu_notice');
  });
});

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

describe('EU regulatory block — input-default red-proof pins (spec v0.2.69, the source-integrity extension)', () => {
  it('no port file seeds an ETS emissions figure or an allowance price: the defaults are blank, never a number (an invented figure would fail this)', () => {
    for (const [file] of PORT_FILES) {
      const raw = fs.readFileSync(path.join(DATA, file), 'utf8');
      // No default_call entry for either input.
      const dcMatch = raw.match(/default_call:([\s\S]*?)(\n[a-z_]+:|\n# Per-port input profile|$)/);
      expect(dcMatch).toBeTruthy();
      expect(dcMatch![1]).not.toMatch(/ets_emissions_tco2\s*:/);
      expect(dcMatch![1]).not.toMatch(/ets_allowance_price\s*:/);
      // No encoded price: the ets_product carries the phase-in data only, never a price.
      const etsMatch = raw.match(/ets_product:([\s\S]*?)basis_note:/);
      expect(etsMatch).toBeTruthy();
      expect(etsMatch![1]).not.toMatch(/price\s*:\s*\d/);
      expect(etsMatch![1]).not.toMatch(/emissions\s*:\s*\d/);
    }
  });

  it('the shared default call seeds neither input (blank = not entered, the v0.2.28 contract)', () => {
    for (const [, id] of PORT_FILES) {
      expect(defaultCall(id).ets_emissions_tco2).toBeUndefined();
      expect(defaultCall(id).ets_allowance_price).toBeUndefined();
    }
  });

  it('a hardcoded allowance price must fail: no rate-bearing section carries a EUA price constant (the observed 2024 band appears only in helper prose)', () => {
    for (const [file] of PORT_FILES) {
      const raw = fs.readFileSync(path.join(DATA, file), 'utf8');
      // 64.74 (the observed 2024 average) must never appear as an encoded price.
      expect(raw).not.toMatch(/ets_allowance_price\s*:\s*64/);
      expect(raw).not.toMatch(/unit_rate\s*:\s*64\.74/);
    }
    const webInputs = fs.readFileSync(path.join(__dirname, '..', '..', 'web', 'src', 'portWorkspaceInputs.tsx'), 'utf8');
    // The helper text may cite the observed band (provenance prose), but the
    // input itself defaults to blank — no value= seeding of either field.
    const emissionsIdx = webInputs.indexOf("value={state.call.ets_emissions_tco2 ?? ''}");
    expect(emissionsIdx).toBeGreaterThan(-1);
    const priceIdx = webInputs.indexOf("value={state.call.ets_allowance_price ?? ''}");
    expect(priceIdx).toBeGreaterThan(-1);
    // No seeded numeric default for either field anywhere in the input surface.
    expect(webInputs).not.toMatch(/ets_emissions_tco2\s*\?\?\s*\d/);
    expect(webInputs).not.toMatch(/ets_allowance_price\s*\?\?\s*\d/);
  });
});
