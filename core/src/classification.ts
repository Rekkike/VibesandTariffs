// Functional classification of fee rules (spec v0.2.30): every rule is
// assigned exactly one function from the closed set below, derived from the
// tariff documents with the existing source-reference discipline. The
// classification drives the vessel-access aggregate and the cross-country
// comparability note; it never changes an amount.
//
// The closed set of functions:
//   berth_terminal_infrastructure — dues for the vessel\'s use of the port's
//     berths/terminal/quay infrastructure (municipal port dues, HPA
//     Hafengeld, HHLA tonnage dues "for the use of a quayside cargo handling
//     facility", the Hafenfonds port-dues surcharge, berth fees, lay-up).
//   waterway_fairway_access — dues funding the fairway/waterway access the
//     call requires (Sweden: Sjöfartsverket fartygsavgift; pilotage is
//     classified separately as a purchased nautical service, matching the
//     tariff documents' own separation of lotsavgift from farledsavgift).
//   readiness_safety_capacity — per-call fees maintaining standby/safety
//     capacity (Sweden: Sjöfartsverket beredskapsavgift; port security fees
//     where the tariff states an ISPS safety purpose).
//   cargo_throughput_levy — per-unit charges levied on cargo throughput
//     (terminal handling, stevedoring, HHLA security per container, cargo
//     dues per unit, godsavgift-class cargo fees, storage, yard surcharges).
//   purchased_service — charges for a service actually purchased on this
//     call (pilotage, towage, gangway and supervision, waste disposal,
//     fresh water, OPS connection, ancillary services, hatch-cover and
//     gearbox handling).
//   waste_environmental — environmental-dimension charges (MARPOL waste
//     fees, environmental surcharges such as Helsingborg's EES).
//
//   Port-access bills excluded by design from the vessel-access aggregate:
//   cargo_throughput_levy, purchased_service, waste_environmental.
export type FunctionalClass =
  | 'berth_terminal_infrastructure'
  | 'waterway_fairway_access'
  | 'readiness_safety_capacity'
  | 'cargo_throughput_levy'
  | 'purchased_service'
  | 'waste_environmental';

export const FUNCTIONAL_CLASSES: FunctionalClass[] = [
  'berth_terminal_infrastructure',
  'waterway_fairway_access',
  'readiness_safety_capacity',
  'cargo_throughput_levy',
  'purchased_service',
  'waste_environmental'
];

export const VESSEL_ACCESS_CLASSES: FunctionalClass[] = [
  'berth_terminal_infrastructure',
  'waterway_fairway_access',
  'readiness_safety_capacity'
];

export interface FunctionalClassInfo {
  functional_class: FunctionalClass;
  basis_note: string;
  source: string;
}

