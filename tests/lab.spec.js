// Evidence Lab (v4.0.0): 3×3×2 controls (View × Relationship × Trendlines), guided presets,
// stats-driven summaries, keyboard and pointer inspection with readout, and interrupted transition safety.
const { test, expect } = require('@playwright/test');
const { openPage, pageErrorsOf, expectTruePixelText, ringsOf, svgFits } = require('./chart-helpers');

const SUMMARIES = {
  'condition learning_gains':
    'Within each condition: r = .16 for VR, −.19 for desktop, .12 for video — none statistically significant.',
  'split learning_gains':
    'Within each condition: r = .16 for VR, −.19 for desktop, .12 for video — none statistically significant.',
  'overall learning_gains': 'Pooled across all 108 participants: r = .51 (p < .001).',
  'condition cognitive_load':
    'Within each condition: r = −.17 for VR, −.04 for desktop, .29 for video — none statistically significant.',
  'split cognitive_load':
    'Within each condition: r = −.17 for VR, −.04 for desktop, .29 for video — none statistically significant.',
  'overall cognitive_load': 'Pooled across all 108 participants: r = .12 (p = .22, not statistically significant).',
  'condition load_vs_gain':
    'Within each condition: r = .14 for VR, −.12 for desktop, .09 for video — none statistically significant.',
  'split load_vs_gain':
    'Within each condition: r = .14 for VR, −.12 for desktop, .09 for video — none statistically significant.',
  'overall load_vs_gain': 'Pooled across all 108 participants: r = .13 (p = .18, not statistically significant).',
};

const READOUT = /^(VR headset|Desktop sim|Video \+ text) · (presence|cognitive load) \d+ · (learning gain [+−]?\d+|cognitive load \d+)$/;
const LAB_SVG = '#lab svg.chart-svg';

async function openLab(page) {
  await openPage(page);
  await page.evaluate(() => document.querySelector('#lab .lab-stage').scrollIntoView({ block: 'start' }));
  await expect(page.locator('#lab')).toHaveAttribute('data-state', 'overall learning_gains on');
}

const settled = (page, state) => expect(page.locator('#lab')).toHaveAttribute('data-state', state, { timeout: 5000 });

async function choose(page, control, value) {
  await page.locator(`#lab .seg[data-control="${control}"] [data-value="${value}"]`).click();
  const state = await page.evaluate(() =>
    ['view', 'axes', 'lines']
      .map((c) => document.querySelector(`#lab .seg[data-control="${c}"] [aria-checked="true"]`).dataset.value)
      .join(' ')
  );
  await settled(page, state);
}

const expectedReadout = (page, i, axesKey) =>
  page.evaluate(
    ({ i, axesKey }) => {
      const p = window.STUDY.points[i];
      const meta = {
        learning_gains: { x: 'presence', xName: 'presence', y: 'learning_gains', yName: 'learning gain' },
        cognitive_load: { x: 'presence', xName: 'presence', y: 'cognitive_load', yName: 'cognitive load' },
        load_vs_gain: { x: 'cognitive_load', xName: 'cognitive load', y: 'learning_gains', yName: 'learning gain' },
      }[axesKey];
      const xv = p[meta.x] < 0 ? '−' + Math.abs(p[meta.x]) : String(p[meta.x]);
      const v = p[meta.y];
      const yv = meta.y === 'learning_gains' ? (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) : String(v);
      return `${window.STUDY.labels[p.condition]} · ${meta.xName} ${xv} · ${meta.yName} ${yv}`;
    },
    { i, axesKey }
  );

const byX = (page, axesKey = 'learning_gains', view = 'overall') =>
  page.evaluate(({ axesKey, view }) => {
    const xVar = axesKey === 'load_vs_gain' ? 'cognitive_load' : 'presence';
    const jScale = xVar === 'cognitive_load' ? 0.22 : 1;
    const grpRank = { Low: 0, Medium: 1, High: 2 };
    return window.STUDY.points
      .slice()
      .sort((a, b) => {
        if (view === 'split' && a.condition !== b.condition) return grpRank[a.condition] - grpRank[b.condition];
        return (a[xVar] + a.jx * jScale) - (b[xVar] + b.jx * jScale) || a.i - b.i;
      })
      .map((p) => p.i);
  }, { axesKey, view });

const readout = (page) => page.locator('#lab .lab-readout');
const focusedDot = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    return el && el.matches('#lab .dot') ? Number(el.dataset.i) : null;
  });

function contrastOnWhite(rgb) {
  const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return 1.05 / (L + 0.05);
}

