// Shared helpers for the narrative chart tests. `probe` runs inside the page (installed with
// addInitScript) and exposes window.__probe: midline-aware step centering and an inspector that
// checks the settled chart DOM against window.STUDY. Expected values come from STUDY, never from
// script.js internals; scales are recovered from the rendered axis ticks.
const { expect } = require('@playwright/test');

const STATES = ['participants', 'gains', 'scatterPooled', 'scatterByCondition', 'load'];

// Spec §5.3 chart headlines, one per step.
const HEADLINES = [
  'Three groups of nearly equal size',
  'Both simulations far outpaced the video',
  'Pooled, presence tracks learning',
  'Within each group, the link fades',
  'VR felt hardest, but not significantly',
];

function probe() {
  const STATES = ['participants', 'gains', 'scatterPooled', 'scatterByCondition', 'load'];
  const COLORS = {
    neutral: 'rgb(118, 118, 118)',
    High: 'rgb(208, 69, 12)',
    Medium: 'rgb(42, 111, 219)',
    Low: 'rgb(58, 58, 58)',
    white: 'rgb(255, 255, 255)',
  };

  /** The midline of the visible text area (spec §5.1), as the tests understand the tiers. */
  function midline() {
    const short = matchMedia('(max-height: 500px) and (orientation: landscape)').matches;
    const wide = !short && matchMedia('(min-width: 900px)').matches;
    if (short || wide) return innerHeight / 2;
    // Phone: halfway between the sticky band's bottom (band is pinned at top 0) and the viewport bottom.
    return (document.getElementById('story-figure').offsetHeight + innerHeight) / 2;
  }

  /** Scroll so step n's vertical center sits on the midline. */
  function centerStep(n) {
    const step = document.querySelector(`.step[data-step="${n}"]`);
    const r = step.getBoundingClientRect();
    window.scrollTo(0, r.top + scrollY + r.height / 2 - midline());
  }

  function activeStep() {
    const el = document.querySelector('.step[aria-current="step"]');
    return el ? Number(el.dataset.step) : null;
  }

  /** Parse "translate(x, y)" into [x, y]. */
  function translate(el) {
    const m = /translate\(\s*([-\d.e]+)[\s,]+([-\d.e]+)\s*\)/.exec(el.getAttribute('transform') || '');
    return m ? [Number(m[1]), Number(m[2])] : [NaN, NaN];
  }

  /** Recover a linear scale from the first and last tick of an axis group. */
  function scaleFrom(axis, dim) {
    const ticks = [...axis.querySelectorAll('.tick')].map((t) => ({ v: Number(t.dataset.v), p: translate(t)[dim] }));
    ticks.sort((a, b) => a.v - b.v);
    const a = ticks[0];
    const b = ticks[ticks.length - 1];
    const k = (b.p - a.p) / (b.v - a.v);
    const f = (v) => a.p + (v - a.v) * k;
    f.ticks = ticks.map((t) => t.v);
    return f;
  }

  function svg() {
    return document.querySelector('#story-figure svg.chart-svg');
  }

  /**
   * Inspect the narrative chart. Returns { state, active, expected, hed, problems } where problems is
   * a list of human-readable mismatches between the DOM and the settled state named by data-state.
   */
  function inspect() {
    const S = window.STUDY;
    const problems = [];
    const fig = document.getElementById('story-figure');
    const state = fig.getAttribute('data-state');
    const active = activeStep();
    const expected = STATES[(active || 1) - 1];
    const hed = document.querySelector('#story-figure .chart-hed').textContent.trim();
    const root = svg();
    if (!root) return { state, active, expected, hed, problems: ['no svg.chart-svg'] };
    if (state !== expected) problems.push(`data-state ${state} but active step ${active} expects ${expected}`);

    const allFrames = root.querySelectorAll('g.frame');
    if (allFrames.length !== 1) problems.push(`${allFrames.length} g.frame elements (expected exactly 1)`);
    const frame = root.querySelector('g.frame:not(.exiting)');
    if (!frame) return { state, active, expected, hed, problems: problems.concat('no live frame') };
    const plot = frame.querySelector('g.plot');

    // Nothing may be left partly faded once settled.
    for (const el of [root, ...root.querySelectorAll('*')]) {
      const op = Number(getComputedStyle(el).opacity);
      if (op !== 1) {
        problems.push(`opacity ${op} on ${el.tagName}.${el.getAttribute('class')}`);
        break;
      }
    }

    const dots = [...root.querySelectorAll('.dot')];
    const bars = [...root.querySelectorAll('rect.bar')];
    const trends = [...root.querySelectorAll('path.trend')];
    const cis = [...root.querySelectorAll('line.ci')];
    const near = (a, b, tol) => Math.abs(a - b) <= tol;

    if (state === 'participants' || state === 'gains' || state === 'load') {
      if (frame.dataset.frame !== 'bars') problems.push(`frame ${frame.dataset.frame} for ${state}`);
      if (dots.length) problems.push(`${dots.length} dots over bars`);
      if (trends.length) problems.push(`${trends.length} trend lines over bars`);
      if (bars.length !== 3) problems.push(`${bars.length} bars`);
      const x = scaleFrom(plot.querySelector('.axis-x'), 0);
      const value = (g) =>
        state === 'participants' ? S.stats.groups[g].n : S.stats.groups[g][state === 'gains' ? 'learning_gains' : 'cognitive_load'].mean;
      for (const b of bars) {
        const g = b.dataset.group;
        const x0 = Number(b.getAttribute('x'));
        const w = Number(b.getAttribute('width'));
        if (!near(x0, x(0), 1)) problems.push(`bar ${g} starts at ${x0}, not x(0)=${x(0)}`);
        if (!near(x0 + w, x(value(g)), 1)) problems.push(`bar ${g} ends at ${x0 + w}, not ${x(value(g))}`);
      }
      const nCi = state === 'participants' ? 0 : 3;
      if (cis.length !== nCi) problems.push(`${cis.length} line.ci (expected ${nCi})`);
      for (const l of cis) {
        const g = l.dataset.group;
        const ci = S.stats.groups[g][state === 'gains' ? 'learning_gains' : 'cognitive_load'].ci;
        const bar = bars.find((b) => b.dataset.group === g);
        const cy = Number(bar.getAttribute('y')) + Number(bar.getAttribute('height')) / 2;
        const [x1, x2, y1, y2] = ['x1', 'x2', 'y1', 'y2'].map((a) => Number(l.getAttribute(a)));
        if (!near(x1, x(ci[0]), 1) || !near(x2, x(ci[1]), 1)) problems.push(`CI ${g} spans ${x1}..${x2}, not ${x(ci[0])}..${x(ci[1])}`);
        if (!near(y1, cy, 1) || !near(y2, cy, 1)) problems.push(`CI ${g} at y ${y1}/${y2}, bar center ${cy}`);
      }
    } else if (state === 'scatterPooled' || state === 'scatterByCondition') {
      if (frame.dataset.frame !== 'scatter') problems.push(`frame ${frame.dataset.frame} for ${state}`);
      if (bars.length) problems.push(`${bars.length} bars over scatter`);
      if (cis.length) problems.push(`${cis.length} CI lines over scatter`);
      if (dots.length !== 108) problems.push(`${dots.length} dots`);
      const x = scaleFrom(plot.querySelector('.axis-x'), 0);
      const y = scaleFrom(plot.querySelector('.axis-y'), 1);
      const pooled = state === 'scatterPooled';
      const shapes = { High: 'circle', Medium: 'ring', Low: 'diamond' };
      const seen = new Set();
      for (const d of dots) {
        const i = Number(d.dataset.i);
        seen.add(i);
        const p = S.points[i];
        const [cx, cy] = translate(d);
        if (!near(cx, x(p.presence + p.jx), 0.5) || !near(cy, y(p.learning_gains + p.jy), 0.5)) {
          problems.push(`dot ${i} at ${cx},${cy}; expected ${x(p.presence + p.jx)},${y(p.learning_gains + p.jy)}`);
        }
        const cs = getComputedStyle(d);
        const wantFill = pooled ? COLORS.neutral : p.condition === 'Medium' ? COLORS.white : COLORS[p.condition];
        if (cs.fill !== wantFill) problems.push(`dot ${i} (${p.condition}) fill ${cs.fill}, expected ${wantFill}`);
        if (!pooled && p.condition === 'Medium' && cs.stroke !== COLORS.Medium) problems.push(`dot ${i} ring stroke ${cs.stroke}`);
        const wantShape = pooled ? 'circle' : shapes[p.condition];
        if (d.dataset.shape !== wantShape) problems.push(`dot ${i} shape ${d.dataset.shape}, expected ${wantShape}`);
      }
      if (seen.size !== 108) problems.push(`${seen.size} distinct data-i values`);
      const groups = trends.map((t) => t.dataset.group).sort().join(',');
      if (pooled) {
        if (groups !== 'all') problems.push(`trend lines [${groups}], expected [all]`);
      } else {
        if (groups !== 'High,Low,Medium,all') problems.push(`trend lines [${groups}]`);
        const ghost = trends.filter((t) => t.classList.contains('ghost'));
        if (ghost.length !== 1 || ghost[0].dataset.group !== 'all') problems.push('expected exactly one ghost line, the pooled one');
        else if (['none', ''].includes(getComputedStyle(ghost[0]).strokeDasharray)) problems.push('ghost line is not dashed');
      }
    } else {
      problems.push(`unknown state ${state}`);
    }
    return { state, active, expected, hed, problems };
  }

  /**
   * Geometry of the live narrative frame right now (mid-transition or settled): the frame's
   * opacity, data-state, the plot and x-axis translates, and each CI whisker's y against the
   * current middle of its bar.
   */
  function geometry() {
    const fig = document.getElementById('story-figure');
    const frame = svg().querySelector('g.frame:not(.exiting)');
    const bar = (g) => frame.querySelector(`rect.bar[data-group="${g}"]`);
    return {
      state: fig.getAttribute('data-state'),
      frame: frame.dataset.frame,
      opacity: Number(getComputedStyle(frame).opacity),
      plot: translate(frame.querySelector('g.plot')),
      axisX: translate(frame.querySelector('.axis-x')),
      cis: [...frame.querySelectorAll('line.ci')].map((l) => ({
        group: l.dataset.group,
        y1: Number(l.getAttribute('y1')),
        y2: Number(l.getAttribute('y2')),
        barMid: Number(bar(l.dataset.group).getAttribute('y')) + Number(bar(l.dataset.group).getAttribute('height')) / 2,
      })),
    };
  }

  window.__probe = { midline, centerStep, activeStep, inspect, scaleFrom, translate, svg, geometry };
}

