import React, { useState, useEffect, useMemo } from 'react';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Button,
  Paper,
  Typography,
  Box,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableContainer,
  TableRow,
  Tabs,
  Tab,
  Collapse,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete,
  Divider
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp, ExpandMore } from '@mui/icons-material';
// Import core types and functions
import {
  VesselInput,
  CallInput,
  CostCalculationInput,
  CostCalculationResult,
  PortDefinition,
  FeeResult,
  QualityFlag,
  CostSegment,
  FEE_FAMILY_TO_SEGMENT,
  getNetTonnageClass,
  calculatePortCallCost
} from '@port-cost/core';

// Import the port registry from canonical sources (converted to JSON at build time).
// The registry contains every port loaded from core/data/*.yaml (spec v0.2.17 section 4.3.1).
import portsRegistry from './data/ports.json';
// Vessel library: curated named-vessel table (spec section 3.4), converted to
// JSON at build time — no runtime API calls.
import vesselLibrary from './data/vessel_library.json';

// Loaded ports; adding a port is a data edit (drop a YAML in core/data/), never a code change
const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);

// Vessel library entries (name, imo, particulars, source_note provenance)
interface LibraryVessel {
  name: string;
  imo: string;
  vessel_type: string;
  flag: string;
  built: number;
  gt: number;
  nt: number;
  loa_m: number;
  beam_m: number;
  draught_m: number;
  teu_capacity: number;
  class_note: string;
  estimated_fields?: string[];
  source_note: string;
}
const LOADED_VESSELS: LibraryVessel[] = (vesselLibrary as any).vessels ?? [];

// Navigation pages per spec v0.2.17 section 4.3.1: per-port workspaces plus a
// distinct comparison screen. Per-port separation is required as soon as a
// second port loads; the selector is always present for forward compatibility.
type Page =
  | { kind: 'port'; portId: string }
  | { kind: 'comparison' };

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
    description: 'Storage, yard surcharges, gate hazardous, cargo-tied idle berth'
  }
];

// Define types for our app state
interface AppState {
  vessel: VesselInput;
  call: CallInput;
  result: CostCalculationResult | null;
  isLoading: boolean;
  error: string | null;
  expandedBillers: Set<string>;
  expandedFees: Set<string>;
}

// Vessel presets
const VESSEL_PRESETS = {
  feeder: { gt: 8000, nt: 4400, loa_m: 150, beam_m: 25, draft_m: 8, teu_capacity: 800 },
  'feeder-max': { gt: 15000, nt: 8250, loa_m: 180, beam_m: 30, draft_m: 10, teu_capacity: 1200 },
  panamax: { gt: 55000, nt: 30250, loa_m: 290, beam_m: 32, draft_m: 12, teu_capacity: 4000 },
  'post-panamax': { gt: 100000, nt: 55000, loa_m: 340, beam_m: 45, draft_m: 14, teu_capacity: 8000 },
  'ultra-large': { gt: 215000, nt: 118250, loa_m: 400, beam_m: 60, draft_m: 16, teu_capacity: 20000 }
};

interface PortWorkspaceProps {
  port: PortDefinition;
  vessel: VesselInput;
  call: CallInput;
  onVesselChange: (vessel: VesselInput) => void;
  onCallChange: (call: CallInput) => void;
}