const labInspect = (page) =>
  page.evaluate(() => {
    const S = window.STUDY;
    const { scaleFrom, translate } = window.__probe;
    const lab = document.getElementById('lab');
    const [view, axesKey, lines] = (lab.dataset.state || '').split(' ');
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
    const COLORS = { neutral: 'rgb(115, 115, 115)', High: 'rgb(208, 69, 12)', Low: 'rgb(58, 58, 58)', white: 'rgb(255, 255, 255)' };
    const shapes = { High: 'circle', Medium: 'ring', Low: 'diamond' };
    const dots = [...svg.querySelectorAll('.dot')];
    if (dots.length !== 108) problems.push(`${dots.length} dots`);
    const pooled = view === 'overall';

    if (view !== 'split') {
      const plot = svg.querySelector('g.frame g.plot');
      const x = scaleFrom(plot.querySelector('.axis-x[data-id="main"]'), 0);
      const y = scaleFrom(plot.querySelector('.axis-y'), 1);
      const xVar = axesKey === 'load_vs_gain' ? 'cognitive_load' : 'presence';
      const yVar = axesKey === 'cognitive_load' ? 'cognitive_load' : 'learning_gains';
      const jScale = xVar === 'cognitive_load' ? 0.22 : 1;
      for (const d of dots) {
        const p = S.points[Number(d.dataset.i)];
        const [cx, cy] = translate(d);
        const ex = x(p[xVar] + p.jx * jScale);
        const ey = y(p[yVar] + p.jy);
        if (Math.abs(cx - ex) > 0.5 || Math.abs(cy - ey) > 0.5) problems.push(`dot ${p.i} at ${cx},${cy}; expected ${ex},${ey}`);
        const fill = getComputedStyle(d).fill;
        const want = pooled ? COLORS.neutral : p.condition === 'Medium' ? COLORS.white : COLORS[p.condition];
        if (fill !== want) problems.push(`dot ${p.i} fill ${fill}, expected ${want}`);
        if (d.dataset.shape !== (pooled ? 'circle' : shapes[p.condition])) problems.push(`dot ${p.i} shape ${d.dataset.shape}`);
      }
    } else {
      if (svg.querySelectorAll('rect.panel-bg').length !== 3) problems.push('expected 3 split panel rects');
      for (const d of dots) {
        const p = S.points[Number(d.dataset.i)];
        const fill = getComputedStyle(d).fill;
        const want = p.condition === 'Medium' ? COLORS.white : COLORS[p.condition];
        if (fill !== want) problems.push(`split dot ${p.i} fill ${fill}, expected ${want}`);
        if (d.dataset.shape !== shapes[p.condition]) problems.push(`split dot ${p.i} shape ${d.dataset.shape}`);
      }
    }

    const trends = [...svg.querySelectorAll('path.trend')].length;
    const wantTrends = lines === 'off' ? 0 : view === 'overall' ? 1 : view === 'condition' ? 4 : 6;
    if (trends !== wantTrends) problems.push(`${trends} trend lines, expected ${wantTrends}`);

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
    const counts = { view: 3, axes: 3, lines: 2 };
    for (const [control, count] of Object.entries(counts)) {
      const seg = page.locator(`#lab .seg[data-control="${control}"]`);
      await expect(seg).toHaveAttribute('role', 'radiogroup');
      await expect(seg.locator('[role="radio"]')).toHaveCount(count);
      await expect(seg.locator('[aria-checked="true"]')).toHaveCount(1);
      await expect(seg.locator('[tabindex="0"]')).toHaveCount(1);
      for (const radio of await seg.locator('[role="radio"]').all()) {
        expect((await radio.boundingBox()).height, `${control} option height`).toBeGreaterThanOrEqual(44);
      }
    }
    const checked = (control) => page.locator(`#lab .seg[data-control="${control}"] [aria-checked="true"]`);

    // View: Overall → Overlay (condition) → Split → wraps back to Overall.
    await checked('view').focus();
    await page.keyboard.press('ArrowRight');
    await expect(checked('view')).toHaveAttribute('data-value', 'condition');
    await expect(checked('view')).toBeFocused();
    await settled(page, 'condition learning_gains on');
    await expect(page.locator(`${LAB_SVG} path.trend`)).toHaveCount(4);
    expect((await labInspect(page)).problems).toEqual([]);

    await page.keyboard.press('ArrowRight');
    await expect(checked('view')).toHaveAttribute('data-value', 'split');
    await settled(page, 'split learning_gains on');
    await expect(page.locator(`${LAB_SVG} path.trend`)).toHaveCount(6);
    expect((await labInspect(page)).problems).toEqual([]);

    await page.keyboard.press('ArrowRight');
    await expect(checked('view')).toHaveAttribute('data-value', 'overall');
    await settled(page, 'overall learning_gains on');
    await expect(page.locator(`${LAB_SVG} path.trend`)).toHaveCount(1);

    // Axes: ArrowDown switches to cognitive_load, then load_vs_gain.
    await checked('axes').focus();
    await page.keyboard.press('ArrowDown');
    await expect(checked('axes')).toHaveAttribute('data-value', 'cognitive_load');
    await settled(page, 'overall cognitive_load on');
    const ticks = await page.$$eval(`${LAB_SVG} .axis-y .tick`, (ts) => ts.map((t) => Number(t.dataset.v)));
    expect(Math.max(...ticks)).toBe(12);

    await page.keyboard.press('ArrowDown');
    await expect(checked('axes')).toHaveAttribute('data-value', 'load_vs_gain');
    await settled(page, 'overall load_vs_gain on');
    const xTicks = await page.$$eval(`${LAB_SVG} .axis-x .tick`, (ts) => ts.map((t) => Number(t.dataset.v)));
    expect(Math.max(...xTicks)).toBe(12);
    expect((await labInspect(page)).problems).toEqual([]);

    // Trendlines: ArrowLeft wraps to "Off" and lines disappear.
    await checked('lines').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(checked('lines')).toHaveAttribute('data-value', 'off');
    await settled(page, 'overall load_vs_gain off');
    await expect(page.locator(`${LAB_SVG} path.trend`)).toHaveCount(0);

    await page.locator('#lab .seg[data-control="lines"] [data-value="on"]').focus();
    await page.keyboard.press('Space');
    await settled(page, 'overall load_vs_gain on');
  });

  test('1b. guided investigation presets switch state and inspect target participants', async ({ page }) => {
    const pFallacy = page.locator('#lab .preset-btn[data-preset="fallacy"]');
    const pLoad = page.locator('#lab .preset-btn[data-preset="load"]');
    const p88 = page.locator('#lab .preset-btn[data-preset="p88"]');

    await pFallacy.click();
    await settled(page, 'condition learning_gains on');
    await expect(pFallacy).toHaveAttribute('aria-pressed', 'true');
    await expect(readout(page)).toHaveText('');

    await pLoad.click();
    await settled(page, 'condition load_vs_gain on');
    await expect(pLoad).toHaveAttribute('aria-pressed', 'true');
    await expect(readout(page)).toHaveText(await expectedReadout(page, 50, 'load_vs_gain'));
    await expect.poll(() => ringsOf(page, LAB_SVG)).toEqual([{ i: 50, opacity: 1 }]);

    await p88.click();
    await settled(page, 'condition learning_gains on');
    await expect(p88).toHaveAttribute('aria-pressed', 'true');
    await expect(readout(page)).toHaveText(await expectedReadout(page, 88, 'learning_gains'));
    await expect.poll(() => ringsOf(page, LAB_SVG)).toEqual([{ i: 88, opacity: 1 }]);
  });

  test('2. summary sentence and chart match across all 18 state combinations', async ({ page }) => {
    const summary = page.locator('#lab p.lab-summary');
    for (const axes of ['learning_gains', 'cognitive_load', 'load_vs_gain']) {
      await choose(page, 'axes', axes);
      for (const view of ['overall', 'condition', 'split']) {
        await choose(page, 'view', view);
        for (const lines of ['on', 'off']) {
          await choose(page, 'lines', lines);
          await expect(summary).toHaveText(SUMMARIES[`${view} ${axes}`]);
          expect((await labInspect(page)).problems, `${view} ${axes} ${lines}`).toEqual([]);
        }
      }
    }
  });

  test('3. cognitive load: the y domain starts at 0 and no tick is negative', async ({ page }) => {
    await choose(page, 'axes', 'cognitive_load');
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
    for (const control of ['axes', 'lines']) {
      await page.keyboard.press('Tab');
      const r = await focusedRadio();
      expect(r && r.control).toBe(control);
      expect(r.checked).toBe('true');
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
    expect(ring.haloStroke).toBe('rgb(255, 255, 255)');
    expect(ring.haloWidth).toBeGreaterThanOrEqual(ring.width + 4);

    await page.keyboard.press('ArrowLeft');
    expect(await focusedDot(page)).toBe(order[0]);
    await expect.poll(() => ringsOf(page, LAB_SVG)).toEqual([{ i: order[0], opacity: 1 }]);

    await page.keyboard.press('End');
    expect(await focusedDot(page)).toBe(order[order.length - 1]);
    await expect(readout(page)).toHaveText(await expectedReadout(page, order[order.length - 1], 'learning_gains'));
    expect(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth)).toBe(true);

    await page.keyboard.press('Escape');
    await expect(readout(page)).toHaveText('');
    expect(await focusedDot(page)).toBe(order[order.length - 1]);

    await page.keyboard.press('Home');
    await choose(page, 'axes', 'cognitive_load');
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

  test('6. lines off: no trend paths in any view', async ({ page }) => {
    await choose(page, 'lines', 'off');
    for (const view of ['overall', 'condition', 'split']) {
      await choose(page, 'view', view);
      await expect(page.locator(`${LAB_SVG} path.trend`)).toHaveCount(0);
      expect((await labInspect(page)).problems).toEqual([]);
    }
  });

  test('7. resize keeps Lab text ≥ 12px and the svg matched to its container', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.endsWith('-1440x900'), 'runs in the 1440×900 project of each engine');
    for (const view of ['condition', 'split']) {
      await choose(page, 'view', view);
      for (const [width, height] of [[1440, 900], [390, 844], [844, 390], [320, 640], [1440, 900]]) {
        await page.setViewportSize({ width, height });
        await expect.poll(() => svgFits(page, LAB_SVG)).toBe(true);
        await expectTruePixelText(page, LAB_SVG);
        expect((await labInspect(page)).problems, `${view} ${width}×${height}`).toEqual([]);
      }
    }
  });

  test('11. Escape unpins from anywhere in the Lab, including a control', async ({ page }) => {
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

  test('14. p-text: no-break spaces, and rounding never turns a significant p into .05 or .00', async ({ page }) => {
    await choose(page, 'axes', 'cognitive_load');
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

  test('12. the Lab chart is a named group with focusable dots', async ({ page }) => {
    const svg = page.locator(LAB_SVG);
    await expect(svg).toHaveAttribute('role', 'group');
    await expect(svg).toHaveAccessibleName(/Scatter plot of presence against learning gain/);
    await choose(page, 'axes', 'load_vs_gain');
    await expect(svg).toHaveAccessibleName(/Scatter plot of cognitive load against learning gain/);
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

  test('8. an axis switch with a hover at 200ms settles to the chosen state', async ({ page }) => {
    await openLab(page);
    await choose(page, 'view', 'condition');
    await page.locator('#lab .seg[data-control="axes"] [data-value="cognitive_load"]').click();
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

  test('9. a pinned dot ring stays aligned or clears cleanly while switching axes', async ({ page }) => {
    await openLab(page);
    const order = await byX(page);
    await page.locator('#lab .seg[data-control="lines"] [aria-checked="true"]').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('End');
    const pinnedI = order[order.length - 1];
    expect(await focusedDot(page)).toBe(pinnedI);
    await expect(page.locator(`${LAB_SVG} circle.emph-ring`)).toHaveCount(1);
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
        document.querySelector('#lab .seg[data-control="axes"] [data-value="cognitive_load"]').click();
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
    await settled(page, 'overall cognitive_load on');
    await expect(page.locator(`${LAB_SVG} circle.emph-ring`)).toHaveCount(1);
    await page.waitForTimeout(300);
    const r = await labInspect(page);
    expect(r.problems).toEqual([]);
    expect(await page.evaluate((sel) => document.querySelector(`${sel} circle.emph-ring`).__data__.i, LAB_SVG)).toBe(pinnedI);
    expect(pageErrorsOf(page)).toEqual([]);
  });

  test('13. toggling trend lines keeps the pinned dot ring in place', async ({ page }) => {
    await openLab(page);
    const order = await byX(page);
    await page.locator('#lab .seg[data-control="lines"] [aria-checked="true"]').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('End');
    const pinnedI = order[order.length - 1];
    await expect.poll(() => ringsOf(page, LAB_SVG)).toEqual([{ i: pinnedI, opacity: 1 }]);
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

test.describe('Evidence Lab text overlap', () => {
  test.use({ reducedMotion: 'reduce' });

  test('15. no chart texts overlap in any of the 18 states', async ({ page }) => {
    await openLab(page);
    for (const axes of ['learning_gains', 'cognitive_load', 'load_vs_gain']) {
      await choose(page, 'axes', axes);
      for (const view of ['overall', 'condition', 'split']) {
        await choose(page, 'view', view);
        for (const lines of ['on', 'off']) {
          await choose(page, 'lines', lines);
          expect(await page.evaluate((sel) => window.__probe.overlaps(sel), LAB_SVG), `${view} ${axes} ${lines}`).toEqual([]);
        }
      }
    }
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