const pageErrors = new WeakMap();

/** Install the probe and load the page. Works for http and file:// projects alike. */
async function openPage(page) {
  const errors = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(probe);
  await page.goto('index.html');
  await page.evaluate(() => document.fonts.ready);
}

/** Wait two animation frames so the rAF-throttled scroll check has run. */
const twoFrames = (page) =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

/** Center step n on the midline and wait for its chart state to settle. */
async function goToStep(page, n, { settle = true } = {}) {
  await page.evaluate((n) => window.__probe.centerStep(n), n);
  await twoFrames(page);
  if (settle) {
    await page.waitForFunction((s) => document.getElementById('story-figure').getAttribute('data-state') === s, STATES[n - 1], {
      timeout: 5000,
    });
  }
}

/** Scroll the whole page in innerHeight/8 increments and record the distinct active steps. */
const recordStepOrder = (page, direction) =>
  page.evaluate(async (direction) => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const inc = innerHeight / 8;
    const seen = [];
    const ys = [];
    for (let y = 0; y <= max + inc; y += inc) ys.push(Math.min(y, max));
    if (direction === 'up') ys.reverse();
    for (const y of ys) {
      window.scrollTo(0, y);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const a = window.__probe.activeStep();
      if (a !== null && a !== seen[seen.length - 1]) seen.push(a);
    }
    return seen;
  }, direction);