// Per-port rule-id classification. Completeness is enforced by tests: every
// rule in every port file must have exactly one entry, so a new rule or an
// id change fails the suite rather than silently falling out of the
// aggregate (spec v0.2.30 classification contract).
//
// Gothenburg 2026 (sources: Port of Gothenburg Port Tariff 2026 §2.1
// municipal port dues; Sjöfartsverket price list 2026 — fartygsavgift p.3,
// beredskapsavgift p.4, godsavgift p.5, pilotage p.4, ordering fee p.4;
// APMT Terminal Tariff 2026 §4 handling, §3 security).
const got: Record<string, FunctionalClassInfo> = {
  gothenburg_mooring_notice: {
    functional_class: 'purchased_service',
    basis_note: 'Mooring boatmen service — AB Klippans Båtmansstation holds the city-lease mooring concession; mandatory per the Sjöfartsverket båtmän instruction (obligatorisk for LOA ≥ 80 m and all Energy Harbour vessels); billed separately from the Port of Gothenburg tariff; no published rate exists (notice only, zero-amount)',
    source: 'docs/sources/sweden/gothenburg/klippan/batman-obligatoriskt.html.md'
  },
  gothenburg_mooring_charge: {
    functional_class: 'purchased_service',
    basis_note: 'Mooring boatmen service, user-specified amount per call — AB Klippans Båtmansstation (no published rate; the entered figure is the users own, never tariff-derived)',
    source: 'docs/sources/sweden/gothenburg/klippan/klippan-boatmangbg-com.html.md'
  },
  port_gothenburg_container_vessel_dues: {
    functional_class: 'berth_terminal_infrastructure',
    basis_note: 'Municipal port dues on the vessel, progressive per GT (Port Tariff 2026 §2.1)',
    source: 'port-tariff-2026.pdf §2.1'
  },
  port_gothenburg_waste_solid_eu: {
    functional_class: 'waste_environmental',
    basis_note: 'Solid waste disposal service (Port Tariff 2026 waste schedule)',
    source: 'port-tariff-2026.pdf waste schedule'
  },
  port_gothenburg_waste_solid_non_eu: {
    functional_class: 'waste_environmental',
    basis_note: 'Solid waste disposal service (Port Tariff 2026 waste schedule)',
    source: 'port-tariff-2026.pdf waste schedule'
  },
  port_gothenburg_waste_sludge_eu: {
    functional_class: 'waste_environmental',
    basis_note: 'Sludge disposal service (Port Tariff 2026 waste schedule)',
    source: 'port-tariff-2026.pdf waste schedule'
  },
  port_gothenburg_waste_sludge_non_eu: {
    functional_class: 'waste_environmental',
    basis_note: 'Sludge disposal service (Port Tariff 2026 waste schedule)',
    source: 'port-tariff-2026.pdf waste schedule'
  },
  port_gothenburg_waste_sludge_excess: {
    functional_class: 'waste_environmental',
    basis_note: 'Sludge volume above the included volume (Port Tariff 2026 waste schedule)',
    source: 'port-tariff-2026.pdf waste schedule'
  },
  port_gothenburg_fresh_water: {
    functional_class: 'purchased_service',
    basis_note: 'Fresh water supplied (Port Tariff 2026 freshwater schedule)',
    source: 'port-tariff-2026.pdf freshwater schedule'
  },
  port_gothenburg_waste_scrubber: {
    functional_class: 'waste_environmental',
    basis_note: 'Scrubber waste administration (Port Tariff 2026 waste schedule)',
    source: 'port-tariff-2026.pdf waste schedule'
  },
  apm_terminals_handling_break_bulk_scrap: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Break-bulk handling (APMT Terminal Tariff 2026 §4)',
    source: 'apm-terminal-tariff-2026.pdf §4'
  },
  port_gothenburg_ops_connection: {
    functional_class: 'purchased_service',
    basis_note: 'OPS connection service (Port Tariff 2026 OPS schedule)',
    source: 'port-tariff-2026.pdf OPS schedule'
  },
  port_gothenburg_layup: {
    functional_class: 'berth_terminal_infrastructure',
    basis_note: 'Lay-up dues for occupying port infrastructure (Port Tariff 2026 lay-up schedule)',
    source: 'port-tariff-2026.pdf lay-up schedule'
  },
  sjofartsverket_godsavgift: {
    functional_class: 'waterway_fairway_access',
    basis_note: 'Godsavgift — national cargo-based fairway due, 3.36 kr/t high-value / 1.67 kr/t low-value on derived cargo tonnes (Sjöfartsverket price list 2026 p.5, Föreskrift 2025:6); international basis assumed; transit cargo exempt',
    source: 'prislista-farleds-lotsavgifter-2026.pdf p.5'
  },
  sjofartsverket_cargo_fee_passengers: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Godsavgift — passenger component (Sjöfartsverket price list 2026 p.5)',
    source: 'prislista-farleds-lotsavgifter-2026.pdf p.5'
  },
  sjofartsverket_cargo_fee_private_vehicles: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Godsavgift — private-vehicle component (Sjöfartsverket price list 2026 p.5)',
    source: 'prislista-farleds-lotsavgifter-2026.pdf p.5'
  },
  apm_terminals_handling_le20ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Container handling lift charge (APMT Terminal Tariff 2026 §4)',
    source: 'apm-terminal-tariff-2026.pdf §4'
  },
  apm_terminals_handling_gt20ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Container handling lift charge (APMT Terminal Tariff 2026 §4)',
    source: 'apm-terminal-tariff-2026.pdf §4'
  },
  apm_terminals_handling_break_bulk: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Break-bulk handling (APMT Terminal Tariff 2026 §4)',
    source: 'apm-terminal-tariff-2026.pdf §4'
  },
  apm_terminals_isps: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'ISPS security charge levied per container unit on cargo throughput; the funded function is ISPS security (APMT Terminal Tariff 2026 §3)',
    source: 'apm-terminal-tariff-2026.pdf §3'
  },
  apm_terminals_hatch_cover: {
    functional_class: 'purchased_service',
    basis_note: 'Hatch-cover handling service (APMT Terminal Tariff 2026 §4)',
    source: 'apm-terminal-tariff-2026.pdf §4'
  },
  apm_terminals_gearbox: {
    functional_class: 'purchased_service',
    basis_note: 'Gearbox handling service (APMT Terminal Tariff 2026 §4)',
    source: 'apm-terminal-tariff-2026.pdf §4'
  },
  apm_terminals_storage_export: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Storage beyond free time (APMT Terminal Tariff 2026 storage schedule)',
    source: 'apm-terminal-tariff-2026.pdf storage schedule'
  },
  apm_terminals_storage_import: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Storage beyond free time (APMT Terminal Tariff 2026 storage schedule)',
    source: 'apm-terminal-tariff-2026.pdf storage schedule'
  },
  gothenburg_towage_estimate: {
    functional_class: 'purchased_service',
    basis_note: 'Towage assist service, estimated (no published tariff)',
    source: 'estimated parameter (Gothenburg reference §6)'
  },
  apm_terminals_surcharge_oog: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'OOG handling surcharge (APMT Terminal Tariff 2026 surcharge schedule)',
    source: 'apm-terminal-tariff-2026.pdf surcharge schedule'
  },
  apm_terminals_surcharge_reefer: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Reefer surcharge (APMT Terminal Tariff 2026 surcharge schedule)',
    source: 'apm-terminal-tariff-2026.pdf surcharge schedule'
  },
  apm_terminals_surcharge_dangerous: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Dangerous-goods surcharge (APMT Terminal Tariff 2026 surcharge schedule)',
    source: 'apm-terminal-tariff-2026.pdf surcharge schedule'
  },
  apm_terminals_surcharge_overdue_dangerous: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Overdue dangerous-goods surcharge (APMT Terminal Tariff 2026 surcharge schedule)',
    source: 'apm-terminal-tariff-2026.pdf surcharge schedule'
  },
  apm_terminals_gate_hazardous: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Hazardous gate charge (APMT Terminal Tariff 2026 gate schedule)',
    source: 'apm-terminal-tariff-2026.pdf gate schedule'
  },
  apm_terminals_idle_berth: {
    functional_class: 'purchased_service',
    basis_note: 'Idle-berth service requested from the terminal (APMT Terminal Tariff 2026 idle-berth schedule)',
    source: 'apm-terminal-tariff-2026.pdf idle-berth schedule'
  }
};

