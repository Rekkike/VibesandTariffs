// Deploy-route pin (spec v0.5.2 deployment-hygiene pass, item 2).
//
// Adjudication: the section-8 method amendment itself takes no pin
// (protocols are executed, not pinned; the version-guard and spec-guard
// runs cover the spec's own consistency). The one pinnable invariant
// the new section-8 language names is the deploy workflow's artifact
// route itself: `.github/workflows/deploy.yml` deploys through
// upload-pages-artifact -> deploy-pages (the Actions artifact route),
// never a branch-push route. This is a config-level pin against
// accidental reversion: a reversion to a branch-push deploy would
// silently resurrect the stale-branch artifact class the v0.5.1
// verification fell into and invalidate the amended section 8's named
// evidence class. Red-proof class observed before trusted: removing
// the upload-pages-artifact step turns the pin red; removing the
// deploy-pages step turns the pin red; each restored green. The pin
// observes the real workflow file on disk, never a fixture, and the
// Pages build_type (workflow route) is the serving fact the API
// confirmed at the pass's item 0.1.
import * as fs from 'fs';
import * as path from 'path';

const WORKFLOW = path.join(__dirname, '..', '..', '.github', 'workflows', 'deploy.yml');

describe('Deploy workflow artifact route (spec v0.5.2 deployment-hygiene)', () => {
  const workflow = () => fs.readFileSync(WORKFLOW, 'utf8');

  it('the deploy workflow uses the Actions artifact route (upload-pages-artifact -> deploy-pages), never a branch-push route', () => {
    const text = workflow();
    // The artifact route: the build uploads, the deploy job serves the
    // artifact (the amended section 8's named evidence class).
    expect(text).toContain('uses: actions/upload-pages-artifact@v3');
    expect(text).toContain('uses: actions/deploy-pages@v4');
    expect(text).toContain('uses: actions/configure-pages@v5');
    // The Pages write + id-token permissions the artifact route requires.
    expect(text).toContain('pages: write');
    expect(text).toContain('id-token: write');
    // The branch-push route absence: no git push to a serving branch
    // anywhere in the workflow, and no peaceiris/actions-gh-pages (the
    // common branch-push deploy action) - a reversion to either would
    // silently change the served artifact's evidence class.
    expect(text).not.toMatch(/git push/);
    expect(text).not.toContain('peaceiris/actions-gh-pages');
  });

  it('the workflow triggers on pushes to main only (the delivered single-push delivery order, spec section 8)', () => {
    const text = workflow();
    expect(text).toContain('branches: [ main ]');
  });
});
