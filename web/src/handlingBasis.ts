// Handling-basis annotations and the compare container-through surface
// (spec v0.4.2, items 2 and 3). A new annotation family - it does NOT extend
// the cargo-family equivalence annotations (equivalenceNotes.ts); those
// state functional correspondence, these state each port's own published
// handling basis, verbatim from the authorities of record.
//
// Authority: docs/TERMINAL_BASIS_COMPARABILITY_AUDIT.md section 2 (the
// six-port basis table, verified against the archived documents - the
// table is itself a verified artifact; future terminal-operator documents,
// APMT for GOT included, enter against it).
//
// The basis wording is presentation-only: no figure moves, no label
// changes, and the default view renders byte-identically (the annotations
// ride the terminal-handling cells; the container-through toggle is
// default-off and adds nothing when off).

export type HinterlandMode = 'truck' | 'rail';

export interface HandlingBasisAnnotation {
  // The port's published handling basis, verbatim, with its citation.
  text: string;
}

// Item 2: every port's handling basis, verbatim from the audit's table.
// "Not published" is always available and never rendered as a zero; a gap
// is a gap notice, never a basis claim.
export const HANDLING_BASIS_ANNOTATIONS: Record<string, HandlingBasisAnnotation> = {
  gothenburg: {
    text:
      'Handling basis: single per-unit charge; no modality distinction and no separately priced legs published; scope of the charge not stated in the document. Verified against the archived APMT Terminal Tariff 2026 (June revision, §1.1, per unit 377/535 SEK) and its Terms of Business v31 March 2025 (the legal wrapper the tariff’s own §8 incorporates): the tariff’s export/import entries are storage-clock calculation rules, not leg prices, and its §4.1 538 SEK figure is a dangerous-goods receipt/delivery surcharge. The bundled reading (one figure covering the lift regardless of modality) is a reasonable inference, labeled as inference pending wording from APMT — the document itself states no scope.'
  },
  hamburg: {
    text:
      'Handling basis: vessel-to-quay only. Eurogate ch. 5 covers "Loading/discharging from/to main vessel, feeder vessel or barge" (5.1.1, 358.00 EUR per container); receiving and delivery from/to rail/truck is a separate 152.00 EUR per movement (ch. 6.1.1) - never included in the waterside figure.'
  },
  helsingborg: {
    text:
      'Handling basis: vessel-to-place-of-rest. "Handling full or empty units to/from vessels to/from \'Place of rest\' at the West Harbour. SEK per unit 890.00" (tariff p.7). The landside legs are separately published: truck 890.00, train incl. shunting 1,110.00 SEK per unit.'
  },
  gavle: {
    text:
      'Handling basis: bundled (container-through). "Includes lift off vessel, train or truck into terminal and lift to vessel, train or truck out of terminal. Hatch covers and twist-lock handling is included" (Yilport 2026 tariff section 4.1) - one rate both directions; it was always the through figure.'
  },
  norrkoping: {
    text:
      'Handling basis: fully leg-priced. Vessel lift to/from vessel 855/1,051/1,249/1,283 SEK per unit (20\'/30\'/40\'/45\'); rail lift to/from train 367/453/526/573; truck gate handling (lift to/from truck, including a visual inspection of the unit\'s outside and seal) 479/509/546/546 (tariff pp.14-15).'
  },
  norvik: {
    text:
      'Handling basis: asymmetric. Export: "ISO containers receiving container to stack including single lift to vessel" 2,012 kr - vessel-side, no road leg. Import: "lifted from vessel, received into stack, and loaded to road transport" 2,012 kr - the road leg is bundled on the import side only. Rail separately priced: container loaded to/from rail stack including receiving, lifts and transfer to train 1,300 kr (trailer 1,575 kr).'
  },
  rotterdam: {
    text:
      'Handling basis: not published in the archived record. The deep-sea container terminal operators at Maasvlakte bill handling separately from Havenbedrijf Rotterdam N.V.\u2019s tariff \u2014 R1\u2019s own scope statement (Article 3) limits the General Terms and Conditions to Port Dues, Inland Port Dues and the Waste fee, and R3\u2019s third-party schedules (Tariffs of Third Parties 2026) price towage, pilotage and the KRVE boatmen, never stevedoring. No rate, no basis, and no scope is published for container handling in any archived document; the cost is excluded from the call total and carried as the notice line only \u2014 never a zero, never an invented figure.'
  }
};

export function handlingBasisAnnotationFor(portId: string): HandlingBasisAnnotation | undefined {
  return HANDLING_BASIS_ANNOTATIONS[portId];
}

// Item 3: the container-through computation. Given the selected hinterland
// mode, each unbundled port's published landside leg is added to the
// through figure; ports publishing only one mode's leg show "not
// published" for the other - never a zero; the bundled port (Gavle) shows
// its unchanged rate - it was always the through figure (never
// double-counted).
export interface ContainerThroughPart {
  portId: string;
  // The published landside-leg figure added for the selected mode, in the
  // port's native currency; null when the port's documents do not publish
  // the leg for the selected mode.
  addedAmount: number | null;
  // Why the part reads as it does - the basis wording and the citation.
  note: string;
  // True when the port's handling rate is already the through figure
  // (bundled): nothing is added and the note says so.
  bundled: boolean;
}

