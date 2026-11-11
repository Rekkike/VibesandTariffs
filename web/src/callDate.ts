// Call-date input contract (spec v0.14.0, the A-01 remediation, user ruling
// 2026-11-11). The call date selects between a port's annual-window-gated
// rule and its year-round sibling (spec v0.4.3; Gavle's winter surcharge,
// 1 December to 30 April), so the date in use is an explicit, disclosed,
// user-controlled call parameter: the Date field defaults to today (the
// production defaultCall() stamp, untouched), and the comparison context
// strip and the paper header state the date in use.
//
// Validation is fail-loud per the house convention: an entry that is not a
// real calendar date in YYYY-MM-DD form is never silently substituted - it
// passes through to the engine unchanged (the engine's window predicates
// match no window on an unparseable date, so no date-window rule fires),
// and the input, the comparison context strip and the paper header all name
// the defect. Pure presentation/validation logic; never touches computation.

export type CallDateState = 'valid' | 'invalid' | 'blank';

export interface CallDateCheck {
  state: CallDateState;
  value: string; // the entered entry, verbatim (never substituted)
}

// A real calendar date in YYYY-MM-DD form (regex shape plus calendar
// validity, e.g. 2026-02-30 is invalid).
export function checkCallDate(raw: unknown): CallDateCheck {
  if (raw === undefined || raw === null || raw === '') return { state: 'blank', value: '' };
  const s = String(raw);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return { state: 'invalid', value: s };
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    return { state: 'invalid', value: s };
  }
  return { state: 'valid', value: s };
}

// The named defect for an entry that is not a usable date.
export function callDateDefectText(value: string): string {
  return `"${value}" is not a valid calendar date (YYYY-MM-DD) - it is not applied; no date-window rule fires`;
}

// The one-line disclosure rendered by the comparison context strip and the
// paper header: the date in use, or the named defect. Blank (cleared field)
// names its own state; the engine's fail-closed predicates govern either way.
export function callDateDisclosure(raw: unknown): string {
  const c = checkCallDate(raw);
  if (c.state === 'valid') return `Call date: ${c.value}`;
  if (c.state === 'blank') return 'Call date: not entered - no date-window rule fires';
  return `Call date: ${callDateDefectText(c.value)}`;
}

// The date fed to the engine through the single path. A valid entry passes
// through verbatim; an invalid or blank entry is fed as blank (not a date),
// which the engine's fail-closed window predicates treat as "no window" -
// so an invalid entry fires no date-window rule, exactly as the surfaces
// name it. The field never substitutes a different real date: the raw entry
// stays in the call state and the disclosure names the defect.
export function engineCallDate(raw: unknown): string {
  const c = checkCallDate(raw);
  return c.state === 'valid' ? c.value : '';
}
