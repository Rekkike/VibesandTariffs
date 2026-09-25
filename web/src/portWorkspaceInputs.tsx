import React from 'react';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Box,
  Grid,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete,
  FormHelperText
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import type {
  CallInput,
  CostCalculationResult,
  OpsComponentsSpec,
  PortDefinition,
  PortInputProfileSection,
  VesselInput
} from '@port-cost/core';
import { getNetTonnageClass } from '@port-cost/core';
import { tierEffectLine } from './envGuidance';
import type { InputGuide } from './envGuidance';
import { LOADED_VESSELS, VESSEL_PRESETS, vesselOptions, vesselOptionId, vesselOptionLabel } from './vesselOptions';
import type { LibraryVessel, VesselOption } from './vesselOptions';
import { portLabel } from './portLabel';
import { DisclosureCard } from './disclosureCard';
import { EnvGuideHelp } from './envGuideHelp';
import { BandSelect, bandedInputsForPort } from './bandSelect';

export interface WorkspaceInputsProps {
  port: PortDefinition;
  state: { vessel: VesselInput; call: CallInput; result: CostCalculationResult | null };
  estimatedFields: string[];
  assumedFields: string[];
  profileAssumptionText: Record<string, string>;
  handleVesselChange: (field: keyof VesselInput, value: number | undefined) => void;
  handleCallChange: (field: keyof CallInput, value: any) => void;
  handleCallChanges: (fields: Partial<CallInput>) => void;
  guideForInput: (key: string) => InputGuide | null;
  portLevers: string[];
  profileSections: Set<string>;
  profileFields: Set<string>;
  operatorSection: PortInputProfileSection | undefined;
  opsComponents: OpsComponentsSpec;
  appliedTier: { tier: string; source: 'entered' | 'inferred' | 'worst-case' };
  applyLibraryVessel: (selected: LibraryVessel | null) => void;
  applyGenericSizeClass: (presetKey: keyof typeof VESSEL_PRESETS) => void;
  applyCustomVessel: () => void;
}

