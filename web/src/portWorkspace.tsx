import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Collapse,
  Divider,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import type {
  CallInput,
  CostCalculationInput,
  CostCalculationResult,
  CostSegment,
  FeeResult,
  PortDefinition,
  QualityFlag,
  VesselInput
} from '@port-cost/core';
import {
  FEE_FAMILY_TO_SEGMENT,
  calculatePortCallCost,
  inferEngineTier,
  opsComponentsForPort,
  portInputProfile,
  namedProfile,
  genericProfile,
  PROFILE_SEEDED_CALL_FIELDS
} from '@port-cost/core';
import type { SeededProfile } from '@port-cost/core';
import { partitionFees } from './zeroCollapse';
import { badgesForFlags } from './flagBadges';
import { DerivationDetail } from './derivation';
import { makeComputer, guideFor, leversForPort } from './envGuidance';
import type { InputGuide } from './envGuidance';
import { customVesselLabel, GENERIC_SIZE_CLASS_LABELS, VESSEL_PRESETS } from './vesselOptions';
import type { LibraryVessel } from './vesselOptions';
import { WorkspaceInputs } from './portWorkspaceInputs';
import { FrequencyPanel } from './frequencyPanel';

// Segment metadata for the toggleable pages (spec v0.2.60 decomposition):
// extracted from App.tsx verbatim.
// Segment metadata for the toggleable pages
// Internal keys (CostSegment) and all logic are unchanged; labels are display-only (spec v0.2.16)
const SEGMENTS: { id: CostSegment; label: string; description: string; subtitle?: string }[] = [
  {
    id: 'vessel_call',
    label: 'Vessel Call',
    description: 'Port dues, fairway dues and pilotage, waste, security, lay-up, quay lifts',
    subtitle: 'Includes terminal vessel operations: lifts on/off, hatch covers, gearbox'
  },
  {
    id: 'energy_at_berth',
    label: 'Energy at Berth',
    description: 'OPS connection and shore-power components'
  },
  {
    id: 'terminal_and_yard',
    label: 'Yard & Storage',
    description: 'Storage, yard surcharges, cargo-tied idle berth (gate hazardous at Gothenburg only)'
  }
];

// Define types for our app state (spec v0.2.60 decomposition).
// Define types for our app state
interface AppState {
  vessel: VesselInput;
  call: CallInput;
  result: CostCalculationResult | null;
  isLoading: boolean;
  error: string | null;
  expandedBillers: Set<string>;
  expandedFees: Set<string>;
  // Zero-line collapse disclosure (spec v0.2.27): collapsed lines render as one
  // expandable row; this is presentation state only, never affects computation.
  zeroLinesExpanded: boolean;
}

// Gothenburg compulsory waste lines (spec v0.2.60 decomposition).
// Gothenburg compulsory waste lines (spec v0.2.50): the per-GT sludge and
// solid-waste dues are compulsory on every calling vessel per Swedish
// legislation (tariff §6); only the Transport Agency exemption relieves them
// (§12). These four rule ids render the compulsory-basis helper sentence.
const WASTE_COMPULSORY_RULES = [
  'port_gothenburg_waste_solid_eu',
  'port_gothenburg_waste_solid_non_eu',
  'port_gothenburg_waste_sludge_eu',
  'port_gothenburg_waste_sludge_non_eu'
];

// Profile-assumption helper sentences (spec v0.2.60 decomposition):
// the seeded-field assumption text, moved beside its rendering surface.
  const PROFILE_ASSUMPTION_TEXT: Record<string, string> = {
    lay_time_hours: 'lay time assumed from vessel class at Gothenburg-class productivity — adjust for your actual call',
    containers_loaded_le20ft: 'moves assumed from vessel class (loaded share) — adjust for your actual call',
    containers_loaded_gt20ft: 'moves assumed from vessel class (loaded share) — adjust for your actual call',
    containers_discharged_le20ft: 'moves assumed from vessel class (discharged share) — adjust for your actual call',
    containers_discharged_gt20ft: 'moves assumed from vessel class (discharged share) — adjust for your actual call'
  };

interface PortWorkspaceProps {
  port: PortDefinition;
  vessel: VesselInput;
  call: CallInput;
  onVesselChange: (vessel: VesselInput) => void;
  onCallChange: (call: CallInput) => void;
  // Per-port reset control (spec v0.2.60): clears this port's own entered
  // port-specific values back to their defaults. Optional with a no-op
  // default: the App wires it, and suites that pin the workspace without
  // the persistence behavior render unchanged.
  onResetPortFields?: () => void;
  onActiveVesselChange: (label: string) => void;
  // Profile-assumption fields (spec v0.2.48), lifted to App so the
  // comparison view's context strip states the same assumptions once.
  // Optional with safe defaults: the App wires both, and tests that pin
  // the flag behavior pass them explicitly.
  assumedCallFields?: string[];
  onAssumedCallFieldsChange?: (fields: string[]) => void;
}

