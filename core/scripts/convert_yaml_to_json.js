#!/usr/bin/env node
/**
 * Converts all YAML port data files to a single JSON registry for web
 * consumption (spec v0.2.17 section 4.3.1: multi-port navigation).
 * Scans core/data/*.yaml and emits web/src/data/ports.json containing
 * every loaded port. Adding a port is a data edit: drop a YAML file in
 * core/data/ and it appears in the registry — no code change.
 * Usage: node scripts/convert_yaml_to_json.js
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const DATA_DIR = path.join(__dirname, '..', 'data');
const JSON_OUTPUT = path.join(__dirname, '..', '..', 'web', 'src', 'data', 'ports.json');

function main() {
  try {
    const outputDir = path.dirname(JSON_OUTPUT);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const yamlFiles = fs.readdirSync(DATA_DIR)
      .filter(f => f.endsWith('.yaml'))
      .sort();

    const ports = [];
    for (const file of yamlFiles) {
      const yamlContent = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
      const portData = yaml.load(yamlContent);
      if (!portData || !portData.fee_rules || !Array.isArray(portData.fee_rules)) {
        throw new Error(`Invalid port data in ${file}: fee_rules missing or not an array`);
      }
      if (!portData.metadata || !portData.metadata.id) {
        throw new Error(`Invalid port data in ${file}: metadata.id missing`);
      }
      ports.push(portData);
      console.log(`Loaded port ${portData.metadata.id} (${portData.metadata.name}) from ${file}: ${portData.fee_rules.length} fee rules`);
    }

    if (ports.length === 0) {
      throw new Error('No port YAML files found in ' + DATA_DIR);
    }

    // The registry is deterministic: same YAML inputs always produce identical
    // output, so the web bundle content hash is reproducible and a served
    // bundle can be matched to a commit (spec section 7 verification).
    const registry = { ports };
    const jsonContent = JSON.stringify(registry, null, 2);
    fs.writeFileSync(JSON_OUTPUT, jsonContent, 'utf8');
    console.log(`Successfully converted ${yamlFiles.length} port file(s) -> ${JSON_OUTPUT}`);
    console.log(`  Ports: ${ports.map(p => p.metadata.id).join(', ')}`);

    process.exit(0);
  } catch (err) {
    console.error('Conversion failed:', err.message);
    process.exit(1);
  }
}

main();
