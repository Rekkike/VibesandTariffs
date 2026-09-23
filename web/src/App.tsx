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
  FormHelperText,
  Divider,
  ThemeProvider,
  createTheme,
  Popover,
  Link,
  useMediaQuery
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp, ExpandMore, HelpOutline } from '@mui/icons-material';
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
  calculatePortCallCost,
  inferEngineTier,
  DEFAULT_VESSEL,
  defaultCall
} from '@port-cost/core';

// Import the port registry from canonical sources (converted to JSON at build time).
// The registry contains every port loaded from core/data/*.yaml (spec v0.2.17 section 4.3.1).
import portsRegistry from './data/ports.json';
// Cross-currency comparison helpers (spec v0.2.31, commit A)
import { resolveExchangeRate, toComparisonBasis, conversionLabel, formatRate, rankByConvertedBasis, DEFAULT_EXCHANGE_RATE } from './conversion';
// Vessel library: curated named-vessel table (spec section 3.4), converted to
// JSON at build time — no runtime API calls.
import vesselLibrary from './data/vessel_library.json';
// Theme preference logic + progressive-disclosure defaults (spec v0.2.25)
import { getInitialTheme, persistTheme } from './theme';
// Responsive layout contract (spec v0.2.39): the stacking breakpoint, the
// minimum supported viewport, and the transposition predicates.
import {
  MIN_SUPPORTED_VIEWPORT_PX,
  STACKING_BREAKPOINT_PX,
  STACKING_MEDIA_QUERY,
  rankOrderByConvertedBasis,
  MediaQueryHook
} from './responsive';
import type { ThemeMode } from './theme';
// Zero-line collapse classification (spec v0.2.27), presentation only
import { partitionFees } from './zeroCollapse';
// Badge honesty (spec v0.2.29): assumed parameters get named badges, never a generic "est."
import { badgesForFlags } from './flagBadges';
// Derivation transparency (spec v0.2.42): engine-exposed derivation rendering
import { DerivationDetail, condensedDerivation } from './derivation';
// Environmental-input guidance (spec v0.2.29): purely informative, no auto-fill
import { guideFor, leversForPort, makeComputer, tierEffectLine } from './envGuidance';
import type { InputGuide } from './envGuidance';

// Loaded ports; adding a port is a data edit (drop a YAML in core/data/), never a code change
const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);

// Theme (spec v0.2.25 Presentation Principles): semantic CSS tokens on :root,
// dark default, light mapped over the same token names. The stored preference
// wins; absent one, prefers-color-scheme: light is honored, else dark.
// Preference logic lives in theme.ts (pure, injectable storage) so the
// persistence contract is unit-tested there; the hook wires it to the DOM.
const useAppTheme = (): [ThemeMode, () => void] => {
  const [mode, setMode] = useState<ThemeMode>(() =>
    getInitialTheme(localStorage, () =>
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: light)').matches
        : false
    )
  );
  useEffect(() => {
    persistTheme(localStorage, mode);
    document.documentElement.dataset.theme = mode;
  }, [mode]);
  const toggle = () => setMode(m => (m === 'dark' ? 'light' : 'dark'));
  return [mode, toggle];
};

// Responsive layout (spec v0.2.39): true when the viewport is below the
// stacking breakpoint (600 px) and the condensed stacked layout renders.
// The MUI useMediaQuery path is live in the browser; the injected test seam
// lets the suites exercise both rendering paths deterministically.
let injectedMobileQuery: MediaQueryHook | null = null;
const useIsMobile = (): boolean => {
  const muiMatches = useMediaQuery(STACKING_MEDIA_QUERY);
  if (injectedMobileQuery) return injectedMobileQuery(STACKING_MEDIA_QUERY);
  return muiMatches;
};
export const __setMobileQueryForTests = (hook: MediaQueryHook | null) => {
  injectedMobileQuery = hook;
};
// MUI palette bridged to the same tokens so MUI components follow the theme.
// Breakpoints (spec v0.2.39 Responsive Layout): sm is the stacking threshold
// (600 px - the responsive.ts contract constant); the minimum supported
// viewport is 360 px. MUI xs is widened to the contract floor so grid
// gutters never squeeze below it.
const muiThemeFor = (mode: ThemeMode) => createTheme({
  breakpoints: {
    values: { xs: MIN_SUPPORTED_VIEWPORT_PX, sm: STACKING_BREAKPOINT_PX, md: 900, lg: 1200, xl: 1536 }
  },
  palette: {
    mode,
    primary: { main: mode === 'dark' ? '#6ea8fe' : '#0b57d0' },
    background: {
      default: mode === 'dark' ? '#16191d' : '#f4f5f6',
      paper: mode === 'dark' ? '#1f2429' : '#ffffff'
    },
    text: {
      primary: mode === 'dark' ? '#eceeef' : '#1a1e22',
      secondary: mode === 'dark' ? '#a7b0b7' : '#4d5860'
    },
    divider: mode === 'dark' ? '#3a4148' : '#cdd2d8'
  },
  typography: {
    fontFamily: "'IBM Plex Sans', -apple-system, 'Segoe UI', Roboto, sans-serif",
    h1: { fontSize: '20px', fontWeight: 600 },
    h2: { fontSize: '16px', fontWeight: 600 },
    h3: { fontSize: '16px', fontWeight: 600 },
    h5: { fontSize: '16px', fontWeight: 600 },
    h6: { fontSize: '16px', fontWeight: 600 },
    subtitle1: { fontSize: '14px' },
    subtitle2: { fontSize: '12px' },
    body1: { fontSize: '14px' },
    body2: { fontSize: '12px' },
    caption: { fontSize: '12px' }
  },
  shape: { borderRadius: 4 },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiTab: { styleOverrides: { root: { minHeight: 48 } } },
    MuiToggleButton: { styleOverrides: { root: { minHeight: 40 } } }
  }
});

