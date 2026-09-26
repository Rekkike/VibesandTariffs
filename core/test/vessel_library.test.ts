import { readFileSync } from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface LibraryVessel {
  name: string;
  imo: string;
  vessel_type: string;
  flag: string;
  built: number;
  gt: number;
  nt: number;
  loa_m: number;
  beam_m: number;
  draught_m: number;
  teu_capacity: number;
  class_note: string;
  estimated_fields?: string[];
  source_note: string;
}

describe('Vessel library data (spec section 3.4)', () => {
  let data: { vessels: LibraryVessel[] };

  beforeAll(() => {
    const filePath = path.join(__dirname, '../data/vessel_library.yaml');
    data = yaml.load(readFileSync(filePath, 'utf8')) as { vessels: LibraryVessel[] };
  });

  test('library file loads and contains vessel entries', () => {
    expect(data).toBeDefined();
    expect(Array.isArray(data.vessels)).toBe(true);
    expect(data.vessels.length).toBeGreaterThanOrEqual(4);
  });

  test('every entry has the full schema including nt, draught_m, and source_note provenance', () => {
    const fields = [
      'name', 'imo', 'vessel_type', 'flag', 'built', 'gt', 'nt',
      'loa_m', 'beam_m', 'draught_m', 'teu_capacity', 'class_note', 'source_note'
    ];
    for (const vessel of data.vessels) {
      for (const field of fields) {
        expect(vessel[field as keyof LibraryVessel]).toBeDefined();
      }
      expect(vessel.source_note.length).toBeGreaterThan(0);
    }
  });

  test('estimated values are flagged: estimated_fields entries are marked in source_note', () => {
    for (const vessel of data.vessels) {
      const estimated = vessel.estimated_fields ?? [];
      for (const field of estimated) {
        // v0.2.48 data audit: GT and TEU capacity may be tracker estimates
        // (MSC Kyungmin), recorded with their basis in the source note.
        expect(['nt', 'draught_m', 'gt', 'teu_capacity']).toContain(field);
        // The source note must surface the estimate for that field, so an
        // estimated value is never mistaken for registry data
        const noteMentionsEstimate = vessel.source_note.toLowerCase().includes(field === 'nt' ? 'nt estimated' : 'estimated');
        expect(noteMentionsEstimate).toBe(true);
      }
    }
  });

  test('IMO numbers are unique 7-digit strings', () => {
    const imos = data.vessels.map(v => v.imo);
    expect(new Set(imos).size).toBe(imos.length);
    for (const imo of imos) {
      expect(imo).toMatch(/^\d{7}$/);
    }
  });

  test('seed vessels are present with verified particulars', () => {
    const byName = new Map(data.vessels.map(v => [v.name, v]));
    const helgafell = byName.get('HELGAFELL');
    expect(helgafell).toBeDefined();
    expect(helgafell!.gt).toBe(8890);
    // v0.3.0 re-derivation: NT observed 3,783 (Marine MAN aggregator, single
    // source — the estimate flag stays; the former ~36-percent estimate was 3,200).
    expect(helgafell!.nt).toBe(3783);
    // LOA corrected to the reference 137.5 m in v0.2.48 (the previous 137
    // was a rounding defect; deliberate data correction).
    expect(helgafell!.loa_m).toBe(137.5);
    expect(helgafell!.draught_m).toBe(8.51);
    expect(helgafell!.teu_capacity).toBe(909);
    expect(helgafell!.estimated_fields).toEqual(['nt']);
    expect(helgafell!.source_note).toContain('Marine MAN');

    const vistula = byName.get('VISTULA MAERSK');
    expect(vistula).toBeDefined();
    expect(vistula!.gt).toBe(34882);
    // v0.3.0 re-derivation: NT confirmed 16,947 (Marine MAN aggregator +
    // the spec §10 evidence record — two independent records agree); the
    // estimated flag retires for nt (the masquerade guard: the confirmation
    // is what retires the flag, never a silent data edit).
    expect(vistula!.nt).toBe(16947);
    expect(vistula!.loa_m).toBe(200);
    expect(vistula!.draught_m).toBe(10.0);
    expect(vistula!.estimated_fields).toEqual(['draught_m']);
    expect(vistula!.source_note).toContain('Class 7');
    expect(vistula!.source_note).toContain('NT confirmed: 16,947');

    const maren = byName.get('MAREN MAERSK');
    expect(maren).toBeDefined();
    expect(maren!.gt).toBe(194849);
    // v0.3.0 re-derivation: NT observed 79,120 (Marine MAN aggregator,
    // single source with a reliability caveat — the same page carries a
    // defective TEU figure; the flag stays, Class 9 either way).
    expect(maren!.nt).toBe(79120);
    expect(maren!.loa_m).toBe(399);
    expect(maren!.draught_m).toBe(16.0);
    expect(maren!.teu_capacity).toBe(19076);
    expect(maren!.estimated_fields).toEqual(['nt']);

    const kyungmin = byName.get('MSC KYUNGMIN');
    expect(kyungmin).toBeDefined();
    expect(kyungmin!.imo).toBe('9967005');
    expect(kyungmin!.flag).toBe('LR');
    expect(kyungmin!.built).toBe(2024);
    expect(kyungmin!.gt).toBe(21979);
    // v0.3.0 re-derivation: no confirming source obtained — the estimate
    // (8,000, Class 5) stays, flagged, with the boundary notice (the
    // convention band 8,792–12,748 spans the Class 6 boundary at 10,000).
    expect(kyungmin!.nt).toBe(8000);
    expect(kyungmin!.loa_m).toBe(171.92);
    expect(kyungmin!.beam_m).toBe(28.4);
    expect(kyungmin!.draught_m).toBe(9.8);
    expect(kyungmin!.teu_capacity).toBe(2400);
    // v0.2.48 data audit: GT and TEU capacity are tracker estimates (basis
    // stated in the source note) — the entry previously claimed GT as
    // registry-confirmed.
    expect(kyungmin!.estimated_fields).toEqual(['gt', 'teu_capacity', 'nt', 'draught_m']);
    expect(kyungmin!.class_note).toContain('estimated');
  });
});
