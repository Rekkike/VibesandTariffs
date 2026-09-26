// NT class-boundary notice (spec v0.3.0, the NT-convention re-derivation):
// a vessel whose NT is an estimate (flagged in the library) AND whose
// formalized error band (0.40-0.58 x GT, the convention band extended over
// the observed container ratios) spans a Sjofartsverket class boundary
// renders a visible sensitivity notice at both Swedish ports: the fee class
// is uncertain; the honest figure shows the class actually used, and the
// alternative class, disclosed.
//
// The notice is data-driven: it computes from the estimate, the band, and
// the engine's own class function - never a port-id or vessel-id string
// (the v0.2.70 data-derived-boundary precedent). A confirmed NT (the flag
// retired) never renders it; an observed value above the boundary by a
// comfortable margin does not either (the placement basis is the
// observation, not the generic band) - the band test only decides whether
// a boundary is reachable inside the estimate's honest range.
import { getNetTonnageClass } from '@port-cost/core';
import type { PortDefinition } from '@port-cost/core/types';

export const NT_ESTIMATE_BAND = { low: 0.4, high: 0.58 } as const;
// An observed estimate (a single-aggregator particular) uses a tighter band
// around the observation (±10 percent) — the observation is the placement
// basis, not the type-wide ratio band (the audit §4.3 adjudication).
export const NT_OBSERVED_BAND = { low: 0.9, high: 1.1 } as const;

// A port carries NT-keyed fees exactly when its own rules carry nt_class
// conditions (the Sjofartsverket class-keyed tables) - data-derived, never
// a port-id string: GOT and HEL carry them, HAM carries none, and a future
// port with class-keyed fees gets the notice for free.
export const portBillsOnNtClasses = (port: PortDefinition): boolean =>
  (port.fee_rules ?? []).some(
    rule => (rule.applicable_conditions as { nt_class?: number } | undefined)?.nt_class !== undefined
  );

export interface NtBoundaryNotice {
  usedClass: number;
  alternativeClass: number;
  bandLow: number;
  bandHigh: number;
}

// Returns the notice when the NT estimate's error band spans a class
// boundary (a different class is plausible inside the band), null when the
// placement is safe. The alternative is the class at the band's far side
// from the used class.
export function ntBoundaryNoticeFor(
  ntEstimated: boolean,
  nt: number | undefined,
  gt: number | undefined,
  ntObserved = false
): NtBoundaryNotice | null {
  if (!ntEstimated || typeof nt !== 'number' || typeof gt !== 'number' || gt <= 0) {
    return null;
  }
  // An observed estimate bands around the observation (±10 percent); a
  // pure authored estimate bands over the type ratio (0.40–0.58 × GT).
  const bandLow = ntObserved
    ? Math.round(nt * NT_OBSERVED_BAND.low)
    : Math.round(gt * NT_ESTIMATE_BAND.low);
  const bandHigh = ntObserved
    ? Math.round(nt * NT_OBSERVED_BAND.high)
    : Math.round(gt * NT_ESTIMATE_BAND.high);
  const usedClass = getNetTonnageClass(nt);
  const lowClass = getNetTonnageClass(bandLow);
  const highClass = getNetTonnageClass(bandHigh);
  if (lowClass === highClass) return null;
  // The alternative class is the far end of the band: the estimate sits in
  // one class; the band reaches another.
  const alternativeClass = usedClass === lowClass ? highClass : lowClass;
  if (alternativeClass === usedClass) return null;
  return { usedClass, alternativeClass, bandLow, bandHigh };
}
