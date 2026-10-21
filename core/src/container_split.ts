/**
 * Empty/full percentage split (spec v0.10.0, user rulings 2026-10-19 and
 * 2026-10-21). Two shared call inputs, container_empty_pct and
 * container_full_pct, entered once for the whole call. Both blank is the
 * all-loaded convention (every handled unit is a charged laden unit):
 * nothing moves. Both entered, integers 0-100 summing to exactly 100, derive
 * per size, over the whole call's handled units of that size (loaded plus
 * discharged):
 *
 *   laden = round-half-up(handled x full% / 100),  empty = handled - laden.
 *
 * Any other combination - one box alone, a sum other than 100, a value that
 * is not a whole number from 0 to 100 - is fail-closed: the state is
 * 'invalid', no charge responds (every rule prices exactly as with a blank
 * pair), and the surfaces show the validation error. Nothing is partially
 * applied. Round-half-up is the only rounding convention and the derived
 * counts are disclosed wherever the pair is shown.
 */
import type { CallInput } from './types';

export type ContainerSplitState = 'blank' | 'valid' | 'invalid';

export interface ContainerSizeSplit {
  handled: number; // loaded + discharged at this size
  laden: number;   // charged laden units (all handled units unless the pair is valid)
  empty: number;   // empty units (zero unless the pair is valid)
}

export interface ContainerSplit {
  state: ContainerSplitState;
  error?: string;
  emptyPct?: number;
  fullPct?: number;
  le20: ContainerSizeSplit;
  gt20: ContainerSizeSplit;
}

// Whole-unit round-half-up of handled x pct / 100, in exact integer
// arithmetic (no floating-point tie errors).
export function roundHalfUpShare(handled: number, pct: number): number {
  return Math.floor((2 * handled * pct + 100) / 200);
}

const isWholePct = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 100;

export function containerSplit(call: Partial<CallInput>): ContainerSplit {
  const handled20 = (call.containers_loaded_le20ft || 0) + (call.containers_discharged_le20ft || 0);
  const handled40 = (call.containers_loaded_gt20ft || 0) + (call.containers_discharged_gt20ft || 0);
  const allLaden = {
    le20: { handled: handled20, laden: handled20, empty: 0 },
    gt20: { handled: handled40, laden: handled40, empty: 0 }
  };
  const emptyRaw = call.container_empty_pct;
  const fullRaw = call.container_full_pct;
  const emptyBlank = emptyRaw === undefined || emptyRaw === null || (emptyRaw as unknown) === '';
  const fullBlank = fullRaw === undefined || fullRaw === null || (fullRaw as unknown) === '';
  if (emptyBlank && fullBlank) return { state: 'blank', ...allLaden };
  if (emptyBlank || fullBlank) {
    return {
      state: 'invalid',
      error: 'Enter both Empty containers % and Full containers %, or leave both blank: one box alone is not applied.',
      ...allLaden
    };
  }
  if (!isWholePct(emptyRaw) || !isWholePct(fullRaw)) {
    return {
      state: 'invalid',
      error: 'Empty containers % and Full containers % must be whole numbers from 0 to 100.',
      ...allLaden
    };
  }
  if (emptyRaw + fullRaw !== 100) {
    return {
      state: 'invalid',
      error: `Empty containers % and Full containers % must sum to exactly 100 (entered ${emptyRaw} + ${fullRaw} = ${emptyRaw + fullRaw}).`,
      ...allLaden
    };
  }
  const laden20 = roundHalfUpShare(handled20, fullRaw);
  const laden40 = roundHalfUpShare(handled40, fullRaw);
  return {
    state: 'valid',
    emptyPct: emptyRaw,
    fullPct: fullRaw,
    le20: { handled: handled20, laden: laden20, empty: handled20 - laden20 },
    gt20: { handled: handled40, laden: laden40, empty: handled40 - laden40 }
  };
}
