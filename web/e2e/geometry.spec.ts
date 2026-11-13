// Visual-geometry gate (v0.21.0, queue item 9): the ruled geometry asserted
// at computed-style level in a real browser (headless Chromium), so a silent
// return of sticky chrome or of the inner-scroll model fails CI. Ruled
// geometry only - no aesthetics, no pixel-diff.
//   (a) no element on either app surface resolves computed position: sticky;
//       the workspace total strip and the comparison head are asserted static
//       explicitly (the v0.19.3 and v0.19.2 rulings, now at browser level);
//   (b) the comparison table is visible at 601 px and the card path at 599 px
//       (the 600 px stacking breakpoint asserted from both sides);
//   (c) the comparison table container computes max-height: none (the v0.19.2
//       inner-scroll retirement);
//   (d) the workspace total strip is static - in normal flow, scrolling with
//       the document (the v0.19.3 ruling);
//   (e) the version chip renders the current version (v0.21.0 at HEAD);
//   (f) one screenshot per surface per viewport, under
//       web/test-results/screenshots/ (uploaded by the workflow with
//       if: always()).
// 8 tests: 2 surfaces x 4 viewports.
import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';

const EXPECTED_VERSION = 'v0.21.0';

const VIEWPORTS = [
  { name: '1280x800', width: 1280, height: 800 },
  { name: '601x800', width: 601, height: 800 },
  { name: '599x800', width: 599, height: 800 },
  { name: '390x844', width: 390, height: 844 }
] as const;

const screenshotPath = (name: string): string =>
  path.join('test-results', 'screenshots', `${name}.png`);

async function gotoWorkspace(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('.total-strip')).toBeVisible();
}

async function gotoComparison(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compare ports' }).click();
  await expect(page.locator('.comparison-view-head')).toBeVisible();
}

// (a) the whole-document sweep: no element resolves computed
// position: sticky on the surface under test.
async function expectNoStickyAnywhere(page: Page): Promise<void> {
  const sticky = await page.evaluate(() =>
    Array.from(document.querySelectorAll('*'))
      .filter(el => window.getComputedStyle(el).position === 'sticky')
      .map(el => `${el.tagName.toLowerCase()}[class="${el.getAttribute('class') ?? ''}"]`)
  );
  expect(sticky, `computed position: sticky resolved on: ${sticky.join(', ')}`).toEqual([]);
}

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    const slug = testInfo.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    await page.screenshot({ path: screenshotPath(`failure-${slug}`) }).catch(() => undefined);
  }
});

for (const vp of VIEWPORTS) {
  test(`workspace surface at ${vp.name}: no sticky, total strip static, chip ${EXPECTED_VERSION}, screenshot`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await gotoWorkspace(page);
    // (a) whole-document sticky sweep
    await expectNoStickyAnywhere(page);
    // (a)/(d) the v0.19.3 ruling at browser level: the head wrapper (inert
    // markup) and the total strip are static - normal flow, scrolling with
    // the document
    await expect(page.locator('.workspace-sticky-head')).toHaveCSS('position', 'static');
    await expect(page.locator('.total-strip')).toHaveCSS('position', 'static');
    // (e) the version chip renders the current version
    await expect(page.locator('.version-chip')).toHaveText(EXPECTED_VERSION);
    // (f) screenshot of the surface at this viewport
    await page.screenshot({ path: screenshotPath(`workspace-${vp.name}`) });
  });

  test(`comparison surface at ${vp.name}: no sticky, head static, breakpoint path, max-height none, chip ${EXPECTED_VERSION}, screenshot`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await gotoComparison(page);
    // (a) whole-document sticky sweep
    await expectNoStickyAnywhere(page);
    // (a) the v0.19.2 ruling at browser level: the comparison head is static
    await expect(page.locator('.comparison-view-head')).toHaveCSS('position', 'static');
    if (vp.width >= 600) {
      // (b) at/above the 600 px breakpoint the desktop table is the visible
      // path (asserted at 1280x800 and at 601x800, one pixel above it)
      await expect(page.locator('.comparison-table-container')).toBeVisible();
      await expect(page.locator('.comparison-cards')).toHaveCount(0);
      // (c) the v0.19.2 inner-scroll retirement: no max-height on the
      // container at computed-style level
      await expect(page.locator('.comparison-table-container')).toHaveCSS('max-height', 'none');
    } else {
      // (b) below the breakpoint the card path is the visible path (asserted
      // at 599x800, one pixel below it, and at 390x844)
      await expect(page.locator('.comparison-cards')).toBeVisible();
      await expect(page.locator('.comparison-port-card').first()).toBeVisible();
      await expect(page.locator('.comparison-table-container')).toHaveCount(0);
    }
    // (e) the version chip renders the current version
    await expect(page.locator('.version-chip')).toHaveText(EXPECTED_VERSION);
    // (f) screenshot of the surface at this viewport
    await page.screenshot({ path: screenshotPath(`comparison-${vp.name}`) });
  });
}