// Hamburg 2026 (sources: HPA Pricelist Maritime Shipping 2026 cat. 31
// items A/B/C; HHLA Quay Tariff 2026 — tonnage dues §1.2, security §1.3.3,
// gangway §1.4, supervision §1.5, Hafenfonds §9.2.3; GDWS Lotstarif; Hamburg
// Ship Waste Fees Ordinance SchiffsAbgV; Eurogate price list anchor).
const ham: Record<string, FunctionalClassInfo> = {
  hpa_port_fee: {
    functional_class: 'berth_terminal_infrastructure',
    basis_note: 'Hafengeld — port dues for the vessel\'s call (HPA Pricelist cat. 31 item A)',
    source: 'pricelist-maritime-shipping-2026.pdf cat. 31 item A'
  },
  hpa_demurrage: {
    functional_class: 'berth_terminal_infrastructure',
    basis_note: 'Demurrage beyond the 120 h port-fee coverage (HPA Pricelist cat. 31 item B)',
    source: 'pricelist-maritime-shipping-2026.pdf cat. 31 item B'
  },
  hpa_berth_fee_quay: {
    functional_class: 'berth_terminal_infrastructure',
    basis_note: 'Berth fee at an HPA-operated quay (HPA Pricelist cat. 31 item C)',
    source: 'pricelist-maritime-shipping-2026.pdf cat. 31 item C'
  },
  hpa_berth_fee_dolphins: {
    functional_class: 'berth_terminal_infrastructure',
    basis_note: 'Berth fee at HPA dolphins (HPA Pricelist cat. 31 item C)',
    source: 'pricelist-maritime-shipping-2026.pdf cat. 31 item C'
  },
  gdws_pilotage_dues: {
    functional_class: 'purchased_service',
    basis_note: 'Federal pilotage dues for the Elbe transit (GDWS Lotstarif Part I)',
    source: 'pilot-tariff-2026.pdf Part I'
  },
  gdws_pilot_fees: {
    functional_class: 'purchased_service',
    basis_note: 'Pilot fees for the Elbe transit (GDWS Lotstarif Part I)',
    source: 'pilot-tariff-2026.pdf Part I'
  },
  hhla_tonnage_dues: {
    functional_class: 'berth_terminal_infrastructure',
    basis_note: 'Tonnage dues for the vessel\'s use of a quayside cargo handling facility (Quay Tariff §1.2; vessel-fee character per §9.1.1)',
    source: 'quay-tariff-2026.pdf §1.2, §9.1.1'
  },
  hhla_hafenfonds_surcharge: {
    functional_class: 'berth_terminal_infrastructure',
    basis_note: 'Hafenfonds — port dues surcharge on quay-tariff fees (Quay Tariff §9.2.3)',
    source: 'quay-tariff-2026.pdf §9.2.3'
  },
  hhla_security_charge: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Security charge levied per container handled — a throughput levy; the funded function is ISPS security (Quay Tariff §1.3.3)',
    source: 'quay-tariff-2026.pdf §1.3.3'
  },
  hhla_gangway: {
    functional_class: 'purchased_service',
    basis_note: 'Gangway supply at the vessel (Quay Tariff §1.4)',
    source: 'quay-tariff-2026.pdf §1.4'
  },
  hhla_gangway_supervision: {
    functional_class: 'purchased_service',
    basis_note: 'Gangway supervision during operations (Quay Tariff §1.5)',
    source: 'quay-tariff-2026.pdf §1.5'
  },
  hhla_container_handling: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Container handling per move, estimated (Eurogate 5.1.1 anchor; HHLA rate unpublished)',
    source: 'prices-and-conditions-2026.pdf 5.1.1 (anchor)'
  },
  hhla_storage_import_20ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Storage beyond free time (Quay Tariff §3)',
    source: 'quay-tariff-2026.pdf §3'
  },
  hhla_storage_import_40ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Storage beyond free time (Quay Tariff §3)',
    source: 'quay-tariff-2026.pdf §3'
  },
  hhla_storage_export_20ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Storage beyond free time (Quay Tariff §3)',
    source: 'quay-tariff-2026.pdf §3'
  },
  hhla_storage_export_40ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Storage beyond free time (Quay Tariff §3)',
    source: 'quay-tariff-2026.pdf §3'
  },
  hhla_storage_transshipment: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Storage beyond free time (Quay Tariff §3)',
    source: 'quay-tariff-2026.pdf §3'
  },
  hhla_storage_hazardous: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Storage beyond free time (Quay Tariff §3)',
    source: 'quay-tariff-2026.pdf §3'
  },
  hhla_storage_empties_20ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Empty storage (Quay Tariff §3)',
    source: 'quay-tariff-2026.pdf §3'
  },
  hhla_storage_empties_40ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Empty storage (Quay Tariff §3)',
    source: 'quay-tariff-2026.pdf §3'
  },
  hhla_storage_import_45ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Storage beyond free time (Quay Tariff §3)',
    source: 'quay-tariff-2026.pdf §3'
  },
  hhla_storage_export_45ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Storage beyond free time (Quay Tariff §3)',
    source: 'quay-tariff-2026.pdf §3'
  },
  hhla_container_service_gassing_20ft: {
    functional_class: 'purchased_service',
    basis_note: 'Gassing-space container service (Quay Tariff §8)',
    source: 'quay-tariff-2026.pdf §8'
  },
  hhla_container_service_gassing_40ft: {
    functional_class: 'purchased_service',
    basis_note: 'Gassing-space container service (Quay Tariff §8)',
    source: 'quay-tariff-2026.pdf §8'
  },
  hhla_container_service_reception: {
    functional_class: 'purchased_service',
    basis_note: 'Container reception/delivery service (Quay Tariff §8)',
    source: 'quay-tariff-2026.pdf §8'
  },
  hhla_container_service_extra_movement: {
    functional_class: 'purchased_service',
    basis_note: 'Extra container movement (Quay Tariff §8)',
    source: 'quay-tariff-2026.pdf §8'
  },
  hhla_container_service_admin: {
    functional_class: 'purchased_service',
    basis_note: 'Administrative fee (Quay Tariff §8)',
    source: 'quay-tariff-2026.pdf §8'
  },
  hhla_container_service_vgm_weighing: {
    functional_class: 'purchased_service',
    basis_note: 'VGM weighing service (Quay Tariff §8)',
    source: 'quay-tariff-2026.pdf §8'
  },
  hhla_container_service_vgm_calculative: {
    functional_class: 'purchased_service',
    basis_note: 'VGM calculative method fee (Quay Tariff §8)',
    source: 'quay-tariff-2026.pdf §8'
  },
  hhla_container_service_reefer_connect: {
    functional_class: 'purchased_service',
    basis_note: 'Reefer connection service (Quay Tariff §8)',
    source: 'quay-tariff-2026.pdf §8'
  },
  hhla_container_service_reefer_energy: {
    functional_class: 'purchased_service',
    basis_note: 'Reefer energy per 24 h (Quay Tariff §8)',
    source: 'quay-tariff-2026.pdf §8'
  },
  hhla_container_service_reefer_check: {
    functional_class: 'purchased_service',
    basis_note: 'Reefer check service (Quay Tariff §8)',
    source: 'quay-tariff-2026.pdf §8'
  },
  hhla_container_service_labelling: {
    functional_class: 'purchased_service',
    basis_note: 'Labelling service (Quay Tariff §8)',
    source: 'quay-tariff-2026.pdf §8'
  },
  eurogate_berthing_charge: {
    functional_class: 'berth_terminal_infrastructure',
    basis_note: 'Berthing charge / tonnage dues for the vessel\'s use of the handling facility (Eurogate Prices and Conditions 2.1.1–2.1.2)',
    source: 'prices-and-conditions-2026.pdf 2.1.1–2.1.2'
  },
  eurogate_social_fund_surcharge: {
    functional_class: 'berth_terminal_infrastructure',
    basis_note: 'Social fund surcharge on Eurogate services (Prices and Conditions 1.3.13)',
    source: 'prices-and-conditions-2026.pdf 1.3.13'
  },
  eurogate_container_handling: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Waterside container lift charge per move (Prices and Conditions 5.1.1)',
    source: 'prices-and-conditions-2026.pdf 5.1.1'
  },
  // Scenario-adjustment layer (spec v0.3.3): the Eurogate ch. 3-4 and ch. 7
  // scenario surfaces. Storage beyond free time is a cargo-throughput levy
  // (the HHLA storage classification); the shift/overtime/waiting and
  // equipment/staff-hire schedules are purchased services (terminal labour
  // and equipment hired by the vessel's line). Every figure derives from
  // the user's scenario inputs over the pinned published rates.
  eurogate_storage_import_20ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Scenario: import storage beyond the 3-day free time, 20 ft full containers (Prices and Conditions 7.2; counting per 7.5.3)',
    source: 'prices-and-conditions-2026.pdf 7.2'
  },
  eurogate_storage_import_40ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Scenario: import storage beyond the 3-day free time, 40 ft full containers (Prices and Conditions 7.2; counting per 7.5.3)',
    source: 'prices-and-conditions-2026.pdf 7.2'
  },
  eurogate_storage_export_20ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Scenario: export storage beyond the 5-day free time, 20 ft full containers (Prices and Conditions 7.1; counting per 7.5.3)',
    source: 'prices-and-conditions-2026.pdf 7.1'
  },
  eurogate_storage_export_40ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Scenario: export storage beyond the 5-day free time, 40 ft full containers (Prices and Conditions 7.1; counting per 7.5.3)',
    source: 'prices-and-conditions-2026.pdf 7.1'
  },
  eurogate_shift_surcharges: {
    functional_class: 'purchased_service',
    basis_note: 'Scenario: waterside shift surcharges, overtime and waiting times per shift/gang or hour (Prices and Conditions 3.1-3.4)',
    source: 'prices-and-conditions-2026.pdf 3.1-3.4'
  },
  eurogate_equipment_hire: {
    functional_class: 'purchased_service',
    basis_note: 'Scenario: hire of handling equipment and staff per hour or part thereof (Prices and Conditions 4.1-4.9)',
    source: 'prices-and-conditions-2026.pdf 4.1-4.9'
  },
  eurogate_security_charge: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Security charge per container handled (Prices and Conditions 13.1)',
    source: 'prices-and-conditions-2026.pdf 13.1'
  },
  eurogate_lashing: {
    functional_class: 'purchased_service',
    basis_note: 'Lashing/unlashing with system lashings per container handled and restowed (Prices and Conditions 5.2.1)',
    source: 'prices-and-conditions-2026.pdf 5.2.1'
  },
  eurogate_twistlocks: {
    functional_class: 'purchased_service',
    basis_note: 'Setting/removing twistlocks on board per container (Prices and Conditions 5.2.2)',
    source: 'prices-and-conditions-2026.pdf 5.2.2'
  },
  eurogate_imo_surcharge: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'IMO (dangerous-goods) container surcharge per container (Prices and Conditions 5.3)',
    source: 'prices-and-conditions-2026.pdf 5.3'
  },
  eurogate_small_call_minimum: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Minimum charge per transaction per ship for calls handling up to 20 containers (Prices and Conditions 5.4)',
    source: 'prices-and-conditions-2026.pdf 5.4'
  },
  eurogate_layby_charge: {
    functional_class: 'berth_terminal_infrastructure',
    basis_note: 'Lay-by berth charge per commenced 24 h by maximum nominal TEU intake (Prices and Conditions 2.1.4)',
    source: 'prices-and-conditions-2026.pdf 2.1.4'
  },
  eurogate_reefer_first_24h: {
    functional_class: 'purchased_service',
    basis_note: 'Reefer temperature maintenance, first 24 h including plug on/off (Prices and Conditions 9.1)',
    source: 'prices-and-conditions-2026.pdf 9.1'
  },
  eurogate_reefer_subsequent_24h: {
    functional_class: 'purchased_service',
    basis_note: 'Reefer temperature maintenance, each subsequent 24 h (Prices and Conditions 9.2)',
    source: 'prices-and-conditions-2026.pdf 9.2'
  },
  hhla_container_service_neutralization: {
    functional_class: 'purchased_service',
    basis_note: 'Neutralization service (Quay Tariff §8)',
    source: 'quay-tariff-2026.pdf §8'
  },
  bukea_waste_marpol_i: {
    functional_class: 'waste_environmental',
    basis_note: 'MARPOL I ship waste fee component (SchiffsAbgV)',
    source: 'ship-waste-fees-ordinance-2025.pdf'
  },
  bukea_waste_marpol_iv: {
    functional_class: 'waste_environmental',
    basis_note: 'MARPOL IV ship waste fee component (SchiffsAbgV)',
    source: 'ship-waste-fees-ordinance-2025.pdf'
  },
  bukea_waste_marpol_v_abc: {
    functional_class: 'waste_environmental',
    basis_note: 'MARPOL V A–C ship waste fee component (SchiffsAbgV)',
    source: 'ship-waste-fees-ordinance-2025.pdf'
  },
  bukea_waste_marpol_v_defi: {
    functional_class: 'waste_environmental',
    basis_note: 'MARPOL V D/E/F/I ship waste fee component (SchiffsAbgV)',
    source: 'ship-waste-fees-ordinance-2025.pdf'
  },
  hamburg_towage_estimate: {
    functional_class: 'purchased_service',
    basis_note: 'Towage assist service, estimated (no published tariff)',
    source: 'estimated parameter (Hamburg reference §6)'
  }
};