// Progressive-disclosure card (spec v0.2.25): staged form sections as
// expandable disclosures with keyboard-operable headers, visible focus,
// and 48px targets. Presentation only; the inputs are unchanged.
const DisclosureCard: React.FC<{
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, summary, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = 'disclosure-' + title.replace(/\W+/g, '-').toLowerCase();
  return (
    <Box className="disclosure-card">
      <button
        type="button"
        className="disclosure-header"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(o => !o)}
      >
        <Box>
          {title}
          {summary && <span className="disclosure-header-summary">{summary}</span>}
        </Box>
        <KeyboardArrowDown
          className="disclosure-chevron"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}
        />
      </button>
      <div id={panelId} className="disclosure-body" hidden={!open}>
        {children}
      </div>
    </Box>
  );
};

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
  engine_tier?: string;
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
    description: 'Storage, yard surcharges, cargo-tied idle berth (gate hazardous at Gothenburg only)'
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
  // Zero-line collapse disclosure (spec v0.2.27): collapsed lines render as one
  // expandable row; this is presentation state only, never affects computation.
  zeroLinesExpanded: boolean;
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

// Environmental-input guidance affordance (spec v0.2.29): a purely
// informative help control beside each environmental input. Expands to the
// certificate issuer, the decision rule in user terms, the port's threshold
// bands with source references, and the money consequence of entering each
// value on this call at this port. No auto-fill, no pre-selection, no
// persistence; WCAG 2.2 AA (keyboard operable, aria-expanded/aria-controls).
const EnvGuideHelp: React.FC<{ guide: InputGuide | null }> = ({ guide }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  if (!guide) return null;
  const open = Boolean(anchorEl);
  const panelId = `env-guide-${guide.key}`;
  return (
    <>
      <IconButton
        size="small"
        aria-label={`About ${guide.title}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={(e) => setAnchorEl(open ? null : e.currentTarget)}
      >
        <HelpOutline fontSize="small" />
      </IconButton>
      <Popover
        id={panelId}
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { p: 2, maxWidth: 420 } } }}
      >
        <Typography variant="subtitle2" gutterBottom>{guide.title}</Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>{guide.what}</Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Issued by:</strong> {guide.issuer}
          {guide.issuerUrl && (
            <> (<Link href={guide.issuerUrl} target="_blank" rel="noopener noreferrer">issuer site</Link>)</>
          )}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}><strong>Decision rule:</strong> {guide.rule}</Typography>
        <Typography variant="body2" sx={{ mb: 0.5 }}><strong>Bands (this port):</strong></Typography>
        {guide.bands.map((b, i) => (
          <Typography key={i} variant="caption" display="block" className="source-ref">
            {b.label}: {b.detail} — {b.source}
          </Typography>
        ))}
        <Typography variant="body2" sx={{ mt: 1, mb: 0.5 }}><strong>Money consequence (per this call, per this port):</strong></Typography>
        {guide.deltas.map((d, i) => (
          <Typography key={i} variant="caption" display="block">
            {d.label}: {d.delta}
          </Typography>
        ))}
        <Typography variant="caption" display="block" className="source-ref" sx={{ mt: 1 }}>
          {guide.deltaNote} Guide is informative only — it never fills or pre-selects the input.
        </Typography>
      </Popover>
    </>
  );
};

export const PortWorkspace: React.FC<PortWorkspaceProps> = ({ port, vessel, call, onVesselChange, onCallChange }) => {
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
      gangway_class: selected.teu_capacity <= 1000 ? 'feeder' : 'overseas',
      // Stored NOx Tier (spec v0.2.29): a library vessel with a certified tier
      // computes at Hamburg without the worst-case-default flag; vessels
      // without one keep the Tier 0 default (never an inferred tier).
      ...(selected.engine_tier
        ? { engine_tier: selected.engine_tier, engine_tier_estimated: false, infer_engine_tier_from_build_year: false }
        : { engine_tier: undefined, engine_tier_estimated: undefined, infer_engine_tier_from_build_year: false })
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
        <Box className="total-strip-segments">          {(state.result?.total_estimated_parameters ?? 0) > 0 && (            <Typography variant="body2" className="total-strip-segment">              <span className="status-badge status-warning" style={{ marginRight: '4px' }}>est.</span>              <span className="total-strip-segment-label">Estimated parameters:</span>{' '}              {formatCurrency(state.result?.total_estimated_parameters ?? 0)}            </Typography>          )}          {(state.result?.total_estimated_parameters ?? 0) > 0 && (            <Typography variant="body2" className="total-strip-segment">              <span className="total-strip-segment-label">Total without estimates:</span>{' '}              {formatCurrency(state.result?.total_without_estimates ?? 0)}            </Typography>          )}
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
        <Grid item xs={12} md={6}>
          <Paper className="form-section" elevation={0}>
            {/* Progressive disclosure (spec v0.2.25): staged form sections.
                Vessel and Call are open by default; Port-Specific Parameters
                starts collapsed. Inputs, defaults, and quality flags are
                unchanged - presentation only. */}
            <DisclosureCard title="Vessel" summary="Particulars; typeahead from the vessel library" defaultOpen>
            <Typography variant="h6" component="h2" className="sr-only">Vessel</Typography>

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
                    estimatedFields.includes('nt')
                      ? 'Estimated value from the vessel library (see source note) — editable'
                      : !state.vessel.nt ? 'Will be estimated as 0.55 × GT' : ''
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
              {port.metadata.id === 'hamburg' && (
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
              {(port.metadata.id === 'gothenburg' || port.metadata.id === 'helsingborg') && (
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
            {port.metadata.id === 'gothenburg' && (
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
                      helperText="2,400 SEK/m³ above the included volume; blank = none"
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
            {port.metadata.id === 'hamburg' && (
              <>
                <Typography variant="h6" component="h3" className="segment-heading vessel-call-heading">
                  Hamburg Call Parameters
                </Typography>
                <Grid container spacing={2}>
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
                  <Grid item xs={12} sm={6}>
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
              {/* Spec v0.2.32 dead-control sweep: the OPS kWh / connected-hours /
                  electricity-price / peak-demand inputs were collected but never
                  read by the engine or any port file (no published container-
                  terminal OPS rate exists to charge against). Removed rather than
                  rendered non-functional; ops_usage itself is live (Hamburg OPS
                  rebate, Gothenburg tanker connection-fee condition). */}
            </Grid>

            {/* ============ TERMINAL AND YARD SEGMENT INPUTS ============ */}
            <Typography variant="h6" component="h3" className="segment-heading terminal-heading">
              Yard &amp; Storage
            </Typography>
            <Typography variant="body2" className="segment-description">
              Storage, yard surcharges (gate hazardous at Gothenburg only)
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Containers Loaded ≤20ft"
                  type="number"
                  value={state.call.containers_loaded_le20ft}
                  onChange={(e) => handleCallChange('containers_loaded_le20ft', parseInt(e.target.value) || 0)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Containers Loaded >20ft"
                  type="number"
                  value={state.call.containers_loaded_gt20ft}
                  onChange={(e) => handleCallChange('containers_loaded_gt20ft', parseInt(e.target.value) || 0)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Containers Discharged ≤20ft"
                  type="number"
                  value={state.call.containers_discharged_le20ft}
                  onChange={(e) => handleCallChange('containers_discharged_le20ft', parseInt(e.target.value) || 0)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Containers Discharged >20ft"
                  type="number"
                  value={state.call.containers_discharged_gt20ft}
                  onChange={(e) => handleCallChange('containers_discharged_gt20ft', parseInt(e.target.value) || 0)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
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
                {/* Vessel-access aggregate (spec v0.2.30): the sum of this
                    call's berth/terminal infrastructure + waterway/fairway
                    access + readiness/safety capacity lines, with the
                    effective per-GT derived comparability bridge and the
                    per-rule basis notes. */}
                {state.result.vessel_access && (
                  <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
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

// Default form state lives in core (DEFAULT_VESSEL / defaultCall, spec
// v0.2.28 default-call contract) so the core suite pins the actual initial
// form values: the default call is the worst-case published-rate call, with
// every environmental lever blank = not entered (never a seeded score).

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
export const ComparisonView: React.FC<ComparisonViewProps> = ({
  ports,
  vessel,
  call,
  selectedPortIds,
  onSelectionChange
}) => {
  const selectedPorts = ports.filter(p => selectedPortIds.includes(p.metadata.id));
  // Responsive layout (spec v0.2.39): below the stacking breakpoint the
  // comparison table transposes to a card-per-port layout; the ranking
  // summary strip renders in both layouts. Horizontal scrolling of the
  // table is never the mobile answer - the transposition is the design.
  const isMobile = useIsMobile();
  // Conversion-figure disclosure (spec v0.2.39): on narrow screens the
  // secondary (converted) figure collapses behind a disclosure control so
  // the native-primary figure stays readable. The disclosure state is
  // per-comparison-view, never global.
  const [conversionsVisible, setConversionsVisible] = useState(false);
  // Table-layout derivation disclosure (spec v0.2.43): the condensed
  // derivation is collapsed by default in the desktop table so the table
  // fits its container without horizontal scrolling; the disclosure
  // reveals it per-view. Mobile cards keep derivations visible by default.
  const [derivationsVisible, setDerivationsVisible] = useState(false);
  // Cross-currency comparison contract (spec v0.2.31, commit A): the
  // comparison basis is SEK. Hamburg's EUR figures render native-primary
  // with a converted-secondary figure; every ordering or ranking of ports
  // uses the converted basis, never raw amounts. The rate is static,
  // versioned data (ports.json exchange_rates, from
  // core/data/exchange_rates.yaml) — no runtime API calls — editable at
  // the UI, with a visible fallback flag when the default is in effect.
  const [rateInput, setRateInput] = useState<string>('');
  const dataRate = (portsRegistry as { exchange_rates?: { from_currency: string; to_currency: string; rate: number; as_of: string; source: string }[] }).exchange_rates?.find(
    r => r.from_currency === 'EUR' && r.to_currency === 'SEK'
  );
  const rateInfo = useMemo(
    () => resolveExchangeRate(rateInput, dataRate ? { rate: dataRate.rate, date: dataRate.as_of, source: dataRate.source } : undefined),
    [rateInput, dataRate]
  );
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
  // Rule attributes per port for the zero-line collapse classification
  // (spec v0.2.27): the comparison collapses only true zero lines (no flags,
  // no floor, no condition gate), and only within cells - the family row and
  // its columns remain, so table symmetry, "not charged", and "not yet
  // encoded" stay distinct visible values.
  const ruleAttributesByPortAndId = useMemo(() => {
    const map = new Map<string, Map<string, { minimum?: number; applicable_conditions?: Record<string, unknown>; estimated_parameter?: unknown; contract_vs_published?: unknown }>>();
    for (const port of ports) {
      const inner = new Map<string, { minimum?: number; applicable_conditions?: Record<string, unknown>; estimated_parameter?: unknown; contract_vs_published?: unknown }>();
      for (const rule of port.fee_rules) {
        inner.set(rule.id, {
          minimum: rule.minimum,
          applicable_conditions: rule.applicable_conditions,
          estimated_parameter: rule.estimated_parameter,
          contract_vs_published: rule.contract_vs_published
        });
      }
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
      effective_per_gt?: number;
      lines: { name: string; biller: string; amount: number; estimated: boolean; derivation?: { structure: string; composition: string; total: string } | null }[];
    }>>();
    for (const { port, result } of portResults) {
      if (!result) continue;
      // Zero-line collapse (spec v0.2.27): true zero lines collapse out of
      // the cell lines; informative zeros (flags, floors, condition gates,
      // estimate markers) stay visible. The family row itself is never
      // removed, so every fee family remains a row across all ports.
      const ruleAttrs = ruleAttributesByPortAndId.get(result.port_id);
      const { visible: visibleFees } = partitionFees(
        result.billers.flatMap(b => b.fees),
        ruleAttrs ?? new Map()
      );
      const feesByFamily = new Map<string, typeof visibleFees>();
      for (const fee of visibleFees) {
        const arr = feesByFamily.get(fee.fee_family) ?? [];
        arr.push(fee);
        feesByFamily.set(fee.fee_family, arr);
      }
      for (const fees of Array.from(feesByFamily.values())) {
        for (const fee of fees) {
          if (!familyTotals.has(fee.fee_family)) {
            familyTotals.set(fee.fee_family, new Map());
          }
          const perPort = familyTotals.get(fee.fee_family)!;
          const entry = perPort.get(result.port_id) || {
            amount: 0,
            currency: fee.currency,
            flags: 0,
            effective_per_gt: undefined,
            lines: []
          };
          entry.amount += fee.amount;
          entry.flags += fee.quality_flags.length;
          entry.lines.push({
            name: ruleNameByPortAndId.get(port.metadata.id)?.get(fee.fee_rule_id) ?? fee.fee_family,
            biller: fee.biller,
            amount: fee.amount,
            estimated: fee.quality_flags.some(flag => flag.type === 'estimated_parameter'),
            // Derivation transparency (spec v0.2.42): the condensed form rides
            // the line into every comparison surface — desktop cells and the
            // mobile card layout alike.
            derivation: condensedDerivation(fee)
          });
          perPort.set(result.port_id, entry);
        }
      }
    }
    return SEGMENTS.map(segment => ({
      segment,
      families: Array.from(familyTotals.entries())
        .filter(([family]) => (FEE_FAMILY_TO_SEGMENT[family] || 'vessel_call') === segment.id)
        .map(([family, perPort]) => {
          // Port-dues family row carries the effective per-GT per port
          // (spec v0.2.30): family total ÷ vessel GT, derived — never a
          // published rate.
          if (family === 'port_dues') {
            for (const portId of Array.from(perPort.keys())) {
              const entry = perPort.get(portId)!;
              entry.effective_per_gt = vessel.gt > 0
                ? Math.round((entry.amount / vessel.gt) * 100) / 100
                : undefined;
            }
          }
          return { family, perPort };
        })
    })).filter(group => group.families.length > 0);
  }, [portResults, ruleNameByPortAndId, ruleAttributesByPortAndId, vessel.gt]);

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

  // Ranking integrity (spec v0.2.31): ordering and ranking use the
  // converted comparison basis (SEK), never raw amounts — the Swedish SEK
  // totals and Hamburg's EUR totals are never compared numerically. The
  // pure rankByConvertedBasis is the single tested path.
  const ranking = useMemo(() => rankByConvertedBasis(
    portResults
      .filter(pr => pr.result)
      .map(pr => ({ portId: pr.result!.port_id, amount: pr.result!.total, currency: pr.result!.currency })),
    rateInfo
  ), [portResults, rateInfo]);
  const cheapestTotalPortId = ranking.cheapestPortId;
  const mostExpensiveTotalPortId = ranking.mostExpensivePortId;


  const amountCell = (
    entry: { amount: number; currency: string; flags: number; effective_per_gt?: number; lines: { name: string; biller: string; amount: number; estimated: boolean; derivation?: { structure: string; composition: string; total: string } | null }[] } | undefined,
    fallbackCurrency: string,
    showDerivation: boolean
  ) => {
    if (!entry) {
      // Explicit absence: never hidden, so an absence of cost is not
      // mistaken for missing data (spec 4.3.1 comparability rules)
      return <span className="comparison-not-charged">not charged</span>;
    }
    const conv = toComparisonBasis(entry.amount, entry.currency || fallbackCurrency, rateInfo);
    return (
      <Box sx={{ textAlign: 'right' }}>
        <span className="comparison-figure">
          {formatCurrency(entry.amount, entry.currency || fallbackCurrency)}
          {entry.flags > 0 && (
            <span className="status-badge status-warning" style={{ marginLeft: '6px' }}>
              {entry.flags} flag{entry.flags > 1 ? 's' : ''}
            </span>
          )}
        </span>
        {conv.converted && (isMobile ? (
          // Narrow screens (spec v0.2.39): the converted figure collapses
          // behind the view's conversion disclosure.
          conversionsVisible && (
            <Box sx={{ fontSize: '0.75rem', color: '#666' }}>
              ≈ {formatCurrency(conv.amount, 'SEK')} <span className="comparison-converted-tag">converted</span>
            </Box>
          )
        ) : (
          // Converted-secondary figure (spec v0.2.31): native primary, then
          // the converted approximation, always with its rate basis.
          <Box sx={{ fontSize: '0.75rem', color: '#666' }}>
            ≈ {formatCurrency(conv.amount, 'SEK')} <span className="comparison-converted-tag">converted</span>
          </Box>
        ))}
        {entry.effective_per_gt !== undefined && (
          <Box sx={{ fontSize: '0.75rem', color: '#666' }}>
            {entry.effective_per_gt.toFixed(2)} {entry.currency || fallbackCurrency}/GT effective — derived, not a published rate
            {conv.converted && (
              <span> (≈ {(entry.effective_per_gt * rateInfo.rate).toFixed(2)} SEK/GT converted)</span>
            )}
          </Box>
        )}
        {entry.lines.map((line, index) => (
          <Box key={index} sx={{ fontSize: '0.75rem', color: '#666', mt: 0.25 }}>
            {line.name} · {line.biller}: {formatCurrency(line.amount, entry.currency || fallbackCurrency)}
            {line.estimated && (
              <span className="status-badge status-warning" style={{ marginLeft: '4px' }}>est.</span>
            )}
            {/* Condensed derivation (spec v0.2.42): the comparison states the
                fee's structure and composition so no figure is opaque there;
                the full band detail stays on the per-port view. */}
            {showDerivation && line.derivation && (
              <Box component="span" className="comparison-derivation-condensed" style={{ display: 'block' }}>
                <span className="comparison-derivation-structure">{line.derivation.structure}</span>
                {line.derivation.composition && line.derivation.composition !== line.derivation.structure && (
                  <span className="comparison-derivation-composition"> — {line.derivation.composition}</span>
                )}
              </Box>
            )}
          </Box>
        ))}
      </Box>
    );
  };

  // Native-primary / converted-secondary aggregate cell (spec v0.2.31):
  // the port's native-currency figure first, then the converted comparison
  // basis (SEK) as a derived secondary figure for non-SEK ports. A converted
  // figure never appears without its rate-and-date basis.
  const convCell = (nativeAmount: number, currency: string) => {
    const conv = toComparisonBasis(nativeAmount, currency, rateInfo);
    if (!conv.converted) {
      return <span className="comparison-figure">{formatCurrency(nativeAmount, currency)}</span>;
    }
    // Narrow screens (spec v0.2.39): the converted figure collapses behind
    // the view's conversion disclosure; the native-primary figure stays
    // readable. The disclosure state is per-comparison-view, never global.
    if (isMobile && !conversionsVisible) {
      return (
        <Box sx={{ textAlign: 'right' }}>
          <span className="comparison-figure">{formatCurrency(nativeAmount, currency)}</span>
          <span className="comparison-converted-hidden-tag">converted figure hidden</span>
        </Box>
      );
    }
    return (
      <Box sx={{ textAlign: 'right' }}>
        <span className="comparison-figure">{formatCurrency(nativeAmount, currency)}</span>
        <Box sx={{ fontSize: '0.75rem', color: '#666' }}>
          {'≈'} {formatCurrency(conv.amount, 'SEK')} <span className="comparison-converted-tag">converted {'—'} {formatRate(rateInfo)}</span>
        </Box>
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

          {/* Ranking summary strip (spec v0.2.39): the cross-port ranking
              is the comparison view's headline answer and survives the
              mobile transposition intact - cheapest first on the converted
              comparison basis (spec v0.2.31), rendered above the table and
              above the mobile cards in both layouts. */}
          <Box className="comparison-ranking-strip" component="section" aria-label="Cross-port ranking summary">
            <ol className="comparison-ranking-list">
              {rankOrderByConvertedBasis(
                portResults
                  .filter(pr => pr.result)
                  .map(pr => ({ portId: pr.result!.port_id, amount: pr.result!.total, currency: pr.result!.currency })),
                rateInfo
              ).map(({ portId }, index) => {
                const pr = portResults.find(p => p.port.metadata.id === portId)!;
                return (
                  <li key={portId}>
                    <span className="comparison-ranking-position">{index + 1}.</span>{' '}
                    <span className="comparison-ranking-port">{portLabel(pr.port)}</span>{' '}
                    {pr.result && cheapestTotalPortId === portId && (
                      <span className="comparison-marker comparison-cheapest">cheapest</span>
                    )}{' '}
                    {pr.result && mostExpensiveTotalPortId === portId && (
                      <span className="comparison-marker comparison-most-expensive">most expensive</span>
                    )}
                  </li>
                );
              })}
            </ol>
            {isMobile && portResults.some(pr => pr.result && toComparisonBasis(pr.result.total, pr.result.currency, rateInfo).converted) && (
              <button
                type="button"
                className="disclosure-header comparison-conversion-disclosure"
                aria-expanded={conversionsVisible}
                aria-controls="comparison-conversions-panel"
                onClick={() => setConversionsVisible(v => !v)}
              >
                {conversionsVisible ? 'Hide converted figures' : 'Show converted figures'}
              </button>
            )}
          </Box>
          {/* Mobile transposition (spec v0.2.39): below the stacking
              breakpoint the comparison renders one card per port, fee
              families listed with native-primary figures (converted
              secondary behind the disclosure). Never a horizontal-scroll
              fallback. */}
          {isMobile && (
            <Box id="comparison-conversions-panel" className="comparison-cards" component="section" aria-label="Port comparison cards">
              {portResults.map(({ port, result }) => {
                const subtotals = segmentSubtotals.find(s => s.portId === port.metadata.id)!;
                return (
                  <Paper key={port.metadata.id} className="comparison-port-card" elevation={1}>
                    <Typography variant="h6" component="h3" className="comparison-card-title">
                      {portLabel(port)}
                      {result && cheapestTotalPortId === port.metadata.id && (
                        <span className="comparison-marker comparison-cheapest">cheapest</span>
                      )}
                      {result && mostExpensiveTotalPortId === port.metadata.id && (
                        <span className="comparison-marker comparison-most-expensive">most expensive</span>
                      )}
                    </Typography>
                    {!result ? (
                      <Typography color="error" className="comparison-not-charged">error</Typography>
                    ) : (
                      <Box component="dl" className="comparison-card-list">
                        {rowsBySegment.map(({ segment, families }) => (
                          <React.Fragment key={segment.id}>
                            <Box component="dt" className="comparison-card-segment">{segment.label}: {convCell(subtotals.totals[segment.id], result.currency)}</Box>
                            {families.map(({ family, perPort }) => (
                              <Box component="dd" key={`${segment.id}-${family}`} className="comparison-card-family">
                                <span className="comparison-card-family-name">{family.replace(/_/g, ' ')}</span>
                                {amountCell(perPort.get(port.metadata.id), port.metadata.currency, true)}
                              </Box>
                            ))}
                          </React.Fragment>
                        ))}
                        <Box component="dt" className="comparison-card-total">
                          <strong>Grand Total</strong>
                          {convCell(result.total, result.currency)}
                        </Box>
                        <Box component="dd" className="comparison-card-family">
                          <span className="comparison-card-family-name">Estimated parameters subtotal</span>
                          {convCell(result.total_estimated_parameters, result.currency)}
                        </Box>
                        <Box component="dd" className="comparison-card-family">
                          <span className="comparison-card-family-name">Total without estimates</span>
                          {convCell(result.total_without_estimates, result.currency)}
                        </Box>
                        {result.vessel_access && (
                          <Box component="dd" className="comparison-card-family">
                            <span className="comparison-card-family-name">Vessel Access Charges</span>
                            {convCell(result.vessel_access.amount, result.currency)}
                          </Box>
                        )}
                      </Box>
                    )}
                  </Paper>
                );
              })}
            </Box>
          )}
          {!isMobile && (
          <Box>
          <button
            type="button"
            className="disclosure-header comparison-derivation-disclosure"
            aria-expanded={derivationsVisible}
            aria-controls="comparison-derivation-panel"
            onClick={() => setDerivationsVisible(v => !v)}
          >
            {derivationsVisible ? 'Hide fee derivations' : 'Show fee derivations'}
          </button>
          <TableContainer id="comparison-derivation-panel" className="comparison-table-container">
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
                              ? convCell(subtotals.totals[segment.id], result.currency)
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
                              {amountCell(entry, port.metadata.currency, derivationsVisible)}
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
                        ? convCell(result.total, result.currency)
                        : <span className="comparison-error">error</span>}
                    </TableCell>
                  ))}
                </TableRow>
                {/* Estimated-parameter separation (spec v0.2.24): the total
                    minus its estimated-parameter lines, shown for every port
                    symmetrically (Hamburg handling/towage, Helsingborg
                    towage, Gothenburg none) so the port-fee-level comparison
                    is never dominated by estimates. */}
                <TableRow className="comparison-estimate-row">
                  <TableCell>
                    <span className="status-badge status-warning" style={{ marginRight: '6px' }}>est.</span>
                    Estimated parameters subtotal
                  </TableCell>
                  {portResults.map(({ port, result }) => (
                    <TableCell key={port.metadata.id} align="right" className="comparison-subtotal">
                      {result
                        ? convCell(result.total_estimated_parameters, result.currency)
                        : <span className="comparison-error">error</span>}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="comparison-estimate-row">
                  <TableCell>
                    <strong>Total without estimates</strong>
                  </TableCell>
                  {portResults.map(({ port, result }) => (
                    <TableCell key={port.metadata.id} align="right" className="comparison-subtotal">
                      {result
                        ? convCell(result.total_without_estimates, result.currency)
                        : <span className="comparison-error">error</span>}
                    </TableCell>
                  ))}
                </TableRow>
                {/* Vessel-access aggregate row (spec v0.2.30): the sum of
                    berth/terminal infrastructure + waterway/fairway access
                    + readiness/safety capacity lines per port, with the
                    effective per-GT derived comparability bridge. */}
                <TableRow className="comparison-total-row">
                  <TableCell>
                    <strong>Vessel Access Charges</strong>
                    <span className="status-badge status-caveat" style={{ marginLeft: '6px' }}>derived metric</span>
                  </TableCell>
                  {portResults.map(({ port, result }) => (
                    <TableCell key={port.metadata.id} align="right" className="comparison-subtotal">
                      {result?.vessel_access
                        ? (() => {
                            const vaConv = toComparisonBasis(result.vessel_access.amount, result.currency, rateInfo);
                            return (
                              <Box sx={{ textAlign: 'right' }}>
                                <span>{formatCurrency(result.vessel_access.amount, result.currency)}</span>
                                {vaConv.converted && (
                                  <Box sx={{ fontSize: '0.75rem', color: '#666' }}>
                                    {'≈'} {formatCurrency(vaConv.amount, 'SEK')} <span className="comparison-converted-tag">converted {'—'} {formatRate(rateInfo)}</span>
                                  </Box>
                                )}
                                <Box sx={{ fontSize: '0.75rem', color: '#666' }}>
                                  {result.vessel_access.effective_per_gt.toFixed(2)} {result.currency}/GT effective — derived, not a published rate
                                  {vaConv.converted && (
                                    <span> ({'≈'} {(result.vessel_access.effective_per_gt * rateInfo.rate).toFixed(2)} SEK/GT converted)</span>
                                  )}
                                </Box>
                              </Box>
                            );
                          })()
                        : <span className="comparison-error">error</span>}
                    </TableCell>
                  ))}
                </TableRow>
                {/* Cross-country comparability note (spec v0.2.30): derived
                    from the functional classification — which functions each
                    country's figure covers and which are funded elsewhere —
                    never hard-coded prose. */}
                <TableRow>
                  <TableCell colSpan={portResults.length + 1}>
                    <Typography variant="caption" className="comparison-basis" sx={{ display: 'block' }}>
                      <strong>Vessel Access Charges — comparability:</strong>{' '}
                      <span style={{ display: 'block' }}>{conversionLabel(rateInfo)}.</span>
                      {portResults.map(({ port, result }) => {
                        const agg = result?.vessel_access;
                        if (!agg) return null;
                        const fn = agg.classes
                          .map(c => c === 'berth_terminal_infrastructure' ? 'berth/terminal infrastructure'
                            : c === 'waterway_fairway_access' ? 'waterway/fairway access'
                            : c === 'readiness_safety_capacity' ? 'readiness/safety capacity' : c)
                          .join(' + ');
                        return (
                          <span key={port.metadata.id} style={{ display: 'block' }}>
                            {port.metadata.name}: covers {fn}
                            {agg.classes.length < 3 && ' (functions not listed are funded outside this call’s charges — e.g. nationally from taxation)'}
                            .
                          </span>
                        );
                      })}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          </Box>
          )}

          {/* Rate input (spec v0.2.31, commit A): the exchange rate behind
              every converted figure in this view. Static, versioned data
              (core/data/exchange_rates.yaml — no runtime API calls);
              the user may override it. Blank or invalid input falls back to
              the documented default with a visible flag. */}
          <Box className="comparison-conversion" sx={{ mt: 3, p: 2, border: '1px solid var(--border)', borderRadius: 1 }}>
            <Typography variant="h6" component="h3">
              Exchange rate
            </Typography>
            <Typography variant="body2" className="comparison-basis">
              {conversionLabel(rateInfo)}{rateInfo.is_default ? ' — default rate in effect (editable)' : ''}
            </Typography>
            <TextField
              label="Exchange rate (kr per EUR)"
              type="number"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              sx={{ maxWidth: 280, mt: 1 }}
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: 'any', 'aria-label': 'Exchange rate, kronor per euro' }}
              helperText={rateInfo.is_default
                ? `Default: ${dataRate?.rate ?? DEFAULT_EXCHANGE_RATE.rate} kr/EUR (${dataRate?.source ?? DEFAULT_EXCHANGE_RATE.source}, ${dataRate?.as_of ?? DEFAULT_EXCHANGE_RATE.date}). Blank uses the default.`
                : `User rate ${rateInfo.rate} kr/EUR in effect.`}
            />
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
                      <span className={flag.severity === 'error' ? 'status-badge status-error' : flag.severity === 'warning' ? 'status-badge status-warning' : 'status-badge status-info'}>
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
  'pilotage_hours', 'pilotage_extra_pilot',
  'pilotage_ordering_lead_time_hours', 'hatch_cover_count', 'gearbox_count',
  'lay_up_days'
];

const App: React.FC = () => {
  const [themeMode, toggleTheme] = useAppTheme();
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
    <ThemeProvider theme={muiThemeFor(themeMode)}>
    <Box className="app-shell">
      <Paper className="header" elevation={0}>
        <Box className="header-left">
          <Typography variant="h1" component="h1">
            Port Call Cost Analyzer
          </Typography>
          <Typography variant="subtitle1">
            Ports are data, not code - every figure traceable to a source tariff
          </Typography>
        </Box>
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-pressed={themeMode === 'light'}
          title="Toggle dark / light theme"
        >
          {themeMode === 'dark' ? '☽ Light' : '☀ Dark'}
        </button>
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
    </ThemeProvider>
  );
};

export default App;
