// Badge-margin token pins (spec v0.2.68, item 5, the v0.2.56 finding
// discharged). The audit: one inline 6px badge margin was already tokenized
// by v0.2.60 (comparisonCells est.-badge, 4px -> var(--space-1)); three
// literals remained (comparisonView est.-badge, comparisonView
// derived-metric badge, portWorkspace effective-rate note badge). The
// decision: normalize to var(--space-1) — the 4px scale carries no 6px
// token, the badge-separation reading purpose survives the 2px delta, and
// the v0.2.51 theme-token discipline wins over a literal. The rendered
// change (6px -> 4px at three badge offsets) is a disclosed presentation
// delta, not a figure change.
import fs from 'fs';
import path from 'path';

const read = (f: string) => fs.readFileSync(path.join(__dirname, f), 'utf8');

describe('badge margins use the spacing tokens (v0.2.68 item 5; the v0.2.56 finding discharged)', () => {
  it('the four badge-margin sites all use var(--space-1) — no inline 6px badge margin remains', () => {
    const sites = [
      ['comparisonCells.tsx', /className="status-badge status-warning" style=\{\{ marginLeft: 'var\(--space-1\)' \}\}/],
      ['comparisonView.tsx', /className="status-badge status-warning" style=\{\{ marginRight: 'var\(--space-1\)' \}\}/],
      ['comparisonView.tsx', /className="status-badge status-caveat" style=\{\{ marginLeft: 'var\(--space-1\)' \}\}/],
      ['portWorkspace.tsx', /className="status-badge status-caveat" style=\{\{ marginLeft: 'var\(--space-1\)' \}\}/]
    ];
    for (const [file, re] of sites as [string, RegExp][]) {
      expect(read(file)).toMatch(re);
    }
  });

  it('red proof (source-level): no 6px badge-margin literal survives anywhere in the web source', () => {
    const files = fs.readdirSync(__dirname)
      .filter(f => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f));
    const offenders: string[] = [];
    for (const f of files) {
      const text = read(f);
      if (/status-badge[^>]*style=\{\{[^}]*(marginLeft|marginRight): '6px'/.test(text)
          || /style=\{\{[^}]*'6px'[^}]*\}\}[^<]*<\/span>/.test(text) && text.includes('status-badge')) {
        offenders.push(f);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the est.-badge and caveat badges keep their token class styling (the v0.2.51 discipline holds)', () => {
    const css = read('index.css');
    const badge = css.match(/\.status-badge\s*\{[^}]+\}/);
    expect(badge).not.toBeNull();
    expect(badge![0]).toMatch(/var\(--font-caption\)/);
    expect(badge![0]).toMatch(/var\(--space-1\)/);
  });
});
