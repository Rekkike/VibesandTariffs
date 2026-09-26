import React, { useState } from 'react';
import { Box, Paper, Tab, Tabs, ThemeProvider, Typography } from '@mui/material';
import type { CallInput, VesselInput } from '@port-cost/core';
import {
  DEFAULT_VESSEL,
  DEFAULT_VESSEL_PROFILE_IMO,
  PROFILE_SEEDED_CALL_FIELDS,
  allPortResetFields,
  defaultCall
} from '@port-cost/core';
import { useAppTheme, muiThemeFor } from './appTheme';
import { APP_VERSION } from './version';
import { LOADED_PORTS } from './portRegistry';
import { portLabel } from './portLabel';
import { PortWorkspace } from './portWorkspace';
import { ComparisonView } from './comparisonView';

// Public surface (spec v0.2.60 decomposition): the views and the test seam
// are re-exported so every existing import from './App' is unchanged.
export { __setMobileQueryForTests } from './appTheme';
export { PortWorkspace } from './portWorkspace';
export { ComparisonView } from './comparisonView';

// Navigation pages per spec v0.2.17 section 4.3.1 (spec v0.2.60
// decomposition): extracted from App.tsx verbatim.
// Navigation pages per spec v0.2.17 section 4.3.1: per-port workspaces plus a
// distinct comparison screen. Per-port separation is required as soon as a
// second port loads; the selector is always present for forward compatibility.
type Page =
  | { kind: 'port'; portId: string }
  | { kind: 'comparison' };

// Per-port persisted call state (spec v0.2.60, the port-switch reset defect
// fix): port-specific input values are per-port state, not wiped on a port
// switch. The reset_fields data (each port's YAML input_profile section,
// the union via allPortResetFields) names which call fields are per-port:
// edits to those fields route to the editing port's own state and survive
// switches; every other field is shared and carries across ports exactly as
// before. Currency safety comes from the isolation itself — an SEK OPS
// price entered at Gothenburg never renders in Hamburg's EUR box because
// Hamburg's workspace reads Hamburg's own state. The fields' values survive
// until page refresh; the per-workspace reset control clears the port's
// own fields back to their defaults.
const PER_PORT_CALL_FIELDS: ReadonlySet<string> = new Set(allPortResetFields());

// Splits a call into its per-port and shared halves (spec v0.2.60): the
// routing half of the per-port persistence. Pure; the workspace's full
// merged call object decomposes losslessly.
export const splitCallByPersistence = (
  call: CallInput
): { perPort: Record<string, unknown>; shared: Record<string, unknown> } => {
  const perPort: Record<string, unknown> = {};
  const shared: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(call as unknown as Record<string, unknown>)) {
    if (field === 'port_id') continue;
    (PER_PORT_CALL_FIELDS.has(field) ? perPort : shared)[field] = value;
  }
  return { perPort, shared };
};

