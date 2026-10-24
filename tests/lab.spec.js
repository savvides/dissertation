// Evidence Lab (spec §6; §8.1 tests 2, 3, 4, 5, 6, 10): radiogroup controls, the stats-driven
// summary, the cognitive-load y domain, keyboard and pointer inspection with a readout panel, and
// clean settling after interrupted transitions. Expected values come from window.STUDY or the spec.
const { test, expect } = require('@playwright/test');
const { openPage, pageErrorsOf, expectTruePixelText, ringsOf } = require('./chart-helpers');

// Spec §6.4: the exact summary sentences for the current data.
const SUMMARIES = {
  'condition learning_gains':
    'Within each condition: r = .16 for VR, −.19 for desktop, .12 for video — none statistically significant.',
  'overall learning_gains': 'Pooled across all 108 participants: r = .51 (p < .001).',
  'condition cognitive_load':
    'Within each condition: r = −.17 for VR, −.04 for desktop, .29 for video — none statistically significant.',
  'overall cognitive_load': 'Pooled across all 108 participants: r = .12 (p = .22, not statistically significant).',
};
const READOUT = /^(VR headset|Desktop sim|Video \+ text) · presence \d+ · (learning gain [+−]?\d+|cognitive load \d+)$/;
const LAB_SVG = '#lab svg.chart-svg';

/** Load the page, bring the Lab into view and wait for its first settled draw. */
async function openLab(page) {
  await openPage(page);
  await page.evaluate(() => document.querySelector('#lab .lab-stage').scrollIntoView({ block: 'start' }));
  await expect(page.locator('#lab')).toHaveAttribute('data-state', 'overall learning_gains on');
}

/** Wait until the Lab has settled in `state` ("view yVar lines"). */
const settled = (page, state) => expect(page.locator('#lab')).toHaveAttribute('data-state', state, { timeout: 5000 });

/** Click a control option and wait for the chart to settle in the resulting state. */
async function choose(page, control, value) {
  await page.locator(`#lab .seg[data-control="${control}"] [data-value="${value}"]`).click();
  const state = await page.evaluate(() =>
    ['view', 'y', 'lines']
      .map((c) => document.querySelector(`#lab .seg[data-control="${c}"] [aria-checked="true"]`).dataset.value)
      .join(' ')
  );
  await settled(page, state);
}

/** The readout the spec expects for participant i under y variable yVar (true, unjittered values). */
const expectedReadout = (page, i, yVar) =>
  page.evaluate(
    ({ i, yVar }) => {
      const p = window.STUDY.points[i];
      const v = p[yVar];
      const val = yVar === 'learning_gains' ? (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) : String(v);
      const name = yVar === 'learning_gains' ? 'learning gain' : 'cognitive load';
      return `${window.STUDY.labels[p.condition]} · presence ${p.presence} · ${name} ${val}`;
    },
    { i, yVar }
  );

/** Participant indices ordered by plotted x (presence + jitter), as the arrow keys walk them. */
const byX = (page) =>
  page.evaluate(() =>
    window.STUDY.points
      .slice()
      .sort((a, b) => a.presence + a.jx - (b.presence + b.jx) || a.i - b.i)
      .map((p) => p.i)
  );

const readout = (page) => page.locator('#lab .lab-readout');
const focusedDot = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    return el && el.matches('#lab .dot') ? Number(el.dataset.i) : null;
  });

/** WCAG contrast ratio of a computed rgb() colour against white. */
function contrastOnWhite(rgb) {
  const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return 1.05 / (L + 0.05);
}

/**
 * Inspect the settled Lab chart against window.STUDY: one frame, everything fully opaque, 108 dots
 * at x(presence + jx), y(value + jy) with the right fill and shape for the view, the right trend
 * lines, and an emphasis ring (if any) centred on its dot. Scales come from the rendered ticks.
 */
