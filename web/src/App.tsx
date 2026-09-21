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
  loa_m: number;
  beam_m: number;
  teu_capacity: number;
  class_note: string;
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

  const handleVesselChange = (field: keyof VesselInput, value: number | undefined) => {
    onVesselChange({ ...vessel, [field]: value });
  };

  const handleCallChange = (field: keyof CallInput, value: any) => {
    onCallChange({ ...call, [field]: value });
  };

  const applyPreset = (preset: keyof typeof VESSEL_PRESETS) => {
    const presetData = VESSEL_PRESETS[preset];
    onVesselChange({ ...vessel, ...presetData });
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
      loa_m: selected.loa_m,
      beam_m: selected.beam_m,
      teu_capacity: selected.teu_capacity
    });
    onCallChange({
      ...call,
      vessel_type: selected.vessel_type
    });
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
                  label="Net Tonnage (NT)"
                  type="number"
                  value={state.vessel.nt || ''}
                  onChange={(e) => handleVesselChange('nt', parseFloat(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  helperText={!state.vessel.nt ? 'Will be estimated as 0.55 × GT' : ''}
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
                  label="Draft (m)"
                  type="number"
                  value={state.vessel.draft_m || ''}
                  onChange={(e) => handleVesselChange('draft_m', parseFloat(e.target.value) || undefined)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
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
                  <InputLabel>CSI Class</InputLabel>
                  <Select
                    value={state.call.csi_class || ''}
                    onChange={(e) => handleCallChange('csi_class', e.target.value as string | undefined)}
                    label="CSI Class"
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
                                                      {fee.fee_family}
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
  ops_peak_demand_kw: 0
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

  // Union of fee families actually charged across the selected ports, in
  // segment order, so a function absent at one port still shows "not charged"
  const rowsBySegment = useMemo(() => {
    const familyTotals = new Map<string, Map<string, { amount: number; currency: string; flags: number }>>();
    for (const { result } of portResults) {
      if (!result) continue;
      for (const biller of result.billers) {
        for (const fee of biller.fees) {
          if (!familyTotals.has(fee.fee_family)) {
            familyTotals.set(fee.fee_family, new Map());
          }
          const perPort = familyTotals.get(fee.fee_family)!;
          const entry = perPort.get(result.port_id) || { amount: 0, currency: fee.currency, flags: 0 };
          entry.amount += fee.amount;
          entry.flags += fee.quality_flags.length;
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
  }, [portResults]);

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

  const portColumn = (portId: string) => portResults.find(pr => pr.port.metadata.id === portId);

  const amountCell = (entry: { amount: number; currency: string; flags: number } | undefined, fallbackCurrency: string) => {
    if (!entry) {
      // Explicit absence: never hidden, so an absence of cost is not
      // mistaken for missing data (spec 4.3.1 comparability rules)
      return <span className="comparison-not-charged">not charged</span>;
    }
    return (
      <span>
        {formatCurrency(entry.amount, entry.currency || fallbackCurrency)}
        {entry.flags > 0 && (
          <span className="status-badge status-warning" style={{ marginLeft: '6px' }}>
            {entry.flags} flag{entry.flags > 1 ? 's' : ''}
          </span>
        )}
      </span>
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
