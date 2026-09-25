import type { PortDefinition } from '@port-cost/core';

// Port display name with tariff validity year - shared by the comparison
// view, the workspace, and the App tabs (spec v0.2.60 decomposition).
// Port display name with tariff validity year for headers and tabs
export const portLabel = (port: PortDefinition): string => {
  const year = (port.metadata.validity_start || '').slice(0, 4);
  return year ? `${port.metadata.name} ${year}` : port.metadata.name;
};
