// Narrative charts (spec §5): step activation, true-pixel text, resize, bars with CIs, the morphing
// scatter, grid layering and chart text alternatives. Runs in every viewport project, both engines.
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

  test('1. steps activate 1→5 scrolling down and 5→1 scrolling up; headline and state follow', async ({ page }) => {
    expect(await recordStepOrder(page, 'down')).toEqual([1, 2, 3, 4, 5]);
    expect(await recordStepOrder(page, 'up')).toEqual([5, 4, 3, 2, 1]);
    for (let n = 1; n <= 5; n++) {
      await goToStep(page, n);
      expect(await page.evaluate(() => window.__probe.activeStep())).toBe(n);
      await expect(page.locator('#story-figure .chart-hed')).toHaveText(HEADLINES[n - 1]);
      await expect(page.locator('#story-figure')).toHaveAttribute('data-state', STATES[n - 1]);
    }
  });

  test('2. true-pixel text: chart text ≥ 12px and the SVG matches its container at every step', async ({ page }) => {
    for (let n = 1; n <= 5; n++) {
      await goToStep(page, n);
      await expectTruePixelText(page);
    }
  });

  test('3. resize 1440×900 → 390×844 → 1440×900 keeps true-pixel text', async ({ page }, testInfo) => {
    // This test sets its own viewports, so it runs once per engine.
    test.skip(!testInfo.project.name.endsWith('-1440x900'), 'runs in the 1440×900 project of each engine');
    await page.setViewportSize({ width: 1440, height: 900 });
    await goToStep(page, 4);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => svgFits(page)).toBe(true);
    await expectTruePixelText(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect.poll(() => svgFits(page)).toBe(true);
    await expectTruePixelText(page);
  });

  test('4. bars: steps 2 and 5 draw 95% CI whiskers from stats; step 5 runs 0–12', async ({ page }) => {
    for (const n of [1, 2, 5]) {
      await goToStep(page, n);
      const r = await inspect(page);
      expect(r.problems, `step ${n}`).toEqual([]);
      await expect(page.locator('#story-figure line.ci')).toHaveCount(n === 1 ? 0 : 3);
    }
    // Step 5 (still showing): the value axis domain is exactly [0, 12].
    const axis = await page.evaluate(() => {
      const a = document.querySelector('#story-figure g.frame:not(.exiting) .axis-x');
      return { domain: a.dataset.domain, ticks: [...a.querySelectorAll('.tick')].map((t) => Number(t.dataset.v)) };
    });
    expect(axis.domain).toBe('0,12');
    expect(Math.min(...axis.ticks)).toBe(0);
    expect(Math.max(...axis.ticks)).toBe(12);
  });

  test('5. scatter: 108 jittered dots; pooled neutral at step 3, morphed by condition at step 4', async ({ page }) => {
    await goToStep(page, 3);
    let r = await inspect(page);
    expect(r.problems, 'step 3').toEqual([]);
    await expect(page.locator('#story-figure .dot')).toHaveCount(108);
    await expect(page.locator('#story-figure path.trend')).toHaveCount(1);
    await expect(page.locator('#story-figure .dlabel')).toContainText(['r = .51']);

    // Step 4 keeps the same dot elements (a real morph), keyed by participant index.
    await page.evaluate(() => {
      for (const d of document.querySelectorAll('#story-figure .dot')) d.__mark = 'step3';
    });
    await goToStep(page, 4);
    r = await inspect(page);
    expect(r.problems, 'step 4').toEqual([]);
    const kept = await page.evaluate(
      () => [...document.querySelectorAll('#story-figure .dot')].filter((d) => d.__mark === 'step3').length
    );
    expect(kept).toBe(108);
    await expect(page.locator('#story-figure path.trend')).toHaveCount(4);
    const labels = (await page.locator('#story-figure .dlabel').allTextContents()).join(' | ');
    for (const s of ['r = .16', 'r = −.19', 'r = .12', 'r = .51']) expect(labels).toContain(s);
  });

  test('6. grid lines sit in the bottom layer, before the marks; trend lines sit under the dots', async ({ page }) => {
    for (const n of [2, 4]) {
      await goToStep(page, n);
      const order = await page.evaluate(() => {
        const plot = document.querySelector('#story-figure g.frame:not(.exiting) g.plot');
        const grid = plot.querySelector(':scope > g.layer-grid');
        const marks = plot.querySelector(':scope > g.layer-marks');
        return {
          first: plot.firstElementChild === grid,
          gridLines: grid ? grid.querySelectorAll('line').length : 0,
          before: !!(grid && marks && grid.compareDocumentPosition(marks) & Node.DOCUMENT_POSITION_FOLLOWING),
          // No participant may be hidden by a trend line, so every trend path paints before the dots.
          trendsUnder: [...plot.querySelectorAll('path.trend')].every(
            (t) => !!(t.compareDocumentPosition(marks) & Node.DOCUMENT_POSITION_FOLLOWING)
          ),
          trends: plot.querySelectorAll('path.trend').length,
        };
      });
      expect(order, `step ${n}`).toEqual({ first: true, gridLines: expect.any(Number), before: true, trendsUnder: true, trends: n === 4 ? 4 : 0 });
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
      5: ['2.9', '2.2', '2.0'],
    };
    const descs = [];
    for (let n = 1; n <= 5; n++) {
      await goToStep(page, n);
      await expect(svg).toHaveAccessibleName(/\S/);
      const desc = (await page.locator('#story-figure .chart-desc').textContent()).trim();
      for (const s of expectations[n]) expect(desc, `step ${n} description`).toContain(s);
      descs.push(desc);
    }
    expect(new Set(descs).size).toBe(5);
  });
});