const PortWorkspace: React.FC<PortWorkspaceProps> = ({ port, vessel, call, onVesselChange, onCallChange }) => {
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
    expandedFees: new Set()
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

  const handleVesselChange = (field: keyof VesselInput, value: number | undefined) => {
    // Manual edits clear the estimate badge for that field: the user has taken
    // ownership of the value
    setEstimatedFields(prev => prev.filter(f => f !== field));
    onVesselChange({ ...vessel, [field]: value });
  };

  const handleCallChange = (field: keyof CallInput, value: any) => {
    onCallChange({ ...call, [field]: value });
  };

  const applyPreset = (preset: keyof typeof VESSEL_PRESETS) => {
    const presetData = VESSEL_PRESETS[preset];
    onVesselChange({ ...vessel, ...presetData });
    // Presets carry no library provenance: clear the estimate badges
    setEstimatedFields([]);
  };

  // Selecting a library vessel pre-fills the form's inputs — a convenience,
  // not a lock: pre-filled values remain editable (spec section 3.4)
  const applyLibraryVessel = (selected: LibraryVessel | null) => {
    if (!selected) {
      return;
    }
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
      gangway_class: selected.teu_capacity <= 1000 ? 'feeder' : 'overseas'
    });
    setEstimatedFields(selected.estimated_fields ?? []);
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
  const feeLineLabel = (fee: FeeResult) => ruleNameById.get(fee.fee_rule_id) ?? fee.fee_family;

  const getCsiClassColor = (csiClass: string | undefined) => {
    if (!csiClass) return '#999';
    const colors = { A: '#4caf50', B: '#8bc34a', C: '#ffeb3b', D: '#ff9800', E: '#f44336' };
    return colors[csiClass as keyof typeof colors] || '#999';
  };

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
        </Box>
        <Box className="total-strip-segments">
          {SEGMENTS.map(segment => (
            <Typography key={segment.id} variant="body2" className="total-strip-segment">
              <span className="total-strip-segment-label">{segment.label}:</span>{' '}
              {formatCurrency(segmentTotals[segment.id])}
            </Typography>
          ))}
        </Box>
      </Paper>

      {/* Main Content */}
      <Grid container spacing={3} className="form-container">
        {/* Input Form - grouped by segment */}
        <Grid item xs={12} md={6}>
          <Paper className="form-section" elevation={2}>
            {/* Vessel Details (shared, always visible) */}
            <Typography variant="h5" component="h2">Vessel Details</Typography>

            {/* Vessel library search/typeahead (spec section 3.4): matches on
                name or IMO; selection pre-fills the inputs below, which stay
                editable */}
            {LOADED_VESSELS.length > 0 && (
              <Autocomplete
                className="vessel-search"
                options={LOADED_VESSELS}
                getOptionLabel={(option: LibraryVessel) =>
                  `${option.name} (IMO ${option.imo})`
                }
                onChange={(_, value: LibraryVessel | null) => applyLibraryVessel(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search vessel library (name or IMO)"
                    placeholder="e.g. HELGAFELL or 9306017"
                    margin="normal"
                  />
                )}
              />
            )}

            <Box className="preset-buttons">
              {Object.entries(VESSEL_PRESETS).map(([key, preset]) => (
                <Button
                  key={key}
                  variant="outlined"
                  className="preset-btn"
                  onClick={() => applyPreset(key as keyof typeof VESSEL_PRESETS)}
                  sx={{
                    borderColor: '#1976d2',
                    color: '#1976d2',
                    '&:hover': { borderColor: '#1976d2', backgroundColor: 'rgba(25, 118, 210, 0.04)' }
                  }}
                >
                  {key.replace('-', ' ').toUpperCase()}
                </Button>
              ))}
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Gross Tonnage (GT)"
                  type="number"
                  value={state.vessel.gt}
                  onChange={(e) => handleVesselChange('gt', parseFloat(e.target.value) || 0)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label={estimatedFields.includes('nt') ? 'Net Tonnage (NT) — est.' : 'Net Tonnage (NT)'}
                  type="number"
                  value={state.vessel.nt || ''}
                  onChange={(e) => handleVesselChange('nt', parseFloat(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  helperText={
                    estimatedFields.includes('nt')
                      ? 'Estimated value from the vessel library (see source note) — editable'
                      : !state.vessel.nt ? 'Will be estimated as 0.55 × GT' : ''
                  }
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="LOA (m)"
                  type="number"
                  value={state.vessel.loa_m || ''}
                  onChange={(e) => handleVesselChange('loa_m', parseFloat(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Beam (m)"
                  type="number"
                  value={state.vessel.beam_m || ''}
                  onChange={(e) => handleVesselChange('beam_m', parseFloat(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
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
              <Grid item xs={6}>
                <TextField
                  label="TEU Capacity"
                  type="number"
                  value={state.vessel.teu_capacity || ''}
                  onChange={(e) => handleVesselChange('teu_capacity', parseFloat(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
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
              {port.metadata.id === 'hamburg' && (
                <Grid item xs={6}>
                  <TextField
                    label="Build Year"
                    type="number"
                    value={state.vessel.built_year ?? ''}
                    onChange={(e) => handleVesselChange('built_year', parseFloat(e.target.value) || undefined)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    helperText="Drives the engine-Tier default (2011+ → Tier II, 2000–2010 → Tier I, earlier → Tier 0)"
                  />
                </Grid>
              )}
            </Grid>

            {/* ============ VESSEL CALL SEGMENT INPUTS ============ */}
            <Typography variant="h6" component="h3" className="segment-heading vessel-call-heading">
              Vessel Call
            </Typography>
            <Typography variant="body2" className="segment-description">
              Port dues, fairway dues and pilotage, waste, security, lay-up, quay lifts
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Date"
                  type="date"
                  value={state.call.date}
                  onChange={(e) => handleCallChange('date', e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
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
              <Grid item xs={6}>
                <TextField
                  label="ESI Score"
                  type="number"
                  value={state.call.esi_score || ''}
                  onChange={(e) => handleCallChange('esi_score', parseFloat(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
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
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Fossil-Free Fuel %"
                  type="number"
                  value={state.call.fossil_free_fuel_percentage || ''}
                  onChange={(e) => handleCallChange('fossil_free_fuel_percentage', parseFloat(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Calls This Month"
                  type="number"
                  value={state.call.calls_this_month}
                  onChange={(e) => handleCallChange('calls_this_month', parseInt(e.target.value) || 0)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
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
                  <Grid item xs={6}>
                    <TextField
                      label="Pilotage Hours"
                      type="number"
                      value={state.call.pilotage_hours || ''}
                      onChange={(e) => handleCallChange('pilotage_hours', parseFloat(e.target.value) || undefined)}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
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
              <Grid item xs={6}>
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
            {/* ============ HAMBURG-SPECIFIC CALL INPUTS ============ */}
            {/* Port-specific parameters (spec v0.2.20): fee families and inputs
                differ between ports; these fields appear only on the Hamburg
                workspace. All are list-price defaults (off/zero/100%) unless
                the user sets them; estimate flags surface in the results. */}
            {port.metadata.id === 'hamburg' && (
              <>
                <Typography variant="h6" component="h3" className="segment-heading vessel-call-heading">
                  Hamburg Call Parameters
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Engine Tier (IAPP, most polluting engine)</InputLabel>
                      <Select
                        value={state.call.engine_tier || 'auto'}
                        onChange={(e) => {
                          const v = e.target.value as string;
                          if (v === 'auto') {
                            handleCallChange('engine_tier', undefined);
                            handleCallChange('engine_tier_estimated', undefined);
                          } else {
                            handleCallChange('engine_tier', v);
                            handleCallChange('engine_tier_estimated', false);
                          }
                        }}
                        label="Engine Tier (IAPP, most polluting engine)"
                      >
                        <MenuItem value="auto">Auto (build-year default, flagged estimated)</MenuItem>
                        <MenuItem value="Tier 0">Tier 0 / no IAPP (+30%)</MenuItem>
                        <MenuItem value="Tier I">Tier I (+25%)</MenuItem>
                        <MenuItem value="Tier II">Tier II (+5%)</MenuItem>
                        <MenuItem value="Tier III">Tier III+ (−20%)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="ESI Air Score (0–100)"
                      type="number"
                      value={state.call.esi_score ?? ''}
                      onChange={(e) => handleCallChange('esi_score', parseFloat(e.target.value) || undefined)}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      helperText="Only if registered in the IAPH database; no default"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="ESI Noise Score (0–100)"
                      type="number"
                      value={state.call.esi_noise_score ?? ''}
                      onChange={(e) => handleCallChange('esi_noise_score', parseFloat(e.target.value) || undefined)}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      helperText="Separate discount; only if registered"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Quantum: prior-year paid GT"
                      type="number"
                      value={state.call.quantum_prior_year_gt ?? ''}
                      onChange={(e) => handleCallChange('quantum_prior_year_gt', parseFloat(e.target.value) || undefined)}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      helperText=">1.5m → 2.5%, >10m → 5%, >25m → 7.5%; 0 = no discount"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Lay Time at Berth (hours)"
                      type="number"
                      value={state.call.lay_time_hours ?? ''}
                      onChange={(e) => handleCallChange('lay_time_hours', parseFloat(e.target.value) || undefined)}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      helperText="HHLA tonnage-dues basis (first 24 h full rate, then per commenced 12 h)"
                    />
                  </Grid>
                  <Grid item xs={6}>
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
                  <Grid item xs={6}>
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
                  <Grid item xs={6}>
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
                  <Grid item xs={6}>
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
                  <Grid item xs={6}>
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
                  <Grid item xs={6}>
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
                  <Grid item xs={6}>
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
                      <Grid item xs={6}>
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
                      <Grid item xs={6}>
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
                  <Grid item xs={4}>
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
                  <Grid item xs={4}>
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
                  <Grid item xs={4}>
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
                </Grid>
              </>
            )}

            {/* ============ HELSINGBORG-SPECIFIC CALL INPUTS ============ */}
            {/* Port-specific parameters (spec v0.2.21): the port's own discount
                scale (Clean Shipping Index class 1-5, distinct from
                Sjöfartsverket's A-E environmental class), ISSC status driving
                the double security fee, the datestamped EES level, and the
                estimated towage parameters with LOA-class tug defaults. */}
            {port.metadata.id === 'helsingborg' && (
              <>
                <Typography variant="h6" component="h3" className="segment-heading vessel-call-heading">
                  Helsingborg Call Parameters
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
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
                  </Grid>
                  <Grid item xs={6}>
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
                  <Grid item xs={6}>
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
                  <Grid item xs={6}>
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
                  <Grid item xs={6}>
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
            {/* ============ ENERGY AT BERTH SEGMENT INPUTS ============ */}
            <Typography variant="h6" component="h3" className="segment-heading energy-heading">
              Energy at Berth
            </Typography>
            <Typography variant="body2" className="segment-description">
              OPS connection and shore-power components
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={state.call.ops_usage}
                      onChange={(e) => handleCallChange('ops_usage', e.target.checked)}
                    />
                  }
                  label="OPS Usage"
                />
              </Grid>
              {state.call.ops_usage && (
                <>
                  <Grid item xs={6}>
                    <TextField
                      label="OPS kWh Demand"
                      type="number"
                      value={state.call.ops_kwh_demand || ''}
                      onChange={(e) => handleCallChange('ops_kwh_demand', parseFloat(e.target.value) || 0)}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="OPS Connected Hours"
                      type="number"
                      value={state.call.ops_connected_hours || ''}
                      onChange={(e) => handleCallChange('ops_connected_hours', parseFloat(e.target.value) || 0)}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Electricity Price (SEK/kWh)"
                      type="number"
                      value={state.call.ops_electricity_price_per_kwh || ''}
                      onChange={(e) => handleCallChange('ops_electricity_price_per_kwh', parseFloat(e.target.value) || 0)}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      helperText="No published container-terminal OPS rate"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Peak Demand (kW)"
                      type="number"
                      value={state.call.ops_peak_demand_kw || ''}
                      onChange={(e) => handleCallChange('ops_peak_demand_kw', parseFloat(e.target.value) || 0)}
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </>
              )}
            </Grid>

            {/* ============ TERMINAL AND YARD SEGMENT INPUTS ============ */}
            <Typography variant="h6" component="h3" className="segment-heading terminal-heading">
              Yard &amp; Storage
            </Typography>
            <Typography variant="body2" className="segment-description">
              Storage, yard surcharges, gate hazardous
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Containers Loaded ≤20ft"
                  type="number"
                  value={state.call.containers_loaded_le20ft}
                  onChange={(e) => handleCallChange('containers_loaded_le20ft', parseInt(e.target.value) || 0)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Containers Loaded >20ft"
                  type="number"
                  value={state.call.containers_loaded_gt20ft}
                  onChange={(e) => handleCallChange('containers_loaded_gt20ft', parseInt(e.target.value) || 0)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Containers Discharged ≤20ft"
                  type="number"
                  value={state.call.containers_discharged_le20ft}
                  onChange={(e) => handleCallChange('containers_discharged_le20ft', parseInt(e.target.value) || 0)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Containers Discharged >20ft"
                  type="number"
                  value={state.call.containers_discharged_gt20ft}
                  onChange={(e) => handleCallChange('containers_discharged_gt20ft', parseInt(e.target.value) || 0)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Storage Days (Export)"
                  type="number"
                  value={state.call.storage_days_export || ''}
                  onChange={(e) => handleCallChange('storage_days_export', parseFloat(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Storage Days (Import)"
                  type="number"
                  value={state.call.storage_days_import || ''}
                  onChange={(e) => handleCallChange('storage_days_import', parseFloat(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Reefer Units"
                  type="number"
                  value={state.call.reefer_units || ''}
                  onChange={(e) => handleCallChange('reefer_units', parseInt(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="OOG Units"
                  type="number"
                  value={state.call.oog_units || ''}
                  onChange={(e) => handleCallChange('oog_units', parseInt(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Dangerous Goods Units"
                  type="number"
                  value={state.call.dangerous_goods_units || ''}
                  onChange={(e) => handleCallChange('dangerous_goods_units', parseInt(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            {/* Optional details (low-relevance inputs) */}
            <Box sx={{ mt: 3 }}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography>Optional Details</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        label="Hatch Cover Count"
                        type="number"
                        value={state.call.hatch_cover_count || ''}
                        onChange={(e) => handleCallChange('hatch_cover_count', parseInt(e.target.value) || 0)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={6}>
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
                {/* Vessel Summary */}
                <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Vessel Summary</Typography>
                  <Typography>GT: {state.result.vessel_summary.gt.toLocaleString()}</Typography>
                  <Typography>NT: {state.result.vessel_summary.nt.toLocaleString()}
                    {state.result.vessel_summary.estimated_nt && (
                      <span className="status-badge status-warning" style={{ marginLeft: '10px' }}>
                        Estimated
                      </span>
                    )}
                  </Typography>
                  {state.result.vessel_summary.loa_m && (
                    <Typography>LOA: {state.result.vessel_summary.loa_m}m</Typography>
                  )}
                  <Typography sx={{ mt: 1, fontSize: '0.8rem', color: '#666' }}>
                    NT Class: {getNetTonnageClass(state.result.vessel_summary.nt)}
                    {state.call.csi_class && (
                      <span style={{
                        marginLeft: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: getCsiClassColor(state.call.csi_class),
                        color: 'white'
                      }}>
                        CSI: {state.call.csi_class}
                      </span>
                    )}
                  </Typography>
                </Box>

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

                  // Collect all fees in this segment, grouped by biller
                  const segmentBillers = currentResult.billers
                    .map(biller => ({
                      biller: biller.biller,
                      currency: biller.currency,
                      fees: biller.fees.filter(
                        fee => (FEE_FAMILY_TO_SEGMENT[fee.fee_family] || 'vessel_call') === segment.id
                      )
                    }))
                    .filter(b => b.fees.length > 0);

                  if (segmentBillers.length === 0) {
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
                                      sx={{ fontWeight: 'bold', color: '#555' }}
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
                                                    <Box display="flex" alignItems="center">
                                                      {feeLineLabel(fee)}
                                                      {fee.quality_flags.length > 0 && (
                                                        <span className="status-badge status-warning" style={{ marginLeft: '10px' }}>
                                                          {fee.quality_flags.length} flag{fee.quality_flags.length > 1 ? 's' : ''}
                                                        </span>
                                                      )}
                                                    </Box>
                                                    <Box sx={{ fontSize: '0.8rem', color: '#666', mt: 0.5 }}>
                                                      {fee.band_or_basis}
                                                    </Box>
                                                  </TableCell>
                                                  <TableCell align="right" className="amount">
                                                    {formatCurrency(fee.amount)}
                                                  </TableCell>
                                                  <TableCell align="right">
                                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleFee(fee.fee_rule_id); }}>
                                                      {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                                                    </IconButton>
                                                  </TableCell>
                                                </TableRow>

                                                <TableRow className="detail-row">
                                                  <TableCell colSpan={3} style={{ padding: 0 }}>
                                                    <Collapse in={isExpanded}>
                                                      <Box sx={{ p: 2, backgroundColor: '#f9f9f9' }}>
                                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                                          <strong>Rate Applied:</strong> {fee.rate_applied}
                                                        </Typography>

                                                        {fee.adjustments_applied.length > 0 && (
                                                          <Typography variant="body2" sx={{ mb: 1 }}>
                                                            <strong>Adjustments:</strong>
                                                            {fee.adjustments_applied.map(a => `${a.type} ${a.percentage}%`).join(', ')}
                                                          </Typography>
                                                        )}

                                                        <Typography variant="body2" className="source-ref">
                                                          Source: {fee.source_reference.document_name}
                                                          (Page {fee.source_reference.page}, {fee.source_reference.clause}) -
                                                          <a href={fee.source_reference.document_url} target="_blank" rel="noopener noreferrer">
                                                            View Document
                                                          </a>
                                                        </Typography>

                                                        {fee.quality_flags.map((flag: QualityFlag, index: number) => (
                                                          <Typography
                                                            key={index}
                                                            variant="body2"
                                                            sx={{
                                                              mt: 1,
                                                              p: 1,
                                                              backgroundColor: flag.severity === 'error' ? '#ffebee' : flag.severity === 'warning' ? '#fff3cd' : '#e3f2fd',
                                                              borderRadius: '4px',
                                                              fontSize: '0.8rem'
                                                            }}
                                                          >
                                                            [{flag.severity.toUpperCase()}] {flag.description}
                                                          </Typography>
                                                        ))}
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
                          <span style={{
                            color: flag.severity === 'error' ? '#dc3545' : flag.severity === 'warning' ? '#856404' : '#0c5460'
                          }}>
                            [{flag.severity.toUpperCase()}] {flag.description}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Box>
                )}

                <Typography variant="body2" sx={{ mt: 2, textAlign: 'center', color: '#666' }}>
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

// Shared form defaults (spec v0.2.17 section 4.3.1: parameters entered once,
// mapped to each port's rules in the comparison view)
const DEFAULT_VESSEL: VesselInput = {
  gt: 55000,
  nt: 30250,
  loa_m: 290,
  beam_m: 32,
  draft_m: 12,
  teu_capacity: 4000
};

const defaultCall = (portId: string): CallInput => ({
  port_id: portId,
  date: new Date().toISOString().split('T')[0],
  containers_loaded_le20ft: 500,
  containers_loaded_gt20ft: 500,
  containers_discharged_le20ft: 500,
  containers_discharged_gt20ft: 500,
  calls_this_month: 1,
  flag_state: 'EU',
  vessel_type: 'container',
  esi_score: 40,
  csi_class: 'A',
  fossil_free_fuel_percentage: 0,
  ops_usage: false,
  lay_up_days: 0,
  storage_days_export: 5,
  storage_days_import: 3,
  reefer_units: 100,
  oog_units: 10,
  dangerous_goods_units: 20,
  hatch_cover_count: 0,
  gearbox_count: 0,
  pilotage_required: true,
  pilotage_hours: 4,
  pilotage_extra_pilot: false,
  pilotage_ordering_lead_time_hours: 2,
  ops_kwh_demand: 0,
  ops_connected_hours: 0,
  ops_electricity_price_per_kwh: 0,
  ops_peak_demand_kw: 0,
  // Hamburg parameters (spec v0.2.20). Lay time 16 h mid-range default
  // (50 h for ULCV); gangway one per call, class default overseas with the
  // feeder default applied from the vessel library for feeder-class ships;
  // pilotage full Elbe transit; estimated-parameter defaults seeded so the
  // estimate-flagged lines render with their default amounts.
  // Helsingborg parameters (spec v0.2.21). List-price defaults: valid ISSC,
  // EES at the September 2026 level, towage estimate with LOA-class tug
  // defaults applied by the engine when no tug count is supplied.
  ...(portId === 'helsingborg' ? {
    issc_valid: true,
    ees_rate_per_move: 35,
    towage_cost_per_tug: 60000,
    tug_count: undefined,
    clean_shipping_index_class: undefined
  } : {}),
  ...(portId === 'hamburg' ? {
    lay_time_hours: 16,
    gangway_class: 'overseas',
    gangway_count: 1,
    gangway_supervision_hours: 0,
    pilotage_segment_pct: 100,
    towage_amount: 15000,
    handling_rate_per_move: 358,
    hpa_berth_usage: false,
    berth_type: 'quay',
    berth_hours: 0,
    esi_noise_score: undefined,
    quantum_prior_year_gt: 0,
    waste_short_sea_reduction: false,
    waste_alternative_fuel_reduction: false,
    waste_sustainable_waste_reduction: false
  } : {})
});

// Port display name with tariff validity year for headers and tabs
const portLabel = (port: PortDefinition): string => {
  const year = (port.metadata.validity_start || '').slice(0, 4);
  return year ? `${port.metadata.name} ${year}` : port.metadata.name;
};

interface ComparisonViewProps {
  ports: PortDefinition[];
  vessel: VesselInput;
  call: CallInput;
  selectedPortIds: string[];
  onSelectionChange: (portIds: string[]) => void;
}

// The comparison screen (spec v0.2.17 section 4.3.1): a presentation over
// multiple single-port computations - same vessel, same call, one column per
// selected port. Rows group by cost segment and fee family (economic
// function, never biller name). Absent functions show "not charged" rather
// than hiding. List-price basis by default; quality flags carried through.
const ComparisonView: React.FC<ComparisonViewProps> = ({
  ports,
  vessel,
  call,
  selectedPortIds,
  onSelectionChange
}) => {
  const selectedPorts = ports.filter(p => selectedPortIds.includes(p.metadata.id));
  // Optional end-of-comparison conversion (spec v0.2.20): local currency
  // throughout; conversion only here, user-triggered, ECB rates or manual
  // entry, with rate source and date displayed alongside the converted figure.
  const [conversionCurrency, setConversionCurrency] = useState<string>('EUR');
  const [manualRate, setManualRate] = useState<string>('');
  const [rateInfo, setRateInfo] = useState<{ source: string; date: string; fallback: boolean } | null>(null);
  const [convertedTotals, setConvertedTotals] = useState<
    { portId: string; portName: string; localAmount: number; localCurrency: string; rate: number; convertedAmount: number }[] | null
  >(null);

  // ECB daily reference rates are quoted against EUR; the rate from a local
  // currency L to display currency D is rate(D)/rate(L). Cached with its
  // publication date; if the feed is unreachable the last cached set is used
  // and this is stated explicitly (spec section 6).
  const fetchEcbRates = async () => {
    const target = conversionCurrency;
    const manual = parseFloat(manualRate);
    const applyRates = (rates: Record<string, number>, source: string, date: string, fallback: boolean) => {
      const rows = portResults
        .filter(pr => pr.result)
        .map(({ port, result }) => {
          const local = result!;
          let rate: number;
          if (!Number.isNaN(manual) && manual > 0) {
            rate = manual; // manual rate entered per 1 unit of local currency
          } else {
            const rLocal = rates[local.currency];
            const rTarget = rates[target];
            rate = rTarget / rLocal;
          }
          return {
            portId: port.metadata.id,
            portName: port.metadata.name,
            localAmount: local.total,
            localCurrency: local.currency,
            rate,
            convertedAmount: local.total * rate
          };
        });
      setConvertedTotals(rows);
      setRateInfo({
        source: !Number.isNaN(manual) && manual > 0 ? 'Manual rate entered by user' : source,
        date,
        fallback
      });
    };

    if (!Number.isNaN(manual) && manual > 0) {
      applyRates({}, 'Manual', new Date().toISOString().split('T')[0], false);
      return;
    }
    try {
      const res = await fetch('https://api.frankfurter.app/latest?from=EUR');
      if (!res.ok) throw new Error(`ECB feed HTTP ${res.status}`);
      const data = await res.json();
      const rates: Record<string, number> = { EUR: 1, ...data.rates };
      localStorage.setItem('ecb_rates_cache', JSON.stringify({ rates, date: data.date }));
      applyRates(rates, 'ECB daily reference rates (Frankfurter mirror of ECB feed)', data.date, false);
    } catch (err) {
      const cached = localStorage.getItem('ecb_rates_cache');
      if (cached) {
        const { rates, date } = JSON.parse(cached);
        applyRates(rates, 'Last cached ECB reference rates', date, true);
      } else {
        setRateInfo({ source: 'unavailable', date: '-', fallback: true });
      }
    }
  };

  // One calculation per selected port - the same engine and data as the
  // per-port pages; no separate calculation path.
  const portResults = useMemo(() => {
    return selectedPorts.map(port => {
      try {
        const result = calculatePortCallCost(port, { vessel, call: { ...call, port_id: port.metadata.id } });
        return { port, result, error: null as string | null };
      } catch (err) {
        return { port, result: null, error: `Calculation failed: ${err}` };
      }
    });
  }, [selectedPorts, vessel, call]);

  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);

  // Rule names per port (line-labeling rule, spec v0.2.18): the family is the
  // group, the rule name is the line, with the biller shown per line.
  const ruleNameByPortAndId = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    for (const port of ports) {
      const inner = new Map<string, string>();
      for (const rule of port.fee_rules) inner.set(rule.id, rule.name);
      map.set(port.metadata.id, inner);
    }
    return map;
  }, [ports]);
  // Union of fee families actually charged across the selected ports, in
  // segment order, so a function absent at one port still shows "not charged".
  // Each cell carries the family subtotal plus its per-rule lines (rule name,
  // biller, per-line amount, estimate marker).
  const rowsBySegment = useMemo(() => {
    const familyTotals = new Map<string, Map<string, {
      amount: number;
      currency: string;
      flags: number;
      lines: { name: string; biller: string; amount: number; estimated: boolean }[];
    }>>();
    for (const { port, result } of portResults) {
      if (!result) continue;
      for (const biller of result.billers) {
        for (const fee of biller.fees) {
          if (!familyTotals.has(fee.fee_family)) {
            familyTotals.set(fee.fee_family, new Map());
          }
          const perPort = familyTotals.get(fee.fee_family)!;
          const entry = perPort.get(result.port_id) || {
            amount: 0,
            currency: fee.currency,
            flags: 0,
            lines: []
          };
          entry.amount += fee.amount;
          entry.flags += fee.quality_flags.length;
          entry.lines.push({
            name: ruleNameByPortAndId.get(port.metadata.id)?.get(fee.fee_rule_id) ?? fee.fee_family,
            biller: fee.biller,
            amount: fee.amount,
            estimated: fee.quality_flags.some(flag => flag.type === 'estimated_parameter' || flag.type === 'estimated_engine_tier')
          });
          perPort.set(result.port_id, entry);
        }
      }
    }
    return SEGMENTS.map(segment => ({
      segment,
      families: Array.from(familyTotals.entries())
        .filter(([family]) => (FEE_FAMILY_TO_SEGMENT[family] || 'vessel_call') === segment.id)
        .map(([family, perPort]) => ({ family, perPort }))
    })).filter(group => group.families.length > 0);
  }, [portResults, ruleNameByPortAndId]);

  const segmentSubtotals = useMemo(() => {
    return portResults.map(({ port, result }) => {
      const totals: Record<CostSegment, number> = {
        vessel_call: 0,
        energy_at_berth: 0,
        terminal_and_yard: 0
      };
      if (result) {
        for (const biller of result.billers) {
          for (const fee of biller.fees) {
            const segment = FEE_FAMILY_TO_SEGMENT[fee.fee_family] || 'vessel_call';
            totals[segment] += fee.amount;
          }
        }
      }
      return { portId: port.metadata.id, totals };
    });
  }, [portResults]);

  const cheapestTotalPortId = useMemo(() => {
    const valid = portResults.filter(pr => pr.result);
    if (valid.length < 2) return null;
    let best: string | null = null;
    let bestAmount = Infinity;
    for (const { result } of valid) {
      if (result!.total < bestAmount) {
        bestAmount = result!.total;
        best = result!.port_id;
      }
    }
    return best;
  }, [portResults]);

  const mostExpensiveTotalPortId = useMemo(() => {
    const valid = portResults.filter(pr => pr.result);
    if (valid.length < 2) return null;
    let worst: string | null = null;
    let worstAmount = -Infinity;
    for (const { result } of valid) {
      if (result!.total > worstAmount) {
        worstAmount = result!.total;
        worst = result!.port_id;
      }
    }
    return worst;
  }, [portResults]);


  const amountCell = (
    entry: { amount: number; currency: string; flags: number; lines: { name: string; biller: string; amount: number; estimated: boolean }[] } | undefined,
    fallbackCurrency: string
  ) => {
    if (!entry) {
      // Explicit absence: never hidden, so an absence of cost is not
      // mistaken for missing data (spec 4.3.1 comparability rules)
      return <span className="comparison-not-charged">not charged</span>;
    }
    return (
      <Box sx={{ textAlign: 'right' }}>
        <span>
          {formatCurrency(entry.amount, entry.currency || fallbackCurrency)}
          {entry.flags > 0 && (
            <span className="status-badge status-warning" style={{ marginLeft: '6px' }}>
              {entry.flags} flag{entry.flags > 1 ? 's' : ''}
            </span>
          )}
        </span>
        {entry.lines.map((line, index) => (
          <Box key={index} sx={{ fontSize: '0.75rem', color: '#666', mt: 0.25 }}>
            {line.name} · {line.biller}: {formatCurrency(line.amount, entry.currency || fallbackCurrency)}
            {line.estimated && (
              <span className="status-badge status-warning" style={{ marginLeft: '4px' }}>est.</span>
            )}
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box className="container">
      <Paper className="header" elevation={3}>
        <Typography variant="h1" component="h1">
          Port Comparison
        </Typography>
        <Typography variant="subtitle1">
          Same vessel, same call - one column per selected port. List-price (published tariff) basis.
        </Typography>
      </Paper>

      <Paper className="comparison-section" elevation={2}>
        <Typography variant="h5" component="h2">Ports to compare</Typography>
        <Box className="comparison-port-selection">
          {ports.map(port => (
            <FormControlLabel
              key={port.metadata.id}
              control={
                <Checkbox
                  checked={selectedPortIds.includes(port.metadata.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onSelectionChange([...selectedPortIds, port.metadata.id]);
                    } else {
                      onSelectionChange(selectedPortIds.filter(id => id !== port.metadata.id));
                    }
                  }}
                />
              }
              label={portLabel(port)}
            />
          ))}
        </Box>
        {selectedPorts.length === 0 && (
          <Typography color="error">Select at least one port to compare.</Typography>
        )}
      </Paper>

      {selectedPorts.length > 0 && (
        <Paper className="comparison-section" elevation={2}>
          <Typography variant="body2" className="comparison-basis">
            Comparison basis: reference tariff rates (list prices). Rows group by economic function
            (fee family), never by biller name, so ports that charge the same function differently
            still line up. Data-quality flags from each port's computation are carried through.
          </Typography>

          <TableContainer className="comparison-table-container">
            <Table size="small" className="comparison-table">
              <TableHead>
                <TableRow>
                  <TableCell>Cost item</TableCell>
                  {portResults.map(({ port, result }) => (
                    <TableCell key={port.metadata.id} align="right">
                      <span className="comparison-port-name">{portLabel(port)}</span>
                      {result && cheapestTotalPortId === port.metadata.id && (
                        <span className="comparison-marker comparison-cheapest">cheapest</span>
                      )}
                      {result && mostExpensiveTotalPortId === port.metadata.id && (
                        <span className="comparison-marker comparison-most-expensive">most expensive</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rowsBySegment.map(({ segment, families }) => (
                  <React.Fragment key={segment.id}>
                    <TableRow className="comparison-segment-row">
                      <TableCell>
                        <strong>{segment.label}</strong>
                      </TableCell>
                      {portResults.map(({ port, result }) => {
                        const subtotals = segmentSubtotals.find(s => s.portId === port.metadata.id)!;
                        return (
                          <TableCell key={port.metadata.id} align="right" className="comparison-subtotal">
                            {result
                              ? formatCurrency(subtotals.totals[segment.id], result.currency)
                              : <span className="comparison-error">error</span>}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    {families.map(({ family, perPort }) => (
                      <TableRow key={`${segment.id}-${family}`}>
                        <TableCell className="comparison-family-cell">
                          {family.replace(/_/g, ' ')}
                        </TableCell>
                        {portResults.map(({ port }) => {
                          const entry = perPort.get(port.metadata.id);
                          return (
                            <TableCell key={port.metadata.id} align="right" className="amount">
                              {amountCell(entry, port.metadata.currency)}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
                <TableRow className="comparison-total-row">
                  <TableCell>
                    <strong>Grand Total</strong>
                  </TableCell>
                  {portResults.map(({ port, result }) => (
                    <TableCell key={port.metadata.id} align="right" className="comparison-subtotal">
                      {result
                        ? formatCurrency(result.total, result.currency)
                        : <span className="comparison-error">error</span>}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Optional, user-triggered conversion (spec v0.2.20): the very end
              of the comparison. Each port's local-currency total is expressed
              in the chosen display currency using ECB daily reference rates
              (or a manual rate); the rate source and date are shown with the
              converted figure. No inline conversion anywhere else. */}
          <Box className="comparison-conversion" sx={{ mt: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
            <Typography variant="h6" component="h3">
              Optional: express totals in one currency
            </Typography>
            <Typography variant="body2" className="comparison-basis">
              All amounts above are in each tariff's local currency. This step converts each port's
              total once, at the end, for display only - it never enters any calculation.
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Display currency</InputLabel>
                  <Select
                    value={conversionCurrency}
                    onChange={(e) => setConversionCurrency(e.target.value as string)}
                    label="Display currency"
                  >
                    {['EUR', 'SEK', 'DKK', 'PLN', 'USD'].map(c => (
                      <MenuItem key={c} value={c}>{c}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  label="Manual rate per 1 {conversionCurrency} (optional)"
                  type="number"
                  value={manualRate}
                  onChange={(e) => setManualRate(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  helperText="Overrides the ECB fetch for all ports"
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <Button
                  variant="contained"
                  onClick={fetchEcbRates}
                  disabled={conversionCurrency === '' || (!!manualRate)}
                >
                  Fetch ECB reference rates
                </Button>
              </Grid>
              <Grid item xs={12} md={3}>
                {rateInfo && (
                  <Typography variant="body2" className="comparison-basis">
                    Rate source: {rateInfo.source}, {rateInfo.date}
                    {rateInfo.fallback && ' (ECB unreachable - last cached rates used)'}
                  </Typography>
                )}
              </Grid>
            </Grid>
            {convertedTotals && (
              <Table size="small" sx={{ mt: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Port</TableCell>
                    <TableCell align="right">Local total</TableCell>
                    <TableCell align="right">Rate ({conversionCurrency} per unit)</TableCell>
                    <TableCell align="right">Converted total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {convertedTotals.map(ct => (
                    <TableRow key={ct.portId}>
                      <TableCell>{ct.portName}</TableCell>
                      <TableCell align="right">{formatCurrency(ct.localAmount, ct.localCurrency)}</TableCell>
                      <TableCell align="right">{ct.rate.toFixed(4)}</TableCell>
                      <TableCell align="right">{formatCurrency(ct.convertedAmount, conversionCurrency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
          {portResults.some(pr => pr.error) && (
            <Typography color="error" sx={{ mt: 2 }}>
              {portResults.filter(pr => pr.error).map(pr => `${pr.port.metadata.name}: ${pr.error}`).join('; ')}
            </Typography>
          )}

          {portResults.some(pr => pr.result && pr.result.quality_flags.length > 0) && (
            <Box className="quality-flags" sx={{ mt: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Quality Flags (carried through from per-port computations)
              </Typography>
              <ul>
                {portResults.map(pr =>
                  (pr.result?.quality_flags ?? []).map((flag: QualityFlag, index: number) => (
                    <li key={`${pr.port.metadata.id}-${index}`}>
                      <strong>{pr.port.metadata.name}:</strong>{' '}
                      <span style={{
                        color: flag.severity === 'error' ? '#dc3545' : flag.severity === 'warning' ? '#856404' : '#0c5460'
                      }}>
                        [{flag.severity.toUpperCase()}] {flag.description}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

// Top-level navigation (spec v0.2.17 section 4.3.1): persistent port selector
// over per-port workspaces plus a distinct comparison screen. Vessel and call
// parameters are shared across pages so the comparison computes the same call.
// Port-specific call inputs: reset to their default (off/zero/100%) when the
// user switches ports, with their estimate flags (spec v0.2.20 port selector).
// Vessel particulars, lay time, and container counts carry over.
const PORT_SPECIFIC_CALL_FIELDS = [
  'engine_tier', 'engine_tier_estimated', 'esi_score', 'esi_noise_score',
  'issc_valid', 'clean_shipping_index_class', 'ees_rate_per_move',
  'towage_cost_per_tug', 'tug_count',
  'quantum_prior_year_gt', 'pilotage_segment_pct', 'towage_amount',
  'handling_rate_per_move', 'gangway_class', 'gangway_count',
  'gangway_supervision_hours', 'hpa_berth_usage', 'berth_type', 'berth_hours',
  'waste_short_sea_reduction', 'waste_alternative_fuel_reduction',
  'waste_sustainable_waste_reduction', 'csi_class', 'fossil_free_fuel_percentage',
  'ops_kwh_demand', 'ops_connected_hours', 'ops_electricity_price_per_kwh',
  'ops_peak_demand_kw', 'pilotage_hours', 'pilotage_extra_pilot',
  'pilotage_ordering_lead_time_hours', 'hatch_cover_count', 'gearbox_count',
  'lay_up_days'
];

const App: React.FC = () => {
  const activePort = LOADED_PORTS[0];

  const [page, setPage] = useState<Page>(
    activePort ? { kind: 'port', portId: activePort.metadata.id } : { kind: 'comparison' }
  );
  const [vessel, setVessel] = useState<VesselInput>(DEFAULT_VESSEL);
  const [call, setCall] = useState<CallInput>(() => defaultCall(activePort ? activePort.metadata.id : ''));
  const [comparisonSelection, setComparisonSelection] = useState<string[]>(
    LOADED_PORTS.map(p => p.metadata.id)
  );
  const [lastPortId, setLastPortId] = useState<string>(activePort?.metadata.id ?? '');

  // Switching ports swaps the fee-rule set: shared inputs carry over,
  // port-specific inputs reset to defaults (spec v0.2.20)
  useEffect(() => {
    const currentPortId = page.kind === 'port' ? page.portId : '';
    if (!currentPortId || currentPortId === lastPortId) return;
    const defaults = defaultCall(currentPortId);
    setCall(prev => {
      const next: Record<string, unknown> = { ...prev, port_id: currentPortId };
      for (const field of PORT_SPECIFIC_CALL_FIELDS) {
        next[field] = (defaults as unknown as Record<string, unknown>)[field];
      }
      return next as unknown as CallInput;
    });
    setLastPortId(currentPortId);
  }, [page, lastPortId]);

  if (LOADED_PORTS.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography variant="h6">No port data loaded.</Typography>
      </Box>
    );
  }

  const currentPort =
    page.kind === 'port'
      ? LOADED_PORTS.find(p => p.metadata.id === page.portId) ?? activePort
      : undefined;

  const tabIndex = page.kind === 'comparison' ? LOADED_PORTS.length : LOADED_PORTS.findIndex(
    p => p.metadata.id === page.portId
  );

  return (
    <Box>
      <Paper className="header" elevation={3}>
        <Typography variant="h1" component="h1">
          Port Call Cost Analyzer
        </Typography>
        <Typography variant="subtitle1">
          Ports are data, not code - every figure traceable to a source tariff
        </Typography>
      </Paper>

      {/* Persistent port selector: one tab per loaded port, plus the
          comparison screen */}
      <Paper className="port-nav" elevation={2}>
        <Tabs
          value={tabIndex === -1 ? 0 : tabIndex}
          onChange={(_, newValue: number) => {
            if (newValue === LOADED_PORTS.length) {
              setPage({ kind: 'comparison' });
            } else {
              setPage({ kind: 'port', portId: LOADED_PORTS[newValue].metadata.id });
            }
          }}
          variant="scrollable"
          scrollButtons="auto"
        >
          {LOADED_PORTS.map(port => (
            <Tab key={port.metadata.id} label={portLabel(port)} />
          ))}
          <Tab label="Compare Ports" />
        </Tabs>
      </Paper>

      {page.kind === 'comparison' ? (
        <ComparisonView
          ports={LOADED_PORTS}
          vessel={vessel}
          call={call}
          selectedPortIds={comparisonSelection}
          onSelectionChange={setComparisonSelection}
        />
      ) : currentPort ? (
        <PortWorkspace
          port={currentPort}
          vessel={vessel}
          call={call}
          onVesselChange={setVessel}
          onCallChange={setCall}
        />
      ) : null}
    </Box>
  );
};

export default App;