const App: React.FC = () => {
  const [themeMode, toggleTheme] = useAppTheme();
  const activePort = LOADED_PORTS[0];

  const [page, setPage] = useState<Page>(
    activePort ? { kind: 'port', portId: activePort.metadata.id } : { kind: 'comparison' }
  );
  const [vessel, setVessel] = useState<VesselInput>(DEFAULT_VESSEL);
  // Active vessel label (spec v0.2.47/v0.2.48): the app header displays the
  // priced vessel, updating live with the selection. A fresh load prices
  // the default vessel — MAREN MAERSK (the default-vessel contract) — so
  // the header names her exactly as a selection would.
  const [activeVesselLabel, setActiveVesselLabel] = useState<string>(
    () => `MAREN MAERSK (IMO ${DEFAULT_VESSEL_PROFILE_IMO})`
  );
  // Shared call state (spec v0.2.60): the fields every port's workspace
  // shares. Built from the active port's default call with the per-port
  // fields stripped — those live in perPortCallFields below, keyed by
  // port id, so a port's own entries survive switches and feed only its
  // own column. The merge order in mergedCallFor keeps the v0.2.53
  // contract exactly: per-port defaults under the (stripped) shared call
  // under the port's own entered values.
  const [sharedCall, setSharedCall] = useState<Record<string, unknown>>(() => {
    const base = defaultCall(activePort ? activePort.metadata.id : '') as unknown as Record<string, unknown>;
    const shared: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(base)) {
      if (!PER_PORT_CALL_FIELDS.has(field)) shared[field] = value;
    }
    return shared;
  });
  // Per-port call state (spec v0.2.60): each port's entered values for its
  // own port-specific fields. Empty until the user enters a value — absent
  // fields fall to the port's defaults in the merge.
  const [perPortCallFields, setPerPortCallFields] = useState<Record<string, Record<string, unknown>>>({});
  // Fresh-load comparison selection (spec v0.2.59): bounded, not all-ports.
  // The first four loaded ports render by default (registry order); at the
  // current three ports this is all of them - identical DOM to the previous
  // all-ports default - and at eight ports the comparison opens workable
  // instead of opening at its worst case. The checkbox list remains the
  // explicit subset control; nothing is rendered beyond the selection.
  const [comparisonSelection, setComparisonSelection] = useState<string[]>(
    LOADED_PORTS.slice(0, 4).map(p => p.metadata.id)
  );
  // Profile-assumption fields (spec v0.2.48), lifted so the comparison view
  // states the same assumptions the per-port inputs flag. A fresh load seeds
  // the default vessel's profile (Maren Maersk), so the default call carries
  // the profile's assumption flags from the start.
  const [assumedCallFields, setAssumedCallFields] = useState<string[]>([
    ...PROFILE_SEEDED_CALL_FIELDS as string[]
  ]);

  // The merged call one port consumes (spec v0.2.60): the port's own
  // defaults under the shared call under the port's own entered values.
  // Identical merge order to the v0.2.53 comparison contract — an
  // explicitly entered value (shared or per-port) always wins over the
  // default; the only change is *where* the entered per-port values live.
  const mergedCallFor = (portId: string): CallInput => ({
    ...((defaultCall(portId) as unknown as Record<string, unknown>)),
    ...sharedCall,
    ...(perPortCallFields[portId] ?? {}),
    port_id: portId
  }) as CallInput;

  // Workspace call edits (spec v0.2.60): the workspace sends its full merged
  // call with the edit applied; App splits it by persistence — per-port
  // fields route to the editing port's own state, shared fields update the
  // shared call. A switch does nothing to either half: entered values
  // persist (the defect fix).
  const currentPortId = page.kind === 'port' ? page.portId : '';
  const handleWorkspaceCallChange = (next: CallInput) => {
    const { perPort, shared } = splitCallByPersistence(next);
    setSharedCall(prev => ({ ...prev, ...shared }));
    if (currentPortId) {
      setPerPortCallFields(prev => ({
        ...prev,
        [currentPortId]: { ...(prev[currentPortId] ?? {}), ...perPort }
      }));
    }
  };
  // Per-workspace reset control (spec v0.2.60): clears this port's own
  // entered port-specific values — its fields fall back to their defaults
  // in the merge. Shared inputs are untouched.
  const resetPortCallFields = (portId: string) => {
    setPerPortCallFields(prev => {
      const next = { ...prev };
      delete next[portId];
      return next;
    });
  };

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
          {/* Active vessel (spec v0.2.47): directly under the title, updating
              live with the selection — preset name, generic class name, or
              the custom label naming the entered GT. */}
          <Typography variant="subtitle1" className="header-active-vessel">
            Active vessel: <strong>{activeVesselLabel}</strong>
          </Typography>
          <Typography variant="subtitle1">
            Ports are data, not code - every figure traceable to a source tariff
          </Typography>
        </Box>
        <Box className="header-controls">
          {/* Version chip (spec v0.2.68, item 1): renders the single
              web-layer version constant beside the theme toggle; the
              version guard cross-checks the constant against the spec
              header. Tokens only (the v0.2.51 theme discipline). */}
          <span className="version-chip" title={`Application version ${APP_VERSION} (matches the specification header; enforced by the version guard)`}>
            {APP_VERSION}
          </span>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-pressed={themeMode === 'light'}
            title="Toggle dark / light theme"
          >
            {themeMode === 'dark' ? '☽ Light' : '☀ Dark'}
          </button>
        </Box>
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
          call={sharedCall as unknown as CallInput}
          perPortCallOverrides={perPortCallFields}
          selectedPortIds={comparisonSelection}
          onSelectionChange={setComparisonSelection}
          activeVessel={activeVesselLabel}
          assumedCallFields={assumedCallFields}
        />
      ) : currentPort ? (
        <PortWorkspace
          port={currentPort}
          vessel={vessel}
          call={mergedCallFor(currentPort.metadata.id)}
          onVesselChange={setVessel}
          onCallChange={handleWorkspaceCallChange}
          onActiveVesselChange={setActiveVesselLabel}
          onResetPortFields={() => resetPortCallFields(currentPort.metadata.id)}
          assumedCallFields={assumedCallFields}
          onAssumedCallFieldsChange={setAssumedCallFields}
        />
      ) : null}
    </Box>
    </ThemeProvider>
  );
};

export default App;