const labInspect = (page) =>
  page.evaluate(() => {
    const S = window.STUDY;
    const { scaleFrom, translate } = window.__probe;
    const lab = document.getElementById('lab');
    const [view, yVar, lines] = (lab.dataset.state || '').split(' ');
    const svg = lab.querySelector('svg.chart-svg');
    const problems = [];
    const frames = svg.querySelectorAll('g.frame');
    if (frames.length !== 1) problems.push(`${frames.length} frames`);
    for (const el of [svg, ...svg.querySelectorAll('*')]) {
      const op = Number(getComputedStyle(el).opacity);
      if (op !== 1) {
        problems.push(`opacity ${op} on ${el.tagName}.${el.getAttribute('class')}`);
        break;
      }
    }
    const plot = svg.querySelector('g.frame g.plot');
    const x = scaleFrom(plot.querySelector('.axis-x'), 0);
    const y = scaleFrom(plot.querySelector('.axis-y'), 1);
    const COLORS = { neutral: 'rgb(118, 118, 118)', High: 'rgb(208, 69, 12)', Low: 'rgb(58, 58, 58)', white: 'rgb(255, 255, 255)' };
    const shapes = { High: 'circle', Medium: 'ring', Low: 'diamond' };
    const dots = [...svg.querySelectorAll('.dot')];
    if (dots.length !== 108) problems.push(`${dots.length} dots`);
    const pooled = view === 'overall';
    for (const d of dots) {
      const p = S.points[Number(d.dataset.i)];
      const [cx, cy] = translate(d);
      const ex = x(p.presence + p.jx);
      const ey = y(p[yVar] + p.jy);
      if (Math.abs(cx - ex) > 0.5 || Math.abs(cy - ey) > 0.5) problems.push(`dot ${p.i} at ${cx},${cy}; expected ${ex},${ey}`);
      const fill = getComputedStyle(d).fill;
      const want = pooled ? COLORS.neutral : p.condition === 'Medium' ? COLORS.white : COLORS[p.condition];
      if (fill !== want) problems.push(`dot ${p.i} fill ${fill}, expected ${want}`);
      if (d.dataset.shape !== (pooled ? 'circle' : shapes[p.condition])) problems.push(`dot ${p.i} shape ${d.dataset.shape}`);
    }
    const trends = [...svg.querySelectorAll('path.trend')].map((t) => t.dataset.group).sort().join(',');
    const want = lines === 'off' ? '' : pooled ? 'all' : 'High,Low,Medium,all';
    if (trends !== want) problems.push(`trend lines [${trends}], expected [${want}]`);
    const rings = [...svg.querySelectorAll('circle.emph-ring')];
    if (rings.length > 1) problems.push(`${rings.length} emphasis rings`);
    for (const ring of rings) {
      const p = ring.__data__;
      const dot = svg.querySelector(`.dot[data-i="${p.i}"]`);
      const [cx, cy] = translate(dot);
      const [rx, ry] = [Number(ring.getAttribute('cx')), Number(ring.getAttribute('cy'))];
      if (Math.abs(rx - cx) > 0.5 || Math.abs(ry - cy) > 0.5) problems.push(`ring at ${rx},${ry}, its dot at ${cx},${cy}`);
    }
    return { state: lab.dataset.state, problems };
  });

