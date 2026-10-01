#!/usr/bin/env node
/**
 * Converts all YAML data files to JSON registries for web consumption
 * (spec v0.2.17 section 4.3.1: multi-port navigation; section 3.4: vessel library).
 * Scans core/data/*.yaml: files with fee_rules are ports (emitted to ports.json);
 * files with a vessels array are vessel-library entries (emitted to
 * vessel_library.json). Vessel entries require name, imo, gt, nt, draught_m,
 * and source_note. Adding a port or a vessel is a data edit: drop a YAML
 * file in core/data/ — no code change.
 * Usage: node scripts/convert_yaml_to_json.js
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const DATA_DIR = path.join(__dirname, '..', 'data');
const WEB_DATA_DIR = path.join(__dirname, '..', '..', 'web', 'src', 'data');
const PORTS_OUTPUT = path.join(WEB_DATA_DIR, 'ports.json');
const VESSELS_OUTPUT = path.join(WEB_DATA_DIR, 'vessel_library.json');
const REPO_ROOT = path.join(__dirname, '..', '..');

// Spec v0.2.26 source-link rule: YAML document_url values are repository-relative
// paths (the file paths used for verification). At conversion, each is rewritten
// to the absolute GitHub blob URL so UI hyperlinks resolve on the deployed
// bundle, where docs/sources/ is not part of the static site. Absolute http(s)
// URLs pass through untouched.
// Spec v0.2.32: sources whose archive copy is intentionally absent carry an
// explicit upstream_url in the YAML (live publisher URL); conversion marks
// them document_not_archived so the UI links the upstream document. No
// source reference ever points at an empty file: zero-byte placeholders
// were removed (the integrity test fails on any regression). A zero-byte
// file that somehow reappears is flagged document_pending by the stat
// branch below as a belt-and-braces guard; the integrity test is the
// authoritative check and fails the suite before any such registry ships.
const BLOB_BASE = 'https://github.com/Rekkike/VibesandTariffs/blob/main/';

function rewriteSourceUrls(node) {
  if (Array.isArray(node)) {
    node.forEach(rewriteSourceUrls);
    return;
  }
  if (!node || typeof node !== 'object') return;
  if ('document_url' in node) {
    const url = node.document_url;
    if (typeof url === 'string' && url.startsWith('docs/sources/')) {
      node.document_url = BLOB_BASE + url;
      try {
        if (fs.statSync(path.join(REPO_ROOT, url)).size === 0) {
          node.document_pending = true;
        }
      } catch (e) {
        // Archive copy intentionally absent (v0.2.32): mark it and require a
        // recorded upstream_url; the integrity test fails loudly otherwise.
        node.document_not_archived = true;
      }
    }
  }
  Object.values(node).forEach(rewriteSourceUrls);
}

function main() {
  try {
    for (const dir of [DATA_DIR, WEB_DATA_DIR]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    const yamlFiles = fs.readdirSync(DATA_DIR)
      .filter(f => f.endsWith('.yaml'))
      .sort();

    const ports = [];
    const vessels = [];
    let exchangeRates = null;

    for (const file of yamlFiles) {
      const yamlContent = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
      const data = yaml.load(yamlContent);

      if (Array.isArray(data && data.vessels)) {
        for (const vessel of data.vessels) {
          for (const field of ['name', 'imo', 'gt', 'nt', 'draught_m', 'source_note']) {
            if (vessel[field] === undefined || vessel[field] === null || vessel[field] === '') {
              throw new Error(`Invalid vessel entry in ${file}: missing ${field}`);
            }
          }
          vessels.push(vessel);
        }
        console.log(`Loaded ${data.vessels.length} vessel(s) from ${file}`);
      } else if (data && data.fee_rules && Array.isArray(data.fee_rules)) {
        if (!data.metadata || !data.metadata.id) {
          throw new Error(`Invalid port data in ${file}: metadata.id missing`);
        }
        ports.push(data);
        console.log(`Loaded port ${data.metadata.id} (${data.metadata.name}) from ${file}: ${data.fee_rules.length} fee rules`);
      } else if (data && Array.isArray(data.published_pairs) && data.published_pairs.length > 0) {
        // Spec v0.3.2: published-pairs exchange-rate reference data
        // (EUR-anchored published pairs; static, versioned pins; the UI's
        // rate-refresh fetch is an override layer, never a default).
        // Emitted as exchange_rates on ports.json. Adding a pair is a
        // data-only addition to published_pairs — no code change.
        const pairs = data.published_pairs;
        const seen = new Set();
        for (const p of pairs) {
          if (typeof p.pair !== 'string' || !/^[A-Z]{3}-[A-Z]{3}$/.test(p.pair)) {
            throw new Error(`Invalid published pair in ${file}: pair must be an AAA-BBB code`);
          }
          if (seen.has(p.pair)) {
            throw new Error(`Invalid published pair in ${file}: duplicate pair ${p.pair}`);
          }
          seen.add(p.pair);
          if (p.from_currency !== p.pair.slice(0, 3) || p.to_currency !== p.pair.slice(4)) {
            throw new Error(`Invalid published pair in ${file}: pair ${p.pair} contradicts from/to currencies`);
          }
          if (p.from_currency !== 'EUR') {
            throw new Error(`Invalid published pair in ${file}: ${p.pair} — published pairs are EUR-anchored (the ECB publishes EUR-base rates only)`);
          }
        }
        for (const r of pairs) {
          for (const field of ['from_currency', 'to_currency', 'rate', 'as_of', 'source']) {
            if (r[field] === undefined || r[field] === null || r[field] === '') {
              throw new Error(`Invalid exchange-rate entry in ${file}: missing ${field}`);
            }
          }
          if (typeof r.rate !== 'number' || r.rate <= 0) {
            throw new Error(`Invalid exchange-rate entry in ${file}: rate must be a positive number`);
          }
          // js-yaml parses ISO dates into Date objects; the registry carries
          // the plain YYYY-MM-DD string.
          if (r.as_of instanceof Date) {
            r.as_of = r.as_of.toISOString().slice(0, 10);
          }
        }
        exchangeRates = pairs.map(({ pair, ...row }) => row);
        console.log(`Loaded ${pairs.length} published pair(s) from ${file}: ${pairs.map(p => p.pair).join(', ')}`);
      } else {
        throw new Error(`Unrecognized data file ${file}: expected fee_rules (port) or vessels (vessel library)`);
      }
    }

    if (ports.length === 0) {
      throw new Error('No port YAML files found in ' + DATA_DIR);
    }

    // Spec v0.2.26: rewrite repository-relative document_url values to
    // absolute GitHub blob URLs and flag zero-byte (pending) source files.
    for (const port of ports) {
      rewriteSourceUrls(port);
    }

    // Registries are deterministic: same YAML inputs always produce identical
    // output, so the web bundle content hash is reproducible and a served
    // bundle can be matched to a commit (spec section 7 verification).
    fs.writeFileSync(PORTS_OUTPUT, JSON.stringify({ ports, exchange_rates: exchangeRates ?? [] }, null, 2), 'utf8');
    console.log(`Wrote ${ports.length} port(s) -> ${PORTS_OUTPUT}`);
    console.log(`  Ports: ${ports.map(p => p.metadata.id).join(', ')}`);

    fs.writeFileSync(VESSELS_OUTPUT, JSON.stringify({ vessels }, null, 2), 'utf8');
    console.log(`Wrote ${vessels.length} vessel(s) -> ${VESSELS_OUTPUT}`);

    process.exit(0);
  } catch (err) {
    console.error('Conversion failed:', err.message);
    process.exit(1);
  }
}

main();
