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
      } else {
        throw new Error(`Unrecognized data file ${file}: expected fee_rules (port) or vessels (vessel library)`);
      }
    }

    if (ports.length === 0) {
      throw new Error('No port YAML files found in ' + DATA_DIR);
    }

    // Registries are deterministic: same YAML inputs always produce identical
    // output, so the web bundle content hash is reproducible and a served
    // bundle can be matched to a commit (spec section 7 verification).
    fs.writeFileSync(PORTS_OUTPUT, JSON.stringify({ ports }, null, 2), 'utf8');
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
