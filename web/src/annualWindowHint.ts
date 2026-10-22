// Date-field hint for a port whose pricing carries an annual date window
// (spec v0.11.3; fixed-date baselines and Gävle winter window disclosure,
// user ruling 2026-10-22). The call date selects between the base rule and
// its winter variant at the port that publishes a winter surcharge (the
// istillägg, 1 December to 30 April, +100 percent), so the Date field states
// the period and the effect. Published-rule content only. The hint is derived
// from the port's own data - the window declared on its date-conditioned
// rules - never from a port identifier: a port without such a window gets no
// hint.
import type { PortDefinition } from '@port-cost/core';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function annualWindowHint(port: PortDefinition): string | null {
  const rule = (port.fee_rules ?? []).find(r => r.applicable_conditions?.date_within_annual_window);
  const w = rule?.applicable_conditions?.date_within_annual_window;
  if (!w) return null;
  return (
    `Winter period: ${w.start_day} ${MONTHS[w.start_month - 1]} to ${w.end_day} ${MONTHS[w.end_month - 1]}. ` +
    'A call date inside this period prices the published winter surcharge (+100 % on the vessel-side hamnavgift, the doubled rate); ' +
    'a date outside it prices the base rate.'
  );
}