/** Uncaught errors seen since openPage (chart code must never throw). */
const pageErrorsOf = (page) => pageErrors.get(page) || [];

/**
 * Every chart text renders at ≥ 12 CSS px, and the SVG is sized to its container's content box.
 * `selector` picks the chart: the narrative figure by default, or the Lab's svg.
 */
async function expectTruePixelText(page, selector = '#story-figure svg.chart-svg') {
  const r = await page.evaluate((selector) => {
    const svg = document.querySelector(selector);
    const wrap = svg.parentElement;
    const cs = getComputedStyle(wrap);
    const contentW = wrap.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const contentH = wrap.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const texts = [...svg.querySelectorAll('text')].map((t) => ({
      text: t.textContent,
      px: parseFloat(getComputedStyle(t).fontSize) * t.getScreenCTM().a,
    }));
    return {
      width: Number(svg.getAttribute('width')),
      height: Number(svg.getAttribute('height')),
      viewBox: svg.getAttribute('viewBox'),
      contentW,
      contentH,
      texts,
    };
  }, selector);
  expect(Math.abs(r.width - r.contentW), `svg width ${r.width} vs content ${r.contentW}`).toBeLessThanOrEqual(1);
  expect(Math.abs(r.height - r.contentH), `svg height ${r.height} vs content ${r.contentH}`).toBeLessThanOrEqual(1);
  expect(r.viewBox).toBe(`0 0 ${r.width} ${r.height}`);
  expect(r.texts.length).toBeGreaterThan(3);
  for (const t of r.texts) expect(t.px, `rendered size of "${t.text}"`).toBeGreaterThanOrEqual(12);
}

module.exports = { STATES, HEADLINES, probe, openPage, pageErrorsOf, twoFrames, goToStep, recordStepOrder, expectTruePixelText };
