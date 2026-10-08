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
  upstream_url?: string; // spec v0.2.32: live publisher URL for not-archived sources
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
    // v0.7.0 re-baseline (in-test attribution): Rotterdam joins the silo
    // set — the ninth silo, the first Dutch port.
    expect(ports.map(p => p.port.metadata!.id).sort()).toEqual(['aarhus', 'bremerhaven', 'gavle', 'gothenburg', 'hamburg', 'helsingborg', 'norrkoping', 'norvik', 'rotterdam']);
  });

  it('every fee rule document_url path is archived or explicitly not-archived (a)', () => {
    // Spec v0.2.32: a cited path either exists in the repository or carries
    // the explicit upstream_url marker (checked in the not-archived test).
    // A cited path that is absent and unmarked is a failure.
    const missing: string[] = [];
    for (const { file, port } of ports) {
      for (const rule of port.fee_rules!) {
        const sr = rule.source_reference;
        const url = sr?.document_url;
        if (!url) continue;
        if (/^https?:\/\//.test(url)) continue; // absolute URLs pass through
        if (!fs.existsSync(path.join(REPO_ROOT, url))) {
          if (!sr?.upstream_url) {
            missing.push(`${file} / ${rule.rule_id}: ${url}`);
          }
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

  it('price-bearing sources are non-zero bytes; no zero-byte placeholder may exist (b)', () => {
    // Scan both the rule-cited URLs and the whole docs/sources tree: a
    // price-bearing placeholder counts even if no rule currently cites it.
    // Spec v0.2.32: the zero-byte placeholders were removed and replaced by
    // explicit not-archived markers with upstream URLs in the YAML. The
    // standing rule is that no source reference may point at an empty file:
    // any zero-byte file under docs/sources is a failure, full stop.
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
    expect(Array.from(zeroByte).sort()).toEqual([]);
  });

  it('sources without an archive copy carry the not-archived marker and a live upstream URL', () => {
    // Spec v0.2.32: a source may be intentionally not archived, but only via
    // the explicit mechanism: the YAML carries upstream_url, the repository
    // file is absent (not zero bytes), and the registry conversion marks it
    // document_not_archived. A cited path that is neither archived nor marked
    // is a failure.
    // v0.4.5 citation repair: the prislista is archived in-repo (the
    // verbatim text extraction, the fetchable artifact) and the national
    // citations point at it; the two prislista paths leave the
    // not-archived marker set.
    // v0.4.6 re-baseline (the APMT operator-document pass, in-test
    // attribution): the APMT Terminal Tariff is archived (the product-
    // owner-delivered text extraction) and the 15 APMT citations point at
    // the archived .txt path — G2 leaves the not-archived list; only the
    // port-authority G1 document remained.
    // v0.4.7 re-baseline (the model health audit pass, in-test
    // attribution): G1 is archived (the primary-route fetch's verbatim
    // text extraction, pages 1-21 with the truncation limitation
    // recorded in its provenance header) and the 10 port-authority
    // citations point at the archived .txt path — G1 leaves the
    // not-archived list, which is now empty.
    const notArchived: string[] = [].sort();
    const cited = new Set<string>();
    const marked = new Set<string>();
    for (const { port } of ports) {
      for (const rule of port.fee_rules!) {
        const sr = rule.source_reference;
        if (!sr?.document_url || /^https?:\/\//.test(sr.document_url)) continue;
        cited.add(sr.document_url);
        if (sr.upstream_url) {
          if (!fs.existsSync(path.join(REPO_ROOT, sr.document_url))) {
            marked.add(sr.document_url);
          }
        }
      }
    }
    // Every upstream_url-marked absent file is a known not-archived source
    expect(Array.from(marked).sort()).toEqual(notArchived);
    // Every cited-but-absent file must be marked (no silent missing sources)
    const absentUnmarked = Array.from(cited).filter(
      u => !fs.existsSync(path.join(REPO_ROOT, u)) && !marked.has(u)
    );
    expect(absentUnmarked.sort()).toEqual([]);
    // Upstream URLs are live publisher URLs, not repository paths
    for (const { port } of ports) {
      for (const rule of port.fee_rules!) {
        const sr = rule.source_reference;
        if (sr?.upstream_url) {
          expect(sr.upstream_url).toMatch(/^https?:\/\//);
        }
      }
    }
  });

  it('the national prislista archive exists with its extraction reference (v0.4.5 archive-presence pin)', () => {
    // The v0.4.4 audit finding, closed: docs/sources/sweden/national/ now
    // holds the archived prislista (the verbatim text extraction, the
    // fetchable artifact) and the national extraction reference written
    // once and cited by all five Swedish silos. Red proof: the archive file
    // removed (or renamed) fails the existsSync checks; a silo document_url
    // pointing at the old never-existed .pdf path fails the first test of
    // this suite (observed red before the repair).
    const archive = path.join(REPO_ROOT, 'docs/sources/sweden/national/sjofartsverket/prislista-farleds-lotsavgifter-2026.txt');
    expect(fs.existsSync(archive)).toBe(true);
    expect(fs.statSync(archive).size).toBeGreaterThan(1000);
    const reference = path.join(REPO_ROOT, 'docs/sources/sweden/national/NATIONAL_EXTRACTION_REFERENCE.md');
    expect(fs.existsSync(reference)).toBe(true);
    const referenceText = fs.readFileSync(reference, 'utf8');
    expect(referenceText).toContain('fa1cfe5a5bf90a6f0b22f30abd3e832f4e01c9dcdc907987e96cf92f720d4699');
    expect(referenceText).toContain('text extraction');
    // All five Swedish silos cite the archived path exactly, with no
    // residual never-existed .pdf citation anywhere in the data.
    for (const file of ['gavle_2026.yaml', 'gothenburg_2026.yaml', 'helsingborg_2026.yaml', 'norrkoping_2026.yaml', 'norvik_2026.yaml']) {
      const text = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
      expect(text).toContain('document_url: docs/sources/sweden/national/sjofartsverket/prislista-farleds-lotsavgifter-2026.txt');
      expect(text).not.toMatch(/document_url:.*prislista.*\.pdf"?\s*$/m);
    }
  });

  it('the APMT GOT operator archives exist and the silo cites the real path (v0.4.6 archive-presence pin)', () => {
    // The v0.4.5 stop finding closed on the delivered-archive route: both
    // APMT documents (the Terminal Tariff and the Terms of Business) were
    // delivered by the product owner outside the sandbox and committed to
    // main. Red proofs observed failing before trusted: the archive file
    // renamed (this pin fails), a silo document_url reverted to the
    // never-existed apm-terminals/ .pdf path (the first test of this suite
    // plus this pin fail).
    const tariff = path.join(REPO_ROOT, 'docs/sources/sweden/gothenburg/apm-terminals-terminal-tariff-2026-june.txt');
    const terms = path.join(REPO_ROOT, 'docs/sources/sweden/gothenburg/apm-terms-of-business-2025-03-31.txt');
    expect(fs.existsSync(tariff)).toBe(true);
    expect(fs.statSync(tariff).size).toBeGreaterThan(1000);
    expect(fs.existsSync(terms)).toBe(true);
    const tariffText = fs.readFileSync(tariff, 'utf8');
    // Identity: issuer, validity, structure, and the recorded provenance.
    expect(tariffText).toContain('APM Terminals Gothenburg');
    expect(tariffText).toContain('01.01.2026 until 31.12.2026');
    expect(tariffText).toContain('Valid from 01.01.2026');
    expect(tariffText).toContain('Delivered by the product owner, 2026-10-02');
    // The verified figures survive verbatim in the archive.
    expect(tariffText).toContain('Per Unit | 377');
    expect(tariffText).toContain('Per Unit | 535');
    expect(tariffText).toContain('Per Unit | 80');
    expect(tariffText).toContain('| 3111');
    expect(tariffText).toContain('| 1036');
    expect(tariffText).toContain('| 437');
    expect(tariffText).toContain('| 709');
    expect(tariffText).toContain('| 382');
    expect(tariffText).toContain('| 538');
    // The silo's APMT rules cite the archived path, with no residual
    // never-existed .pdf citation anywhere in the data.
    const gotText = fs.readFileSync(path.join(DATA_DIR, 'gothenburg_2026.yaml'), 'utf8');
    expect(gotText).toContain('document_url: "docs/sources/sweden/gothenburg/apm-terminals-terminal-tariff-2026-june.txt"');
    expect(gotText).not.toMatch(/document_url:.*apm-terminals\/terminal-tariff-2026-june\.pdf/);
    // The extraction reference records the operator layer and its archive.
    const reference = fs.readFileSync(path.join(REPO_ROOT, 'docs/sources/sweden/gothenburg/GOTHENBURG_EXTRACTION_REFERENCE.md'), 'utf8');
    expect(reference).toContain('apm-terminals-terminal-tariff-2026-june.txt');
    expect(reference).toContain('apm-terms-of-business-2025-03-31.txt');
  });
  it('conversion rewrites relative URLs to GitHub blob URLs and flags not-archived sources', () => {
    // Re-run the conversion contract on the registry: the web registry must
    // carry absolute blob URLs and document_not_archived on absent files
    // (with upstream_url carrying the live publisher link).
    const registryPath = path.join(__dirname, '../../../web/src/data/ports.json');
    if (!fs.existsSync(registryPath)) return; // registry not generated in this checkout state
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    const BLOB_BASE = 'https://github.com/Rekkike/VibesandTariffs/blob/main/';
    let blobUrls = 0;
    let notArchivedFlags = 0;
    let notArchivedWithUpstream = 0;
    for (const port of registry.ports ?? []) {
      for (const rule of port.fee_rules ?? []) {
        const sr = rule.source_reference;
        if (!sr || !sr.document_url) continue;
        if (sr.document_url.startsWith(BLOB_BASE)) blobUrls++;
        if (sr.document_url.startsWith('docs/sources/')) {
          throw new Error(`Registry still carries a repository-relative document_url: ${sr.document_url}`);
        }
        if (sr.document_not_archived === true) {
          notArchivedFlags++;
          if (typeof sr.upstream_url === 'string' && /^https?:\/\//.test(sr.upstream_url)) {
            notArchivedWithUpstream++;
          }
        }
      }
    }
    expect(blobUrls).toBeGreaterThan(0);
    // v0.4.7 re-baseline (the model health audit pass, in-test
    // attribution): G1 (the last not-archived source) is archived, so no
    // registry rule carries the document_not_archived flag. The flagged-
    // when-absent machinery stays (the converter branch above); the
    // invariant is now zero flags, never at-least-one.
    expect(notArchivedFlags).toBe(0);
    expect(notArchivedWithUpstream).toBe(notArchivedFlags);
  });

  it('the G1 port-authority archive exists with its provenance and the silo cites the real path (v0.4.7 archive-presence pin)', () => {
    // The model health audit pass closed the not-archived list's last
    // entry: the Port of Gothenburg Port Tariff 2026 fetched from the
    // primary route (the host serves plain clients) and archived as the
    // verbatim text extraction, pages 1-21 — the truncation limitation
    // recorded in the provenance header, the prislista precedent. Every
    // G1-cited encoded rule cites pages 9-13, inside the archived range;
    // every encoded figure verified against the archive (the audit's
    // figure table). No contradiction; the anchor-port stop was not met.
    const archivePath = path.join(REPO_ROOT, 'docs/sources/sweden/gothenburg/port-authority/port-tariff-2026.txt');
    const text = fs.readFileSync(archivePath, 'utf8');
    // Identity: issuer, title, edition, currency, provenance, limitation.
    expect(text).toContain('Port of Gothenburg');
    expect(text).toContain('PORT TARIFF 2026');
    expect(text).toContain('VERSION 1 - Effective from January 1, 2026');
    expect(text).toContain('The prices quoted below are in SEK');
    expect(text).toContain('Fetched 2026-10-02');
    expect(text).toContain('portofgothenburg.com/globalassets/dokument/port-tariff-2026.pdf');
    expect(text).toContain('truncates at page 21 of 37');
    // The encoded container-call authority: the section 2.2 schedules the
    // silo's rules cite, verbatim.
    expect(text).toContain('2.2 CONTAINER VESSELS');
    expect(text).toContain('1,96 SEK/GT');
    expect(text).toContain('1,71 SEK/GT');
    expect(text).toContain('1,15 SEK/GT');
    expect(text).toContain('0,80 SEK/GT');
    expect(text).toContain('0,13 SEK/GT');
    expect(text).toContain('0,24 SEK/GT');
    expect(text).toContain('0,21 SEK/GT');
    expect(text).toContain('0,31 SEK/GT');
    expect(text).toContain('2 400 SEK/m³');
    expect(text).toContain('800 SEK');
    expect(text).toContain('50 SEK/m³');
    expect(text).toContain('7 000 SEK');
    expect(text).toContain('45 SEK/m (LOA)');
    expect(text).toContain('50% discount on port dues based on GT for the second call');
    // The extraction reference records the archive and its SHA.
    const reference = fs.readFileSync(path.join(REPO_ROOT, 'docs/sources/sweden/gothenburg/GOTHENBURG_EXTRACTION_REFERENCE.md'), 'utf8');
    expect(reference).toContain('port-tariff-2026.txt');
    expect(reference).toContain('e8a85b1e17efc46ed78c328412b627b90c52ba01dcc7828861ffb968839f36ed');
    // The silo's port-authority rules cite the real archived path, never
    // the never-existed .pdf repository path.
    const gotYaml = fs.readFileSync(path.join(DATA_DIR, 'gothenburg_2026.yaml'), 'utf8');
    const g1RuleCitations = gotYaml.split('document_url: "docs/sources/sweden/gothenburg/port-authority/port-tariff-2026.txt"').length - 1;
    expect(g1RuleCitations).toBe(10);
    expect(gotYaml).not.toContain('document_url: "docs/sources/sweden/gothenburg/port-authority/port-tariff-2026.pdf"');
    expect(gotYaml).not.toContain('document_name: "port-tariff-2026.pdf"');
  });
});