// Workspace input sections (spec v0.2.60 decomposition, audit item B
// boundary 4): the profile-driven field groups - the verbatim input-form
// JSX, lifted from PortWorkspace as a props-in component.
export const WorkspaceInputs: React.FC<WorkspaceInputsProps> = (props) => {
  const {
    port,
    state,
    estimatedFields,
    assumedFields,
    profileAssumptionText,
    handleVesselChange,
    handleCallChange,
    handleCallChanges,
    guideForInput,
    portLevers,
    profileSections,
    profileFields,
    operatorSection,
    opsComponents,
    appliedTier,
    applyLibraryVessel,
    applyGenericSizeClass,
    applyCustomVessel
  } = props;
  const PROFILE_ASSUMPTION_TEXT = profileAssumptionText;
  // Banded-input dual-mode controls (spec v0.2.65): the band definitions
  // derive from the port file's own adjustment rules - the same band
  // arrays the engine applies - so a port without banded adjustments
  // renders no select, and the defaults never move.
  const bandDefs = bandedInputsForPort(port);
  const bandDefFor = (input: string) => bandDefs.find(d => d.input === input);
  return (
          <Grid item xs={12} md={6}>
            <Paper className="form-section" elevation={0}>
              {/* Progressive disclosure (spec v0.2.25): staged form sections.
                  Vessel and Call are open by default; Port-Specific Parameters
                  starts collapsed. Inputs, defaults, and quality flags are
                  unchanged - presentation only. */}
              <DisclosureCard title="Vessel" summary="Particulars; typeahead from the vessel library" defaultOpen>
              <Typography variant="h6" component="h2" className="sr-only">Vessel</Typography>

              {/* Vessel-selection combobox (spec v0.2.47): one searchable
                  control, three tiers — named library presets, generic
                  size-class entries, Custom vessel. Typing filters across
                  all three; selection pre-fills the inputs below (library,
                  generic) or leaves them for direct entry (custom). The
                  button strip and the separate free-text search are removed;
                  every dependency they carried lives in the tiers:
                  named presets (full specs + estimate badges + gangway/tier
                  call defaults), generic classes (the former buttons' full
                  parameter seeds), custom (the raw fields themselves). */}
              {LOADED_VESSELS.length > 0 && (
                <Autocomplete
                  className="vessel-select"
                  options={vesselOptions()}
                  getOptionLabel={vesselOptionLabel}
                  isOptionEqualToValue={(option, value) => vesselOptionId(option) === vesselOptionId(value)}
                  renderOption={(props, option) => {
                    const { key, ...rest } = props as unknown as Record<string, unknown>;
                    return (
                      <li key={key as React.Key} {...(rest as object)} className={
                        option.kind === 'library' ? 'vessel-option-library'
                          : option.kind === 'generic' ? 'vessel-option-generic'
                          : 'vessel-option-custom'
                      }>
                        <span className="vessel-option-label">{vesselOptionLabel(option)}</span>
                        {option.kind === 'library' && option.vessel.class_note && (
                          <span className="vessel-option-note">{option.vessel.class_note}</span>
                        )}
                      </li>
                    );
                  }}
                  onChange={(_, value: VesselOption | null) => {
                    if (!value) return;
                    if (value.kind === 'library') {
                      applyLibraryVessel(value.vessel);
                    } else if (value.kind === 'generic') {
                      applyGenericSizeClass(value.presetKey);
                    } else {
                      applyCustomVessel();
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Vessel"
                      placeholder="Search by name, IMO, or size class — or pick Custom vessel"
                      margin="normal"
                    />
                  )}
                />
              )}
              {LOADED_VESSELS.length === 0 && (
                <Autocomplete
                  className="vessel-select"
                  options={vesselOptions()}
                  getOptionLabel={vesselOptionLabel}
                  isOptionEqualToValue={(option, value) => vesselOptionId(option) === vesselOptionId(value)}
                  onChange={(_, value: VesselOption | null) => {
                    if (!value) return;
                    if (value.kind === 'generic') {
                      applyGenericSizeClass(value.presetKey);
                    } else if (value.kind === 'custom') {
                      applyCustomVessel();
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Vessel"
                      placeholder="Pick a size class — or Custom vessel"
                      margin="normal"
                    />
                  )}
                />
              )}

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Gross Tonnage (GT)"
                    type="number"
                    value={state.vessel.gt}
                    onChange={(e) => handleVesselChange('gt', parseFloat(e.target.value) || 0)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label={estimatedFields.includes('nt') ? 'Net Tonnage (NT) — est.' : 'Net Tonnage (NT)'}
                    type="number"
                    value={state.vessel.nt || ''}
                    onChange={(e) => handleVesselChange('nt', parseFloat(e.target.value) || undefined)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    helperText={
                      estimatedFields.includes('nt') && state.vessel.nt
                        ? `Estimated value from the vessel library (see source note) — editable · NT class ${getNetTonnageClass(state.vessel.nt)}`
                        : !state.vessel.nt
                          ? 'Will be estimated as 0.55 × GT'
                          : `NT class ${getNetTonnageClass(state.vessel.nt)}`
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="LOA (m)"
                    type="number"
                    value={state.vessel.loa_m || ''}
                    onChange={(e) => handleVesselChange('loa_m', parseFloat(e.target.value) || undefined)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Beam (m)"
                    type="number"
                    value={state.vessel.beam_m || ''}
                    onChange={(e) => handleVesselChange('beam_m', parseFloat(e.target.value) || undefined)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label={estimatedFields.includes('draught_m') ? 'Draft (m) — est.' : 'Draft (m)'}
                    type="number"
                    value={state.vessel.draft_m || ''}
                    onChange={(e) => handleVesselChange('draft_m', parseFloat(e.target.value) || undefined)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    helperText={
                      estimatedFields.includes('draught_m')
                        ? 'Estimated value from the vessel library (see source note) — editable'
                        : ''
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="TEU Capacity"
                    type="number"
                    value={state.vessel.teu_capacity || ''}
                    onChange={(e) => handleVesselChange('teu_capacity', parseFloat(e.target.value) || undefined)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Vessel Type</InputLabel>
                    <Select
                      value={state.call.vessel_type || 'container'}
                      onChange={(e) => handleCallChange('vessel_type', e.target.value as string)}
                      label="Vessel Type"
                    >
                      <MenuItem value="container">Container</MenuItem>
                      <MenuItem value="tanker">Tanker (Energy Port jetties 519-521)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {profileFields.has('build_year') && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Build Year"
                      type="number"
                      value={state.vessel.built_year ?? ''}
                      onChange={(e) => handleVesselChange('built_year', parseFloat(e.target.value) || undefined)}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      helperText="Drives the Hamburg NOx Tier inference when no certified tier is entered (Regulation 13 construction dates; spec v0.2.44); otherwise informational"
                    />
                  </Grid>
                )}
              </Grid>
              {/* General-information group (spec v0.2.47): shared call
                  parameters that describe the call itself, not a port's
                  specific tariff — lay time directly under the selection,
                  the four container counts as one compact secondary row.
                  Lay time is a shared input: the terminal layer's lay-time
                  basis (Eurogate berthing at the default operator, HHLA
                  tonnage dues at the variant) and the HPA demurrage read it
                  at Hamburg (Eurogate P&C 2.1.1–2.1.2, HHLA S4 clause 1.2;
                  the port card keeps its tariff caveats in its helper text),
                  and the Swedish per-commenced-period rules fall back to
                  it. */}
              <Box className="general-info-group" component="section" aria-label="Call general information">
                <Typography variant="subtitle2" component="h3" className="general-info-heading">
                  General call information
                </Typography>
                <TextField
                  className="lay-time-input"
                  label="Lay Time at Berth (hours)"
                  type="number"
                  value={state.call.lay_time_hours ?? ''}
                  onChange={(e) => handleCallChange('lay_time_hours', parseFloat(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  helperText={
                    (assumedFields.includes('lay_time_hours')
                      ? `${PROFILE_ASSUMPTION_TEXT.lay_time_hours}. `
                      : '') +
                    'Lay time runs berthing to casting off; Sundays and holidays count only if worked — modeled as a simple hours input (sources: Eurogate Prices and Conditions 2.1.1–2.1.2; HHLA Quay Tariff S4 clause 1.2). Terminal lay-time charge: Eurogate berthing at the default operator — 1.04 EUR/GT first 24 h, then 0.60 EUR/GT per commenced 12 h; HHLA tonnage dues at the variant — first 24 h full rate, then per commenced 12 h. Blank = not entered'
                  }
                  FormHelperTextProps={{ className: 'profile-assumption-helper' }}
                />
                <Box className="box-counts-row" aria-label="Container moves (loaded and discharged)">
                  <TextField
                    className="box-count-field"
                    label="20' Loaded"
                    type="number"
                    value={state.call.containers_loaded_le20ft}
                    onChange={(e) => handleCallChange('containers_loaded_le20ft', parseInt(e.target.value) || 0)}
                    InputLabelProps={{ shrink: true }}
                    helperText={assumedFields.includes('containers_loaded_le20ft') ? PROFILE_ASSUMPTION_TEXT.containers_loaded_le20ft : undefined}
                    FormHelperTextProps={{ className: 'profile-assumption-helper' }}
                  />
                  <TextField
                    className="box-count-field"
                    label="40' Loaded"
                    type="number"
                    value={state.call.containers_loaded_gt20ft}
                    onChange={(e) => handleCallChange('containers_loaded_gt20ft', parseInt(e.target.value) || 0)}
                    InputLabelProps={{ shrink: true }}
                    helperText={assumedFields.includes('containers_loaded_gt20ft') ? PROFILE_ASSUMPTION_TEXT.containers_loaded_gt20ft : undefined}
                    FormHelperTextProps={{ className: 'profile-assumption-helper' }}
                  />
                  <TextField
                    className="box-count-field"
                    label="20' Discharged"
                    type="number"
                    value={state.call.containers_discharged_le20ft}
                    onChange={(e) => handleCallChange('containers_discharged_le20ft', parseInt(e.target.value) || 0)}
                    InputLabelProps={{ shrink: true }}
                    helperText={assumedFields.includes('containers_discharged_le20ft') ? PROFILE_ASSUMPTION_TEXT.containers_discharged_le20ft : undefined}
                    FormHelperTextProps={{ className: 'profile-assumption-helper' }}
                  />
                  <TextField
                    className="box-count-field"
                    label="40' Discharged"
                    type="number"
                    value={state.call.containers_discharged_gt20ft}
                    onChange={(e) => handleCallChange('containers_discharged_gt20ft', parseInt(e.target.value) || 0)}
                    InputLabelProps={{ shrink: true }}
                    helperText={assumedFields.includes('containers_discharged_gt20ft') ? PROFILE_ASSUMPTION_TEXT.containers_discharged_gt20ft : undefined}
                    FormHelperTextProps={{ className: 'profile-assumption-helper' }}
                  />
                </Box>
              </Box>
                {profileSections.has('godsavgift_parameters') && (
                  <Box className="godsavgift-parameters-group" component="section" aria-label="Cargo tonnage for godsavgift">
                    <Typography variant="caption" component="h4" className="godsavgift-heading">
                      Cargo tonnage for godsavgift (Swedish national cargo fee)
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Avg. weight per 20' container (t)"
                          type="number"
                          value={state.call.cargo_weight_per_20ft ?? ''}
                          onChange={(e) => handleCallChange('cargo_weight_per_20ft', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                          helperText="Suggested planning weight — user-adjustable, not tariff data (OECD 12–18 t/TEU band)"
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Avg. weight per 40' container (t)"
                          type="number"
                          value={state.call.cargo_weight_per_40ft ?? ''}
                          onChange={(e) => handleCallChange('cargo_weight_per_40ft', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                          helperText="Suggested planning weight — user-adjustable, not tariff data (OECD 12–18 t/TEU band)"
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          label="Low-value share of tonnage (%)"
                          type="number"
                          value={state.call.cargo_low_value_share ?? ''}
                          onChange={(e) => handleCallChange('cargo_low_value_share', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                          helperText="Default 0% — 100% high-value for container vessels per the SJÖFS commodity-code annex; the input exists for mixed and non-container calls"
                        />
                      </Grid>
                    </Grid>
                    <Typography variant="caption" className="godsavgift-derived-note">
                      Derived cargo tonnes: (20' loaded + 20' discharged) × avg-20 + (40' loaded + 40' discharged) × avg-40 — international basis (loaded + discharged)
                    </Typography>
                  </Box>
                )}
              </DisclosureCard>
              <DisclosureCard title="Call" summary="Vessel call parameters" defaultOpen>
              {/* ============ VESSEL CALL SEGMENT INPUTS ============ */}
              <Typography variant="h6" component="h3" className="segment-heading vessel-call-heading">
                Vessel Call
              </Typography>
              <Typography variant="body2" className="segment-description">
                Port dues, fairway dues and pilotage, waste, security, lay-up, quay lifts
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Date"
                    type="date"
                    value={state.call.date}
                    onChange={(e) => handleCallChange('date', e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Flag State</InputLabel>
                    <Select
                      value={state.call.flag_state}
                      onChange={(e) => handleCallChange('flag_state', e.target.value as 'EU' | 'non-EU')}
                      label="Flag State"
                    >
                      <MenuItem value="EU">EU</MenuItem>
                      <MenuItem value="non-EU">Non-EU</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {/* Arrival origin (spec v0.2.50): the Gothenburg waste dues split
                    on the previous port of call's region, not the flag. Shared
                    across all ports per the comparison philosophy — one leg,
                    priced identically everywhere. Default: outside Europe (the
                    worst case and the realistic Asia-arrival leg). */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Arrival Origin</InputLabel>
                    <Select
                      value={state.call.arrival_origin || 'outside-europe'}
                      onChange={(e) => handleCallChange('arrival_origin', e.target.value as 'europe' | 'outside-europe')}
                      label="Arrival Origin"
                    >
                      <MenuItem value="outside-europe">From outside Europe</MenuItem>
                      <MenuItem value="europe">From a European port</MenuItem>
                    </Select>
                    <FormHelperText>
                      priced as an arrival from outside Europe — set 'From a European port' for the intra-Europe leg
                    </FormHelperText>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center">
                    <TextField
                      label="ESI Score"
                      type="number"
                      value={state.call.esi_score || ''}
                      onChange={(e) => handleCallChange('esi_score', parseFloat(e.target.value) || undefined)}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      helperText="Blank = not entered (no discount); never treated as a score"
                    />
                    <EnvGuideHelp guide={guideForInput('esi_score')} />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center">
                    <FormControl fullWidth>
                      <InputLabel>Sjöfartsverket Environmental Class</InputLabel>
                      <Select
                        value={state.call.csi_class || ''}
                        onChange={(e) => handleCallChange('csi_class', e.target.value as string | undefined)}
                        label="Sjöfartsverket Environmental Class"
                      >
                        <MenuItem value="A">A</MenuItem>
                        <MenuItem value="B">B</MenuItem>
                        <MenuItem value="C">C</MenuItem>
                        <MenuItem value="D">D</MenuItem>
                        <MenuItem value="E">E (Not Registered)</MenuItem>
                        <MenuItem value="">None</MenuItem>
                      </Select>
                    </FormControl>
                    <EnvGuideHelp guide={guideForInput('csi_class')} />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center">
                    <TextField
                      label="Fossil-Free Fuel %"
                      type="number"
                      value={state.call.fossil_free_fuel_percentage || ''}
                      onChange={(e) => handleCallChange('fossil_free_fuel_percentage', parseFloat(e.target.value) || undefined)}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      helperText="Blank = not entered (no discount); discount needs ≥ 30%"
                    />
                    <EnvGuideHelp guide={guideForInput('fossil_free_fuel_percentage')} />
                  </Box>
                </Grid>
                {profileFields.has('clean_shipping_index') && (
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center">
                      <FormControl fullWidth>
                        <InputLabel>Clean Shipping Index Class (port discount)</InputLabel>
                        <Select
                          value={state.call.clean_shipping_index_class || ''}
                          onChange={(e) => handleCallChange('clean_shipping_index_class', e.target.value === '' ? undefined : e.target.value as string)}
                          label="Clean Shipping Index Class (port discount)"
                        >
                          <MenuItem value="">None</MenuItem>
                          <MenuItem value="1">1</MenuItem>
                          <MenuItem value="2">2</MenuItem>
                          <MenuItem value="3">3</MenuItem>
                          <MenuItem value="4">4 (10% port-dues discount)</MenuItem>
                          <MenuItem value="5">5</MenuItem>
                        </Select>
                      </FormControl>
                      <EnvGuideHelp guide={guideForInput('clean_shipping_index_class')} />
                    </Box>
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Calls This Month"
                    type="number"
                    value={state.call.calls_this_month}
                    onChange={(e) => handleCallChange('calls_this_month', parseInt(e.target.value) || 0)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                {/* Gothenburg same-route second-call attestation (spec
                    v0.2.67, Port Tariff 2026 §2.2 FREQUENCY DISCOUNT): the
                    50% port-dues discount is earned only by a scheduled
                    route calling "twice on the same route (import call and
                    export call)" — a route-pair property the call counter
                    cannot represent. Explicit attestation, off by default
                    (worst case): two unrelated calls in a month do not earn
                    the discount; the second call of a same-route pair does. */}
                {profileFields.has('got_same_route_second_call') && (
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={state.call.got_same_route_second_call || false}
                          onChange={(e) => handleCallChange('got_same_route_second_call', e.target.checked)}
                        />
                      }
                      label="Same-route second call (import + export pair, §2.2)"
                    />
                    <FormHelperText>
                      attest only for the second call of a same-route import/export pair; two unrelated calls in a month do not earn the 50% port-dues discount
                    </FormHelperText>
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={state.call.pilotage_required}
                        onChange={(e) => handleCallChange('pilotage_required', e.target.checked)}
                      />
                    }
                    label="Pilotage Required"
                  />
                </Grid>
                {state.call.pilotage_required && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Pilotage Hours"
                        type="number"
                        value={state.call.pilotage_hours || ''}
                        onChange={(e) => handleCallChange('pilotage_hours', parseFloat(e.target.value) || undefined)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={state.call.pilotage_extra_pilot || false}
                            onChange={(e) => handleCallChange('pilotage_extra_pilot', e.target.checked)}
                          />
                        }
                        label="Extra Pilot"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Pilotage Ordering Lead Time (hours)"
                        type="number"
                        value={state.call.pilotage_ordering_lead_time_hours || ''}
                        onChange={(e) => handleCallChange('pilotage_ordering_lead_time_hours', parseFloat(e.target.value) || undefined)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  </>
                )}
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Lay-up Days (idle, not working cargo)"
                    type="number"
                    value={state.call.lay_up_days || ''}
                    onChange={(e) => handleCallChange('lay_up_days', parseFloat(e.target.value) || undefined)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    helperText="0 for normal calls"
                  />
                </Grid>
              </Grid>
              {/* ============ GOTHENBURG-SPECIFIC CALL INPUTS ============ */}
              {/* Audit pass (spec v0.2.23): the four rules added by the Gothenburg
                  repair (fresh water, sludge excess, scrubber waste, break-bulk)
                  plus the gated idle-berth service are optional inputs; blank
                  values never fire the rules (presence-gated in the data). */}
              </DisclosureCard>
              <DisclosureCard title="Port-Specific Parameters" summary={portLabel(port) + ' only'}>
              <Typography variant="body2" className="segment-description">
                Environmental levers at {port.metadata.name}: {portLevers.join(' · ') || 'none'}. All levers default to the no-discount state — the default call is the worst-case published-rate call (spec v0.2.29); only an explicit entry discounts.
              </Typography>
              {profileSections.has('gothenburg_ancillary') && (
                <>
                  <Typography variant="h6" component="h3" className="segment-heading vessel-call-heading">
                    Gothenburg Ancillary Services (optional)
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Fresh Water Above 50 m³ (m³)"
                        type="number"
                        value={state.call.fresh_water_m3 || ''}
                        onChange={(e) => handleCallChange('fresh_water_m3', parseFloat(e.target.value) || undefined)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        helperText="0 SEK up to 50 m³; 50 SEK/m³ above; blank = not supplied"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Sludge Exceeding 11 m³ (m³)"
                        type="number"
                        value={state.call.sludge_extra_m3 || ''}
                        onChange={(e) => handleCallChange('sludge_extra_m3', parseFloat(e.target.value) || undefined)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        helperText="sludge exceeding the 11 m³ included volume — 2,400 SEK/m³"
                      />
                    </Grid>
                    {/* EU 2022/91 waste-certificate discount (spec v0.2.50, tariff
                        §10): an explicit attestation — off by default per the
                        worst-case posture; discounts the solid-waste line by
                        0.05 SEK/GT only. */}
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={state.call.waste_certificate_2022_91 || false}
                            onChange={(e) => handleCallChange('waste_certificate_2022_91', e.target.checked)}
                          />
                        }
                        label="EU 2022/91 waste certificate held (−0.05 SEK/GT off solid waste)"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={state.call.scrubber_waste || false}
                            onChange={(e) => handleCallChange('scrubber_waste', e.target.checked)}
                          />
                        }
                        label="Scrubber waste disposal (800 SEK admin; actual cost separate)"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Break Bulk (1,000 kg units)"
                        type="number"
                        value={state.call.break_bulk_1000kg || ''}
                        onChange={(e) => handleCallChange('break_bulk_1000kg', parseFloat(e.target.value) || undefined)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        helperText="54 SEK per 1,000 kg; blank = none"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Idle Berth Service Hours"
                        type="number"
                        value={state.call.idle_berth_hours || ''}
                        onChange={(e) => handleCallChange('idle_berth_hours', parseFloat(e.target.value) || undefined)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        helperText="500 SEK/hour, explicit request only; blank = not ordered"
                      />
                    </Grid>
                  </Grid>
                  <Typography variant="h6" component="h3" className="segment-heading vessel-call-heading">
                    Gothenburg Towage (estimated)
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Towage per Tug-Assist (SEK) — est."
                        type="number"
                        value={state.call.towage_cost_per_tug ?? 60000}
                        onChange={(e) => handleCallChange('towage_cost_per_tug', parseFloat(e.target.value) || undefined)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        helperText="Estimated; no published Gothenburg tug tariff (Helsingborg-market anchored)"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Tug Count (blank: LOA-class default)"
                        type="number"
                        value={state.call.tug_count ?? ''}
                        onChange={(e) => handleCallChange('tug_count', parseFloat(e.target.value) || undefined)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        helperText="<150 m: 0; 150–250 m: 1; >250 m: 2 — suggestion, always overridable"
                      />
                    </Grid>
                  </Grid>
                </>
              )}
              {/* ============ HAMBURG-SPECIFIC CALL INPUTS ============ */}
              {/* Port-specific parameters (spec v0.2.20): fee families and inputs
                  differ between ports; these fields appear only on the Hamburg
                  workspace. All are list-price defaults (off/zero/100%) unless
                  the user sets them; estimate flags surface in the results. */}
              {profileSections.has('hamburg_call_parameters') && (
                <>
                  <Typography variant="h6" component="h3" className="segment-heading vessel-call-heading">
                    Hamburg Call Parameters
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Terminal Operator</InputLabel>
                        <Select
                          value={state.call.terminal_operator || (operatorSection?.operators?.[0]?.value ?? '')}
                          onChange={(e) => handleCallChange('terminal_operator', e.target.value as string)}
                          label="Terminal Operator"
                        >
                          {(operatorSection?.operators ?? []).map(op => (
                            <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>
                          ))}
                        </Select>
                        {/* Terminal scope (spec v0.2.49): ship's dues and terminal
                            items are gated to the named operator; port-wide
                            charges (HPA, pilotage, waste, towage) fire either
                            way; the comparison strip restates the operator. */}
                        <FormHelperText>
                          Ship's dues and terminal items are billed by the selected operator; port authority, pilotage, waste and towage apply either way.
                        </FormHelperText>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center">
                        <FormControl fullWidth>
                          <InputLabel>Engine Tier (IAPP, most polluting engine)</InputLabel>
                          <Select
                            value={state.call.engine_tier || 'tier0_default'}
                            onChange={(e) => {
                              const v = e.target.value as string;
                              // One atomic update per selection (spec v0.2.44):
                              // an explicit tier applies and clears the
                              // inference; the not-entered default hands the
                              // decision to the engine's inference contract
                              // (build year present -> inferred tier; blank
                              // -> worst-case Tier 0 with its existing flag).
                              if (v === 'tier0_default') {
                                handleCallChanges({ engine_tier: undefined, engine_tier_estimated: undefined, infer_engine_tier_from_build_year: false });
                              } else {
                                handleCallChanges({ engine_tier: v, engine_tier_estimated: false, infer_engine_tier_from_build_year: false });
                              }
                            }}
                            // Tier-field visibility (spec v0.2.45): the field
                            // shows the tier actually applied, not merely what
                            // was typed — the rendered value states the tier and
                            // where it came from (entered / inferred from build
                            // year / worst-case Tier 0), so the states cannot
                            // be confused. Derived from the same resolution the
                            // engine applies; display only, no computation.
                            renderValue={(selected) => {
                              const v = selected as string;
                              if (v !== 'tier0_default') {
                                return `${v} — entered`;
                              }
                              if (appliedTier.source === 'inferred') {
                                return `${appliedTier.tier} — inferred from build year ${state.vessel.built_year}`;
                              }
                              return 'Not entered — worst case Tier 0 applied';
                            }}
                            label="Engine Tier (IAPP, most polluting engine)"
                          >
                            <MenuItem value="tier0_default">Not entered — inferred from build year per Regulation 13 (blank build year: worst case Tier 0)</MenuItem>
                            <MenuItem value="Tier 0">Tier 0 / no IAPP (+30%)</MenuItem>
                            <MenuItem value="Tier I">Tier I (+25%)</MenuItem>
                            <MenuItem value="Tier II">Tier II (+5%)</MenuItem>
                            <MenuItem value="Tier III">Tier III+ (−20%)</MenuItem>
                          </Select>
                          {/* Effect line (spec v0.2.45): the arithmetic consequence
                              of the applied tier in the tier's own terms, sourced
                              from the same tier-percentage map the guidance uses
                              (envGuidance TIER_PCT) — one source of truth. */}
                          <FormHelperText className="tier-effect-line">{tierEffectLine(appliedTier.tier)}</FormHelperText>
                          <FormHelperText>Explicit entry wins; otherwise inferred from build year per Regulation 13; otherwise worst case Tier 0.</FormHelperText>
                        </FormControl>
                        <EnvGuideHelp guide={guideForInput('engine_tier')} />
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center">
                        <TextField
                          label="ESI Air Score (0–100)"
                          type="number"
                          value={state.call.esi_score ?? ''}
                          onChange={(e) => handleCallChange('esi_score', parseFloat(e.target.value) || undefined)}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                          helperText="Only if registered in the IAPH database; blank = not entered (no discount), never treated as a score"
                        />
                        <EnvGuideHelp guide={guideForInput('esi_score')} />
                      </Box>
                    </Grid>
                    {bandDefFor('esi_score') && (
                      <Grid item xs={12} sm={6}>
                        <BandSelect
                          def={bandDefFor('esi_score')!}
                          value={state.call.esi_score}
                          onValueChange={(v) => handleCallChange('esi_score', v)}
                          selectLabel="ESI air tier (STC 4.1.1.1)"
                          label="Bands: Environmental Ship Index air score 20 up to < 25 = 0.35% (max € 175); 25 up to < 35 = 0.7% (max € 350); 35 up to < 50 = 3.5% (max € 700); ≥ 50 = 7% (max € 1,050) — special tariff 140, stc-maritime-shipping-2026.pdf"
                          helperText="Selecting a tier writes the score field; editing the score re-bands this select"
                        />
                      </Grid>
                    )}
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center">
                        <TextField
                          label="ESI Noise Score (0–100)"
                          type="number"
                          value={state.call.esi_noise_score ?? ''}
                          onChange={(e) => handleCallChange('esi_noise_score', parseFloat(e.target.value) || undefined)}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                          helperText="Separate discount; only if registered"
                        />
                        <EnvGuideHelp guide={guideForInput('esi_noise_score')} />
                      </Box>
                    </Grid>
                    {bandDefFor('esi_noise_score') && (
                      <Grid item xs={12} sm={6}>
                        <BandSelect
                          def={bandDefFor('esi_noise_score')!}
                          value={state.call.esi_noise_score}
                          onValueChange={(v) => handleCallChange('esi_noise_score', v)}
                          selectLabel="ESI noise tier (STC 4.1.1.2)"
                          label="Bands: Environmental Ship Index noise score 40 up to < 45 = 0.15% (max € 75); 45 up to < 55 = 0.3% (max € 150); 55 up to < 70 = 1.5% (max € 300); ≥ 70 = 3% (max € 450) — special tariff 141, stc-maritime-shipping-2026.pdf"
                          helperText="Selecting a tier writes the score field; editing the score re-bands this select"
                        />
                      </Grid>
                    )}
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center">
                        <TextField
                          label="Quantum: prior-year paid GT"
                          type="number"
                          value={state.call.quantum_prior_year_gt ?? ''}
                          onChange={(e) => handleCallChange('quantum_prior_year_gt', parseFloat(e.target.value) || undefined)}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                          helperText=">1.5m → 2.5%, >10m → 5%, >25m → 7.5%; 0 = no discount"
                        />
                        <EnvGuideHelp guide={guideForInput('quantum_prior_year_gt')} />
                      </Box>
                    </Grid>
                    {bandDefFor('quantum_prior_year_gt') && (
                      <Grid item xs={12} sm={6}>
                        <BandSelect
                          def={bandDefFor('quantum_prior_year_gt')!}
                          value={state.call.quantum_prior_year_gt === 0 ? undefined : state.call.quantum_prior_year_gt}
                          onValueChange={(v) => handleCallChange('quantum_prior_year_gt', v === undefined ? 0 : v)}
                          selectLabel="Quantum tier (STC 4.1.2.11)"
                          label="Steps: > 1.5m GT and ≤ 10m = 2.5%; > 10m and ≤ 25m = 5.0%; > 25m = 7.5% on the GT component — special tariff 280, stc-maritime-shipping-2026.pdf"
                          helperText="Selecting a tier writes the GT field; editing the GT re-bands this select; 0 = no discount"
                        />
                      </Grid>
                    )}
                    {/* Lay Time at Berth moved to the general-information group
                        (spec v0.2.47): a shared input rendered once beneath the
                        vessel selection, not per port card. The Hamburg tariff
                        caveats travel with it in its helper text. */}
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Total Time in Port (hours)"
                        type="number"
                        value={state.call.port_time_hours ?? ''}
                        onChange={(e) => handleCallChange('port_time_hours', parseFloat(e.target.value) || undefined)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        helperText="Demurrage beyond the 120 h port-fee coverage; blank uses lay time"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Elbe Transit Segment (% of full)"
                        type="number"
                        value={state.call.pilotage_segment_pct ?? 100}
                        onChange={(e) => handleCallChange('pilotage_segment_pct', parseFloat(e.target.value) || undefined)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        helperText="100 = Hamburg↔Elbe buoy; partial transits (e.g. 40 Cuxhaven) scale dues and fees"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Towage per Call (EUR) — est."
                        type="number"
                        value={state.call.towage_amount ?? 15000}
                        onChange={(e) => handleCallChange('towage_amount', parseFloat(e.target.value) || undefined)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        helperText="Estimated; no published tariff (3 tugs × ~5,000 EUR market range)"
                      />
                    </Grid>
                    {/* HHLA-variant inputs (spec v0.2.66): the handling-rate
                        estimate and the gangway charges are HHLA layer;
                        under the Eurogate default the handling rate is the
                        published 5.1.1 price and S9 carries no gangway
                        charge, so the fields render only for the variant. */}
                    {(state.call.terminal_operator === 'HHLA') && (
                      <>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Handling Rate per Move (EUR) — est."
                            type="number"
                            value={state.call.handling_rate_per_move ?? 358}
                            onChange={(e) => handleCallChange('handling_rate_per_move', parseFloat(e.target.value) || undefined)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            helperText="Estimated; HHLA unpublished, anchored to Eurogate Hamburg 5.1.1"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Gangways"
                            type="number"
                            value={state.call.gangway_count ?? 1}
                            onChange={(e) => handleCallChange('gangway_count', parseFloat(e.target.value) || undefined)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            helperText="One gangway per call default"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Gangway Supervision (hours)"
                            type="number"
                            value={state.call.gangway_supervision_hours ?? 0}
                            onChange={(e) => handleCallChange('gangway_supervision_hours', parseFloat(e.target.value) || undefined)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            helperText="101.30 EUR/h during operations; 0 in reference calls"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel>Gangway Class</InputLabel>
                            <Select
                              value={state.call.gangway_class || 'overseas'}
                              onChange={(e) => handleCallChange('gangway_class', e.target.value as string)}
                              label="Gangway Class"
                            >
                              <MenuItem value="feeder">Feeder (453.50 EUR)</MenuItem>
                              <MenuItem value="overseas">Overseas (633.80 EUR)</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      </>
                    )}
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={state.call.hpa_berth_usage || false}
                            onChange={(e) => handleCallChange('hpa_berth_usage', e.target.checked)}
                          />
                        }
                        label="Vessel at an HPA-operated berth (not a terminal berth; enables HPA berth fees)"
                      />
                    </Grid>
                    {state.call.hpa_berth_usage && (
                      <>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel>HPA Berth Type</InputLabel>
                            <Select
                              value={state.call.berth_type || 'quay'}
                              onChange={(e) => handleCallChange('berth_type', e.target.value as string)}
                              label="HPA Berth Type"
                            >
                              <MenuItem value="quay">Quay (0.0152 EUR/GT per 6 h)</MenuItem>
                              <MenuItem value="dolphins">Dolphins (0.0052 EUR/GT per 6 h)</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Berth Hours"
                            type="number"
                            value={state.call.berth_hours ?? ''}
                            onChange={(e) => handleCallChange('berth_hours', parseFloat(e.target.value) || undefined)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                      </>
                    )}
                    <Grid item xs={12}>
                      <Typography variant="body2" className="segment-description">
                        Waste-fee reductions (application-based, off by default; combinable)
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={state.call.waste_short_sea_reduction || false}
                            onChange={(e) => handleCallChange('waste_short_sea_reduction', e.target.checked)}
                          />
                        }
                        label="Short-sea (−90%)"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={state.call.waste_alternative_fuel_reduction || false}
                            onChange={(e) => handleCallChange('waste_alternative_fuel_reduction', e.target.checked)}
                          />
                        }
                        label="Alternative fuel (−50% MARPOL I)"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={state.call.waste_sustainable_waste_reduction || false}
                            onChange={(e) => handleCallChange('waste_sustainable_waste_reduction', e.target.checked)}
                          />
                        }
                        label="Sustainable waste (−2% MARPOL V)"
                      />
                    </Grid>
                    {/* Eurogate optional services (spec v0.2.66, S9 chs. 2/5/9):
                        ordered or gated services rendered only under the
                        Eurogate operator; blank charges nothing. */}
                    {(state.call.terminal_operator !== 'HHLA') && (
                      <>
                        <Grid item xs={12}>
                          <Typography variant="body2" className="segment-description">
                            EUROGATE optional services (ordered services, blank = not ordered; Prices and Conditions chs. 2, 5, 9)
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Lashing / unlashing containers (47.00 EUR each)"
                            type="number"
                            value={state.call.lashing_containers ?? ''}
                            onChange={(e) => handleCallChange('lashing_containers', parseFloat(e.target.value) || undefined)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            helperText="System lashings on board, per container handled/restowed (P&C 5.2.1)"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Twistlock containers (24.00 EUR each)"
                            type="number"
                            value={state.call.twistlock_containers ?? ''}
                            onChange={(e) => handleCallChange('twistlock_containers', parseFloat(e.target.value) || undefined)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            helperText="Setting / removing twistlocks on board, per container (P&C 5.2.2)"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="IMO containers (87.00 EUR each)"
                            type="number"
                            value={state.call.imo_containers ?? ''}
                            onChange={(e) => handleCallChange('imo_containers', parseFloat(e.target.value) || undefined)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            helperText="Surcharge for IMO (dangerous-goods) containers, per container (P&C 5.3)"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Small-call handled containers (≤20 → 3,308.00 EUR per ship)"
                            type="number"
                            value={state.call.small_call_containers ?? ''}
                            onChange={(e) => handleCallChange('small_call_containers', parseFloat(e.target.value) || undefined)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            helperText="Enter the call's handled-container count only for a small call (P&C 5.4); blank = not a small call"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Lay-by berth hours (1.34 EUR/TEU per commenced 24 h)"
                            type="number"
                            value={state.call.layby_hours ?? ''}
                            onChange={(e) => handleCallChange('layby_hours', parseFloat(e.target.value) || undefined)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            helperText="Lay-by use before start / after completion of cargo operations (P&C 2.1.4); TEU basis is the vessel's nominal intake"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Reefer days beyond the first 24 h (144.50 EUR/reefer/day)"
                            type="number"
                            value={state.call.reefer_extra_days ?? ''}
                            onChange={(e) => handleCallChange('reefer_extra_days', parseFloat(e.target.value) || undefined)}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            helperText="Subsequent 24-h temperature maintenance (P&C 9.2); requires reefer units in the shared special-cargo group"
                          />
                        </Grid>
                      </>
                    )}
                  </Grid>
                </>
              )}

              {/* ============ HELSINGBORG-SPECIFIC CALL INPUTS ============ */}
              {/* Port-specific parameters (spec v0.2.21): the port's own discount
                  scale (Clean Shipping Index class 1-5, distinct from
                  Sjöfartsverket's A-E environmental class), ISSC status driving
                  the double security fee, the datestamped EES level, and the
                  estimated towage parameters with LOA-class tug defaults. */}
              {profileSections.has('helsingborg_call_parameters') && (
                <>
                  <Typography variant="h6" component="h3" className="segment-heading vessel-call-heading">
                    Helsingborg Call Parameters
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={state.call.issc_valid ?? true}
                            onChange={(e) => handleCallChange('issc_valid', e.target.checked)}
                          />
                        }
                        label="Valid ISSC certificate (unchecked: double security fee)"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="EES per Move (SEK) — datestamped level"
                        type="number"
                        value={state.call.ees_rate_per_move ?? 35}
                        onChange={(e) => handleCallChange('ees_rate_per_move', parseFloat(e.target.value) || undefined)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        helperText="September 2026 level: 35 SEK/move; monthly HVO band table in the tariff"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Towage per Tug-Assist (SEK) — est."
                        type="number"
                        value={state.call.towage_cost_per_tug ?? 60000}
                        onChange={(e) => handleCallChange('towage_cost_per_tug', parseFloat(e.target.value) || undefined)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        helperText="Estimated; no published Helsingborg tug tariff"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Tug Count (blank: LOA-class default)"
                        type="number"
                        value={state.call.tug_count ?? ''}
                        onChange={(e) => handleCallChange('tug_count', parseFloat(e.target.value) || undefined)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        helperText="<150 m: 0; 150–250 m: 1; >250 m: 2 — suggestion, always overridable"
                      />
                    </Grid>
                  </Grid>
                </>
              )}
              </DisclosureCard>
              <DisclosureCard title="Call (continued)" summary="Energy at berth; yard & storage" defaultOpen>
              {/* ============ ENERGY AT BERTH SEGMENT INPUTS ============ */}
              <Typography variant="h6" component="h3" className="segment-heading energy-heading">
                Energy at Berth
              </Typography>
              <Typography variant="body2" className="segment-description">
                OPS connection and shore-power components
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center">
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={state.call.ops_usage}
                          onChange={(e) => handleCallChange('ops_usage', e.target.checked)}
                        />
                      }
                      label="OPS Usage"
                    />
                    <EnvGuideHelp guide={guideForInput('ops_usage')} />
                  </Box>
                </Grid>
                {/* Spec v0.2.32 removed the dead OPS kWh/price inputs (never
                    read by engine or data). Spec v0.2.57 re-introduces them as
                    a per-port speculative input group (descriptor-driven,
                    opsComponentsForPort): AFIR/FuelEU make OPS effectively
                    mandatory at key EU ports from 2030, but no in-scope
                    published tariff prices it — these are free-number user
                    speculation, deliberately outside the tariff-traceability
                    contract, never in ports.json. Blank contributes zero and
                    renders nothing; every entered value renders under an
                    explicit "user-specified, not tariff-derived" label.
                    ops_usage above stays live (Hamburg OPS rebate, Gothenburg
                    tanker connection-fee condition). */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" className="ops-speculative-group-label">
                    OPS speculation (user-specified, not tariff-derived)
                  </Typography>
                  <Typography variant="caption" className="ops-speculative-group-note">
                    No published container-terminal OPS rate exists at this port — enter your own assumptions; entered values render in a separate block and add to the Grand Total.
                    The price inputs are this port's own (per-port; they survive port switches and never price another port); the consumption (kWh) input is shared across all ports — it prices the electricity line at every port with its own entered price.
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label={`Estimated OPS consumption (kWh)`}
                    type="number"
                    value={state.call.ops_kwh_consumption ?? ''}
                    onChange={(e) => handleCallChange('ops_kwh_consumption', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    helperText="Required enabling input: the electricity line needs it. Shared across all ports (currency-neutral): it prices the electricity line at every port with its own entered price, so changing it here changes other ports' OPS amounts too"
                  />
                </Grid>
                {opsComponents.electricity.enabled && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label={`OPS electricity price (${opsComponents.electricity.unit})`}
                      type="number"
                      value={state.call.ops_electricity_price ?? ''}
                      onChange={(e) => handleCallChange('ops_electricity_price', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      helperText={`User-specified ${opsComponents.electricity.currency}/kWh — not a tariff rate; blank = none`}
                    />
                  </Grid>
                )}
                {opsComponents.demand.enabled && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label={`OPS demand charge (${opsComponents.demand.unit})`}
                      type="number"
                      value={state.call.ops_demand_charge ?? ''}
                      onChange={(e) => handleCallChange('ops_demand_charge', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      helperText={`User-specified flat per call — not a tariff rate; blank = none`}
                    />
                  </Grid>
                )}
                {opsComponents.connection.enabled && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label={`OPS service/connection charge (${opsComponents.connection.unit})`}
                      type="number"
                      value={state.call.ops_connection_charge ?? ''}
                      onChange={(e) => handleCallChange('ops_connection_charge', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      helperText={`User-specified flat per call — not a tariff rate; blank = none`}
                    />
                  </Grid>
                )}
                {opsComponents.per_gt.enabled && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label={`OPS additional per-GT charge (${opsComponents.per_gt.unit})`}
                      type="number"
                      value={state.call.ops_per_gt_charge ?? ''}
                      onChange={(e) => handleCallChange('ops_per_gt_charge', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      helperText={`User-specified, not a tariff rate — no published tariff prices container-terminal OPS per GT (Gothenburg's only published OPS due is the flat tanker-jetty connection fee); the amount uses the same GT basis as the port dues and flows into the derived SEK/GT metric. Blank disables.`}
                    />
                  </Grid>
                )}
              </Grid>

              {/* ============ TERMINAL AND YARD SEGMENT INPUTS ============ */}
              <Typography variant="h6" component="h3" className="segment-heading terminal-heading">
                Yard &amp; Storage
              </Typography>
              <Typography variant="body2" className="segment-description">
                Storage, yard surcharges (gate hazardous at Gothenburg only)
              </Typography>

              {/* The four container counts moved to the general-information
                  group (spec v0.2.47): shared call parameters rendered once
                  beneath the vessel selection. The counts drive terminal
                  handling at all three ports, so they are shared inputs, not
                  port-specific ones. */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Storage Days (Export)"
                    type="number"
                    value={state.call.storage_days_export || ''}
                    onChange={(e) => handleCallChange('storage_days_export', parseFloat(e.target.value) || undefined)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Storage Days (Import)"
                    type="number"
                    value={state.call.storage_days_import || ''}
                    onChange={(e) => handleCallChange('storage_days_import', parseFloat(e.target.value) || undefined)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Reefer Units"
                    type="number"
                    value={state.call.reefer_units ?? ''}
                    onChange={(e) => handleCallChange('reefer_units', e.target.value === '' ? undefined : parseInt(e.target.value))}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    helperText="Blank = no reefer units (no reefer surcharge); yard surcharges are per unit per day"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="OOG Units"
                    type="number"
                    value={state.call.oog_units ?? ''}
                    onChange={(e) => handleCallChange('oog_units', e.target.value === '' ? undefined : parseInt(e.target.value))}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    helperText="Blank = no out-of-gauge units (no OOG surcharge)"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Dangerous Goods Units"
                    type="number"
                    value={state.call.dangerous_goods_units ?? ''}
                    onChange={(e) => handleCallChange('dangerous_goods_units', e.target.value === '' ? undefined : parseInt(e.target.value))}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    helperText="Blank = no dangerous-goods units (no DG yard surcharge or gate fee)"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Overdue Dangerous Units"
                    type="number"
                    value={state.call.overdue_dangerous_units ?? ''}
                    onChange={(e) => handleCallChange('overdue_dangerous_units', e.target.value === '' ? undefined : parseInt(e.target.value))}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    helperText="Units left overdue in the yard (penalty rate); blank = none"
                  />
                </Grid>
              </Grid>

              </DisclosureCard>
              {/* Optional details (low-relevance inputs) */}
              <Box sx={{ mt: 3 }}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography>Optional Details</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Hatch Cover Count"
                          type="number"
                          value={state.call.hatch_cover_count || ''}
                          onChange={(e) => handleCallChange('hatch_cover_count', parseInt(e.target.value) || 0)}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Gearbox Count"
                          type="number"
                          value={state.call.gearbox_count || ''}
                          onChange={(e) => handleCallChange('gearbox_count', parseInt(e.target.value) || 0)}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Box>
            </Paper>
          </Grid>
  );
};