test.describe('Evidence Lab', () => {
  test.beforeEach(async ({ page }) => {
    await openLab(page);
  });

  test.afterEach(async ({ page }) => {
    expect(pageErrorsOf(page), 'uncaught page errors').toEqual([]);
  });

  test('1. each control is a radiogroup; arrow keys move the checked option and change the chart', async ({ page }) => {
    for (const control of ['view', 'y', 'lines']) {
      const seg = page.locator(`#lab .seg[data-control="${control}"]`);
      await expect(seg).toHaveAttribute('role', 'radiogroup');
      await expect(seg.locator('[role="radio"]')).toHaveCount(2);
      await expect(seg.locator('[aria-checked="true"]')).toHaveCount(1);
      await expect(seg.locator('[tabindex="0"]')).toHaveCount(1);
      for (const radio of await seg.locator('[role="radio"]').all()) {
        expect((await radio.boundingBox()).height, `${control} option height`).toBeGreaterThanOrEqual(44);
      }
    }
    const checked = (control) => page.locator(`#lab .seg[data-control="${control}"] [aria-checked="true"]`);

    // View: ArrowRight checks "By condition", focus follows, and the pooled line splits into four.
    await checked('view').focus();
    await page.keyboard.press('ArrowRight');
    await expect(checked('view')).toHaveAttribute('data-value', 'condition');
    await expect(checked('view')).toBeFocused();
    await expect(checked('view')).toHaveAttribute('tabindex', '0');
    await settled(page, 'condition learning_gains on');
    await expect(page.locator(`${LAB_SVG} path.trend`)).toHaveCount(4);
    await expect(page.locator(`${LAB_SVG} .dot[data-shape="diamond"]`)).toHaveCount(37);
    expect((await labInspect(page)).problems).toEqual([]);

    // Arrow keys wrap around within the group.
    await page.keyboard.press('ArrowRight');
    await expect(checked('view')).toHaveAttribute('data-value', 'overall');
    await settled(page, 'overall learning_gains on');
    await expect(page.locator(`${LAB_SVG} path.trend`)).toHaveCount(1);

    // Y-axis: ArrowDown switches to cognitive load; the y ticks now run 0..12.
    await checked('y').focus();
    await page.keyboard.press('ArrowDown');
    await expect(checked('y')).toHaveAttribute('data-value', 'cognitive_load');
    await settled(page, 'overall cognitive_load on');
    const ticks = await page.$$eval(`${LAB_SVG} .axis-y .tick`, (ts) => ts.map((t) => Number(t.dataset.v)));
    expect(Math.max(...ticks)).toBe(12);
    expect((await labInspect(page)).problems).toEqual([]);

    // Trendlines: ArrowLeft wraps to "Off" and the line goes away.
    await checked('lines').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(checked('lines')).toHaveAttribute('data-value', 'off');
    await settled(page, 'overall cognitive_load off');
    await expect(page.locator(`${LAB_SVG} path.trend`)).toHaveCount(0);

    // Space on a focused option selects it, like a click.
    await page.locator('#lab .seg[data-control="lines"] [data-value="on"]').focus();
    await page.keyboard.press('Space');
    await settled(page, 'overall cognitive_load on');
    await expect(checked('lines')).toHaveAttribute('data-value', 'on');
  });

  test('2. the summary sentence is the §6.4 string for every view and y; lines only toggle trend paths', async ({ page }) => {
    const summary = page.locator('#lab p.lab-summary');
    for (const y of ['learning_gains', 'cognitive_load']) {
      await choose(page, 'y', y);
      for (const view of ['overall', 'condition']) {
        await choose(page, 'view', view);
        for (const lines of ['on', 'off']) {
          await choose(page, 'lines', lines);
          await expect(summary).toHaveText(SUMMARIES[`${view} ${y}`]);
          const n = lines === 'off' ? 0 : view === 'overall' ? 1 : 4;
          await expect(page.locator(`${LAB_SVG} path.trend`)).toHaveCount(n);
          expect((await labInspect(page)).problems, `${view} ${y} ${lines}`).toEqual([]);
        }
      }
    }
  });

  test('3. cognitive load: the y domain starts at 0 and no tick is negative (C17)', async ({ page }) => {
    await choose(page, 'y', 'cognitive_load');
    for (const view of ['overall', 'condition']) {
      await choose(page, 'view', view);
      const axis = await page.evaluate((sel) => {
        const a = document.querySelector(`${sel} g.frame .axis-y`);
        return { domain: a.dataset.domain, ticks: [...a.querySelectorAll('.tick')].map((t) => Number(t.dataset.v)) };
      }, LAB_SVG);
      expect(Number(axis.domain.split(',')[0]), `${view} domain ${axis.domain}`).toBe(0);
      expect(Math.min(...axis.ticks)).toBe(0);
      expect(axis.ticks.filter((v) => v < 0)).toEqual([]);
      const labels = await page.$$eval(`${LAB_SVG} .axis-y .tick text`, (ts) => ts.map((t) => t.textContent));
      expect(labels.some((s) => s.startsWith('−') || s.startsWith('-'))).toBe(false);
      // Every dot, including the 25 zero-load participants jittered below 0, stays inside the plot.
      const outside = await page.evaluate((sel) => {
        const svg = document.querySelector(sel);
        const box = svg.getBoundingClientRect();
        const axisY = svg.querySelector('.axis-x').getBoundingClientRect().top;
        return [...svg.querySelectorAll('.dot')].filter((d) => {
          const r = d.getBoundingClientRect();
          return r.bottom > axisY + 0.5 || r.top < box.top;
        }).length;
      }, LAB_SVG);
      expect(outside).toBe(0);
      expect((await labInspect(page)).problems).toEqual([]);
    }
  });

  test('4. keyboard: Tab reaches the chart, arrows walk dots by x, the readout is true, Escape clears', async ({ page }) => {
    const order = await byX(page);
    // Tab walks the three controls (one stop each, on the checked option), then the chart.
    const focusedRadio = () =>
      page.evaluate(() => {
        const el = document.activeElement;
        if (!el || !el.matches('#lab .seg [role="radio"]')) return null;
        const cs = getComputedStyle(el);
        return {
          control: el.parentElement.dataset.control,
          checked: el.getAttribute('aria-checked'),
          outline: { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), color: cs.outlineColor },
        };
      });
    await page.locator('#lab .seg[data-control="view"] [aria-checked="true"]').focus();
    for (const control of ['y', 'lines']) {
      await page.keyboard.press('Tab');
      const r = await focusedRadio();
      expect(r && r.control).toBe(control);
      expect(r.checked).toBe('true');
      // The focus ring is visible: a solid outline ≥ 3px at ≥ 3:1 against white (spec §4.5).
      expect(r.outline.style).toBe('solid');
      expect(r.outline.width).toBeGreaterThanOrEqual(3);
      expect(contrastOnWhite(r.outline.color)).toBeGreaterThanOrEqual(3);
    }
    await page.keyboard.press('Tab');
    expect(await focusedDot(page), 'Tab lands on the first dot by x').toBe(order[0]);
    await expect(page.locator(`${LAB_SVG} .dot[tabindex="0"]`)).toHaveCount(1);
    await expect(readout(page)).toHaveText(await expectedReadout(page, order[0], 'learning_gains'));

    await page.keyboard.press('ArrowRight');
    expect(await focusedDot(page)).toBe(order[1]);
    const text = (await readout(page).textContent()).trim();
    expect(text).toMatch(READOUT);
    expect(text).toBe(await expectedReadout(page, order[1], 'learning_gains'));
    await expect(page.locator(`${LAB_SVG} .dot[tabindex="0"]`)).toHaveAttribute('data-i', String(order[1]));

    // The focused dot carries a visible ring: ≥ 2px, ≥ 3:1 against white, centred on the dot. The
    // previous dot's ring may still be fading out for a moment.
    const ringInfo = () =>
      page.evaluate((sel) => {
        const rings = [...document.querySelectorAll(`${sel} circle.emph-ring`)];
        if (rings.length !== 1) return { count: rings.length };
        const cs = getComputedStyle(rings[0]);
        const halo = getComputedStyle(rings[0].parentElement.querySelector('circle.emph-halo'));
        return {
          count: 1,
          i: rings[0].__data__.i,
          width: parseFloat(cs.strokeWidth),
          stroke: cs.stroke,
          haloWidth: parseFloat(halo.strokeWidth),
          haloStroke: halo.stroke,
        };
      }, LAB_SVG);
    await expect.poll(ringInfo).toMatchObject({ count: 1, i: order[1] });
    const ring = await ringInfo();
    expect(ring.width).toBeGreaterThanOrEqual(2);
    expect(contrastOnWhite(ring.stroke)).toBeGreaterThanOrEqual(3);
    // A white offset under the ring keeps it visible over dark marks and lines (2px each side).
    expect(ring.haloStroke).toBe('rgb(255, 255, 255)');
    expect(ring.haloWidth).toBeGreaterThanOrEqual(ring.width + 4);
    expect((await labInspect(page)).problems).toEqual([]);

    await page.keyboard.press('ArrowLeft');
    expect(await focusedDot(page)).toBe(order[0]);
    await expect.poll(() => ringsOf(page, LAB_SVG)).toEqual([{ i: order[0], opacity: 1 }]);

    // A quick Right then Left returns to a dot whose ring is still fading out: once settled it has
    // exactly one fully drawn ring (WCAG 2.4.7; the ring is the dot's only focus indicator).
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    expect(await focusedDot(page)).toBe(order[0]);
    await expect.poll(() => ringsOf(page, LAB_SVG)).toEqual([{ i: order[0], opacity: 1 }]);
    await page.waitForTimeout(400);
    expect(await ringsOf(page, LAB_SVG)).toEqual([{ i: order[0], opacity: 1 }]);
    expect((await labInspect(page)).problems).toEqual([]);

    // End reaches the rightmost dot without page overflow (C07, C11).
    await page.keyboard.press('End');
    expect(await focusedDot(page)).toBe(order[order.length - 1]);
    await expect(readout(page)).toHaveText(await expectedReadout(page, order[order.length - 1], 'learning_gains'));
    expect(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth)).toBe(true);

    await page.keyboard.press('Escape');
    await expect(readout(page)).toHaveText('');
    expect(await focusedDot(page), 'focus stays on the dot').toBe(order[order.length - 1]);

    // The readout follows the y variable.
    await page.keyboard.press('Home');
    await choose(page, 'y', 'cognitive_load');
    await page.locator(`${LAB_SVG} .dot[tabindex="0"]`).focus();
    const cl = (await readout(page).textContent()).trim();
    expect(cl).toMatch(READOUT);
    expect(cl).toBe(await expectedReadout(page, order[0], 'cognitive_load'));
  });

  test('5. pointer: hovering previews a dot, clicking pins it, leaving returns to the pin', async ({ page }) => {
    const center = (i) =>
      page.evaluate(
        ({ sel, i }) => {
          const dot = document.querySelector(`${sel} .dot[data-i="${i}"]`);
          dot.scrollIntoView({ block: 'center' });
          const r = dot.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        },
        { sel: LAB_SVG, i }
      );
    const order = await byX(page);
    const a = order[0];
    const b = order[order.length - 1];
    let pt = await center(a);
    await page.mouse.move(pt.x, pt.y);
    await expect(readout(page)).toHaveText(await expectedReadout(page, a, 'learning_gains'));
    await page.mouse.move(1, 1);
    await expect(readout(page)).toHaveText('');
    await page.mouse.click(pt.x, pt.y);
    await expect(readout(page)).toHaveText(await expectedReadout(page, a, 'learning_gains'));
    pt = await center(b);
    await page.mouse.move(pt.x, pt.y);
    await expect(readout(page)).toHaveText(await expectedReadout(page, b, 'learning_gains'));
    await page.mouse.move(1, 1);
    await expect(readout(page)).toHaveText(await expectedReadout(page, a, 'learning_gains'));
    await page.keyboard.press('Escape');
    await expect(readout(page)).toHaveText('');
  });

  test('6. lines off: no trend paths in either view', async ({ page }) => {
    await choose(page, 'lines', 'off');
    for (const view of ['overall', 'condition']) {
      await choose(page, 'view', view);
      await expect(page.locator(`${LAB_SVG} path.trend`)).toHaveCount(0);
      expect((await labInspect(page)).problems).toEqual([]);
    }
  });

  test('7. resize keeps Lab text ≥ 12px and the svg matched to its container', async ({ page }, testInfo) => {
    // This test sets its own viewports, so it runs once per engine.
    test.skip(!testInfo.project.name.endsWith('-1440x900'), 'runs in the 1440×900 project of each engine');
    await choose(page, 'view', 'condition');
    for (const [width, height] of [[1440, 900], [390, 844], [844, 390], [320, 640], [1440, 900]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(400);
      await expectTruePixelText(page, LAB_SVG);
      expect((await labInspect(page)).problems, `${width}×${height}`).toEqual([]);
    }
  });

  test('11. Escape unpins from anywhere in the Lab, including a control (§6.3)', async ({ page }) => {
    const order = await byX(page);
    await page.locator('#lab .seg[data-control="lines"] [aria-checked="true"]').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('End');
    await expect(readout(page)).toHaveText(await expectedReadout(page, order[order.length - 1], 'learning_gains'));
    const control = page.locator('#lab .seg[data-control="view"] [aria-checked="true"]');
    await control.focus();
    await page.keyboard.press('Escape');
    await expect(readout(page)).toHaveText('');
    await expect(control).toBeFocused();
    await expect(page.locator(`${LAB_SVG} .dot[aria-selected="true"]`)).toHaveCount(0);
  });

  test('14. p-text: no-break spaces, and rounding never turns a significant p into .05 or .00 (§6.4)', async ({ page }) => {
    await choose(page, 'y', 'cognitive_load');
    // The Lab reads window.STUDY.stats live; each redraw (here a trend-line toggle) rebuilds the summary.
    const pText = (p) =>
      page.evaluate((p) => {
        window.STUDY.stats.cor.cognitive_load.all.p = p;
        document.querySelector('#lab .seg[data-control="lines"] [aria-checked="false"]').click();
        return document.querySelector('#lab p.lab-summary').textContent.match(/\((.*)\)/)[1];
      }, p);
    const cases = [
      [2e-8, 'p < .001'],
      [0.003, 'p = .003'],
      [0.046, 'p = .046'],
      [0.0496, 'p = .0496'],
      [0.05, 'p = .05, not statistically significant'],
      [0.2246, 'p = .22, not statistically significant'],
    ];
    for (const [p, want] of cases) expect(await pText(p), `p = ${p}`).toBe(want.replace(/ ([<=]) /, '\u00a0$1\u00a0'));
  });

  test('12. the Lab chart is a named group: its dots are focusable, so it cannot be an img (§5.5)', async ({ page }) => {
    const svg = page.locator(LAB_SVG);
    await expect(svg).toHaveAttribute('role', 'group');
    await expect(svg).toHaveAccessibleName(/Scatter plot of presence against learning gain/);
    await choose(page, 'y', 'cognitive_load');
    await expect(svg).toHaveAccessibleName(/Scatter plot of presence against cognitive load/);
  });
});