// Helsingborg 2026 (sources: Port of Helsingborg Tariff 2026 — port dues
// p.5, cargo dues p.6, security p.6, LO-LO p.7, EES p.7, storage p.7,
// ancillaries p.8; Sjöfartsverket price list 2026 — fartygsavgift p.3,
// beredskapsavgift p.4, pilotage p.4, ordering fee p.4).
const hbg: Record<string, FunctionalClassInfo> = {
  poh_port_dues: {
    functional_class: 'berth_terminal_infrastructure',
    basis_note: 'Municipal port dues per GT (Tariff 2026, Port dues p.5)',
    source: 'tariff-2026.pdf p.5'
  },
  poh_long_stay_port_dues: {
    functional_class: 'berth_terminal_infrastructure',
    basis_note: 'Long-stay surcharge on port dues (Tariff 2026, Port dues p.5)',
    source: 'tariff-2026.pdf p.5'
  },
  poh_waste_fee: {
    functional_class: 'waste_environmental',
    basis_note: 'Waste and environmental fee (Tariff 2026 p.5)',
    source: 'tariff-2026.pdf p.5'
  },
  poh_sludge_excess: {
    functional_class: 'waste_environmental',
    basis_note: 'Additional sludge above included volume (Tariff 2026 p.5)',
    source: 'tariff-2026.pdf p.5'
  },
  poh_long_stay_waste: {
    functional_class: 'waste_environmental',
    basis_note: 'Long-stay waste surcharge (Tariff 2026 p.5)',
    source: 'tariff-2026.pdf p.5'
  },
  poh_cargo_due: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Port dues cargo per unit (Tariff 2026 p.6)',
    source: 'tariff-2026.pdf p.6'
  },
  poh_security_fee: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Port security fee levied per unit handled — a throughput levy; the funded function is ISPS security, valid ISSC (Tariff 2026 p.6)',
    source: 'tariff-2026.pdf p.6'
  },
  poh_security_fee_no_issc: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Port security fee levied per unit handled without a valid ISSC — a throughput levy; the funded function is ISPS security (Tariff 2026 p.6)',
    source: 'tariff-2026.pdf p.6'
  },
  poh_lolo_handling: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'LO-LO stevedoring per unit (Tariff 2026 p.7)',
    source: 'tariff-2026.pdf p.7'
  },
  poh_hatch_cover: {
    functional_class: 'purchased_service',
    basis_note: 'Hatch-cover handling (Tariff 2026 p.7)',
    source: 'tariff-2026.pdf p.7'
  },
  poh_ees: {
    functional_class: 'waste_environmental',
    basis_note: 'Emergency Energy Surcharge per move (Tariff 2026 p.7; energy-cost recovery, environmental dimension)',
    source: 'tariff-2026.pdf p.7'
  },
  poh_storage_full_import_20ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Storage beyond free days (Tariff 2026 p.7)',
    source: 'tariff-2026.pdf p.7'
  },
  poh_storage_full_import_30ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Storage beyond free days (Tariff 2026 p.7)',
    source: 'tariff-2026.pdf p.7'
  },
  poh_storage_full_import_40ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Storage beyond free days (Tariff 2026 p.7)',
    source: 'tariff-2026.pdf p.7'
  },
  poh_storage_full_import_45ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Storage beyond free days (Tariff 2026 p.7)',
    source: 'tariff-2026.pdf p.7'
  },
  poh_storage_full_export_20ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Storage beyond free days (Tariff 2026 p.7)',
    source: 'tariff-2026.pdf p.7'
  },
  poh_storage_full_export_30ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Storage beyond free days (Tariff 2026 p.7)',
    source: 'tariff-2026.pdf p.7'
  },
  poh_storage_full_export_40ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Storage beyond free days (Tariff 2026 p.7)',
    source: 'tariff-2026.pdf p.7'
  },
  poh_storage_full_export_45ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Storage beyond free days (Tariff 2026 p.7)',
    source: 'tariff-2026.pdf p.7'
  },
  poh_storage_empty_20ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Empty storage (Tariff 2026 p.7)',
    source: 'tariff-2026.pdf p.7'
  },
  poh_storage_empty_30ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Empty storage (Tariff 2026 p.7)',
    source: 'tariff-2026.pdf p.7'
  },
  poh_storage_empty_40ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Empty storage (Tariff 2026 p.7)',
    source: 'tariff-2026.pdf p.7'
  },
  poh_storage_empty_45ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Empty storage (Tariff 2026 p.7)',
    source: 'tariff-2026.pdf p.7'
  },
  poh_fresh_water: {
    functional_class: 'purchased_service',
    basis_note: 'Fresh water supply (Tariff 2026 p.8)',
    source: 'tariff-2026.pdf p.8'
  },
  poh_imo_transport: {
    functional_class: 'purchased_service',
    basis_note: 'IMO transport service (Tariff 2026 p.8)',
    source: 'tariff-2026.pdf p.8'
  },
  poh_reefer_connection: {
    functional_class: 'purchased_service',
    basis_note: 'Reefer connection (Tariff 2026 p.8)',
    source: 'tariff-2026.pdf p.8'
  },
  poh_reefer_days: {
    functional_class: 'purchased_service',
    basis_note: 'Reefer days (Tariff 2026 p.8)',
    source: 'tariff-2026.pdf p.8'
  },
  poh_vgm: {
    functional_class: 'purchased_service',
    basis_note: 'VGM service (Tariff 2026 p.8)',
    source: 'tariff-2026.pdf p.8'
  },
  poh_other_admin: {
    functional_class: 'purchased_service',
    basis_note: 'Other administrative service (Tariff 2026 p.8)',
    source: 'tariff-2026.pdf p.8'
  },
  poh_customs_inspection: {
    functional_class: 'purchased_service',
    basis_note: 'Customs/veterinary inspection (Tariff 2026 p.8)',
    source: 'tariff-2026.pdf p.8'
  },
  poh_port_area_transport: {
    functional_class: 'purchased_service',
    basis_note: 'Port-area transport (Tariff 2026 p.8)',
    source: 'tariff-2026.pdf p.8'
  },
  poh_towage_estimate: {
    functional_class: 'purchased_service',
    basis_note: 'Towage assist service, estimated (no published tariff)',
    source: 'estimated parameter (Helsingborg reference §5)'
  }
};

