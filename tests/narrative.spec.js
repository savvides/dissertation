// Narrative charts (v4.0.0): 6-step activation, 108-dot object permanence, true-pixel text,
// resize, beeswarm CIs, scatter + small multiples, grid layering, and zero overlaps.
const { test, expect } = require('@playwright/test');
const { STATES, HEADLINES, openPage, pageErrorsOf, goToStep, recordStepOrder, expectTruePixelText, ringsOf, svgFits } = require('./chart-helpers');

const inspect = (page) => page.evaluate(() => window.__probe.inspect());

test.describe('narrative', () => {
  test.beforeEach(async ({ page }) => {
    await openPage(page);
  });

  test.afterEach(async ({ page }) => {
    expect(pageErrorsOf(page), 'uncaught page errors').toEqual([]);
  });

  test('1. steps activate 1→6 scrolling down and 6→1 scrolling up; headline and state follow', async ({ page }) => {
    expect(await recordStepOrder(page, 'down')).toEqual([1, 2, 3, 4, 5, 6]);
    expect(await recordStepOrder(page, 'up')).toEqual([6, 5, 4, 3, 2, 1]);
    for (let n = 1; n <= 6; n++) {
      await goToStep(page, n);
      expect(await page.evaluate(() => window.__probe.activeStep())).toBe(n);
      await expect(page.locator('#story-figure .chart-hed')).toHaveText(HEADLINES[n - 1]);
      await expect(page.locator('#story-figure')).toHaveAttribute('data-state', STATES[n - 1]);
    }
  });

  test('1b. story-nav jump button navigates directly to step 4 on wide viewports', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.endsWith('-1440x900'), 'runs in wide 1440×900 project');
    await goToStep(page, 1);
    await page.locator('#story-figure .story-nav button[data-jump="4"]').click();
    await expect(page.locator('#story-figure')).toHaveAttribute('data-state', 'scatterByCondition', { timeout: 5000 });
    expect(await page.evaluate(() => window.__probe.activeStep())).toBe(4);
    await expect(page.locator('#story-figure .story-nav button[data-jump="4"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('2. true-pixel text: chart text ≥ 12px and the SVG matches its container at every step', async ({ page }) => {
    for (let n = 1; n <= 6; n++) {
      await goToStep(page, n);
      await expectTruePixelText(page);
    }
  });

  test('3. resize 1440×900 → 390×844 → 1440×900 keeps true-pixel text on scatter and split', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.endsWith('-1440x900'), 'runs in the 1440×900 project of each engine');
    for (const step of [4, 5]) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await goToStep(page, step);
      await page.setViewportSize({ width: 390, height: 844 });
      await expect.poll(() => svgFits(page)).toBe(true);
      await expectTruePixelText(page);
      await page.setViewportSize({ width: 1440, height: 900 });
      await expect.poll(() => svgFits(page)).toBe(true);
      await expectTruePixelText(page);
    }
  });

  test('4. object permanence: all 108 dots persist across all 6 steps; beeswarms draw 95% CIs and step 6 runs 0–12', async ({ page }) => {
    await goToStep(page, 1);
    await page.evaluate(() => {
      for (const d of document.querySelectorAll('#story-figure .dot')) d.__mark = 'v4';
    });

    for (const n of [1, 2, 3, 4, 5, 6]) {
      await goToStep(page, n);
      const r = await inspect(page);
      expect(r.problems, `step ${n}`).toEqual([]);
      const kept = await page.evaluate(
        () => [...document.querySelectorAll('#story-figure .dot')].filter((d) => d.__mark === 'v4').length
      );
      expect(kept, `step ${n} keeps all 108 dot nodes`).toBe(108);
    }

    // Step 2 and Step 6 beeswarms draw 3 CIs and 3 mean markers; step 6 runs 0–12.
    await goToStep(page, 2);
    await expect(page.locator('#story-figure line.ci')).toHaveCount(3);
    await expect(page.locator('#story-figure circle.mean-mk')).toHaveCount(3);

    await goToStep(page, 6);
    await expect(page.locator('#story-figure line.ci')).toHaveCount(3);
    await expect(page.locator('#story-figure circle.mean-mk')).toHaveCount(3);
    const axis = await page.evaluate(() => {
      const a = document.querySelector('#story-figure g.frame:not(.exiting) .axis-x[data-id="main"]');
      return { domain: a.dataset.domain, ticks: [...a.querySelectorAll('.tick')].map((t) => Number(t.dataset.v)) };
    });
    expect(axis.domain).toBe('0,12');
    expect(Math.min(...axis.ticks)).toBe(0);
    expect(Math.max(...axis.ticks)).toBe(12);
  });

  test('5. scatter and split: pooled → colored overlay → 3 small-multiple panels', async ({ page }) => {
    await goToStep(page, 3);
    expect((await inspect(page)).problems, 'step 3').toEqual([]);
    await expect(page.locator('#story-figure path.trend')).toHaveCount(1);
    await expect(page.locator('#story-figure .dlabel')).toContainText(['r = .51']);

    await goToStep(page, 4);
    expect((await inspect(page)).problems, 'step 4').toEqual([]);
    await expect(page.locator('#story-figure path.trend')).toHaveCount(4);
    const step4Text = await page.locator('#story-figure svg.chart-svg').textContent();
    for (const s of ['r = .16', 'r = −.19', 'r = .12', 'r = .51']) expect(step4Text).toContain(s);

    await goToStep(page, 5);
    expect((await inspect(page)).problems, 'step 5').toEqual([]);
    await expect(page.locator('#story-figure rect.panel-bg')).toHaveCount(3);
    await expect(page.locator('#story-figure path.trend')).toHaveCount(6);
    const step5Text = await page.locator('#story-figure svg.chart-svg').textContent();
    for (const s of ['r = .16', 'r = −.19', 'r = .12']) expect(step5Text).toContain(s);
  });

  test('6. grid lines sit in the bottom layer before marks; trend lines sit under dots', async ({ page }) => {
    for (const n of [2, 4, 5]) {
      await goToStep(page, n);
      const order = await page.evaluate(() => {
        const plot = document.querySelector('#story-figure g.frame:not(.exiting) g.plot');
        const grid = plot.querySelector(':scope > g.layer-grid');
        const marks = plot.querySelector(':scope > g.layer-marks');
        return {
          first: plot.firstElementChild === grid,
          gridLines: grid ? grid.querySelectorAll('line').length : 0,
          before: !!(grid && marks && grid.compareDocumentPosition(marks) & Node.DOCUMENT_POSITION_FOLLOWING),
          trendsUnder: [...plot.querySelectorAll('path.trend')].every(
            (t) => !!(t.compareDocumentPosition(marks) & Node.DOCUMENT_POSITION_FOLLOWING)
          ),
          trends: plot.querySelectorAll('path.trend').length,
        };
      });
      const wantTrends = n === 4 ? 4 : n === 5 ? 6 : 0;
      expect(order, `step ${n}`).toEqual({ first: true, gridLines: expect.any(Number), before: true, trendsUnder: true, trends: wantTrends });
      expect(order.gridLines).toBeGreaterThan(0);
    }
  });

  test('7. the chart is an image with a name, and its description follows the step', async ({ page }) => {
    const svg = page.locator('#story-figure svg.chart-svg');
    await expect(svg).toHaveAttribute('role', 'img');
    const expectations = {
      1: ['35', '36', '37'],
      2: ['4.1', '3.8', '0.5'],
      3: ['108', '.51'],
      4: ['.16', '−.19', '.12'],
      5: ['Video + text', 'Desktop sim', 'VR headset'],
      6: ['2.9', '2.2', '2.0', 'median of 2'],
    };
    const descs = [];
    for (let n = 1; n <= 6; n++) {
      await goToStep(page, n);
      await expect(svg).toHaveAccessibleName(/\S/);
      const desc = (await page.locator('#story-figure .chart-desc').textContent()).trim();
      for (const s of expectations[n]) expect(desc, `step ${n} description`).toContain(s);
      descs.push(desc);
    }
    expect(new Set(descs).size).toBe(6);
  });
});

