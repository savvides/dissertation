// Resilience (spec §5.4, §8.1 tests 4, 9, 10, 14): interrupted transitions settle cleanly, the page
// survives a missing d3, works from file://, and swaps instantly under reduced motion.
const { test, expect } = require('@playwright/test');
const { STATES, openPage, pageErrorsOf, goToStep, recordStepOrder } = require('./chart-helpers');

/** Sweep the pointer across the chart's plot (over the dots when a scatter is showing). */
async function sweepPointer(page) {
  const box = await page.locator('#story-figure svg.chart-svg').boundingBox();
  const y = box.y + box.height * 0.45;
  await page.mouse.move(box.x + box.width * 0.15, y);
  await page.mouse.move(box.x + box.width * 0.7, y + 10, { steps: 8 });
}

/** Hover the first live dot if one is showing, else sweep the plot. */
async function hoverDot(page) {
  const pt = await page.evaluate(() => {
    const d = document.querySelector('#story-figure g.frame:not(.exiting) .dot');
    if (!d) return null;
    const r = d.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (pt) await page.mouse.move(pt.x, pt.y, { steps: 2 });
  else await sweepPointer(page);
}

// Each scenario is a list of [step, wait-ms, pointer action?]; the review's stress sequences.
const SCENARIOS = {
  '3→2 with pointer movement over dots at 100ms': [[3, 1500], [2, 100, sweepPointer]],
  '3→4 with a hover at 200ms': [[3, 1500], [4, 200, hoverDot]],
  'rapid 1→5→1': [[1, 1500], [2, 60], [3, 60], [4, 60], [5, 60], [4, 60], [3, 60], [2, 60], [1, 0]],
  '5→1→4 jumps': [[5, 1500], [1, 150], [4, 0]],
};

test.describe('interrupted transitions', () => {
  test.use({ reducedMotion: 'no-preference' });

  for (const [name, seq] of Object.entries(SCENARIOS)) {
    test(`8. ${name} settles to exactly the active state`, async ({ page }) => {
      await openPage(page);
      for (const [n, wait, action] of seq) {
        await page.evaluate((n) => window.__probe.centerStep(n), n);
        if (action) {
          await page.waitForTimeout(wait);
          await action(page);
        } else if (wait) {
          await page.waitForTimeout(wait);
        }
      }
      await page.waitForTimeout(1500);
      const r = await page.evaluate(() => window.__probe.inspect());
      expect(r.active).toBe(seq[seq.length - 1][0]);
      expect(r.state).toBe(STATES[r.active - 1]);
      expect(r.problems).toEqual([]);
      expect(pageErrorsOf(page)).toEqual([]);
    });
  }
});

test.describe('without d3', () => {
  test('9. a blocked d3 leaves readable text, visible fallbacks and no errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('**/vendor/d3.v7.9.0.min.js', (route) => route.abort());
    await page.goto('index.html');
    await page.waitForLoadState('load');
    await page.evaluate(() => new Promise((r) => setTimeout(r, 300)));
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.classList.contains('has-d3'))).toBe(false);
    await expect(page.locator('#story-figure .chart-fallback')).toBeVisible();
    await expect(page.locator('#lab .chart-fallback')).toBeVisible();
    for (let n = 1; n <= 5; n++) {
      const step = page.locator(`.step[data-step="${n}"]`);
      await step.scrollIntoViewIfNeeded();
      await expect(step.locator('h2')).toBeVisible();
      for (const p of await step.locator('p:not(.step-label)').all()) await expect(p).toBeVisible();
    }
    for (const p of await page.locator('#coda p').all()) await expect(p).toBeVisible();
  });
});

test.describe('file://', () => {
  test('10. from file:// d3 loads, steps activate 1→5 and step 4 draws 108 dots', { tag: '@file' }, async ({ page }) => {
    await openPage(page);
    expect(page.url().startsWith('file://')).toBe(true);
    expect(await page.evaluate(() => typeof window.d3)).toBe('object');
    expect(await recordStepOrder(page, 'down')).toEqual([1, 2, 3, 4, 5]);
    await goToStep(page, 4);
    await expect(page.locator('#story-figure .dot')).toHaveCount(108);
    expect(pageErrorsOf(page)).toEqual([]);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('11. under reduced motion step 4 is fully in place within 50ms', async ({ page }) => {
    await openPage(page);
    await goToStep(page, 1);
    const r = await page.evaluate(async () => {
      window.__probe.centerStep(4);
      await new Promise((res) => setTimeout(res, 50));
      return window.__probe.inspect();
    });
    expect(r.state).toBe('scatterByCondition');
    expect(r.problems).toEqual([]);
    expect(pageErrorsOf(page)).toEqual([]);
  });
});