// The Swedish national Sjöfartsverket tables are transcribed identically in
// every Swedish port file under per-port rule ids (port-silo principle;
// spec v0.4.4 presentation normalization: referenced, never duplicated —
// each silo keeps its own rule copies and citations, and the shared prefix
// patterns below are the single presentation reference applied to all of
// them, so the same authority renders identically at every Swedish port).
// The classification below applies to every Swedish port's ids via the shared
// prefix patterns: *_vessel_fee_class*_* (fartygsavgift, per call by NT
// class × CSI class — fairway/waterway access), *_readiness_fee_class*
// (beredskapsavgift, per call by NT class — readiness/safety capacity),
// *_pilotage_class*_start / _per_half_hour and *_extra_pilot (pilotage —
// purchased nautical service), *_ordering_fee_* (beställningsavgift —
// purchased service), and the per-biller frequency_discount lines
// (sjofartsverket_frequency_discount, sfv_frequency_discount,
// gavle_sfv_frequency_discount, norrkoping_sfv_frequency_discount,
// norvik_sfv_frequency_discount — a discount
// line on vessel-fee + readiness classes; classified to mirror the fees it
// adjusts, so the aggregate nets correctly).

// Bremerhaven 2026 (v0.5.1; sources: the consolidated 2026 HGebO statute
// with inline fee tables - Raumgebuehr 6, waste 10, Hafenlotsgeld 12; GDWS
// Lotstarifverordnung Anlagen 1/2 Weser columns; EUROGATE P&C 2026 (the
// national-class document shared with Hamburg); NTB Reference tariff
// 01.08.2026).
const brv: Record<string, FunctionalClassInfo> = {
  brv_raumgebuehr_overseas_liner: {
    functional_class: 'berth_terminal_infrastructure',
    basis_note: 'Raumgebuehr - port dues for the vessel\'s five-day transshipment period (HGebO 6, Ueberseeverkehr liner rate)',
    source: 'hgebo-consolidated-2026.txt 6'
  },
  brv_raumgebuehr_europe_liner: {
    functional_class: 'berth_terminal_infrastructure',
    basis_note: 'Raumgebuehr - port dues for the vessel\'s five-day transshipment period (HGebO 6, Europaverkehr liner rates, GT-banded)',
    source: 'hgebo-consolidated-2026.txt 6'
  },
  brv_raumgebuehr_extension_overseas: {
    functional_class: 'berth_terminal_infrastructure',
    basis_note: 'Raumgebuehr extension - 50 percent of the rate per further commenced ten-day period beyond five days (HGebO 3b(2))',
    source: 'hgebo-consolidated-2026.txt 3b(2)'
  },
  brv_abfallentsorgung: {
    functional_class: 'waste_environmental',
    basis_note: 'MARPOL Annex V waste-disposal fee from raumgebuehrpflichtige vessels, five-day period, GT-banded (HGebO 10(1))',
    source: 'hgebo-consolidated-2026.txt 10(1)'
  },
  brv_hafenlotsgeld_ab13k: {
    functional_class: 'purchased_service',
    basis_note: 'Hafenlotsgeld - the Bremerhaven port pilots\' Beratungsgeld from 13,000 BRZ, no lock use (HGebO 12(7).2)',
    source: 'hgebo-consolidated-2026.txt 12(7).2'
  },
  brv_hafenlotsgeld_unter13k: {
    functional_class: 'purchased_service',
    basis_note: 'Hafenlotsgeld - the Bremerhaven port pilots\' Beratungsgeld under 13,000 BRZ, no lock use (HGebO 12(7).1)',
    source: 'hgebo-consolidated-2026.txt 12(7).1'
  },
  gdws_pilotage_dues_weser: {
    functional_class: 'purchased_service',
    basis_note: 'Federal pilotage dues for the Weser sea approach (GDWS Lotstarif Anlage 1 Teil I, Weser column; 65 percent route)',
    source: 'pilot-tariff-2026.pdf Anlage 1 Teil I (Weser)'
  },
  gdws_pilot_fees_aussenweser: {
    functional_class: 'purchased_service',
    basis_note: 'Pilot fees for the Aussenweser sea approach (GDWS Lotstarif Anlage 2 Teil I, Aussenweser column)',
    source: 'pilot-tariff-2026.pdf Anlage 2 Teil I (Aussenweser)'
  },
  eurogate_ctb_berthing_charge: {
    functional_class: 'berth_terminal_infrastructure',
    basis_note: 'Berthing charge for the vessel\'s use of the handling facilities, GT x lay time (EUROGATE P&C 2.1.1-2.1.2)',
    source: 'prices-and-conditions-2026.txt 2.1.1-2.1.2'
  },
  eurogate_ctb_container_handling: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Waterside container handling per lift (EUROGATE P&C 5.1.1)',
    source: 'prices-and-conditions-2026.txt 5.1.1'
  },
  eurogate_ctb_security_charge: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Security charge per container handled - a throughput levy; the funded function is ISPS security (EUROGATE P&C 13.1)',
    source: 'prices-and-conditions-2026.txt 13.1'
  },
  eurogate_ctb_lashing: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Lashing/unlashing per container handled and restowed (EUROGATE P&C 5.2.1)',
    source: 'prices-and-conditions-2026.txt 5.2.1'
  },
  eurogate_ctb_twistlocks: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Twistlock setting/removal per container (EUROGATE P&C 5.2.2)',
    source: 'prices-and-conditions-2026.txt 5.2.2'
  },
  eurogate_ctb_imo_surcharge: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'IMO dangerous-goods surcharge per container (EUROGATE P&C 5.3)',
    source: 'prices-and-conditions-2026.txt 5.3'
  },
  eurogate_ctb_small_call_minimum: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Small-call minimum bill for ships with up to 20 containers handled (EUROGATE P&C 5.4)',
    source: 'prices-and-conditions-2026.txt 5.4'
  },
  eurogate_ctb_layby_charge: {
    functional_class: 'berth_terminal_infrastructure',
    basis_note: 'Lay-by berth use per TEU per 24 h (EUROGATE P&C 2.1.4)',
    source: 'prices-and-conditions-2026.txt 2.1.4'
  },
  eurogate_ctb_reefer_first_24h: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Reefer temperature maintenance, first 24 h per reefer container (EUROGATE P&C 9.1)',
    source: 'prices-and-conditions-2026.txt 9.1'
  },
  eurogate_ctb_reefer_subsequent_24h: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Reefer temperature maintenance, subsequent 24 h per reefer container per day (EUROGATE P&C 9.2)',
    source: 'prices-and-conditions-2026.txt 9.2'
  },
  eurogate_ctb_storage_import_20ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Import storage per container per day beyond free time (EUROGATE P&C 7.2)',
    source: 'prices-and-conditions-2026.txt 7.2'
  },
  eurogate_ctb_storage_import_40ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Import storage per container per day beyond free time (EUROGATE P&C 7.2)',
    source: 'prices-and-conditions-2026.txt 7.2'
  },
  eurogate_ctb_storage_export_20ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Export storage per container per day beyond free time (EUROGATE P&C 7.1)',
    source: 'prices-and-conditions-2026.txt 7.1'
  },
  eurogate_ctb_storage_export_40ft: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Export storage per container per day beyond free time (EUROGATE P&C 7.1)',
    source: 'prices-and-conditions-2026.txt 7.1'
  },
  ntb_tonnage_dues: {
    functional_class: 'berth_terminal_infrastructure',
    basis_note: 'Tonnage dues for the vessel\'s use of the handling facilities, BRZ x port stay (NTB reference tariff 1.1; reference-tariff caveat)',
    source: 'ntb-reference-tariff-en-2026-08-01.txt 1.1'
  },
  ntb_container_handling: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Container handling per lift (NTB reference tariff 2.1.1; reference-tariff caveat)',
    source: 'ntb-reference-tariff-en-2026-08-01.txt 2.1.1'
  },
  ntb_security_charge: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Security charge per container loaded/discharged (NTB reference tariff ch. 10; reference-tariff caveat)',
    source: 'ntb-reference-tariff-en-2026-08-01.txt ch. 10'
  },
  ntb_lashing: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Lashing/unlashing per container (NTB reference tariff 2.3.1; reference-tariff caveat)',
    source: 'ntb-reference-tariff-en-2026-08-01.txt 2.3.1'
  },
  ntb_twistlocks: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Twistlock attaching/removal per container (NTB reference tariff 2.3.2; reference-tariff caveat)',
    source: 'ntb-reference-tariff-en-2026-08-01.txt 2.3.2'
  },
  ntb_reefer_first_24h: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Reefer service, first 24 h per reefer container (NTB reference tariff 7.1.1; reference-tariff caveat)',
    source: 'ntb-reference-tariff-en-2026-08-01.txt 7.1.1'
  },
  ntb_reefer_subsequent_24h: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Reefer service, subsequent 24 h per reefer container (NTB reference tariff 7.1.2; reference-tariff caveat)',
    source: 'ntb-reference-tariff-en-2026-08-01.txt 7.1.2'
  },
  bremerhaven_towage_estimate: {
    functional_class: 'purchased_service',
    basis_note: 'Towage per call - estimated, no published tariff (the Hamburg convention\'s market-range default)',
    source: 'BREMERHAVEN_EXTRACTION_REFERENCE.md section 7'
  },
  eurogate_ctb_social_fund_surcharge: {
    functional_class: 'berth_terminal_infrastructure',
    basis_note: 'The EUROGATE CTB social fund - a percentage uplift on the terminal\'s non-excluded fees (P&C 1.3.13)',
    source: 'prices-and-conditions-2026.txt 1.3.13'
  },
  ntb_social_fund_surcharge: {
    functional_class: 'berth_terminal_infrastructure',
    basis_note: 'The NTB social fund - a percentage uplift on the terminal\'s non-excluded fees (reference tariff general regulations; reference-tariff caveat)',
    source: 'ntb-reference-tariff-en-2026-08-01.txt general regulations'
  }
};

