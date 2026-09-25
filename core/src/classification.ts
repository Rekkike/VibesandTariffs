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
// both Swedish port files under per-port rule ids (port-silo principle).
// The classification below applies to BOTH ports' ids via the shared
// prefix patterns: *_vessel_fee_class*_* (fartygsavgift, per call by NT
// class × CSI class — fairway/waterway access), *_readiness_fee_class*
// (beredskapsavgift, per call by NT class — readiness/safety capacity),
// *_pilotage_class*_start / _per_half_hour and *_extra_pilot (pilotage —
// purchased nautical service), *_ordering_fee_* (beställningsavgift —
// purchased service), and the per-biller frequency_discount lines
// (sjofartsverket_frequency_discount, sfv_frequency_discount — a discount
// line on vessel-fee + readiness classes; classified to mirror the fees it
// adjusts, so the aggregate nets correctly).

export const PORT_FUNCTIONAL_CLASSIFICATION: Record<string, Record<string, FunctionalClassInfo>> = {
  gothenburg: got,
  hamburg: ham,
  helsingborg: hbg
};// Classification for the Swedish national rule-id patterns shared by both
// Swedish ports (Gothenburg sjofartsverket_* and Helsingborg sfv_*).
export function classifyRule(ruleId: string): FunctionalClassInfo | undefined {
  // Swedish national patterns (both ports)
  if (/^(sjofartsverket|sfv)_vessel_fee_/.test(ruleId)) {
    return {
      functional_class: 'waterway_fairway_access',
      basis_note: 'Fartygsavgift — national fairway dues, per call by NT class × environmental class (Sjöfartsverket price list 2026 p.3); per-call by NT class, not per GT',
      source: 'prislista-farleds-lotsavgifter-2026.pdf p.3'
    };
  }
  if (/^(sjofartsverket|sfv)_readiness_fee_/.test(ruleId)) {
    return {
      functional_class: 'readiness_safety_capacity',
      basis_note: 'Beredskapsavgift — national readiness fee, per call by NT class (Sjöfartsverket price list 2026 p.4); per-call by NT class, not per GT',
      source: 'prislista-farleds-lotsavgifter-2026.pdf p.4'
    };
  }
  if (/^(sjofartsverket|sfv)_pilotage_/.test(ruleId)) {
    return {
      functional_class: 'purchased_service',
      basis_note: 'Pilotage — purchased nautical service (Sjöfartsverket price list 2026 p.4)',
      source: 'prislista-farleds-lotsavgifter-2026.pdf p.4'
    };
  }
  if (/^(sjofartsverket|sfv)_godsavgift$/.test(ruleId)) {
    return {
      functional_class: 'waterway_fairway_access',
      basis_note: 'Godsavgift — national cargo-based fairway due, 3.36 kr/t high-value / 1.67 kr/t low-value on derived cargo tonnes (Sjöfartsverket price list 2026 p.5, Föreskrift 2025:6); international basis assumed; transit cargo exempt',
      source: 'prislista-farleds-lotsavgifter-2026.pdf p.5'
    };
  }
  if (/^(sjofartsverket|sfv)_ordering_fee_/.test(ruleId)) {
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
  // Per-port explicit tables
  for (const portTable of Object.values(PORT_FUNCTIONAL_CLASSIFICATION)) {
    const hit = portTable[ruleId];
    if (hit) return hit;
  }
  return undefined;
}
