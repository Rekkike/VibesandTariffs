// Cross-port functional-equivalence annotations (spec v0.3.3, item 2).
//
// The comparison view's family rows carry each port's own tariff
// terminology, so a shared label can mislead: HAM's "port dues" family
// (the HPA per-call port fee) and GOT's "port dues" family (the municipal
// per-call container vessel dues) occupy the same functional slot, while
// the German berth-dues lines (HHLA tonnage dues / Eurogate berthing) are
// a lay-time charge neither Swedish port levies, and the Sjofartsverket
// fairway dues have no Hamburg counterpart. The fix is annotation, not
// re-labelling: every note is stated as functional correspondence
// ("functionally corresponds to"), never as identity of amounts or labels;
// no figure moves, no label changes, no port's own terminology is altered.
//
// The pairs are verified against the archived tariff documents and the
// repo's pinned functional classification (the audit of record:
// docs/SCENARIO_LAYER_AUDIT.md item 3 — both directive-claimed pairs were
// dropped with reasons; only the verified three-slot map annotates).

export interface EquivalenceNote {
  text: string;
}

// The verified functional map, keyed by fee family. A family annotates when
// its rows at different ports fill the same functional slot under different
// tariff terminology, or when a function one port charges is levied
// elsewhere under a different family or not at all. The notes are
// family-scoped and stated as correspondence, never identity.
const FAMILY_EQUIVALENCE_NOTES: Record<string, EquivalenceNote> = {
  port_dues: {
    text:
      'Functional context: the per-call port/infrastructure charge — GOT\'s municipal container vessel dues, HAM\'s HPA Hafengeld, and HEL\'s per-GT port dues functionally correspond to each other (the port\'s own call charge). The German berth-dues lines (GT × lay time) are a separate time-based charge and correspond to no Swedish line; the Sjöfartsverket fairway dues have no counterpart at the German port. Functional mapping only — never identity of amounts or labels.'
  },
  vessel_fee: {
    text:
      'Functional context: the Swedish national vessel fee (fartygsavgift, per call by NT class) has no counterpart at the German port — no national waterway due is levied there. Functionally corresponds to nothing at the German port; stated so the cross-port figure is never mistaken for a like-for-like charge.'
  }
};

// Rule-id-keyed notes for the charge-type lines and specific families whose
// correspondence spans differently-named slots (the audit's verified map).
const RULE_EQUIVALENCE_NOTES: Record<string, EquivalenceNote> = {
  hhla_tonnage_dues: {
    text:
      'Functional context: a lay-time ship\'s due (GT × lay time at a berthed handling facility) — functionally corresponds to the Eurogate berthing charge (the same slot at the other German operator); neither Swedish port levies a berth-time ship\'s due in the container domain, so no Swedish figure corresponds.'
  },
  eurogate_berthing_charge: {
    text:
      'Functional context: a lay-time ship\'s due (GT × lay time at a berthed handling facility) — functionally corresponds to the HHLA tonnage dues (the same slot at the other German operator); neither Swedish port levies a berth-time ship\'s due in the container domain.'
  }
};

// The ports the verified map annotates (the audit's scope: the v0.3.3
// three-port comparison surface). The Swedish domestic expansion ports
// (Norrköping, Gävle, Norvik) do NOT receive the annotations this pass —
// a future verified equivalence audit extends the map with its own
// terminology verification per the v0.3.3 discipline; extending by
// default would assert correspondence no audit verified.
export const EQUIVALENCE_ANNOTATED_PORTS: ReadonlySet<string> = new Set([
  'gothenburg',
  'hamburg',
  'helsingborg'
]);

export function equivalenceNoteForFamily(family: string, portId?: string): EquivalenceNote | undefined {
  if (portId !== undefined && !EQUIVALENCE_ANNOTATED_PORTS.has(portId)) return undefined;
  return FAMILY_EQUIVALENCE_NOTES[family];
}

export function equivalenceNoteForRule(ruleId: string, portId?: string): EquivalenceNote | undefined {
  if (portId !== undefined && !EQUIVALENCE_ANNOTATED_PORTS.has(portId)) return undefined;
  return RULE_EQUIVALENCE_NOTES[ruleId];
}
