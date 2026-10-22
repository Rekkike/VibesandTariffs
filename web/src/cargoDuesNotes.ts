// Cargo dues notes (spec v0.11.4; comparison wording honesty, user ruling
// 2026-10-22). A note family parallel to the handling-basis annotations
// (handlingBasis.ts): keyed to the Cargo dues charge-type line, one entry per
// port that needs it. The Gothenburg entry carries the placement of the
// published goods charge: it is a cargo due carried on the Cargo dues line,
// not handling. The wording quotes the archived tariff citation the earlier
// handling annotation carried; no new figure is introduced. Comparison screen
// only (the handling-annotation print precedent stands: the print surface
// does not carry these notes).
export interface CargoDuesNote {
  text: string;
}

export const CARGO_DUES_NOTES: Record<string, CargoDuesNote> = {
  gothenburg: {
    text:
      'The published goods charge — the archived APMT Terminal Tariff 2026 (June revision) §1, Terminal Charges on goods, 377/535 SEK per unit — is a cargo due carried on the Cargo dues line, not handling.'
  }
};

export function cargoDuesNoteFor(portId: string): CargoDuesNote | undefined {
  return CARGO_DUES_NOTES[portId];
}
