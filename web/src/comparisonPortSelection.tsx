import React from 'react';
import { Box, Checkbox, FormControlLabel, Paper, Typography } from '@mui/material';
import type { PortDefinition } from '@port-cost/core';
import { portLabel } from './portLabel';

// Port-selection controls (spec v0.2.60 decomposition, audit item B
// boundary 5): the checkbox list plus its empty-selection guard.
export const ComparisonPortSelection: React.FC<{
  ports: PortDefinition[];
  selectedPortIds: string[];
  onSelectionChange: (portIds: string[]) => void;
  selectedCount: number;
}> = ({ ports, selectedPortIds, onSelectionChange, selectedCount }) => (
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
          {selectedCount === 0 && (
            <Typography color="error">Select at least one port to compare.</Typography>
          )}
        </Paper>
);
