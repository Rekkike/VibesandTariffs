// Audit script: item 0.1 (inventory) and item 0.2 (equivalence verification).
// Presentation-normalization audit, v0.4.4 pass. Read-only.
import * as path from 'path';
import { loadAndValidatePort } from '../src/loader';
import { calculatePortCallCost } from '../src/engine';
import { DEFAULT_VESSEL, defaultCall } from '../src/defaults';
import { registerPortDataFromYaml } from '../src/port_data_fs';
import { PortDefinition } from '../src/types';

const DATA_DIR = path.join(__dirname, '..', 'data');
const PORTS = ['gothenburg', 'helsingborg', 'gavle', 'norrkoping', 'norvik'];
const PREFIX: Record<string, string> = {
  gothenburg: 'sjofartsverket_',
  helsingborg: 'sfv_',
  gavle: 'gvh_sfv_',
  norrkoping: 'pon_sfv_',
  norvik: 'snv_sfv_'
};

const defs: Record<string, PortDefinition> = {};
for (const p of PORTS) {
  registerPortDataFromYaml(path.join(DATA_DIR, `${p}_2026.yaml`));
  defs[p] = loadAndValidatePort(path.join(DATA_DIR, `${p}_2026.yaml`)).port;
}

function kindOf(id: string, prefix: string): string | null {
  if (!id.startsWith(prefix)) return null;
  const rest = id.slice(prefix.length);
  const vm = rest.match(/^vessel_fee_class(\d+)_csi_([a-e])$/);
  if (vm) return `vessel_fee_class${vm[1]}_csi_${vm[2]}`;
  const rm = rest.match(/^readiness_fee_class(\d+)$/);
  if (rm) return `readiness_fee_class${rm[1]}`;
  const om = rest.match(/^ordering_fee_(under_1h|1_2h|2_3h|3_4h|4_5h)$/);
  if (om) return `ordering_fee_${om[1]}`;
  return rest;
}


function norm(rule: any) {
  const sr = (rule.source_reference || {}) as any;
  return {
    fee_family: rule.fee_family,
    biller: rule.biller,
    name: rule.name,
    description: rule.description,
    rate_structure: rule.rate_structure,
    applicable_conditions: rule.applicable_conditions,
    source: { page: sr.page, clause: sr.clause, document_name: sr.document_name }
  };
}

const canonMap: Record<string, any> = {};
for (const r of defs.gothenburg.fee_rules) {
  const k = kindOf(r.id, 'sjofartsverket_');
  if (k) canonMap[k] = r;
}

console.log('=== ITEM 0.1 INVENTORY ===');
console.log('GOT national rule count:', Object.keys(canonMap).length);

for (const p of ['helsingborg', 'gavle', 'norrkoping', 'norvik']) {
  const diffs: any[] = [];
  let count = 0;
  for (const r of defs[p].fee_rules) {
    const k = kindOf(r.id, PREFIX[p]);
    if (!k) continue;
    count++;
    const c = canonMap[k];
    if (!c) { diffs.push({ id: r.id, kind: k, type: 'NO_GOT_EQUIVALENT' }); continue; }
    const a = norm(r), b = norm(c);
    for (const field of Object.keys(a)) {
      if (JSON.stringify(a[field]) !== JSON.stringify(b[field])) {
        diffs.push({ id: r.id, kind: k, field, local: a[field], got: b[field] });
      }
    }
  }
  console.log(`\n--- ${p}: ${count} national rules; ${diffs.length} field differences vs GOT ---`);
  for (const d of diffs) console.log(JSON.stringify(d));
}

console.log('\n=== CARGO-DUES FAMILY MAPPING ===');
const CARGO_IDS = ['poh_cargo_due', 'gvh_yilport_cargo_due', 'pon_cargo_due_20ft', 'pon_cargo_due_gt20ft', 'snv_pos_cargo_due_le20ft', 'snv_pos_cargo_due_gt20ft'];
for (const p of PORTS) {
  for (const r of defs[p].fee_rules) {
    if (CARGO_IDS.includes(r.id)) {
      console.log(`${p} ${r.id}: fee_family=${r.fee_family} name=${JSON.stringify(r.name)}`);
    }
  }
}

console.log('\n=== ITEM 0.2 EQUIVALENCE ===');
function sfvBlock(result: any) {
  const b = result.billers.find((x: any) => /Sjöfartsverket/i.test(x.biller));
  return b ? b.fees.filter((f: any) => f.amount !== 0).map((f: any) => `${f.fee_rule_id}=${f.amount.toFixed(2)}`) : [];
}
for (const p of PORTS) {
  const res = calculatePortCallCost(defs[p], { vessel: DEFAULT_VESSEL, call: defaultCall(p) });
  console.log(`\n${p}: grand=${res.total.toFixed(2)}`);
  for (const f of sfvBlock(res)) console.log('  ', f);
}
console.log('\nEquivalence check: active national lines per port (same DEFAULT_VESSEL and per-port default call).');