// Aarhus 2026 (v0.6.0; sources: Port of Aarhus Terms and Conditions of
// Business 2026 - port dues 4.2, ESI discount 4.3, ISPS 3.3, work levy 8.1,
// wharfage 8, pilotage 5.3 (the 1-July-2026 edition), mooring 6.3 (the
// July-2026 edition), towage 7.4 (the port\'s own tugs HERMES and AROS);
// APMT Aarhus 2026 tariff - quay 2.1, gate 4, lashing 2.5, reefer 7,
// storage 10, IMDG 11/5.2). The pilotage provider IS the port (Pilotage
// STC 1, in force 01.11.2022). The mooring and towage lines are the
// model\'s first PUBLISHED-price surfaces of those families - authority
// services, never estimates.
const aar: Record<string, FunctionalClassInfo> = {
  aarhus_port_due: {
    functional_class: 'berth_terminal_infrastructure',
    basis_note: 'Port due for ships over 3,000 GT - 4.00 DKK per GT up to 7 calendar days, 0.70 DKK per GT per day beyond (ToC 4.2); the ESI discount (4.3) adjusts it',
    source: 'Port of Aarhus - Terms and Conditions of Business 2026.pdf 4.2'
  },
  aarhus_port_due_extension: {
    functional_class: 'berth_terminal_infrastructure',
    basis_note: 'Port-due supplement beyond 7 calendar days - 0.70 DKK per GT per commenced day (ToC 4.2)',
    source: 'Port of Aarhus - Terms and Conditions of Business 2026.pdf 4.2'
  },
  aarhus_pilotage: {
    functional_class: 'purchased_service',
    basis_note: 'Pilotage per call by GT band - the Port of Aarhus IS the pilotage provider and biller (Pilotage STC 1: the port handles the public pilotage and is legally obliged to deliver it to all ships calling); the 5.3 bands are the port\'s own July-2026 prices',
    source: 'Port of Aarhus - Terms and Conditions of Business 2026.pdf 5.3 (updated 1 July 2026)'
  },
  aarhus_mooring: {
    functional_class: 'purchased_service',
    basis_note: 'Mooring per call by GT band - mandatory approved line handlers over 80 m LOA (ToC 6.1), the port or an approved supplier provides them; the 6.3 bands are published prices, the model\'s first priced mooring (an authority service, never an estimate)',
    source: 'Port of Aarhus - Terms and Conditions of Business 2026.pdf 6.1/6.3 (updated 1 July 2026)'
  },
  aarhus_towage: {
    functional_class: 'purchased_service',
    basis_note: 'Towage per tugboat by the assisted ship\'s GT band - the port\'s own tugs m.s. HERMES and AROS (ToC 7.4); published bands replace the estimate convention at Aarhus only, per-port honest',
    source: 'Port of Aarhus - Terms and Conditions of Business 2026.pdf 7.4'
  },
  aarhus_isps: {
    functional_class: 'readiness_safety_capacity',
    basis_note: 'ISPS fee per loaded container (ToC 3.3) - the security fee with the stated ISPS safety purpose, the classification contract\'s own example',
    source: 'Port of Aarhus - Terms and Conditions of Business 2026.pdf 3.3'
  },
  aarhus_work_environment_levy: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Working-environment levy per container (ToC 8.1) - a per-unit worker-welfare charge on throughput (reg. no. 181 of 18 May 1965), charged to the ship\'s agent or customer',
    source: 'Port of Aarhus - Terms and Conditions of Business 2026.pdf 8.1'
  },
  aarhus_wharfage: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'Wharfage per loaded container (ToC 8) - the cargo-side authority charge; payment is the recipient\'s or sender\'s responsibility (rendered and attributed, never silently dropped)',
    source: 'Port of Aarhus - Terms and Conditions of Business 2026.pdf 8'
  },
  apmt_aarhus_container_handling: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'APMT quay operations - 1,105.00 DKK per container (tariff 2.1); continuous work from start-up times, lashing/unlashing excluded (the basis wording verbatim); published-default honesty flag carried',
    source: 'Aarhus-01_01_2026-31_12_2026-Tariff - 2026.pdf 2.1'
  },
  apmt_aarhus_lashing: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'APMT lashing/unlashing per gang-hour (tariff 2.5) - ordered service, blank charges zero',
    source: 'Aarhus-01_01_2026-31_12_2026-Tariff - 2026.pdf 2.5'
  },
  apmt_aarhus_gate_move_truck: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'APMT truck gate move per container (tariff 4.1) - the landside leg, the container-through comparison surface',
    source: 'Aarhus-01_01_2026-31_12_2026-Tariff - 2026.pdf 4.1'
  },
  apmt_aarhus_reefer_daily: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'APMT reefer daily monitoring (tariff 7.1) - scenario surface, blank charges zero',
    source: 'Aarhus-01_01_2026-31_12_2026-Tariff - 2026.pdf 7.1'
  },
  apmt_aarhus_storage_full: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'APMT full-container storage tiers (tariff 10.1) - scenario surface over the published tier ladder',
    source: 'Aarhus-01_01_2026-31_12_2026-Tariff - 2026.pdf 10.1'
  },
  apmt_aarhus_storage_imdg: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'APMT IMDG-container storage tiers, group 1 (tariff 10.3) - scenario surface over the published tier ladder',
    source: 'Aarhus-01_01_2026-31_12_2026-Tariff - 2026.pdf 10.3'
  },
  apmt_aarhus_imdg_surcharge: {
    functional_class: 'cargo_throughput_levy',
    basis_note: 'APMT IMDG surcharge - percent-of-rate classes for quay/yard/gate operations (tariff 11; the 825.00 DKK incorrect-IMO inspection line 5.2 is the same surface); fires only for dangerous-goods units',
    source: 'Aarhus-01_01_2026-31_12_2026-Tariff - 2026.pdf 11/5.2'
  }
};