test.describe('Evidence Lab on touch', () => {
  test.use({ hasTouch: true });

  test('5b. at 390×844 tapping the rightmost dot shows it without overflow; tapping empty space unpins', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.endsWith('-390x844'), 'runs in the 390×844 project of each engine');
    await openLab(page);
    await page.evaluate((sel) => document.querySelector(sel).scrollIntoView({ block: 'center' }), LAB_SVG);
    const target = await page.evaluate((sel) => {
      let best = null;
      for (const d of document.querySelectorAll(`${sel} .dot`)) {
        const r = d.getBoundingClientRect();
        const c = { i: Number(d.dataset.i), x: r.left + r.width / 2, y: r.top + r.height / 2 };
        if (!best || c.x > best.x) best = c;
      }
      return best;
    }, LAB_SVG);
    await page.touchscreen.tap(target.x, target.y);
    await expect(readout(page)).toHaveText(await expectedReadout(page, target.i, 'learning_gains'));
    expect(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth)).toBe(true);

    // Empty plot space: a point inside the plot at least 40px from every dot.
    const empty = await page.evaluate((sel) => {
      const svg = document.querySelector(sel);
      const plot = svg.querySelector('g.frame .axis-x .domain').getBoundingClientRect();
      const top = svg.getBoundingClientRect().top + 40;
      const dots = [...svg.querySelectorAll('.dot')].map((d) => d.getBoundingClientRect());
      for (let y = top; y < plot.top; y += 6) {
        for (let x = plot.left + 10; x < plot.right - 10; x += 6) {
          if (dots.every((r) => Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y) > 40)) return { x, y };
        }
      }
      return null;
    }, LAB_SVG);
    expect(empty).not.toBeNull();
    await page.touchscreen.tap(empty.x, empty.y);
    await expect(readout(page)).toHaveText('');
    expect(pageErrorsOf(page)).toEqual([]);
  });
});

