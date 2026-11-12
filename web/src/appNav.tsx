import React, { useMemo, useState } from 'react';
import { Box, Checkbox, FormControlLabel, Paper, Typography } from '@mui/material';
import type { PortDefinition } from '@port-cost/core';
import { portLabel } from './portLabel';

// Comparison-selection cap (carried over verbatim from the v0.5.0 selection
// surface, spec v0.5.0): six ports. The number is adjudicated from the
// comparison view's own degradation arithmetic, never taste - every port
// column keeps its 140 px readability floor (spec v0.3.1's v0.2.60
// contract), so the seventh column is where the desktop table begins to
// scroll at the common laptop widths (7 x 140 = 980 px plus the bounded
// label column exceeds the supported 1024-1200 px band). Six is the last
// count that fits the floor arithmetic there, and it covers the entire
// current port set - the cap never binds today; it binds honestly the day
// a seventh port exists. Presentation-only: the cap governs the check
// handler and the disabled disclosure, never the comparison's ranking or
// the engine.
export const COMPARISON_SELECTION_CAP = 6;

export const COMPARISON_CAP_MESSAGE =
  `Comparison is capped at ${COMPARISON_SELECTION_CAP} ports ` +
  '(the comparison table keeps a 140 px column floor; uncheck one to compare another).';

// Country grouping (carried over verbatim, spec v0.5.0): groups the loaded
// ports by metadata.country exactly as carried - the full-name convention
// the silos were authored with. No code-side country list, no mapping
// table: a new country's group appears the day its port exists, and the
// expansion-wave currency keying reads metadata.currency, never this
// string - the grouping is additive by construction.
export const groupPortsByCountry = (
  ports: PortDefinition[]
): { country: string; ports: PortDefinition[] }[] => {
  const groups: { country: string; ports: PortDefinition[] }[] = [];
  for (const port of ports) {
    const country = port.metadata.country || 'Unassigned';
    const existing = groups.find(g => g.country === country);
    if (existing) {
      existing.ports.push(port);
    } else {
      groups.push({ country, ports: [port] });
    }
  }
  return groups;
};

