import React, { useState } from 'react';
import { IconButton, Link, Popover, Typography } from '@mui/material';
import { HelpOutline } from '@mui/icons-material';
import type { InputGuide } from './envGuidance';

// Environmental-input guidance affordance (spec v0.2.60 decomposition):
// extracted from App.tsx verbatim.
// Environmental-input guidance affordance (spec v0.2.29): a purely
// informative help control beside each environmental input. Expands to the
// certificate issuer, the decision rule in user terms, the port's threshold
// bands with source references, and the money consequence of entering each
// value on this call at this port. No auto-fill, no pre-selection, no
// persistence; WCAG 2.2 AA (keyboard operable, aria-expanded/aria-controls).
export const EnvGuideHelp: React.FC<{ guide: InputGuide | null }> = ({ guide }) => {
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
