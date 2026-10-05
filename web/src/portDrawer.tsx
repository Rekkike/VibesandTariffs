import React, { useMemo, useState } from 'react';
import { Box, Checkbox, FormControlLabel, Paper, Typography } from '@mui/material';
import type { PortDefinition } from '@port-cost/core';
import { portLabel } from './portLabel';

// Comparison-selection cap (spec v0.5.0, the selection-surface redesign):
// six ports. The number is adjudicated from the comparison view's own
// degradation arithmetic, never taste - every port column keeps its
// 140 px readability floor (spec v0.3.1's v0.2.60 contract), so the
// seventh column is where the desktop table begins to scroll at the
// common laptop widths (7 x 140 = 980 px plus the bounded label column
// exceeds the supported 1024-1200 px band). Six is the last count that
// fits the floor arithmetic there, and it covers the entire current
// port set - the cap never binds today; it binds honestly the day a
// seventh port exists. Presentation-only: the cap governs the check
// handler and the disabled disclosure, never the comparison's ranking
// or the engine.
export const COMPARISON_SELECTION_CAP = 6;

export const COMPARISON_CAP_MESSAGE =
  `Comparison is capped at ${COMPARISON_SELECTION_CAP} ports ` +
  '(the comparison table keeps a 140 px column floor; uncheck one to compare another).';

// Country grouping for the drawer (spec v0.5.0): groups the loaded ports
// by metadata.country exactly as carried - the full-name convention the
// silos were authored with. No code-side country list, no mapping table:
// a new country's group appears the day its port exists, and the
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

// The port drawer (spec v0.5.0 selection-surface redesign): the collapsed
// "Ports" control that replaces the horizontal tab list, opening a
// country-grouped panel. Each port row carries its navigation (the tab
// bar's function, carried) and its compare checkbox (the comparison
// model's function, carried - the same selection store, the same feed
// into the comparison view, the same bounded fresh-load default). The
// drawer is the honest cap surface: the counter always renders, and at
// cap the next checkbox disables with its explanation - never a silent
// drop, never a hidden cap. The open/closed state is component-local and
// never touches pricing or comparison results.
export const PortDrawer: React.FC<{
  ports: PortDefinition[];
  page: { kind: 'port'; portId: string } | { kind: 'comparison' };
  onNavigate: (page: { kind: 'port'; portId: string } | { kind: 'comparison' }) => void;
  selectedPortIds: string[];
  onSelectionChange: (portIds: string[]) => void;
}> = ({ ports, page, onNavigate, selectedPortIds, onSelectionChange }) => {
  const [open, setOpen] = useState(false);
  const panelId = 'port-drawer-panel';
  const groups = useMemo(() => groupPortsByCountry(ports), [ports]);
  const atCap = selectedPortIds.length >= COMPARISON_SELECTION_CAP;

  const togglePort = (portId: string, checked: boolean) => {
    if (checked) {
      if (selectedPortIds.length >= COMPARISON_SELECTION_CAP) return;
      onSelectionChange([...selectedPortIds, portId]);
    } else {
      onSelectionChange(selectedPortIds.filter(id => id !== portId));
    }
  };

  const navigate = (target: { kind: 'port'; portId: string } | { kind: 'comparison' }) => {
    setOpen(false);
    onNavigate(target);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      setOpen(false);
    }
  };

  return (
    <Paper className="port-nav port-drawer" elevation={2} onKeyDown={handleKeyDown}>
      <button
        type="button"
        className="port-drawer-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(v => !v)}
      >
        Ports
        <span className="port-drawer-summary">
          {page.kind === 'comparison'
            ? `Comparing ${selectedPortIds.length}/${COMPARISON_SELECTION_CAP}`
            : portLabel(ports.find(p => p.metadata.id === page.portId) ?? ports[0])}
        </span>
        <span className="port-drawer-chevron" aria-hidden="true">{open ? '\u25BE' : '\u25B8'}</span>
      </button>
      {open && (
        <div id={panelId} className="port-drawer-body">
          <button
            type="button"
            className={`port-drawer-row${page.kind === 'comparison' ? ' port-drawer-row-active' : ''}`}
            onClick={() => navigate({ kind: 'comparison' })}
          >
            <span className="port-drawer-row-label">Compare Ports</span>
          </button>
          {groups.map(group => (
            <div key={group.country} className="port-drawer-country">
              <Typography variant="subtitle2" component="h3" className="port-drawer-country-header">
                {group.country}
              </Typography>
              {group.ports.map(port => {
                const checked = selectedPortIds.includes(port.metadata.id);
                const disabledByCap = !checked && atCap;
                return (
                  <Box key={port.metadata.id} className="port-drawer-row">
                    <button
                      type="button"
                      className={`port-drawer-nav${page.kind === 'port' && page.portId === port.metadata.id ? ' port-drawer-row-active' : ''}`}
                      onClick={() => navigate({ kind: 'port', portId: port.metadata.id })}
                    >
                      <span className="port-drawer-row-label">{portLabel(port)}</span>
                    </button>
                    <FormControlLabel
                      className="port-drawer-compare"
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
          <Typography variant="body2" className="port-drawer-count" component="p">
            {selectedPortIds.length}/{COMPARISON_SELECTION_CAP} selected
          </Typography>
          {atCap && (
            <Typography variant="body2" className="port-drawer-cap-message" component="p">
              {COMPARISON_CAP_MESSAGE}
            </Typography>
          )}
        </div>
      )}
    </Paper>
  );
};