// Tier-field visibility (spec v0.2.45): extracted from App.tsx verbatim.
// Tier-field visibility (spec v0.2.45): the tier the engine will actually
// apply, derived from the same resolution order the engine's
// resolveEngineTier uses (explicit entry > build-year inference > worst-case
// Tier 0). The applied state mirrors the engine contract; presentation only,
// no figure is recomputed here.
const appliedTierState = (
  call: CallInput,
  builtYear: number | undefined
): { tier: string; source: 'entered' | 'inferred' | 'worst-case' } => {
  if (call.engine_tier) return { tier: call.engine_tier, source: 'entered' };
  if (builtYear !== undefined) return { tier: inferEngineTier(builtYear), source: 'inferred' };
  return { tier: 'Tier 0', source: 'worst-case' };
};

// The per-port workspace (spec v0.2.60 decomposition, audit item B
// boundary 2): state, handlers, the total strip, and the results blocks -
// extracted from App.tsx verbatim; the input-form JSX renders through
// WorkspaceInputs with identical DOM.
export const PortWorkspace: React.FC<PortWorkspaceProps> = ({ port, vessel, call, onVesselChange, onCallChange, onResetPortFields, onActiveVesselChange, assumedCallFields = [], onAssumedCallFieldsChange = () => {} }) => {
  // Per-port input profile (spec v0.2.59): the sections and field-level
  // inputs this port's workspace renders are data - declared in the
  // port's YAML input_profile section, registered at module load. The
  // gates below ask the profile; no port id is named in the code.
  const inputProfile = useMemo(() => portInputProfile(port.metadata.id), [port.metadata.id]);
  const profileSections = useMemo(
    () => new Set(inputProfile.sections.map(sec => sec.id)),
    [inputProfile]
  );
  const profileFields = useMemo(
    () => new Set(inputProfile.fields ?? []),
    [inputProfile]
  );
  // The operator list for the operator-scoped section, when present:
  const operatorSection = useMemo(
    () => inputProfile.sections.find(sec => sec.operators),
    [inputProfile]
  );
  // OPS speculative component shape for this port (spec v0.2.57):
  // descriptor-driven presence/currency/unit — the input group renders
  // exactly the components this port's public OPS posture supports.
  const opsComponents = useMemo(() => opsComponentsForPort(port.metadata.id), [port.metadata.id]);
  // Which result page(s) are visible - display filter only, never affects computation
  const [visibleSegments, setVisibleSegments] = useState<CostSegment[]>([
    'vessel_call',
    'energy_at_berth'
  ]);
  // Local workspace state for display only (expansion, loading)
  const [state, setState] = useState<AppState>({
    vessel,
    call,
    result: null,
    isLoading: false,
    error: null,
    expandedBillers: new Set(),
    expandedFees: new Set(),
    zeroLinesExpanded: false
  });

  // Keep workspace state synchronized with shared (parent) inputs
  useEffect(() => {
    setState(prev => ({ ...prev, vessel, call }));
  }, [vessel, call]);

  // Calculate costs when inputs change
  useEffect(() => {
    if (!port) {
      return;
    }

    const calculate = () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const input: CostCalculationInput = {
          vessel: state.vessel,
          call: { ...state.call, port_id: port.metadata.id }
        };

        const result = calculatePortCallCost(port, input);
        setState(prev => ({ ...prev, result, isLoading: false }));
      } catch (err) {
        console.error('Calculation error:', err);
        setState(prev => ({
          ...prev,
          error: `Calculation failed: ${err}`,
          isLoading: false
        }));
      }
    };

    const timer = setTimeout(calculate, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.vessel, state.call, port]);

  // Which form fields currently hold values pre-filled from a library entry
  // whose data is marked estimated (spec v0.2.19: estimated values are never
  // mistaken for registry data — the field shows an "est." badge)
  const [estimatedFields, setEstimatedFields] = useState<string[]>([]);
  // Profile-seeded assumption fields (spec v0.2.48): selecting a preset
  // seeds lay time and the four container counts as class-based assumptions.
  // Every seeded value carries an assumption flag rendered adjacent to its
  // input; a user edit of the field takes ownership and clears its flag.
  // The state is lifted to App so the comparison strip states the same
  // assumptions; the build-year tier flag rides the engine's inference flag
  // (v0.2.44), rendered adjacent per the standing contracts.
  const [assumedFieldsLocal, setAssumedFields] = useState<string[]>(assumedCallFields);
  const assumedFields = assumedFieldsLocal;
  const clearAssumedField = (field: keyof CallInput) => {
    const next = assumedFields.filter(f => f !== field);
    setAssumedFields(next);
    onAssumedCallFieldsChange(next);
  };
  // Seeds a call profile (spec v0.2.48): the shared lay-time and box-count
  // fields take the profile's values with their assumption flags set. A
  // profile that fails the sanity band is never seeded.
  const seedProfile = (profile: SeededProfile | null) => {
    if (!profile) return;
    onCallChange({
      ...call,
      lay_time_hours: profile.lay_time_hours,
      containers_loaded_le20ft: profile.containers_loaded_le20ft,
      containers_loaded_gt20ft: profile.containers_loaded_gt20ft,
      containers_discharged_le20ft: profile.containers_discharged_le20ft,
      containers_discharged_gt20ft: profile.containers_discharged_gt20ft
    });
    const next = [...PROFILE_SEEDED_CALL_FIELDS as string[]];
    setAssumedFields(next);
    onAssumedCallFieldsChange(next);
  };

  // Environmental-input guidance (spec v0.2.29): the money deltas are computed
  // live from the current form state against this port's engine - informative
  // only, never mutating the call state.
  const guidanceComputer = useMemo(
    () => makeComputer([port], state.vessel, state.call),
    [port, state.vessel, state.call]
  );
  const guideForInput = (key: string): InputGuide | null => guideFor(key, port, guidanceComputer);

  // Compact per-port overview of which environmental levers apply where
  const portLevers = useMemo(() => leversForPort(port.metadata.id), [port.metadata.id]);

  const handleVesselChange = (field: keyof VesselInput, value: number | undefined) => {
    // Manual edits clear the estimate badge for that field: the user has taken
    // ownership of the value
    setEstimatedFields(prev => prev.filter(f => f !== field));
    onVesselChange({ ...vessel, [field]: value });
  };

  const handleCallChange = (field: keyof CallInput, value: any) => {
    // Batched from the current prop, not a stale closure copy: consecutive
    // handleCallChange calls in one handler must not clobber each other
    // (the v0.2.44 wiring defect — the old per-call `{ ...call, [field] }`
    // spread lost every field but the last when a handler set several).
    // A user edit of a profile-seeded field takes ownership of the value:
    // the assumption flag clears (spec v0.2.48).
    if ((PROFILE_SEEDED_CALL_FIELDS as string[]).includes(field as string)) {
      clearAssumedField(field);
    }
    onCallChange({ ...call, [field]: value });
  };
  // Tier-field visibility (spec v0.2.45): the field mirrors the tier the
  // engine actually applies, derived from the same inputs the engine's
  // resolveEngineTier reads (explicit entry, else build-year inference,
  // else the v0.2.28 worst case) — presentation only, never a second
  // computation of the fee.
  const appliedTier = appliedTierState(state.call, state.vessel.built_year);
  const handleCallChanges = (fields: Partial<CallInput>) => {
    onCallChange({ ...call, ...fields });
  };

  const applyPreset = (preset: keyof typeof VESSEL_PRESETS) => {
    const presetData = VESSEL_PRESETS[preset];
    onVesselChange({
      ...vessel,
      ...presetData,
      // Generic classes carry no library provenance: clear name/IMO/build
      // year so nothing from a previously selected named vessel survives a
      // class switch (build year especially — it drives tier inference).
      name: undefined,
      imo: undefined,
      built_year: undefined
    });
    // Presets carry no library provenance: clear the estimate badges
    setEstimatedFields([]);
    onActiveVesselChange(GENERIC_SIZE_CLASS_LABELS[preset]);
    // Profile seeding (spec v0.2.48): the generic class seeds its profile
    // (class lay time × class-appropriate productivity, sanity-banded).
    seedProfile(genericProfile(preset));
  };

  // Generic size-class entry (spec v0.2.47 vessel-selection contract):
  // presented as a vessel entry in the combobox, seeded from the same
  // VESSEL_PRESETS particulars the removed button strip carried — no
  // dependency of the old buttons is lost; behavior is identical to the
  // button (a full re-seed of every parameter the preset defines).
  const applyGenericSizeClass = (presetKey: keyof typeof VESSEL_PRESETS) => {
    applyPreset(presetKey);
  };

  // "Custom vessel" (spec v0.2.47): exposes the raw parameter fields — the
  // fields below the combobox are the custom surface. Selection is a no-op
  // on the data (the user edits the fields directly); the entry exists so
  // the combobox states what it prices.
  const applyCustomVessel = () => {
    // no data change: the raw fields below are already the input surface
    onActiveVesselChange(customVesselLabel(vessel));
  };

  // Selecting a library vessel pre-fills the form's inputs — a convenience,
  // not a lock: pre-filled values remain editable (spec section 3.4)
  const applyLibraryVessel = (selected: LibraryVessel | null) => {
    if (!selected) {
      return;
    }
    onActiveVesselChange(`${selected.name} (IMO ${selected.imo})`);
    onVesselChange({
      ...vessel,
      name: selected.name,
      imo: selected.imo,
      gt: selected.gt,
      nt: selected.nt,
      loa_m: selected.loa_m,
      beam_m: selected.beam_m,
      draft_m: selected.draught_m,
      teu_capacity: selected.teu_capacity,
      built_year: selected.built
    });
    onCallChange({
      ...call,
      vessel_type: selected.vessel_type,
      // Gangway class default follows the service (reference §9): feeder-class
      // container vessels get the feeder rate, deep-sea the overseas rate.
      gangway_class: selected.teu_capacity <= 1000 ? 'feeder' : 'overseas',
      // Stored NOx Tier (spec v0.2.29): a library vessel with a certified tier
      // computes at Hamburg without the worst-case-default flag; vessels
      // without one keep the Tier 0 default (never an inferred tier —
      // build-year inference applies, flagged, per v0.2.44).
      ...(selected.engine_tier
        ? { engine_tier: selected.engine_tier, engine_tier_estimated: false, infer_engine_tier_from_build_year: false }
        : { engine_tier: undefined, engine_tier_estimated: undefined, infer_engine_tier_from_build_year: false })
    });
    setEstimatedFields(selected.estimated_fields ?? []);
    // Profile seeding (spec v0.2.48): the named preset seeds its class-based
    // call profile (lay time + the four box counts), each flagged as an
    // assumption. No library vessel carries a certified tier today, so the
    // build-year inference (flagged) does the tier work.
    seedProfile(namedProfile(selected.imo));
  };

  const toggleBiller = (biller: string) => {
    setState(prev => {
      const newSet = new Set(prev.expandedBillers);
      if (newSet.has(biller)) {
        newSet.delete(biller);
      } else {
        newSet.add(biller);
      }
      return { ...prev, expandedBillers: newSet };
    });
  };

  const toggleFee = (feeId: string) => {
    setState(prev => {
      const newSet = new Set(prev.expandedFees);
      if (newSet.has(feeId)) {
        newSet.delete(feeId);
      } else {
        newSet.add(feeId);
      }
      return { ...prev, expandedFees: newSet };
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: port.metadata.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Line labeling (spec v0.2.18 section 4.3): the fee family is the grouping
  // and the rule name is the line. Every fee line is labeled by its distinct
  // rule name, resolved from the port's own fee rules — presentation only.
  const ruleNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const rule of port.fee_rules) {
      map.set(rule.id, rule.name);
    }
    return map;
  }, [port]);
  // Rule attributes that decide the zero-line collapse classification
  // (spec v0.2.27): minimum floors, condition gates, estimate/caveat markers.
  const ruleAttributesById = useMemo(() => {
    const map = new Map<string, { minimum?: number; applicable_conditions?: Record<string, unknown>; estimated_parameter?: unknown; contract_vs_published?: unknown }>();
    for (const rule of port.fee_rules) {
      map.set(rule.id, {
        minimum: rule.minimum,
        applicable_conditions: rule.applicable_conditions,
        estimated_parameter: rule.estimated_parameter,
        contract_vs_published: rule.contract_vs_published
      });
    }
    return map;
  }, [port]);
  const feeLineLabel = (fee: FeeResult) => ruleNameById.get(fee.fee_rule_id) ?? fee.fee_family;

  // Segment subtotals derived from fee_family membership (no manual tagging)
  const segmentTotals = useMemo(() => {
    const totals: Record<CostSegment, number> = {
      vessel_call: 0,
      energy_at_berth: 0,
      terminal_and_yard: 0
    };
    if (state.result) {
      for (const biller of state.result.billers) {
        for (const fee of biller.fees) {
          const segment = FEE_FAMILY_TO_SEGMENT[fee.fee_family] || 'vessel_call';
          totals[segment] += fee.amount;
        }
      }
    }
    return totals;
  }, [state.result]);

  if (!port) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography variant="h6">Loading port data...</Typography>
      </Box>
    );
  }

  return (
    <>
      {/* Persistent total strip - always visible regardless of toggled page */}
      <Paper className="total-strip" elevation={2}>
        <Box className="total-strip-main">
          <Typography variant="h6" component="div">
            Grand Total: <strong>{formatCurrency(state.result?.total ?? 0)}</strong>
          </Typography>
          {/* Per-port reset control (spec v0.2.60): clears this port's own
              entered port-specific inputs back to their defaults. Shared
              inputs are untouched; the control is per-workspace, stated
              quietly beside the total it changes. */}
          <button
            type="button"
            className="workspace-reset"
            onClick={() => onResetPortFields?.()}
          >
            Reset {port.metadata.name} inputs to defaults
          </button>
        </Box>
        <Box className="total-strip-segments">
          {/* OPS user-specified separation (spec v0.2.57): the Grand Total
              distinguishes tariff-derived from user-specified
              contributions — the OPS speculative block is stated as its
              own strip line when entered, absent when blank. */}
          {state.result?.ops_speculative && (
            <Typography variant="body2" className="total-strip-segment">
              <span className="status-badge status-info" style={{ marginRight: '4px' }}>user</span>
              <span className="total-strip-segment-label">OPS user-specified:</span>{' '}
              {formatCurrency(state.result.ops_speculative.amount)}
              <span className="total-strip-segment-label"> (tariff-derived: {formatCurrency(state.result.total - state.result.ops_speculative.amount)})</span>
            </Typography>
          )}
          {(state.result?.total_estimated_parameters ?? 0) > 0 && (            <Typography variant="body2" className="total-strip-segment">              <span className="status-badge status-warning" style={{ marginRight: '4px' }}>est.</span>              <span className="total-strip-segment-label">Estimated parameters:</span>{' '}              {formatCurrency(state.result?.total_estimated_parameters ?? 0)}            </Typography>          )}          {(state.result?.total_estimated_parameters ?? 0) > 0 && (            <Typography variant="body2" className="total-strip-segment">              <span className="total-strip-segment-label">Total without estimates:</span>{' '}              {formatCurrency(state.result?.total_without_estimates ?? 0)}            </Typography>          )}
          {SEGMENTS.map(segment => (
            <Typography key={segment.id} variant="body2" className="total-strip-segment">
              <span className="total-strip-segment-label">{segment.label}:</span>{' '}
              {formatCurrency(segmentTotals[segment.id])}
            </Typography>
          ))}
          {/* Vessel-access aggregate (spec v0.2.30): berth/terminal
              infrastructure + waterway/fairway access + readiness/safety
              capacity. The effective per-GT is the derived comparability
              bridge — the Swedish national fees are per-call by NT class,
              not per-GT; the basis notes state this where it matters. */}
          {state.result?.vessel_access && (
            <Typography variant="body2" className="total-strip-segment">
              <span className="total-strip-segment-label">Vessel access charges:</span>{' '}
              {formatCurrency(state.result.vessel_access.amount)}
              <span style={{ marginLeft: '8px' }}>
                ({state.result.vessel_access.effective_per_gt.toFixed(2)} {state.result.currency}/GT effective — derived, not a published rate)
              </span>
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Main Content */}
      <Grid container spacing={3} className="form-container">
        {/* Input Form - grouped by segment */}
        <WorkspaceInputs
          port={port}
          state={state}
          estimatedFields={estimatedFields}
          assumedFields={assumedFields}
          profileAssumptionText={PROFILE_ASSUMPTION_TEXT}
          handleVesselChange={handleVesselChange}
          handleCallChange={handleCallChange}
          handleCallChanges={handleCallChanges}
          guideForInput={guideForInput}
          portLevers={portLevers}
          profileSections={profileSections}
          profileFields={profileFields}
          operatorSection={operatorSection}
          opsComponents={opsComponents}
          appliedTier={appliedTier}
          applyLibraryVessel={applyLibraryVessel}
          applyGenericSizeClass={applyGenericSizeClass}
          applyCustomVessel={applyCustomVessel}
        />

        {/* Results - segmented pages */}
        <Grid item xs={12} md={6}>
          <Paper className="results-section" elevation={2}>
            <Typography variant="h5" component="h2">Cost Breakdown</Typography>

            {/* Segment page toggles - filter display only */}
            <ToggleButtonGroup
              value={visibleSegments}
              onChange={(_, newValue: CostSegment[]) => setVisibleSegments(newValue)}
              aria-label="Cost segments"
              className="segment-toggle"
              size="small"
              sx={{ mt: 2, mb: 2 }}
            >
              {SEGMENTS.map(segment => (
                <ToggleButton key={segment.id} value={segment.id} aria-label={segment.label}>
                  {segment.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            {state.isLoading ? (
              <Typography>Calculating...</Typography>
            ) : state.error ? (
              <Typography color="error">{state.error}</Typography>
            ) : state.result ? (
              <Box>
                {/* Vessel-access aggregate (spec v0.2.30): the sum of this
                    call's berth/terminal infrastructure + waterway/fairway
                    access + readiness/safety capacity lines, with the
                    effective per-GT derived comparability bridge and the
                    per-rule basis notes. The v0.2.51 audit removed the
                    v0.2.51 audit removed the vessel-particulars recap (pure duplication: GT/NT/LOA live
                    in the vessel card, CSI in its select input) and
                    relocated its one unique datum — the NT class — to the
                    NT field's helper text; this block is retained and
                    themed (it was invisible in dark mode from its
                    introduction: a hardcoded light background under themed
                    text). */}
                {state.result.vessel_access && (
                  <Box className="results-summary-block">
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      Vessel Access Charges
                    </Typography>
                    <Typography>
                      {formatCurrency(state.result.vessel_access.amount)}
                      <span style={{ marginLeft: '8px', fontSize: '0.85rem' }}>
                        ({state.result.vessel_access.effective_per_gt.toFixed(2)} {state.result.currency}/GT effective — derived, not a published rate)
                      </span>
                    </Typography>
                    {state.result.vessel_access.basis_notes.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        {state.result.vessel_access.basis_notes.map((note, i) => (
                          <Typography key={i} variant="caption" display="block" className="source-ref">
                            {note}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Box>
                )}

                {/* Per-segment fee display - stacked on narrow viewports, columns on wide */}
                <Box className="segments-container">
                {SEGMENTS.map(segment => {
                  // Toggling a page filters display only - never the computed total
                  if (!visibleSegments.includes(segment.id)) {
                    return null;
                  }

                  const currentResult = state.result;
                  if (!currentResult) {
                    return null;
                  }

                  // Collect all fees in this segment, grouped by biller.
                  // Zero-line collapse (spec v0.2.27): a zero-amount line with
                  // no user-relevant information collapses out of the main
                  // itemization into the per-segment disclosure row; subtotals
                  // and biller breakdowns are computed figures and stay
                  // untouched. Display only - never the computed total.
                  const segmentBillersRaw = currentResult.billers
                    .map(biller => ({
                      biller: biller.biller,
                      currency: biller.currency,
                      fees: biller.fees.filter(
                        fee => (FEE_FAMILY_TO_SEGMENT[fee.fee_family] || 'vessel_call') === segment.id
                      )
                    }))
                    .filter(b => b.fees.length > 0);
                  const segmentBillers = segmentBillersRaw.map(b => {
                    const { visible } = partitionFees(b.fees, ruleAttributesById);
                    return { ...b, fees: visible };
                  }).filter(b => b.fees.length > 0);
                  const collapsedZeroLines = segmentBillersRaw.flatMap(b =>
                    partitionFees(b.fees, ruleAttributesById).collapsed
                  );
                  // Collapsed zero lines render as one keyboard-operable
                  // disclosure row (spec v0.2.27), aria-expanded/aria-controls
                  // per the v0.2.25 disclosure pattern; expanded lines keep all
                  // presentational styling (badges, source refs, alignment).
                  const zeroLinesOpen = state.zeroLinesExpanded;
                  const ZeroLinesDisclosure = collapsedZeroLines.length > 0 ? (
                    <Box className="zero-lines-disclosure">
                      <button
                        type="button"
                        className="disclosure-header zero-lines-toggle"
                        aria-expanded={zeroLinesOpen}
                        aria-controls={`zero-lines-${segment.id}`}
                        onClick={() => setState(prev => ({ ...prev, zeroLinesExpanded: !prev.zeroLinesExpanded }))}
                      >
                        <Box>
                          {collapsedZeroLines.length} charge{collapsedZeroLines.length > 1 ? 's' : ''} not applicable to this call (0 kr / 0 €)
                        </Box>
                        <KeyboardArrowDown
                          className="disclosure-chevron"
                          style={{ transform: zeroLinesOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}
                        />
                      </button>
                      <div id={`zero-lines-${segment.id}`} className="zero-lines-body" hidden={!zeroLinesOpen}>
                        {collapsedZeroLines.map(fee => (
                          <Box key={fee.fee_rule_id} sx={{ mb: 1 }}>
                            <TableContainer>
                              <Table size="small">
                                <TableBody>
                                  <TableRow>
                                    <TableCell>
                                      <Box display="flex" alignItems="center" sx={{ gap: 1, flexWrap: 'wrap' }}>
                                        {feeLineLabel(fee)}
                                      </Box>
                                      <Box className="source-ref" sx={{ mt: 0.5 }}>
                                        {fee.band_or_basis}
                                      </Box>
                                    </TableCell>
                                    <TableCell align="right" className="amount">
                                      {formatCurrency(fee.amount)}
                                    </TableCell>
                                    <TableCell align="right" />
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </Box>
                        ))}
                      </div>
                    </Box>
                  ) : null;
                  if (segmentBillers.length === 0 && collapsedZeroLines.length === 0) {
                    return (
                      <Box key={segment.id} className="segment-section">
                        <Typography variant="h6" className="segment-title">
                          {segment.label}
                        </Typography>
                        {segment.subtitle && (
                          <Typography variant="caption" className="segment-panel-subtitle">
                            {segment.subtitle}
                          </Typography>
                        )}
                        <Typography variant="body2" className="segment-empty">
                          No fees in this segment for the current call inputs.
                        </Typography>
                        <Divider sx={{ my: 2 }} />
                      </Box>
                    );
                  }
                  if (segmentBillers.length === 0 && collapsedZeroLines.length > 0) {
                    return (
                      <Box key={segment.id} className="segment-section">
                        <Typography variant="h6" className="segment-title">
                          {segment.label}
                          <span className="segment-subtotal">
                            {formatCurrency(segmentTotals[segment.id])}
                          </span>
                        </Typography>
                        {segment.subtitle && (
                          <Typography variant="caption" className="segment-panel-subtitle">
                            {segment.subtitle}
                          </Typography>
                        )}
                        {ZeroLinesDisclosure}
                        <Divider sx={{ my: 2 }} />
                      </Box>
                    );
                  }

                  return (
                    <Box key={segment.id} className="segment-section">
                      <Typography variant="h6" className="segment-title">
                        {segment.label}
                        <span className="segment-subtotal">
                          {formatCurrency(segmentTotals[segment.id])}
                        </span>
                      </Typography>
                      {segment.subtitle && (
                        <Typography variant="caption" className="segment-panel-subtitle">
                          {segment.subtitle}
                        </Typography>
                      )}

                      {segmentBillers.map((billerBreakdown) => {
                        const isExpanded = state.expandedBillers.has(billerBreakdown.biller);
                        const billerSubtotal = billerBreakdown.fees.reduce(
                          (sum, fee) => sum + fee.amount,
                          0
                        );

                        return (
                          <Box key={billerBreakdown.biller} className="biller-section">
                            <Box
                              className="biller-header"
                              onClick={() => toggleBiller(billerBreakdown.biller)}
                              sx={{ cursor: 'pointer' }}
                            >
                              <Typography variant="h6" className="biller-name">
                                {billerBreakdown.biller}
                              </Typography>
                              <Typography variant="h6" className="biller-subtotal">
                                {formatCurrency(billerSubtotal)}
                              </Typography>
                              <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleBiller(billerBreakdown.biller); }}>
                                {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                              </IconButton>
                            </Box>

                            <Collapse in={isExpanded}>
                              <Box sx={{ pl: 2 }}>
                                {Object.entries(
                                  billerBreakdown.fees.reduce((acc, fee) => {
                                    if (!acc[fee.fee_family]) {
                                      acc[fee.fee_family] = [];
                                    }
                                    acc[fee.fee_family].push(fee);
                                    return acc;
                                  }, {} as Record<string, FeeResult[]>)
                                ).map(([feeFamily, fees]) => (
                                  <Box key={feeFamily} className="fee-family-group">
                                    <Typography
                                      variant="subtitle2"
                                      className="fee-family-header"
                                    >
                                      {feeFamily.replace(/_/g, ' ')}
                                    </Typography>

                                    {fees.map((fee: FeeResult) => {
                                      const isExpanded = state.expandedFees.has(fee.fee_rule_id);

                                      return (
                                        <Box key={fee.fee_rule_id} sx={{ mb: 1 }}>
                                          <TableContainer>
                                            <Table size="small">
                                              <TableBody>
                                                <TableRow
                                                  className="expandable-row"
                                                  onClick={() => toggleFee(fee.fee_rule_id)}
                                                >
                                                  <TableCell>
                                                    <Box display="flex" alignItems="center" sx={{ gap: 1, flexWrap: 'wrap' }}>
                                                      {feeLineLabel(fee)}
                                                      {badgesForFlags(fee.quality_flags).map((b, i) => (
                                                        <span
                                                          key={i}
                                                          className={`status-badge ${b.kind === 'estimated' ? 'status-warning' : b.kind === 'assumed' ? 'status-info' : b.kind === 'caveat' ? 'status-caveat' : 'status-info'}`}
                                                          title={b.title}
                                                        >
                                                          {b.label}
                                                        </span>
                                                      ))}
                                                    </Box>
                                                    <Box className="source-ref" sx={{ mt: 0.5 }}>
                                                      {fee.band_or_basis}
                                                    </Box>
                                                    {/* Compulsory basis (spec v0.2.50): the Gothenburg sludge
                                                        and solid-waste lines are compulsory per-GT charges on
                                                        every calling vessel per Swedish legislation; only a
                                                        Transport Agency exemption relieves them (tariff §12). */}
                                                    {WASTE_COMPULSORY_RULES.includes(fee.fee_rule_id) && (
                                                      <Box className="source-ref waste-compulsory-helper" sx={{ mt: 0.5 }}>
                                                        charged to all calling vessels in accordance with Swedish legislation; only a Transport Agency exemption relieves it (tariff §12)
                                                      </Box>
                                                    )}
                                                  </TableCell>
                                                  <TableCell align="right" className="amount">
                                                    {formatCurrency(fee.amount)}
                                                  </TableCell>
                                                  <TableCell align="right">
                                                    <IconButton
                                                      size="small"
                                                      className="fee-derivation-toggle"
                                                      aria-expanded={isExpanded}
                                                      aria-controls={`fee-derivation-${fee.fee_rule_id}`}
                                                      aria-label={`${isExpanded ? 'Hide' : 'Show'} derivation for ${fee.fee_rule_id.replace(/_/g, ' ')}`}
                                                      onClick={(e) => { e.stopPropagation(); toggleFee(fee.fee_rule_id); }}
                                                    >
                                                      {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                                                    </IconButton>
                                                  </TableCell>
                                                </TableRow>

                                                <TableRow className="detail-row">
                                                  <TableCell colSpan={3} style={{ padding: 0 }}>
                                                    <Collapse in={isExpanded}>
                                                      <Box sx={{ p: 2 }} className="detail-row" id={`fee-derivation-${fee.fee_rule_id}`}>
                                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                                          <strong>Rate Applied:</strong> {fee.rate_applied}
                                                        </Typography>
                                                        {/* Derivation transparency (spec v0.2.42): every fee line exposes its derivation — bands, components, adjustment order, flags adjacent — rendered from the engine's own step record; the UI never recomputes. */}
                                                        <DerivationDetail fee={fee} />
                                                        {/* Effective per-GT (spec v0.2.30): every dues-type line renders its own derived per-GT — fee total ÷ vessel GT — labeled as derived, never a published rate; distorting-factor notes name the binding floor/cap/class basis. */}
                                                        {fee.effective_rate && (
                                                          <Typography variant="body2" sx={{ mb: 1 }}>
                                                            <strong>Effective rate for this call</strong> (derived, not a published rate):{' '}
                                                            {fee.effective_rate.effective_per_gt.toFixed(2)} {fee.currency}/GT
                                                            {fee.effective_rate.note && (
                                                              <span className="status-badge status-caveat" style={{ marginLeft: '6px' }}>
                                                                {fee.effective_rate.note}
                                                              </span>
                                                            )}
                                                          </Typography>
                                                        )}
                                                        <Typography variant="body2" className="source-ref">
                                                          Source: {fee.source_reference.document_name}
                                                          (Page {fee.source_reference.page}, {fee.source_reference.clause}) -
                                                          {fee.source_reference.document_not_archived ? (
                                                            <>
                                                              <a href={fee.source_reference.upstream_url} target="_blank" rel="noopener noreferrer">View Document (publisher)</a>
                                                              <span className="status-badge status-caveat">source not archived — upstream linked</span>
                                                            </>
                                                          ) : (
                                                            <a href={fee.source_reference.document_url} target="_blank" rel="noopener noreferrer">
                                                              View Document
                                                            </a>
                                                          )}
                                                        </Typography>

                                                      </Box>
                                                    </Collapse>
                                                  </TableCell>
                                                </TableRow>
                                              </TableBody>
                                            </Table>
                                          </TableContainer>
                                        </Box>
                                      );
                                    })}
                                  </Box>
                                ))}
                              </Box>
                            </Collapse>
                          </Box>
                        );
                      })}
                      {ZeroLinesDisclosure}
                      <Divider sx={{ my: 2 }} />
                    </Box>
                  );
                })}
                </Box>

                {/* Quality Flags Summary */}
                {state.result.quality_flags.length > 0 && (
                  <Box className="quality-flags" sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      Quality Flags ({state.result.quality_flags.length})
                    </Typography>
                    <ul>
                      {state.result.quality_flags.map((flag: QualityFlag, index: number) => (
                        <li key={index}>
                          <span className={flag.severity === 'error' ? 'status-badge status-error' : flag.severity === 'warning' ? 'status-badge status-warning' : 'status-badge status-info'}>
                            [{flag.severity.toUpperCase()}] {flag.description}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Box>
                )}

                {/* OPS speculative block (spec v0.2.57): user-entered OPS
                    components render as their own visibly separated block —
                    never interleaved with tariff lines — each under the
                    explicit user-specified label. Absent when every OPS
                    input is blank (blank changes no total, renders
                    nothing). */}
                {state.result.ops_speculative && (
                  <Box className="ops-speculative-block">
                    <Typography variant="subtitle1" className="ops-speculative-title">
                      OPS (user-specified, not tariff-derived)
                    </Typography>
                    {state.result.ops_speculative.lines.map(line => (
                      <Box key={line.id} className="ops-speculative-line">
                        <span className="ops-speculative-line-label">{line.label}</span>
                        <span className="ops-speculative-line-basis">{line.basis}</span>
                        <span className="ops-speculative-line-amount">{formatCurrency(line.amount)}</span>
                      </Box>
                    ))}
                    <Box className="ops-speculative-total">
                      <span className="ops-speculative-total-label">OPS subtotal (user-specified)</span>
                      <span className="ops-speculative-total-amount">{formatCurrency(state.result.ops_speculative.amount)}</span>
                    </Box>
                  </Box>
                )}
                {/* Call-frequency what-if panel (spec v0.2.63): a
                    workspace-side speculation surface in the OPS tradition.
                    Collapsed by default; its input is local React state —
                    outside the call model, outside every reset_fields list,
                    never feeding the engine, so rendering it changes no
                    total (the zero-drift contract). */}
                <FrequencyPanel
                  port={port}
                  result={state.result}
                  formatCurrency={formatCurrency}
                />
                <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }} className="results-timestamp">
                  Calculation performed: {new Date(state.result.calculation_timestamp).toLocaleString()}
                </Typography>
              </Box>
            ) : (
              <Typography>Enter vessel and call details to see cost breakdown</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </>
  );
};
