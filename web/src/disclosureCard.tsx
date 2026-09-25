import React, { useState } from 'react';
import { Box } from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';

// Progressive-disclosure card (spec v0.2.60 decomposition): extracted
// from App.tsx verbatim.
// Progressive-disclosure card (spec v0.2.25): staged form sections as
// expandable disclosures with keyboard-operable headers, visible focus,
// and 48px targets. Presentation only; the inputs are unchanged.
export const DisclosureCard: React.FC<{
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