test.describe('narrative with motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('8. mid-transition whiskers align with mean markers and settle cleanly across frame states', async ({ page }) => {
    await openPage(page);
    for (const [from, to] of [[1, 2], [2, 3], [4, 5], [5, 6]]) {
      await goToStep(page, from);
      const mid = await page.evaluate(async (to) => {
        await window.__probe.activateStep(to);
        await new Promise((r) => setTimeout(r, 300));
        return window.__probe.geometry();
      }, to);
      expect(mid.state, `${from}→${to} still animating at 300ms`).toBeNull();
      if (to === 2 || to === 6) expect(mid.cis.length, `${from}→${to} whiskers exist mid-transition`).toBe(3);
      for (const c of mid.cis) {
        expect(Math.abs(c.y1 - c.meanY), `${from}→${to} CI ${c.group} y1 vs meanY`).toBeLessThanOrEqual(1);
        expect(Math.abs(c.y2 - c.meanY), `${from}→${to} CI ${c.group} y2 vs meanY`).toBeLessThanOrEqual(1);
      }
      await goToStep(page, to);
      expect((await inspect(page)).problems, `${from}→${to} settled`).toEqual([]);
    }
  });

  test('9. a quick re-hover within the ring fade leaves exactly one ring on the dot', async ({ page }) => {
    await openPage(page);
    await goToStep(page, 3);
    const pt = await page.evaluate(() => {
      for (const d of document.querySelectorAll('#story-figure g.frame:not(.exiting) .dot')) {
        const r = d.getBoundingClientRect();
        const c = { i: Number(d.dataset.i), x: r.left + r.width / 2, y: r.top + r.height / 2 };
        if (document.elementFromPoint(c.x, c.y) === d) return c;
      }
      return null;
    });
    expect(pt).not.toBeNull();
    const SVG = '#story-figure svg.chart-svg';
    await page.mouse.move(pt.x, pt.y);
    await expect.poll(() => ringsOf(page, SVG)).toEqual([{ i: pt.i, opacity: 1 }]);
    await page.mouse.move(2, 2);
    await page.mouse.move(pt.x, pt.y);
    await expect.poll(() => ringsOf(page, SVG)).toEqual([{ i: pt.i, opacity: 1 }]);
    await page.waitForTimeout(400);
    expect(await ringsOf(page, SVG)).toEqual([{ i: pt.i, opacity: 1 }]);
  });
});

test.describe('narrative text overlap', () => {
  test.use({ reducedMotion: 'reduce' });

  test('10. no chart texts overlap at any step (1–6)', async ({ page }) => {
    await openPage(page);
    for (let n = 1; n <= 6; n++) {
      await goToStep(page, n);
      const texts = await page.evaluate(() => document.querySelectorAll('#story-figure svg.chart-svg text').length);
      expect(texts, `step ${n} has chart text`).toBeGreaterThan(2);
      expect(await page.evaluate(() => window.__probe.overlaps('#story-figure svg.chart-svg')), `step ${n}`).toEqual([]);
    }
  });
});
