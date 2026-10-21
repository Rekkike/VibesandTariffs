/**
 * User-specified rate inputs (spec v0.11.0, user ruling 2026-10-21). A rate
 * the user enters is a call parameter, never a tariff figure and never an
 * estimated parameter. Blank is the honest "not entered" state, never a zero.
 * A valid entry is a finite number of at least zero; any other entry
 * (negative, non-numeric, not finite) is fail-closed: the state is 'invalid',
 * nothing fires, and the surfaces name the defect. Nothing is partially
 * applied and a blank never defaults to a published rate.
 */
import type { CallInput } from './types';

export type UserRateState = 'blank' | 'valid' | 'invalid';

export interface UserRate {
  state: UserRateState;
  value?: number;
  error?: string;
}

export function userSpecifiedRate(call: Partial<CallInput> | Record<string, unknown>, field: string, label: string): UserRate {
  const raw = (call as Record<string, unknown>)[field];
  if (raw === undefined || raw === null || raw === '') return { state: 'blank' };
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return { state: 'invalid', error: `${label} must be a number of zero or more; the entry is not applied.` };
  }
  if (raw < 0) {
    return { state: 'invalid', error: `${label} must not be negative (entered ${raw}); the entry is not applied.` };
  }
  return { state: 'valid', value: raw };
}
