// Node-side port-data loaders (spec v0.2.59). The registry and lookups
// (port_data.ts) are dependency-free so the browser bundle can register
// from the generated registry; this module carries the fs/YAML loaders
// used by Node consumers (the core test suite, scripts) that read the
// port YAML directly. Never imported by the web - the fs import would
// break the browser bundle.
import { readFileSync, readdirSync } from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

import { registerPortDefinition } from './port_data';
import { PortDefinition } from './types';

/**
 * Loads one port YAML and registers its configuration sections.
 */
export function registerPortDataFromYaml(filePath: string): void {
  const yamlContent = readFileSync(filePath, 'utf8');
  const data = yaml.load(yamlContent) as PortDefinition;
  if (!data || !data.metadata || !data.metadata.id) {
    throw new Error(`registerPortDataFromYaml: ${filePath} carries no metadata.id`);
  }
  registerPortDefinition(data);
}

/**
 * Loads and registers every port file in a directory (core/data layout:
 * one YAML per port). Exchange-rate and vessel-library files are skipped
 * (no metadata.id + fee_rules pairing).
 */
export function loadAllPortData(directory: string): void {
  for (const file of readdirSync(directory)) {
    if (!file.endsWith('.yaml')) continue;
    const yamlContent = readFileSync(path.join(directory, file), 'utf8');
    const data = yaml.load(yamlContent) as PortDefinition;
    if (data && data.metadata && data.metadata.id && Array.isArray(data.fee_rules)) {
      registerPortDefinition(data);
    }
  }
}
