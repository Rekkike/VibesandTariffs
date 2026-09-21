#!/usr/bin/env node

/**
 * Converts YAML port data files to JSON for web consumption
 * Usage: node scripts/convert_yaml_to_json.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const YAML_SOURCE = path.join(__dirname, '..', 'data', 'gothenburg_2026.yaml');
const JSON_OUTPUT = path.join(__dirname, '..', '..', 'web', 'src', 'data', 'gothenburg_2026.json');

function main() {
  try {
    // Ensure output directory exists
    const outputDir = path.dirname(JSON_OUTPUT);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Read YAML
    const yamlContent = fs.readFileSync(YAML_SOURCE, 'utf8');
    const portData = yaml.load(yamlContent);

    // Validate
    if (!portData || !portData.fee_rules || !Array.isArray(portData.fee_rules)) {
      throw new Error('Invalid port data: fee_rules missing or not an array');
    }

    // Write JSON
    const jsonContent = JSON.stringify(portData, null, 2);
    fs.writeFileSync(JSON_OUTPUT, jsonContent, 'utf8');

    console.log(`Successfully converted ${YAML_SOURCE} -> ${JSON_OUTPUT}`);
    console.log(`  Rules: ${portData.fee_rules.length} fee rules`);
    console.log(`  Billers: ${portData.billers ? portData.billers.length : 0}`);
    
    process.exit(0);
  } catch (err) {
    console.error('Conversion failed:', err.message);
    process.exit(1);
  }
}

main();
