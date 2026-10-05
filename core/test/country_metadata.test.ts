// Country-metadata pin (spec v0.5.0 selection-surface redesign, item 0.2).
//
// The audit finding: the `country` field already exists end-to-end (the
// type, all six silos, the loader's non-empty validation, the converter
// pass-through, the generated registry) - the directive's "only data-layer
// change" reduces to this pin plus the drawer's grouping read. The
// contract pinned here: every loaded 2026 silo carries a valid (non-empty,
// non-whitespace) country, rendered by the drawer as its group header
// exactly as carried (the full-name convention the silos were authored
// with). Red-proof class: a silo with its country dropped or blanked
// fails the loader's validation and this pin; the pin observes the real
// data files on disk, never a fixture, so a data regression turns it red.
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { validatePort } from '../src/loader';
import type { PortDefinition } from '../src/types';

const DATA_DIR = path.join(__dirname, '..', 'data');
// The delivered 2026 silo set (spec §9): exactly these six files.
const EXPECTED_SILOS = [
  'gavle_2026.yaml',
  'gothenburg_2026.yaml',
  'hamburg_2026.yaml',
  'helsingborg_2026.yaml',
  'norrkoping_2026.yaml',
  'norvik_2026.yaml'
];

describe('Country metadata (spec v0.5.0 selection-surface redesign)', () => {
  it('every loaded 2026 silo carries a valid, non-empty country', () => {
    for (const file of EXPECTED_SILOS) {
      const port = yaml.load(
        fs.readFileSync(path.join(DATA_DIR, file), 'utf8')
      ) as PortDefinition;
      expect(port.metadata).toBeDefined();
      expect(typeof port.metadata.country).toBe('string');
      expect(port.metadata.country.trim().length).toBeGreaterThan(0);
    }
  });

  it('the loader rejects a port whose country is missing or blank (the validation seam the drawer groups behind)', () => {
    const loadPort = (): PortDefinition =>
      yaml.load(
        fs.readFileSync(path.join(DATA_DIR, 'gothenburg_2026.yaml'), 'utf8')
      ) as PortDefinition;
    // The real silo passes validation.
    expect(validatePort(loadPort()).errors).toHaveLength(0);
    // Red-proof class: blanking the country must fail the loader - the
    // drawer groups on this field, so an invalid country may never load.
    const blanked = loadPort();
    (blanked.metadata as any).country = '   ';
    const result = validatePort(blanked);
    expect(result.is_valid).toBe(false);
    expect(result.errors.some(e => e.path === 'metadata.country')).toBe(true);
    const removed = loadPort();
    delete (removed.metadata as any).country;
    const result2 = validatePort(removed);
    expect(result2.is_valid).toBe(false);
    expect(result2.errors.some(e => e.path === 'metadata.country')).toBe(true);
  });
});
