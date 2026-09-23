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

  it('the NOx Tier menu is a native labeled Select stating the inference contract (v0.2.44)', () => {
    expect(appSource).toContain('Engine Tier (IAPP, most polluting engine)');
    // Default item states the Regulation 13 inference contract in its label
    expect(appSource).toMatch(/Not entered — inferred from build year per Regulation 13 \(blank build year: worst case Tier 0\)/);
    // The superseded explicit-infer action item is gone: inference is the
    // engine's contract, not a user action
    expect(appSource).not.toMatch(/value="infer_build_year"/);
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

// Mobile-DOM accessibility (spec v0.2.39 responsive contract): a responsive
// layout that breaks keyboard navigation, reading order, or label
// association at the stacking breakpoint is a regression the desktop-path
// assertions above would not catch. These pins cover the transposed
// comparison DOM: the disclosure control's operability and state wiring,
// the section landmarks for reading order, and the hidden-converted-figure
// tag (visible state indication).
describe('accessibility floor: mobile DOM at the stacking breakpoint (v0.2.39)', () => {
  it('the conversion disclosure is a native button (keyboard-operable) with dashed secondary styling', () => {
    const idx = appSource.indexOf('aria-expanded={conversionsVisible}');
    expect(idx).toBeGreaterThan(-1);
    const surrounding = appSource.slice(Math.max(0, idx - 800), idx + 400);
    expect(surrounding).toMatch(/<button\s+type="button"\s+className="disclosure-header comparison-conversion-disclosure"/);
    expect(surrounding).toMatch(/onClick=\{\(\) => setConversionsVisible\(v => !v\)\}/);
  });

  it('the disclosure controls the mobile conversions panel by id (aria-controls target exists)', () => {
    expect(appSource).toMatch(/aria-controls="comparison-conversions-panel"/);
    expect(appSource).toMatch(/id="comparison-conversions-panel"/);
  });
  it('the desktop derivation disclosure is a native button with per-view state and a real aria-controls target (v0.2.43)', () => {
    const idx = appSource.indexOf('aria-expanded={derivationsVisible}');
    expect(idx).toBeGreaterThan(-1);
    const surrounding = appSource.slice(Math.max(0, idx - 800), idx + 400);
    expect(surrounding).toMatch(/<button\s+type="button"\s+className="disclosure-header comparison-derivation-disclosure"/);
    expect(surrounding).toMatch(/onClick=\{\(\) => setDerivationsVisible\(v => !v\)\}/);
    expect(appSource).toMatch(/aria-controls="comparison-derivation-panel"/);
    expect(appSource).toMatch(/id="comparison-derivation-panel"/);
  });

  it('the transposed layout exposes section landmarks with explicit aria-labels (reading order)', () => {
    expect(appSource).toMatch(/component="section" aria-label="Cross-port ranking summary"/);
    expect(appSource).toMatch(/component="section" aria-label="Port comparison cards"/);
  });

  it('the ranking strip renders an ordered list (list semantics survive transposition)', () => {
    expect(appSource).toMatch(/<ol className="comparison-ranking-list">/);
  });

  it('hidden converted figures carry a visible tag (state is perceivable, not color-only)', () => {
    expect(appSource).toMatch(/comparison-converted-hidden-tag/);
    expect(appSource).toContain('converted figure hidden');
    expect(cssSource).toMatch(/\.comparison-converted-hidden-tag/);
  });

  it('the mobile disclosure button keeps the global focus-visible policy (focus ring at the breakpoint)', () => {
    expect(cssSource).toMatch(/button:focus-visible/);
    expect(cssSource).toMatch(/\.comparison-conversion-disclosure:hover/);
  });

  it('mobile disclosure state is component-local, never global (per-view contract)', () => {
    expect(appSource).toMatch(/const \[conversionsVisible, setConversionsVisible\] = useState\(false\)/);
    const moduleLevel = /let\s+conversionsVisible/.test(appSource);
    expect(moduleLevel).toBe(false);
  });
});

// Derivation disclosure a11y (spec v0.2.42 Derivation Transparency contract):
// the expandable derivation controls must keep the standing disclosure
// pattern — native button (keyboard operable), aria-expanded, aria-controls
// bound to the panel it toggles — in both the per-port fee lines and every
// comparison surface, desktop and mobile alike.
describe('accessibility floor: derivation disclosure controls (v0.2.42)', () => {
  const derivationSource = fs.readFileSync(path.join(__dirname, 'derivation.tsx'), 'utf8');

  it('the per-port fee-line expansion is a native IconButton carrying aria-expanded and aria-controls', () => {
    expect(appSource).toMatch(/className="fee-derivation-toggle"\s*\n\s*aria-expanded=\{isExpanded\}/);
    expect(appSource).toMatch(/aria-controls=\{`fee-derivation-\$\{fee\.fee_rule_id\}`\}/);
    // aria-controls binds to the panel actually rendered for this fee line.
    expect(appSource).toMatch(/className="detail-row" id=\{`fee-derivation-\$\{fee\.fee_rule_id\}`\}/);
  });

  it('the expansion control names its action (Hide/Show derivation for the named rule)', () => {
    expect(appSource).toMatch(/aria-label=\{`\$\{isExpanded \? 'Hide' : 'Show'\} derivation for/);
  });

  it('the derivation detail is a labeled section (reading order for screen readers)', () => {
    expect(derivationSource).toMatch(/component="section" aria-label="Fee derivation"/);
  });

  it('flags render inside the derivation detail, adjacent to the figures they affected', () => {
    expect(derivationSource).toMatch(/className="derivation-flags"/);
    expect(derivationSource).toMatch(/derivation-flag-detail/);
    // No distant per-fee flag prose elsewhere: flags live next to the
    // figure (the call-level Quality Flags summary is a different, aggregate
    // surface and keeps the state.result.quality_flags list).
    expect(appSource).not.toMatch(/fee\.quality_flags\.map/);
  });

  it('no keyboard-inaccessible derivation surface: every mobile-path derivation markup stays wrap-safe (no fixed widths)', () => {
    expect(cssSource).toMatch(/\.derivation-step-head\s*\{\s*display:\s*flex;\s*flex-wrap:\s*wrap;/);
    expect(cssSource).not.toMatch(/\.derivation-detail\s*\{[^}]*width:\s*\d+px/);
  });
});
