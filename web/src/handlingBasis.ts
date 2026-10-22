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
// The basis wording is presentation-only: no label changes, and the default
// view renders byte-identically (the annotations ride the terminal-handling
// cells; the container-through toggle is default-off and adds nothing when
// off). Design reversal (spec v0.9.0, user ruling 2026-10-21; supersedes the
// v0.4.2 presentation-only contract for the toggle): with the toggle ON each
// port's published landside leg is added to its Grand Total at the
// view/model layer.

import { userSpecifiedRate } from '@port-cost/core';

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
      'The lift amount is the user-specified Cost per lift input (blank = not priced). The landside receiving/delivering leg is billed separately per unit (the container-through toggle); its amount is the user-specified Delivery input (blank = not added).'
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
  bremerhaven: {
    text:
      'Handling basis: vessel-to-quay only at the default terminal, EUROGATE CTB. Eurogate Prices and Conditions ch. 5.1 "Loading/discharging from/to main vessel, feeder vessel or barge" (5.1.1, 358.00 EUR per container); receiving and delivery from/to rail/truck is a separate 152.00 EUR per movement (ch. 6.1.1). The NTB variant’s reference tariff prices receipt/delivery at 145.00 EUR per container (ch. 6.1.1), published but not reflected in the container-through figure, which carries the default terminal’s leg.'
  },
  aarhus: {
    text:
      'Handling basis: vessel move with separately priced gate legs. APMT Aarhus 2026 tariff §2.1 "Load or Discharge Move", full/empty per container 1,105.00 DKK (vessel side); the landside legs are separately published: §4.1 "Gate Move Truck" ("Full or empty including horizontal move from truck to yard/stack or vice versa") 338.00 DKK and §4.2 "Gate Move Rail" ("Loading/unloading of railway wagons") 414.00 DKK per container.'
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
  // Spec v0.11.0: a user-specified leg (Gothenburg Delivery) that is blank
  // reads 'not_entered' and an invalid entry reads 'invalid' (fail-closed);
  // neither adds anything and neither reads as "not published".
  status?: 'not_entered' | 'invalid';
}

// The published landside legs, per port and mode (SEK unless stated). The
// unit convention: every container handled by the call (loaded +
// discharged) takes the landside leg once - the same per-unit basis as the
// handling lines; the call is never re-profiled. The Gothenburg leg is the
// user-specified Delivery input (spec v0.11.0, passed as deliveryRaw, the
// call's got_delivery_cost for that port).
export function containerThroughParts(
  portId: string,
  mode: HinterlandMode,
  le20ftUnits: number,
  gt20ftUnits: number,
  deliveryRaw?: unknown
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
      // Size convention (verified v0.8.0 against tariff pp.14-15): the
      // over-20-foot class takes the 40-foot figure; the 30-foot (truck 509,
      // rail 453) and 45-foot (truck 546, rail 573) variants are
      // unrepresentable in the two-size model.
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
          'Rail handling added per container (1,300 kr; Hutchison price list p.4 "Container loaded to/from rail stack including Receiving, Lifts and transfer to train 1300 kr"; the trailer line 1,575 kr has no trailer-unit input in the container model): ' +
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
    case 'bremerhaven': {
      // v0.8.0 (Unit 3d, the Hamburg precedent per the ruling): the default
      // terminal's leg, EUROGATE CTB 152.00 EUR per movement (Eurogate P&C
      // ch. 6.1.1), for both modes. The NTB variant's 145.00 EUR (reference
      // tariff ch. 6.1.1) is published but not reflected: this function
      // receives no terminal operator (terminal-aware legs are queued).
      const added = 152 * (le20ftUnits + gt20ftUnits);
      return {
        portId,
        addedAmount: added,
        bundled: false,
        note:
          'Receiving and delivery from/to rail/truck added per movement at the default terminal, EUROGATE CTB (152.00 EUR; Eurogate Prices and Conditions ch. 6.1.1); the NTB variant’s published 145.00 EUR (reference tariff ch. 6.1.1) is not reflected: ' +
          `152 x ${le20ftUnits + gt20ftUnits} = ${added} EUR.`
      };
    }
    case 'aarhus': {
      // v0.8.0 (Unit 3c): the published gate legs replace the silent default
      // (APMT Aarhus 2026 tariff §4.1 truck 338.00, §4.2 rail 414.00 DKK per
      // container). Native DKK, rendered in the port's own currency like
      // Hamburg's EUR leg.
      const rate = mode === 'truck' ? 338 : 414;
      const added = rate * (le20ftUnits + gt20ftUnits);
      return {
        portId,
        addedAmount: added,
        bundled: false,
        note:
          (mode === 'truck'
            ? 'Gate move truck added per container (338.00 DKK; APMT Aarhus 2026 tariff §4.1 "Full or empty including horizontal move from truck to yard/stack or vice versa"): '
            : 'Gate move rail added per container (414.00 DKK; APMT Aarhus 2026 tariff §4.2 "Loading/unloading of railway wagons"): ') +
          `${rate} x ${le20ftUnits + gt20ftUnits} = ${added} DKK.`
      };
    }
    case 'gothenburg': {
      // v0.11.0: the gated landside leg (receiving/delivering, the same
      // figure for truck and rail) is the user-specified Delivery input -
      // recorded in GOTHENBURG_EXTRACTION_REFERENCE.md section 8, never
      // encoded. Blank adds nothing (not entered); an invalid entry is
      // fail-closed and names the defect.
      const delivery = userSpecifiedRate({ got_delivery_cost: deliveryRaw }, 'got_delivery_cost', 'Delivery');
      if (delivery.state === 'blank') {
        return {
          portId,
          addedAmount: null,
          bundled: false,
          status: 'not_entered',
          note: 'Delivery not entered: enter the Delivery cost per unit at Gothenburg to add the landside leg.'
        };
      }
      if (delivery.state === 'invalid') {
        return {
          portId,
          addedAmount: null,
          bundled: false,
          status: 'invalid',
          note: `Delivery not applied - ${delivery.error}`
        };
      }
      const units = le20ftUnits + gt20ftUnits;
      const added = Math.round(delivery.value! * units * 100) / 100;
      return {
        portId,
        addedAmount: added,
        bundled: false,
        note:
          `Delivery added per unit (user-specified, ${delivery.value!.toLocaleString('en-US', { maximumFractionDigits: 4 })} SEK): ` +
          `${delivery.value!.toLocaleString('en-US', { maximumFractionDigits: 4 })} x ${units} = ${added.toLocaleString('en-US', { maximumFractionDigits: 2 })} SEK.`
      };
    }
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
  'Includes terminal handling plus the published leg to truck gate or rail stack where the port\'s documents publish it; last-mile road haulage is not included at any port. With this comparison on, each port\'s published landside leg is included in its Grand Total and the ranking follows the through totals.';
export const CONTAINER_THROUGH_BILLING_FOOTNOTE =
  'At some terminals the landside leg is billed to the landside party rather than the carrier; it is included here because the cost of moving the container through the port is real regardless of which party pays.';
