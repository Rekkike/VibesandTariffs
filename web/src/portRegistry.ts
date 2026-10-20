import type { PortDefinition } from '@port-cost/core';
import { registerPortDefinition } from '@port-cost/core';
import portsRegistry from './data/ports.json';
import { resolveComparisonBasis } from './conversion';
import type { DeclaredRateRow } from './conversion';

// Loaded-port registry and per-port configuration registration (spec
// v0.2.60 decomposition): the module-scope port list, the
// registerPortDefinition loop, and the comparison-basis context -
// extracted from App.tsx verbatim.
// Registered ports: every port file in the registry; adding a port is a data
// edit (drop a YAML in core/data/), never a code change.
const REGISTERED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
// Hidden ports (spec v0.8.0, the cap-constant precedent class): the one
// web-layer exclusion constant every rendered surface derives through -
// the selection drawer, the comparison columns, print, and the
// cheapest-marker ranking. Presentation-only: no engine change, no core data
// change; a hidden port stays registered with the core lookups below and its
// core pins stay untouched. A hidden port is hidden, never deleted.
// Ruling of record (user ruling, 2026-10-20): Rotterdam is disabled from
// view. Reason: the core surface is incomplete - vessel-side handling is
// unpublished at every Rotterdam deep-sea operator - so the rendered default
// call (about 1.5 MSEK) is not a credible like-for-like comparison and
// undermines the believability of the app. Resume condition: only the user
// re-enables it; the expected vehicle is the Rotterdam terminal-layer
// completion pass (parked). The handlingBasis Rotterdam annotation and its
// containerThroughParts case stay in the code as the resume surface.
export const HIDDEN_PORT_IDS: ReadonlySet<string> = new Set(['rotterdam']);
// Loaded (rendered) ports: the registered ports less the hidden ones.
export const LOADED_PORTS: PortDefinition[] = REGISTERED_PORTS.filter(
  p => !HIDDEN_PORT_IDS.has(p.metadata.id)
);
// Per-port configuration registration (spec v0.2.59): the default-call,
// OPS-descriptor, and input-profile sections flow from each port's YAML
// through the registry; register them with the core lookups once at module
// scope, before any view computes a default call or renders a workspace.
// registerPortDefinition throws loudly on a port missing its sections -
// a broken port file fails at load, never at first use. Every registered
// port registers, hidden ones included (v0.8.0).
for (const p of REGISTERED_PORTS) {
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