// The published landside legs, per port and mode (SEK unless stated). The
// unit convention: every container handled by the call (loaded +
// discharged) takes the landside leg once - the same per-unit basis as the
// handling lines; the call is never re-profiled.
export function containerThroughParts(
  portId: string,
  mode: HinterlandMode,
  le20ftUnits: number,
  gt20ftUnits: number
): ContainerThroughPart {
  switch (portId) {
    case 'gavle':
      return {
        portId,
        addedAmount: null,
        bundled: true,
        note:
          'Yilport\'s throughput rate is bundled - "lift off vessel, train or truck into terminal and lift to vessel, train or truck out of terminal" (section 4.1) - it was always the through figure; nothing is added (never double-counted).'
      };
    case 'norrkoping': {
      if (mode === 'truck') {
        const added = 479 * le20ftUnits + 546 * gt20ftUnits;
        return {
          portId,
          addedAmount: added,
          bundled: false,
          note:
            'Truck gate handling added per unit (20\' 479, >20\' 546 SEK; tariff p.15 "Lift to/from truck, including a visual inspection of the units outsides and seal"): ' +
            `479 x ${le20ftUnits} + 546 x ${gt20ftUnits} = ${added} SEK.`
        };
      }
      const added = 367 * le20ftUnits + 526 * gt20ftUnits;
      return {
        portId,
        addedAmount: added,
        bundled: false,
        note:
          'Rail lift added per unit (20\' 367, >20\' 526 SEK; tariff p.14 "LIFT TO/FROM TRAIN"): ' +
          `367 x ${le20ftUnits} + 526 x ${gt20ftUnits} = ${added} SEK.`
      };
    }
    case 'helsingborg': {
      if (mode === 'truck') {
        const added = 890 * (le20ftUnits + gt20ftUnits);
        return {
          portId,
          addedAmount: added,
          bundled: false,
          note:
            'Delivery/receiving truck added per unit (890.00 SEK; tariff p.7 "Handling full or empty units to/from \'Place of Rest\' to/from the Truck"): ' +
            `890 x ${le20ftUnits + gt20ftUnits} = ${added} SEK.`
        };
      }
      const added = 1110 * (le20ftUnits + gt20ftUnits);
      return {
        portId,
        addedAmount: added,
        bundled: false,
        note:
          'Delivery/receiving train incl. shunting added per unit (1,110.00 SEK; tariff p.7): ' +
          `1 110 x ${le20ftUnits + gt20ftUnits} = ${added} SEK.`
      };
    }
    case 'norvik': {
      if (mode === 'truck') {
        return {
          portId,
          addedAmount: null,
          bundled: false,
          note:
            'Nothing added: the import road leg is already part of Hutchison\'s published unit rate ("lifted from vessel, received into stack, and loaded to road transport" - never double-counted) and the export road leg is not published in the document.'
        };
      }
      const added = 1300 * (le20ftUnits + gt20ftUnits);
      return {
        portId,
        addedAmount: added,
        bundled: false,
        note:
          'Rail handling added per container (1,300 kr; Hutchison price list p.6 "Container loaded to/from rail stack including Receiving, Lifts and transfer to train 1300 kr"; the trailer line 1,575 kr has no trailer-unit input in the container model): ' +
          `1 300 x ${le20ftUnits + gt20ftUnits} = ${added} kr.`
      };
    }
    case 'hamburg': {
      // The 152.00 EUR movement is published for rail/truck receiving and
      // delivery alike (ch. 6.1) - the same figure for both modes.
      const added = 152 * (le20ftUnits + gt20ftUnits);
      return {
        portId,
        addedAmount: added,
        bundled: false,
        note:
          'Receiving and delivery from/to rail/truck added per movement (152.00 EUR; Eurogate Prices and Conditions ch. 6.1.1): ' +
          `152 x ${le20ftUnits + gt20ftUnits} = ${added} EUR (converted at the pinned rate in this view).`
      };
    }
    case 'gothenburg':
      return {
        portId,
        addedAmount: null,
        bundled: false,
        note:
          'Not published: the archived APMT Terminal Tariff 2026 (June revision) and its Terms of Business publish no separately priced landside leg — the tariff’s export/import entries are storage-clock calculation rules, not leg prices, and its §4.1 538 SEK figure is a dangerous-goods receipt/delivery surcharge — and the handling basis itself is not stated in the document. Not published is never rendered as a zero.'
      };
    case 'rotterdam':
      return {
        portId,
        addedAmount: null,
        bundled: false,
        note:
          'Not published: no handling rate of any basis exists in the archived record — the Maasvlakte deep-sea terminal operators bill handling separately from the port authority’s tariff (R1 Article 3 scopes the General Terms and Conditions to port dues, inland port dues and the waste fee; R3’s third-party schedules price towage, pilotage and mooring, never stevedoring). No figure is added and none is invented; not published is never rendered as a zero.'
      };
    default:
      return {
        portId,
        addedAmount: null,
        bundled: false,
        note: 'Not published at this port.'
      };
  }
}

// The disclosure and the billing footnote render once with the toggle.
// Naming decision, recorded: the industry term "door to door" appears
// nowhere - it covers first/last-mile road haulage, which no figure here
// includes; the surface states exactly what it adds instead.
export const CONTAINER_THROUGH_DISCLOSURE =
  'Includes terminal handling plus the published leg to truck gate or rail stack where the port\'s documents publish it; last-mile road haulage is not included at any port.';
export const CONTAINER_THROUGH_BILLING_FOOTNOTE =
  'At some terminals the landside leg is billed to the landside party rather than the carrier; it is included here because the cost of moving the container through the port is real regardless of which party pays.';