// The persistent navigation (Stage 3 of the design overhaul, the 2026-11-12
// ruling: persistent segmented nav with a visible n/6 compare chip). It
// replaces the v0.5.0 combined "Ports" drawer: the port selector and the
// comparison entry are always visible in the bar; the port selector opens
// the country-grouped navigation popover; the compare chip shows the n/6
// count at all times and opens the country-grouped compare panel. The
// selection model is unchanged - the same selection store, the same cap
// constant, the same cap-disabled state and cap message, the same per-port
// Compare checkbox semantics (aria-label `Compare <port>`), the same
// honest n/6 counter - only the chrome moved. The open/closed state of
// both popovers is component-local and never touches pricing or comparison
// results; Escape closes them; navigation closes them.
export const AppNav: React.FC<{
  ports: PortDefinition[];
  page: { kind: 'port'; portId: string } | { kind: 'comparison' };
  onNavigate: (page: { kind: 'port'; portId: string } | { kind: 'comparison' }) => void;
  selectedPortIds: string[];
  onSelectionChange: (portIds: string[]) => void;
}> = ({ ports, page, onNavigate, selectedPortIds, onSelectionChange }) => {
  const [navOpen, setNavOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const navPanelId = 'app-nav-panel';
  const comparePanelId = 'app-nav-compare-panel';
  const groups = useMemo(() => groupPortsByCountry(ports), [ports]);
  const atCap = selectedPortIds.length >= COMPARISON_SELECTION_CAP;
  const currentPort =
    page.kind === 'port' ? ports.find(p => p.metadata.id === page.portId) : undefined;

  const togglePort = (portId: string, checked: boolean) => {
    if (checked) {
      if (selectedPortIds.length >= COMPARISON_SELECTION_CAP) return;
      onSelectionChange([...selectedPortIds, portId]);
    } else {
      onSelectionChange(selectedPortIds.filter(id => id !== portId));
    }
  };

  const navigate = (target: { kind: 'port'; portId: string } | { kind: 'comparison' }) => {
    setNavOpen(false);
    setCompareOpen(false);
    onNavigate(target);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && (navOpen || compareOpen)) {
      setNavOpen(false);
      setCompareOpen(false);
    }
  };

  return (
    <Paper
      className="port-nav app-nav"
      component="nav"
      aria-label="Primary"
      elevation={2}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        className="app-nav-port"
        aria-expanded={navOpen}
        aria-controls={navPanelId}
        onClick={() => {
          setCompareOpen(false);
          setNavOpen(v => !v);
        }}
      >
        {page.kind === 'comparison' ? 'Compare ports' : currentPort ? portLabel(currentPort) : 'Ports'}
        <span className="app-nav-chevron" aria-hidden="true">{navOpen ? '\u25BE' : '\u25B8'}</span>
      </button>
      <button
        type="button"
        className={`app-nav-compare${page.kind === 'comparison' ? ' app-nav-row-active' : ''}`}
        aria-current={page.kind === 'comparison' ? 'page' : undefined}
        onClick={() => navigate({ kind: 'comparison' })}
      >
        Compare ports
      </button>
      <button
        type="button"
        className="app-nav-compare-chip"
        aria-expanded={compareOpen}
        aria-controls={comparePanelId}
        aria-label={`Compare selection, ${selectedPortIds.length} of ${COMPARISON_SELECTION_CAP} ports selected`}
        onClick={() => {
          setNavOpen(false);
          setCompareOpen(v => !v);
        }}
      >
        Compare{' '}
        <span className="app-nav-chip-count">
          {selectedPortIds.length}/{COMPARISON_SELECTION_CAP}
        </span>
        <span className="app-nav-chevron" aria-hidden="true">{compareOpen ? '\u25BE' : '\u25B8'}</span>
      </button>
      {navOpen && (
        <div id={navPanelId} className="app-nav-panel">
          <button
            type="button"
            className={`app-nav-compare-row${page.kind === 'comparison' ? ' app-nav-row-active' : ''}`}
            onClick={() => navigate({ kind: 'comparison' })}
          >
            Compare Ports
          </button>
          {groups.map(group => (
            <div key={group.country} className="app-nav-country">
              <Typography variant="subtitle2" component="h3" className="app-nav-country-header">
                {group.country}
              </Typography>
              {group.ports.map(port => (
                <button
                  type="button"
                  key={port.metadata.id}
                  className={`app-nav-item${page.kind === 'port' && page.portId === port.metadata.id ? ' app-nav-row-active' : ''}`}
                  onClick={() => navigate({ kind: 'port', portId: port.metadata.id })}
                >
                  {portLabel(port)}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
      {compareOpen && (
        <div id={comparePanelId} className="app-nav-compare-panel">
          {groups.map(group => (
            <div key={group.country} className="app-nav-country">
              <Typography variant="subtitle2" component="h3" className="app-nav-country-header">
                {group.country}
              </Typography>
              {group.ports.map(port => {
                const checked = selectedPortIds.includes(port.metadata.id);
                const disabledByCap = !checked && atCap;
                return (
                  <Box key={port.metadata.id} className="app-nav-compare-row">
                    <span className="app-nav-compare-name">{portLabel(port)}</span>
                    <FormControlLabel
                      className="app-nav-compare-check"
                      control={
                        <Checkbox
                          checked={checked}
                          disabled={disabledByCap}
                          onChange={e => togglePort(port.metadata.id, e.target.checked)}
                          inputProps={{
                            'aria-label': `Compare ${portLabel(port)}`
                          }}
                        />
                      }
                      label="Compare"
                      title={disabledByCap ? COMPARISON_CAP_MESSAGE : undefined}
                    />
                  </Box>
                );
              })}
            </div>
          ))}
          <Typography variant="body2" className="app-nav-count" component="p">
            {selectedPortIds.length}/{COMPARISON_SELECTION_CAP} selected
          </Typography>
          {atCap && (
            <Typography variant="body2" className="app-nav-cap-message" component="p">
              {COMPARISON_CAP_MESSAGE}
            </Typography>
          )}
        </div>
      )}
    </Paper>
  );
};