export const PORT_FUNCTIONAL_CLASSIFICATION: Record<string, Record<string, FunctionalClassInfo>> = {
  gothenburg: got,
  hamburg: ham,
  helsingborg: hbg,
  bremerhaven: brv,
  aarhus: aar
};
// Classification for the Swedish national rule-id patterns shared by all
// five Swedish ports (Gothenburg sjofartsverket_*, Helsingborg sfv_*,
// Gävle gvh_sfv_*, Norrköping pon_sfv_*, Norvik snv_sfv_*).
export function classifyRule(ruleId: string): FunctionalClassInfo | undefined {
  // Swedish national patterns (every Swedish port)
  if (/^(sjofartsverket|sfv|gvh_sfv|pon_sfv|snv_sfv)_vessel_fee_/.test(ruleId)) {
    return {
      functional_class: 'waterway_fairway_access',
      basis_note: 'Fartygsavgift — national fairway dues, per call by NT class × environmental class (Sjöfartsverket price list 2026 p.3); per-call by NT class, not per GT',
      source: 'prislista-farleds-lotsavgifter-2026.pdf p.3'
    };
  }
  if (/^(sjofartsverket|sfv|gvh_sfv|pon_sfv|snv_sfv)_readiness_fee_/.test(ruleId)) {
    return {
      functional_class: 'readiness_safety_capacity',
      basis_note: 'Beredskapsavgift — national readiness fee, per call by NT class (Sjöfartsverket price list 2026 p.4); per-call by NT class, not per GT',
      source: 'prislista-farleds-lotsavgifter-2026.pdf p.4'
    };
  }
  if (/^(sjofartsverket|sfv|gvh_sfv|pon_sfv|snv_sfv)_pilotage_/.test(ruleId)) {
    return {
      functional_class: 'purchased_service',
      basis_note: 'Pilotage — purchased nautical service (Sjöfartsverket price list 2026 p.4)',
      source: 'prislista-farleds-lotsavgifter-2026.pdf p.4'
    };
  }
  if (/^(sjofartsverket|sfv|gvh_sfv|pon_sfv|snv_sfv)_godsavgift$/.test(ruleId)) {
    return {
      functional_class: 'waterway_fairway_access',
      basis_note: 'Godsavgift — national cargo-based fairway due, 3.36 kr/t high-value / 1.67 kr/t low-value on derived cargo tonnes (Sjöfartsverket price list 2026 p.5, Föreskrift 2025:6); international basis assumed; transit cargo exempt',
      source: 'prislista-farleds-lotsavgifter-2026.pdf p.5'
    };
  }
  if (/^(sjofartsverket|sfv|gvh_sfv|pon_sfv|snv_sfv)_ordering_fee_/.test(ruleId)) {
    return {
      functional_class: 'purchased_service',
      basis_note: 'Beställningsavgift — pilotage ordering fee by lead time (Sjöfartsverket price list 2026 p.4)',
      source: 'prislista-farleds-lotsavgifter-2026.pdf p.4'
    };
  }
  if (/_frequency_discount$/.test(ruleId) || /frequency_discount/.test(ruleId)) {
    // The discount adjusts fartygsavgift + beredskapsavgift; it is rendered
    // inside the aggregate as a deduction, mirroring the fees it adjusts.
    return {
      functional_class: 'waterway_fairway_access',
      basis_note: 'Frequency discount on the national vessel + readiness fees (Sjöfartsverket price list 2026 p.4); reduces the fees it adjusts',
      source: 'prislista-farleds-lotsavgifter-2026.pdf p.4'
    };
  }
  // EU regulatory block (spec v0.2.69): the ETS allowances line is a
  // statutory emissions levy accompanying the call (Directive (EU) 2023/959
  // amending Directive 2003/87/EC); the FuelEU notice line is informational
  // (zero-amount by construction — Regulation (EU) 2023/1805's balance is
  // annual, never a per-call charge). Both classify to the environmental
  // class; neither enters the vessel-access aggregate (excluded by design).
  if (/_eu_ets_allowances$/.test(ruleId)) {
    return {
      functional_class: 'waste_environmental',
      basis_note: 'EU ETS allowance surrender for the call\'s in-scope emissions (Directive (EU) 2023/959 amending Directive 2003/87/EC, Art. 3ga-3gb; user-specified emissions basis and EUA price — derived, never published rates)',
      source: 'docs/sources/eu/ets/faq-maritime-ets.html.md (Directive 2003/87/EC Art. 3ga-3gb)'
    };
  }
  if (/_fueleu_notice$/.test(ruleId)) {
    return {
      functional_class: 'waste_environmental',
      basis_note: 'FuelEU Maritime notice — annual GHG-intensity compliance balance, not a per-call charge (Regulation (EU) 2023/1805 Art. 4/20-23; no amount computed)',
      source: 'docs/sources/eu/fueleu/fueleu-maritime.html.md (Regulation (EU) 2023/1805)'
    };
  }
  // Per-port explicit tables
  for (const portTable of Object.values(PORT_FUNCTIONAL_CLASSIFICATION)) {
    const hit = portTable[ruleId];
    if (hit) return hit;
  }
  return undefined;
}