test.describe('narrative with motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('8. mid-transition, a new frame and new whiskers are already in place; only opacity animates', async ({ page }) => {
    await openPage(page);
    for (const [from, to] of [[4, 5], [2, 3], [1, 2]]) {
      await goToStep(page, from);
      const mid = await page.evaluate(async (to) => {
        window.__probe.centerStep(to);
        await new Promise((r) => setTimeout(r, 300));
        return window.__probe.geometry();
      }, to);
      // The sample really is mid-transition.
      expect(mid.state, `${from}→${to} still animating at 300ms`).toBeNull();
      if (from === 1) expect(mid.cis.length, '1→2 whiskers exist mid-transition').toBe(3);
      else expect(mid.opacity, `${from}→${to} new frame still fading in`).toBeLessThan(1);
      for (const c of mid.cis) {
        expect(Math.abs(c.y1 - c.barMid), `${from}→${to} CI ${c.group} y1 ${c.y1} vs bar middle ${c.barMid}`).toBeLessThanOrEqual(1);
        expect(Math.abs(c.y2 - c.barMid), `${from}→${to} CI ${c.group} y2`).toBeLessThanOrEqual(1);
      }
      await goToStep(page, to);
      const end = await page.evaluate(() => window.__probe.geometry());
      // A new frame (4→5, 2→3) must not slide in at all. Within the bars frame (1→2) the axis may
      // legitimately move: on phones step 2's longer dek shrinks the chart box.
      for (const k of from === 1 ? ['plot'] : ['plot', 'axisX']) {
        for (const d of [0, 1]) {
          expect(Math.abs(mid[k][d] - end[k][d]), `${from}→${to} ${k} ${mid[k]} vs settled ${end[k]}`).toBeLessThanOrEqual(0.5);
        }
      }
    }
  });

  test('9. a quick re-hover within the ring fade leaves exactly one ring on the dot', async ({ page }) => {
    await openPage(page);
    await goToStep(page, 3);
    // A dot whose centre is not covered by a line or another dot, so the pointer lands on it.
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
    await page.waitForTimeout(400); // longer than a ring fade: the ring stays
    expect(await ringsOf(page, SVG)).toEqual([{ i: pt.i, opacity: 1 }]);
  });
});

test.describe('narrative text overlap', () => {
  test.use({ reducedMotion: 'reduce' });

  test('10. no chart texts overlap at any step (C30)', async ({ page }) => {
    await openPage(page);
    for (let n = 1; n <= 5; n++) {
      await goToStep(page, n);
      const texts = await page.evaluate(() => document.querySelectorAll('#story-figure svg.chart-svg text').length);
      expect(texts, `step ${n} has chart text`).toBeGreaterThan(3);
      expect(await page.evaluate(() => window.__probe.overlaps('#story-figure svg.chart-svg')), `step ${n}`).toEqual([]);
    }
  });
});
