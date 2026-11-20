// Shared helpers for the v4.0.0 narrative chart tests. `probe` runs inside the page via
// addInitScript and exposes window.__probe: midline-aware step centering and an inspector that
// checks the settled chart DOM against window.STUDY across all 6 steps.
const { expect } = require('@playwright/test');

const STATES = ['design', 'gains', 'scatterPooled', 'scatterByCondition', 'scatterSplit', 'load'];

const HEADLINES = [
  'Experimental design: three balanced cohorts',
  'Learning gain by condition (10-question test)',
  'Pooled across all 108, presence tracks learning',
  'Within each condition, the link fades',
  'Three groups separated against the pooled diagonal',
  'Cognitive load across all 108 learners (0–12)',
];

function probe() {
  const STATES = ['design', 'gains', 'scatterPooled', 'scatterByCondition', 'scatterSplit', 'load'];
  const COLORS = {
    neutral: 'rgb(115, 115, 115)',
    High: 'rgb(208, 69, 12)',
    Medium: 'rgb(42, 111, 219)',
    Low: 'rgb(58, 58, 58)',
    white: 'rgb(255, 255, 255)',
  };

  function midline() {
    const short = matchMedia('(max-height: 500px) and (orientation: landscape)').matches;
    const wide = !short && matchMedia('(min-width: 900px)').matches;
    if (short || wide) return innerHeight / 2;
    return (document.getElementById('story-figure').offsetHeight + innerHeight) / 2;
  }

  function centerStep(n) {
    const step = document.querySelector(`.step[data-step="${n}"]`);
    const r = step.getBoundingClientRect();
    window.scrollTo(0, r.top + scrollY + r.height / 2 - midline());
  }

  function activateStep(n, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const step = document.querySelector(`.step[data-step="${n}"]`);
      if (step.getAttribute('aria-current') === 'step') {
        resolve(performance.now());
        return;
      }
      const mo = new MutationObserver(() => {
        if (step.getAttribute('aria-current') !== 'step') return;
        mo.disconnect();
        clearTimeout(timer);
        resolve(performance.now());
      });
      const timer = setTimeout(() => {
        mo.disconnect();
        reject(new Error(`step ${n} not activated within ${timeout}ms`));
      }, timeout);
      mo.observe(step, { attributes: true, attributeFilter: ['aria-current'] });
      centerStep(n);
    });
  }

  function activeStep() {
    const el = document.querySelector('.step[aria-current="step"]');
    return el ? Number(el.dataset.step) : null;
  }

  function translate(el) {
    const m = /translate\(\s*([-\d.e]+)[\s,]+([-\d.e]+)\s*\)/.exec(el.getAttribute('transform') || '');
    return m ? [Number(m[1]), Number(m[2])] : [NaN, NaN];
  }

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

  function checkDotAppearance(d, p, pooled, problems) {
    const shapes = { High: 'circle', Medium: 'ring', Low: 'diamond' };
    const cs = getComputedStyle(d);
    const wantFill = pooled ? COLORS.neutral : p.condition === 'Medium' ? COLORS.white : COLORS[p.condition];
    if (cs.fill !== wantFill) problems.push(`dot ${p.i} (${p.condition}) fill ${cs.fill}, expected ${wantFill}`);
    if (!pooled && p.condition === 'Medium' && cs.stroke !== COLORS.Medium) {
      problems.push(`dot ${p.i} ring stroke ${cs.stroke}`);
    }
    const wantShape = pooled ? 'circle' : shapes[p.condition];
    if (d.dataset.shape !== wantShape) problems.push(`dot ${p.i} shape ${d.dataset.shape}, expected ${wantShape}`);
  }

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
    if (frame.dataset.frame !== 'story') problems.push(`unexpected frame ${frame.dataset.frame}`);
    const plot = frame.querySelector('g.plot');

    for (const el of [root, ...root.querySelectorAll('*')]) {
      const op = Number(getComputedStyle(el).opacity);
      if (op !== 1) {
        problems.push(`opacity ${op} on ${el.tagName}.${el.getAttribute('class')}`);
        break;
      }
    }

    const dots = [...root.querySelectorAll('.dot')];
    const trends = [...root.querySelectorAll('path.trend')];
    const cis = [...root.querySelectorAll('line.ci')];
    const means = [...root.querySelectorAll('circle.mean-mk')];
    const panels = [...root.querySelectorAll('rect.panel-bg')];
    const near = (a, b, tol) => Math.abs(a - b) <= tol;

    if (dots.length !== 108) problems.push(`${dots.length} dots (expected 108)`);
    const seen = new Set();
    for (const d of dots) seen.add(Number(d.dataset.i));
    if (seen.size !== 108) problems.push(`${seen.size} distinct data-i values`);

    if (state === 'design') {
      if (trends.length) problems.push(`${trends.length} trend lines on design`);
      if (cis.length) problems.push(`${cis.length} CI lines on design`);
      if (panels.length) problems.push(`${panels.length} panel rects on design`);
      for (const d of dots) {
        const p = S.points[Number(d.dataset.i)];
        checkDotAppearance(d, p, false, problems);
      }
    } else if (state === 'gains' || state === 'load') {
      if (trends.length) problems.push(`${trends.length} trend lines on ${state}`);
      if (panels.length) problems.push(`${panels.length} panel rects on ${state}`);
      if (cis.length !== 3) problems.push(`${cis.length} line.ci (expected 3)`);
      if (means.length !== 3) problems.push(`${means.length} mean markers (expected 3)`);
      const x = scaleFrom(plot.querySelector('.axis-x[data-id="main"]'), 0);
      const metric = state === 'gains' ? 'learning_gains' : 'cognitive_load';
      for (const l of cis) {
        const g = l.dataset.group;
        const ci = S.stats.groups[g][metric].ci;
        const mk = means.find((m) => m.dataset.group === g);
        const cy = Number(mk.getAttribute('cy'));
        const mx = Number(mk.getAttribute('cx'));
        const [x1, x2, y1, y2] = ['x1', 'x2', 'y1', 'y2'].map((a) => Number(l.getAttribute(a)));
        if (!near(mx, x(S.stats.groups[g][metric].mean), 1)) problems.push(`mean ${g} at ${mx}, expected ${x(S.stats.groups[g][metric].mean)}`);
        if (!near(x1, x(ci[0]), 1) || !near(x2, x(ci[1]), 1)) problems.push(`CI ${g} spans ${x1}..${x2}, not ${x(ci[0])}..${x(ci[1])}`);
        if (!near(y1, cy, 1) || !near(y2, cy, 1)) problems.push(`CI ${g} y ${y1}/${y2}, mean cy ${cy}`);
      }
      for (const d of dots) {
        const p = S.points[Number(d.dataset.i)];
        checkDotAppearance(d, p, false, problems);
        const [cx] = translate(d);
        if (!near(cx, x(p[metric]), 18)) problems.push(`dot ${p.i} x=${cx} too far from ${x(p[metric])}`);
      }
    } else if (state === 'scatterPooled' || state === 'scatterByCondition') {
      if (cis.length) problems.push(`${cis.length} CI lines on ${state}`);
      if (panels.length) problems.push(`${panels.length} panel rects on ${state}`);
      const x = scaleFrom(plot.querySelector('.axis-x[data-id="main"]'), 0);
      const y = scaleFrom(plot.querySelector('.axis-y'), 1);
      const pooled = state === 'scatterPooled';
      for (const d of dots) {
        const p = S.points[Number(d.dataset.i)];
        const [cx, cy] = translate(d);
        if (!near(cx, x(p.presence + p.jx), 0.5) || !near(cy, y(p.learning_gains + p.jy), 0.5)) {
          problems.push(`dot ${p.i} at ${cx},${cy}; expected ${x(p.presence + p.jx)},${y(p.learning_gains + p.jy)}`);
        }
        checkDotAppearance(d, p, pooled, problems);
      }
      const groups = trends.map((t) => t.dataset.group).sort().join(',');
      if (pooled) {
        if (groups !== 'all') problems.push(`trend lines [${groups}], expected [all]`);
      } else {
        if (groups !== 'High,Low,Medium,all') problems.push(`trend lines [${groups}]`);
        const ghost = trends.filter((t) => t.classList.contains('ghost'));
        if (ghost.length !== 1 || ghost[0].dataset.group !== 'all') problems.push('expected exactly one ghost line');
        else if (['none', ''].includes(getComputedStyle(ghost[0]).strokeDasharray)) problems.push('ghost line is not dashed');
      }
    } else if (state === 'scatterSplit') {
      if (cis.length) problems.push(`${cis.length} CI lines on scatterSplit`);
      if (panels.length !== 3) problems.push(`${panels.length} panel rects (expected 3)`);
      if (trends.length !== 6) problems.push(`${trends.length} trend lines (expected 6: 3 group + 3 pooled)`);
      const ghost = trends.filter((t) => t.classList.contains('ghost'));
      if (ghost.length !== 3) problems.push(`${ghost.length} ghost lines (expected 3)`);
      for (const d of dots) {
        const p = S.points[Number(d.dataset.i)];
        checkDotAppearance(d, p, false, problems);
      }
    } else {
      problems.push(`unknown state ${state}`);
    }
    return { state, active, expected, hed, problems };
  }

  function geometry() {
    const fig = document.getElementById('story-figure');
    const frame = svg().querySelector('g.frame:not(.exiting)');
    const meanMk = (g) => frame.querySelector(`circle.mean-mk[data-group="${g}"]`);
    const axisX = frame.querySelector('.axis-x[data-id="main"]');
    return {
      state: fig.getAttribute('data-state'),
      frame: frame.dataset.frame,
      opacity: Number(getComputedStyle(frame).opacity),
      plot: translate(frame.querySelector('g.plot')),
      axisX: axisX ? translate(axisX) : null,
      cis: [...frame.querySelectorAll('line.ci')].map((l) => {
        const mk = meanMk(l.dataset.group);
        return {
          group: l.dataset.group,
          y1: Number(l.getAttribute('y1')),
          y2: Number(l.getAttribute('y2')),
          meanY: mk ? Number(mk.getAttribute('cy')) : NaN,
        };
      }),
    };
  }

  function overlaps(selector) {
    const ts = [...document.querySelectorAll(`${selector} text`)]
      .filter((t) => t.textContent.trim() && t.getAttribute('visibility') !== 'hidden')
      .map((t) => ({ s: t.textContent, r: t.getBoundingClientRect() }));
    const out = [];
    for (let i = 0; i < ts.length; i++) {
      for (let j = i + 1; j < ts.length; j++) {
        const a = ts[i].r;
        const c = ts[j].r;
        if (a.left < c.right - 0.5 && c.left < a.right - 0.5 && a.top < c.bottom - 0.5 && c.top < a.bottom - 0.5) {
          out.push(`${ts[i].s} / ${ts[j].s}`);
        }
      }
    }
    return out;
  }

  window.__probe = { midline, centerStep, activateStep, activeStep, inspect, scaleFrom, translate, svg, geometry, overlaps };
}

