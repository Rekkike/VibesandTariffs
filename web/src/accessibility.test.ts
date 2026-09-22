// Accessibility contract tests (WCAG 2.2 AA floor, spec 4.8; re-audited
// v0.2.32 for everything added since v0.2.25: disclosure rows, guidance
// popovers, the Tier menu, badge titles, aggregate rows, the rate input,
// converted figures). These are static contract assertions over the App
// source plus behavioral assertions where cheap — the keyboard path is
// exercised by the underlying native components (MUI Select, IconButton,
// Collapse), whose contracts are pinned here so a future edit that drops
// aria-expanded/aria-controls or the labels fails the suite.
import * as fs from 'fs';
import * as path from 'path';

const appSource = fs.readFileSync(path.join(__dirname, 'App.tsx'), 'utf8');
const cssSource = fs.readFileSync(path.join(__dirname, 'index.css'), 'utf8');

describe('accessibility floor (WCAG 2.2 AA, v0.2.25–v0.2.32 surfaces)', () => {
  it('disclosure cards expose aria-expanded and aria-controls', () => {
    const disclosures = appSource.match(/aria-expanded=\{open\}/g) ?? [];
    expect(disclosures.length).toBeGreaterThanOrEqual(2);
    expect(appSource).toMatch(/aria-controls=\{panelId\}/);
    expect(appSource).toMatch(/aria-controls=\{`zero-lines-\$\{segment.id\}`\}/);
  });

  it('the zero-line collapse disclosure is keyboard operable (button-based, aria-expanded/aria-controls)', () => {
    expect(appSource).toMatch(/aria-expanded=\{zeroLinesOpen\}/);
    expect(appSource).toMatch(/aria-controls=\{`zero-lines-\$\{segment\.id\}`\}/);
    // It renders as a native button (Enter/Space operable), not a click-only div
    const idx = appSource.indexOf('aria-expanded={zeroLinesOpen}');
    const surrounding = appSource.slice(Math.max(0, idx - 300), idx);
    expect(surrounding).toMatch(/<button\s+type="button"\s+className="disclosure-header/);
  });

  it('guidance popovers are labeled, expanded-state-exposed, and panel-controlled', () => {
    expect(appSource).toMatch(/aria-label=\{`About \$\{guide\.title\}`\}/);
    expect(appSource).toMatch(/aria-expanded=\{open\}\s*aria-controls=\{panelId\}/);
    // The panel itself carries the id the control references
    expect(appSource).toMatch(/<Popover\s+id=\{panelId\}/);
  });

  it('the NOx Tier menu is a native labeled Select with an explicit infer action item', () => {
    expect(appSource).toContain('Engine Tier (IAPP, most polluting engine)');
    expect(appSource).toMatch(/value="infer_build_year">Infer from build year/);
    // Default item states the worst-case default in its label
    expect(appSource).toMatch(/Tier 0 — not entered \(worst case; enter certified tier to override\)/);
  });

  it('quality-flag badges carry titles (accessible name beyond color)', () => {
    const badgeSource = fs.readFileSync(path.join(__dirname, 'flagBadges.ts'), 'utf8');
    // Named assumed-parameter badges and generic flags both carry titles
    expect(badgeSource).toMatch(/title: named\.title/);
    expect(badgeSource).toMatch(/title: flag\.description/);
    // The Tier badge title names the assumed parameter specifically (v0.2.29 badge honesty)
    expect(badgeSource).toMatch(/The NOx Tier is assumed at its worst case/);
  });

  it('the theme toggle exposes its pressed state and label', () => {
    expect(appSource).toMatch(/aria-pressed=\{themeMode === 'light'\}/);
  });

  it('the exchange-rate input has a programmatic label', () => {
    expect(appSource).toMatch(/'aria-label': 'Exchange rate, kronor per euro'/);
  });

  it('focus visibility is defined in the theme (focus-visible styles)', () => {
    expect(cssSource).toMatch(/:focus-visible/);
  });

  it('no converted figure renders without its rate and date (label contract)', () => {
    const conversion = fs.readFileSync(path.join(__dirname, 'conversion.ts'), 'utf8');
    expect(conversion).toMatch(/at \$\{rate\.rate\} kr\/EUR, \$\{rate\.date\}/);
  });
});
