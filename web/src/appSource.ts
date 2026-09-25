// Decomposed app source for the source-reading pin suites (spec v0.2.60
// decomposition). The pins that previously read App.tsx as one file now
// read the union of the extracted modules in a fixed order - every
// assertion's letter and intent is unchanged; the source moved.
// The two structural slice pins (conversion's workspace-boundary pin,
// portGeneralization's workspace-slice pin) are re-expressed against
// their new module boundaries in their own suites instead of this union.
import * as fs from 'fs';
import * as path from 'path';

const MODULES = [
  'App.tsx',
  'appTheme.ts',
  'portLabel.ts',
  'vesselOptions.ts',
  'portRegistry.ts',
  'disclosureCard.tsx',
  'envGuideHelp.tsx',
  'portWorkspaceInputs.tsx',
  'portWorkspace.tsx',
  'comparisonModel.ts',
  'comparisonCells.tsx',
  'comparisonPortSelection.tsx',
  'comparisonView.tsx'
];

export const readDecomposedAppSource = (): string =>
  MODULES.map(m => fs.readFileSync(path.join(__dirname, m), 'utf8')).join('\n');