test.describe('Evidence Lab interrupted', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('8. a y-switch with a hover at 200ms settles to exactly the chosen state (C02)', async ({ page }) => {
    await openLab(page);
    await choose(page, 'view', 'condition');
    await page.locator('#lab .seg[data-control="y"] [data-value="cognitive_load"]').click();
    await page.waitForTimeout(200);
    const pt = await page.evaluate((sel) => {
      const r = document.querySelector(`${sel} .dot`).getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, LAB_SVG);
    await page.mouse.move(pt.x, pt.y, { steps: 2 });
    await page.waitForTimeout(1500);
    const r = await labInspect(page);
    expect(r.state).toBe('condition cognitive_load on');
    expect(r.problems).toEqual([]);
    expect(pageErrorsOf(page)).toEqual([]);
  });

  test('9. a pinned dot’s ring never leaves its dot while a y-switch animates (C02)', async ({ page }) => {
    await openLab(page);
    const order = await byX(page);
    await page.locator('#lab .seg[data-control="lines"] [aria-checked="true"]').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('End');
    const pinnedI = order[order.length - 1];
    expect(await focusedDot(page)).toBe(pinnedI);
    await expect(page.locator(`${LAB_SVG} circle.emph-ring`)).toHaveCount(1);
    // Switch y from inside the page (focus stays on the dot) and sample the ring against its dot.
    const samples = await page.evaluate(
      async ({ sel, at }) => {
        const { translate } = window.__probe;
        const svg = document.querySelector(sel);
        const sample = () => {
          const ring = svg.querySelector('circle.emph-ring');
          if (!ring) return { ring: false };
          const [cx, cy] = translate(svg.querySelector(`.dot[data-i="${ring.__data__.i}"]`));
          return { ring: true, i: ring.__data__.i, d: Math.hypot(Number(ring.getAttribute('cx')) - cx, Number(ring.getAttribute('cy')) - cy) };
        };
        document.querySelector('#lab .seg[data-control="y"] [data-value="cognitive_load"]').click();
        const t0 = performance.now();
        const out = [];
        for (const ms of at) {
          await new Promise((r) => setTimeout(r, ms - (performance.now() - t0)));
          out.push({ ms, ...sample() });
        }
        return out;
      },
      { sel: LAB_SVG, at: [50, 150, 300, 400, 600] }
    );
    for (const s of samples) {
      if (s.ring) expect(s.d, `ring ${s.d.toFixed(1)}px from its dot at ${s.ms}ms`).toBeLessThanOrEqual(3);
    }
    // Once settled, the pinned dot has its ring back, centred on it.
    await settled(page, 'overall cognitive_load on');
    await expect(page.locator(`${LAB_SVG} circle.emph-ring`)).toHaveCount(1);
    await page.waitForTimeout(300); // the ring's fade-in
    const r = await labInspect(page);
    expect(r.problems).toEqual([]);
    expect(await page.evaluate((sel) => document.querySelector(`${sel} circle.emph-ring`).__data__.i, LAB_SVG)).toBe(pinnedI);
    expect(pageErrorsOf(page)).toEqual([]);
  });

  test('13. toggling trend lines keeps the pinned dot’s ring: the dots do not move', async ({ page }) => {
    await openLab(page);
    const order = await byX(page);
    await page.locator('#lab .seg[data-control="lines"] [aria-checked="true"]').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('End');
    const pinnedI = order[order.length - 1];
    await expect.poll(() => ringsOf(page, LAB_SVG)).toEqual([{ i: pinnedI, opacity: 1 }]);
    // Toggle from inside the page (focus stays on the dot) and sample the ring while lines fade.
    const samples = await page.evaluate(
      async ({ sel, at }) => {
        document.querySelector('#lab .seg[data-control="lines"] [data-value="off"]').click();
        const t0 = performance.now();
        const out = [];
        for (const ms of at) {
          await new Promise((r) => setTimeout(r, ms - (performance.now() - t0)));
          out.push({ ms, rings: [...document.querySelectorAll(`${sel} circle.emph-ring`)].map((c) => c.__data__.i) });
        }
        return out;
      },
      { sel: LAB_SVG, at: [100, 300, 500] }
    );
    for (const s of samples) expect(s.rings, `rings at ${s.ms}ms`).toEqual([pinnedI]);
    await settled(page, 'overall learning_gains off');
    await expect.poll(() => ringsOf(page, LAB_SVG)).toEqual([{ i: pinnedI, opacity: 1 }]);
    expect((await labInspect(page)).problems).toEqual([]);
  });
});

test.describe('Evidence Lab from file://', () => {
  test('10. the Lab renders from file://', { tag: '@file' }, async ({ page }) => {
    await openLab(page);
    await expect(page.locator(`${LAB_SVG} .dot`)).toHaveCount(108);
    await expect(page.locator('#lab p.lab-summary')).toHaveText(SUMMARIES['overall learning_gains']);
    expect(pageErrorsOf(page)).toEqual([]);
  });
});
