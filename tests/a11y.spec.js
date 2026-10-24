// axe-core gate (spec §8.1 test 7; C23, C29): the full page has no serious or critical violations
// at 1440×900 and 390×844 in Chromium, at the top, at step 4 and with the Lab "By condition".
// Axe runs only after the chart has settled, so mid-transition opacity can't cause false hits.
const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');
const { openPage, goToStep } = require('./chart-helpers');

const PROJECTS = ['chromium-1440x900', 'chromium-390x844'];

/** Run axe on the whole document and fail with each serious/critical rule id and its targets. */
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
    await expect(page.locator('#story-figure')).toHaveAttribute('data-state', 'participants');
    await expectNoSeriousViolations(page);
  });

  test('step 4', async ({ page }) => {
    await goToStep(page, 4);
    await expectNoSeriousViolations(page);
  });

  test('Evidence Lab, by condition', async ({ page }) => {
    await page.locator('#lab .lab-stage').scrollIntoViewIfNeeded();
    await expect(page.locator('#lab')).toHaveAttribute('data-state', 'overall learning_gains on');
    await page.locator('#lab .seg[data-control="view"] [data-value="condition"]').click();
    await expect(page.locator('#lab')).toHaveAttribute('data-state', 'condition learning_gains on');
    await expectNoSeriousViolations(page);
  });
});
