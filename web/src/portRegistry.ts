import type { PortDefinition } from '@port-cost/core';
import { registerPortDefinition } from '@port-cost/core';
import portsRegistry from './data/ports.json';
import { resolveComparisonBasis } from './conversion';
import type { DeclaredRateRow } from './conversion';

// Loaded-port registry and per-port configuration registration (spec
// v0.2.60 decomposition): the module-scope port list, the
// registerPortDefinition loop, and the comparison-basis context -
// extracted from App.tsx verbatim.
// Loaded ports; adding a port is a data edit (drop a YAML in core/data/), never a code change
export const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
// Per-port configuration registration (spec v0.2.59): the default-call,
// OPS-descriptor, and input-profile sections flow from each port's YAML
// through the registry; register them with the core lookups once at module
// scope, before any view computes a default call or renders a workspace.
// registerPortDefinition throws loudly on a port missing its sections -
// a broken port file fails at load, never at first use.
for (const p of LOADED_PORTS) {
  registerPortDefinition(p);
}
// Comparison basis context (spec v0.2.59): the basis currency and the
// declared conversion paths are data (the registry's exchange_rates, from
// core/data/exchange_rates.yaml). Every conversion and ranking in the
// comparison flows through this context; a port whose currency has no
// declared path fails loudly, never ranks on raw amounts.
export const comparisonBasisContext = resolveComparisonBasis(
  ((portsRegistry as any).exchange_rates ?? []) as DeclaredRateRow[]
);
