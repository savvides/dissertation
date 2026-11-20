// axe-core gate: full page has no serious or critical violations across key v4.0.0 states.
const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');
const { openPage, goToStep } = require('./chart-helpers');

const PROJECTS = ['chromium-1440x900', 'chromium-390x844'];

async function expectNoSeriousViolations(page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const bad = violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
  expect(bad, bad.join('\n')).toEqual([]);
}

test.describe('axe-core', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!PROJECTS.includes(testInfo.project.name), 'axe runs in Chromium at 1440×900 and 390×844');
    await openPage(page);
  });

  test('page top', async ({ page }) => {
    await expect(page.locator('#story-figure')).toHaveAttribute('data-state', 'design');
    await expect(page.locator('#lab')).toHaveAttribute('data-state', 'overall learning_gains on');
    await expectNoSeriousViolations(page);
  });

  test('step 4 (overlay)', async ({ page }) => {
    await goToStep(page, 4);
    await expectNoSeriousViolations(page);
  });

  test('step 5 (split small multiples)', async ({ page }) => {
    await goToStep(page, 5);
    await expectNoSeriousViolations(page);
  });

  test('Evidence Lab, split and load-vs-gain', async ({ page }) => {
    await page.locator('#lab .lab-stage').scrollIntoViewIfNeeded();
    await expect(page.locator('#lab')).toHaveAttribute('data-state', 'overall learning_gains on');
    await page.locator('#lab .seg[data-control="view"] [data-value="split"]').click();
    await page.locator('#lab .seg[data-control="axes"] [data-value="load_vs_gain"]').click();
    await expect(page.locator('#lab')).toHaveAttribute('data-state', 'split load_vs_gain on');
    await expectNoSeriousViolations(page);
  });
});