const pageErrors = new WeakMap();

async function openPage(page) {
  const errors = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(probe);
  await page.goto('index.html');
  await page.evaluate(() => document.fonts.ready);
}

const twoFrames = (page) =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

async function goToStep(page, n, { settle = true } = {}) {
  await page.evaluate((n) => window.__probe.centerStep(n), n);
  await twoFrames(page);
  if (settle) {
    await page.waitForFunction((s) => document.getElementById('story-figure').getAttribute('data-state') === s, STATES[n - 1], {
      timeout: 5000,
    });
  }
}

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

const pageErrorsOf = (page) => pageErrors.get(page) || [];

async function expectTruePixelText(page, selector = '#story-figure svg.chart-svg') {
  const r = await page.evaluate((selector) => {
    const svg = document.querySelector(selector);
    const wrap = svg.parentElement;
    const cs = getComputedStyle(wrap);
    const contentW = wrap.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const contentH = wrap.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const texts = [...svg.querySelectorAll('text')].filter((t) => t.textContent.trim()).map((t) => ({
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
  expect(r.texts.length).toBeGreaterThan(2);
  for (const t of r.texts) expect(t.px, `rendered size of "${t.text}"`).toBeGreaterThanOrEqual(12);
}

const svgFits = (page, selector = '#story-figure svg.chart-svg') =>
  page.evaluate((selector) => {
    const svg = document.querySelector(selector);
    const wrap = svg.parentElement;
    const cs = getComputedStyle(wrap);
    const box = wrap.getBoundingClientRect();
    const w = box.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = box.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    return Math.abs(Number(svg.getAttribute('width')) - w) <= 1 && Math.abs(Number(svg.getAttribute('height')) - h) <= 1;
  }, selector);

const ringsOf = (page, selector) =>
  page.evaluate(
    (sel) =>
      [...document.querySelectorAll(`${sel} circle.emph-ring`)].map((c) => ({
        i: c.__data__.i,
        opacity: Number(getComputedStyle(c.parentElement).opacity),
      })),
    selector
  );

module.exports = { STATES, HEADLINES, probe, openPage, pageErrorsOf, twoFrames, goToStep, recordStepOrder, expectTruePixelText, ringsOf, svgFits };
