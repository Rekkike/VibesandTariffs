// User-specified inputs disclosure (spec v0.11.0, user ruling 2026-10-21).
// A user-specified rate is a call parameter, not an estimated parameter: it
// carries no est. badge and never moves the estimated-parameters subtotal.
// The disclosure is the entered value stated in the comparison context strip
// and the paper header (the empty/full disclosure precedent). Blank states
// nothing; an invalid entry names the defect and is not applied.
import { userSpecifiedRate } from '@port-cost/core';
import type { PortDefinition } from '@port-cost/core';

export interface UserSpecifiedDisclosureItem {
  portId: string;
  portName: string;
  input: string;
  label: string;
  state: 'valid' | 'invalid';
  text: string;
}

// Input hints (spec v0.11.0, the tug-input precedent): a suggestion only,
// never a prefill. The published rates stay recorded in the Gothenburg
// extraction reference section 8; nothing here is read by any calculation.
// v0.11.2 (GOT lift and delivery rate-text removal, user ruling 2026-10-21):
// the hints no longer state the recorded figures anywhere in the app; an
// entered value is the user's own figure and still discloses as entered.
const HINTS: Record<string, string> = {
  got_lift_cost:
    'Blank = not entered; no lift is priced. Suggestion only, never a prefill: the published ordinary-time rate is recorded in the Gothenburg extraction reference section 8. Prices on the call\'s moves (loaded + discharged).',
  got_delivery_cost:
    'Blank = not entered; no landside leg is added. Applies only with the container-through toggle ON, under the selected hinterland mode. Suggestion only, never a prefill: the published receiving/delivering rate is recorded in the Gothenburg extraction reference section 8.'
};

export const userSpecifiedHint = (input: string): string | undefined => HINTS[input];

const fmt = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 4 });

export function userSpecifiedDisclosures(
  ports: PortDefinition[],
  call: Record<string, unknown>,
  perPortOverrides?: Record<string, Record<string, unknown>>
): UserSpecifiedDisclosureItem[] {
  const items: UserSpecifiedDisclosureItem[] = [];
  for (const port of ports) {
    const spec = port.user_specified_inputs;
    if (!spec) continue;
    const merged: Record<string, unknown> = { ...call, ...(perPortOverrides?.[port.metadata.id] ?? {}) };
    const entries = [
      ...(spec.lines ?? []).map(l => ({ input: l.input, label: l.label, unit: l.unit, currency: l.currency })),
      ...(spec.legs ?? []).map(l => ({ input: l.input, label: l.label, unit: l.unit, currency: l.currency }))
    ];
    for (const e of entries) {
      const rate = userSpecifiedRate(merged, e.input, e.label);
      if (rate.state === 'blank') continue;
      items.push({
        portId: port.metadata.id,
        portName: port.metadata.name,
        input: e.input,
        label: e.label,
        state: rate.state,
        text: rate.state === 'valid'
          ? `${fmt(rate.value!)} ${e.unit} (entered, user-specified)`
          : `not applied - ${rate.error}`
      });
    }
  }
  return items;
}
