// Port Call Cost Analyzer - Source Link Integrity Tests (spec v0.2.26)
// For every fee rule in every port file, the repository-relative document_url
// path must (a) exist in the repository, (b) belong to a price-bearing source
// that is non-zero bytes (zero-byte placeholders are reported as warnings and
// must never silently masquerade as complete sources), and (c) match the
// repository path casing exactly. This test would have caught both the
// GitHub-Pages 404 defect (relative paths rendered as links on the deployed
// bundle) and the Gothenburg placeholder gap automatically.
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../data');
const REPO_ROOT = path.join(__dirname, '../..');

// Price-bearing sources per the extraction references: the documents the
// references mark as carrying prices. Terms-only documents (Hamburg S3/S5/S6,
// Helsingborg S4/S5) carry no rates; a zero-byte terms file is acceptable.
// All other referenced documents are price-bearing for the rules citing them.
const TERMS_ONLY_DOCS = new Set([
  'docs/sources/germany/hamburg/port-authority/port-gtc-2026.pdf',
  'docs/sources/germany/hamburg/hhla/gtcch-2017.pdf',
  'docs/sources/sweden/helsingborg/port-authority/ports-of-sweden-general-conditions-1989.pdf',
  'docs/sources/sweden/helsingborg/port-authority/stevedoring-terms-2011.pdf',
]);

interface RuleSource {
  document_name?: string;
  document_url?: string;
  document_issued?: string;
  page?: string | number;
  clause?: string;
  verified_on?: string;
  verified_by?: string;
}

interface PortFile {
  metadata?: { id?: string };
  fee_rules?: Array<{ rule_id?: string; source_reference?: RuleSource }>;
}

function loadPorts(): Array<{ file: string; port: PortFile }> {
  const ports: Array<{ file: string; port: PortFile }> = [];
  for (const file of fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.yaml')).sort()) {
    const data = yaml.load(fs.readFileSync(path.join(DATA_DIR, file), 'utf8')) as PortFile;
    if (data && Array.isArray(data.fee_rules) && data.metadata && data.metadata.id) {
      ports.push({ file, port: data });
    }
  }
  return ports;
}

describe('Source link integrity (spec v0.2.26)', () => {
  const ports = loadPorts();

  it('has port files loaded for every registered port', () => {
    expect(ports.length).toBeGreaterThanOrEqual(3);
    expect(ports.map(p => p.port.metadata!.id).sort()).toEqual(['gothenburg', 'hamburg', 'helsingborg']);
  });

  it('every fee rule document_url path exists in the repository (a)', () => {
    const missing: string[] = [];
    for (const { file, port } of ports) {
      for (const rule of port.fee_rules!) {
        const url = rule.source_reference?.document_url;
        if (!url) continue;
        if (/^https?:\/\//.test(url)) continue; // absolute URLs pass through
        if (!fs.existsSync(path.join(REPO_ROOT, url))) {
          missing.push(`${file} / ${rule.rule_id}: ${url}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('document_url paths match repository casing exactly (c)', () => {
    const caseMismatches: string[] = [];
    for (const { file, port } of ports) {
      for (const rule of port.fee_rules!) {
        const url = rule.source_reference?.document_url;
        if (!url || /^https?:\/\//.test(url)) continue;
        const rel = url.replace(/^docs\/sources\//, 'docs/sources/');
        const dir = path.dirname(path.join(REPO_ROOT, rel));
        const base = path.basename(rel);
        if (fs.existsSync(dir)) {
          const actual = fs.readdirSync(dir).find(f => f.toLowerCase() === base.toLowerCase());
          if (actual !== undefined && actual !== base) {
            caseMismatches.push(`${file} / ${rule.rule_id}: "${url}" vs repository "${path.join(path.basename(dir), actual)}"`);
          }
        }
      }
    }
    expect(caseMismatches).toEqual([]);
  });

  it('price-bearing sources are non-zero bytes; zero-byte placeholders are listed (b)', () => {
    // Scan both the rule-cited URLs and the whole docs/sources tree: a
    // price-bearing placeholder counts even if no rule currently cites it.
    const zeroByte = new Set<string>();
    for (const { port } of ports) {
      for (const rule of port.fee_rules!) {
        const url = rule.source_reference?.document_url;
        if (!url || /^https?:\/\//.test(url)) continue;
        if (TERMS_ONLY_DOCS.has(url)) continue;
        const abs = path.join(REPO_ROOT, url);
        if (fs.existsSync(abs) && fs.statSync(abs).size === 0) {
          zeroByte.add(url);
        }
      }
    }
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir)) {
        const abs = path.join(dir, entry);
        if (fs.statSync(abs).isDirectory()) {
          walk(abs);
        } else if (abs.endsWith('.pdf') && fs.statSync(abs).size === 0) {
          const rel = path.relative(REPO_ROOT, abs);
          if (!TERMS_ONLY_DOCS.has(rel)) zeroByte.add(rel);
        }
      }
    };
    walk(path.join(REPO_ROOT, 'docs/sources'));
    // Known pending placeholders (Gothenburg PDFs, Sjöfartsverket national
    // PDFs): recorded, not silently accepted. The assertion below lists them
    // via the test output and must be updated when the PDFs land in the repo.
    const knownPending = [
      'docs/sources/sweden/gothenburg/apm-terminals/terminal-tariff-2026-june.pdf',
      'docs/sources/sweden/gothenburg/port-authority/port-tariff-2026.pdf',
      'docs/sources/sweden/national/sjofartsverket/lathund-lotsavgifter-2026.pdf',
      'docs/sources/sweden/national/sjofartsverket/prislista-farleds-lotsavgifter-2026.pdf',
    ].sort();
    const zeroByteList = Array.from(zeroByte).sort();
    const newZeroByte = zeroByteList.filter(u => !knownPending.includes(u));
    // Any placeholder outside the known set is a failure: a price-bearing
    // source must not regress to a zero-byte placeholder unnoticed.
    expect(newZeroByte).toEqual([]);
    // The known set must still match reality exactly: if a placeholder gains
    // content, remove it here; this keeps the pending list honest.
    expect(zeroByteList).toEqual(knownPending);
  });

  it('conversion rewrites relative URLs to GitHub blob URLs and flags zero-byte sources', () => {
    // Re-run the conversion contract on one port's rules: the web registry
    // must carry absolute blob URLs and document_pending on zero-byte files.
    const registryPath = path.join(__dirname, '../../../web/src/data/ports.json');
    if (!fs.existsSync(registryPath)) return; // registry not generated in this checkout state
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    const BLOB_BASE = 'https://github.com/Rekkike/VibesandTariffs/blob/main/';
    let blobUrls = 0;
    let pendingFlags = 0;
    for (const port of registry.ports ?? []) {
      for (const rule of port.fee_rules ?? []) {
        const sr = rule.source_reference;
        if (!sr || !sr.document_url) continue;
        if (sr.document_url.startsWith(BLOB_BASE)) blobUrls++;
        if (sr.document_url.startsWith('docs/sources/')) {
          throw new Error(`Registry still carries a repository-relative document_url: ${sr.document_url}`);
        }
        if (sr.document_pending === true) pendingFlags++;
      }
    }
    expect(blobUrls).toBeGreaterThan(0);
    expect(pendingFlags).toBeGreaterThan(0);
  });
});
