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
  loa_m: number;
  beam_m: number;
  teu_capacity: number;
  class_note: string;
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
    expect(data.vessels.length).toBeGreaterThanOrEqual(3);
  });

  test('every entry has the full schema including source_note provenance', () => {
    const fields = [
      'name', 'imo', 'vessel_type', 'flag', 'built', 'gt',
      'loa_m', 'beam_m', 'teu_capacity', 'class_note', 'source_note'
    ];
    for (const vessel of data.vessels) {
      for (const field of fields) {
        expect(vessel[field as keyof LibraryVessel]).toBeDefined();
      }
      expect(vessel.source_note.length).toBeGreaterThan(0);
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
    expect(helgafell!.loa_m).toBe(137);
    expect(helgafell!.teu_capacity).toBe(909);

    const vistula = byName.get('VISTULA MAERSK');
    expect(vistula).toBeDefined();
    expect(vistula!.gt).toBe(34882);
    expect(vistula!.loa_m).toBe(200);

    const maren = byName.get('MAREN MAERSK');
    expect(maren).toBeDefined();
    expect(maren!.gt).toBe(194849);
    expect(maren!.loa_m).toBe(399);
    expect(maren!.teu_capacity).toBe(19076);
  });
});
