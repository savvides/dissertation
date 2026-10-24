// Layout per spec §4: three tiers, sticky safety, no horizontal overflow, readable body text,
// undimmed inactive steps and a static scroll cue under reduced motion. Runs in every project.
const { test, expect } = require('@playwright/test');

/** The tier the spec's media queries should select for this viewport (§4.1). */
function tierOf({ width, height }) {
  if (height <= 500 && width > height) return 'short';
  if (width >= 900) return 'wide';
  return 'phone';
}

/** Scroll so step n's top sits just above the middle of the viewport, then let layout settle. */
async function scrollToStep(page, n) {
  await page.evaluate((n) => {
    const step = document.querySelector(`.step[data-step="${n}"]`);
    const top = step.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top - window.innerHeight * 0.4);
  }, n);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

const rect = (page, sel) =>
  page.locator(sel).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height };
  });

const overflowCheck = (page) =>
  page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));

test.describe('layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
  });

  test('no horizontal overflow at load or after scrolling to the end', async ({ page }) => {
    let o = await overflowCheck(page);
    expect(o.scrollWidth).toBe(o.innerWidth);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
    o = await overflowCheck(page);
    expect(o.scrollWidth).toBe(o.innerWidth);
  });

  test('no ancestor of the sticky figure clips overflow (iOS sticky safety)', async ({ page }) => {
    const offenders = await page.evaluate(() => {
      const bad = [];
      for (let el = document.getElementById('story-figure').parentElement; el; el = el.parentElement) {
        const cs = getComputedStyle(el);
        if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
          bad.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} ${cs.overflowX}/${cs.overflowY}`);
        }
      }
      return bad;
    });
    expect(offenders).toEqual([]);
  });

  test('tier layout: figure placement and stickiness', async ({ page }) => {
    const vp = page.viewportSize();
    const tier = tierOf(vp);
    await scrollToStep(page, 3);
    const fig = await rect(page, '#story-figure');
    const step = await rect(page, '.step[data-step="3"]');

    // The figure is pinned to the top of the viewport in every tier.
    expect(Math.abs(fig.top)).toBeLessThanOrEqual(1);

    if (tier === 'wide') {
      // Text column on the left, sticky chart column beside it, both on screen together.
      expect(step.right).toBeLessThanOrEqual(fig.left + 1);
      expect(fig.top).toBeLessThan(step.bottom);
      expect(fig.bottom).toBeGreaterThan(step.top);
      expect(Math.abs(fig.height - vp.height)).toBeLessThanOrEqual(1);
    } else if (tier === 'short') {
      // Chart pinned on the left at full height, steps scrolling on the right.
      expect(fig.right).toBeLessThanOrEqual(step.left + 1);
      expect(Math.abs(fig.height - vp.height)).toBeLessThanOrEqual(1);
    } else {
      // Sticky band across the top, at least 360px tall, painted above the step cards.
      expect(fig.height).toBeGreaterThanOrEqual(360 - 0.5);
      expect(Math.abs(fig.width - vp.width)).toBeLessThanOrEqual(1);
      const onTop = await page.evaluate(() => {
        const band = document.getElementById('story-figure');
        const r = band.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.bottom - 4);
        return band.contains(hit);
      });
      expect(onTop).toBe(true);
    }
  });

  test('chart containers have a usable size before any chart is drawn', async ({ page }) => {
    await scrollToStep(page, 1);
    for (const sel of ['#story-figure .chart-svg-wrap', '#lab .lab-svg-wrap']) {
      const box = await page.locator(sel).evaluate((el) => ({ w: el.clientWidth, h: el.clientHeight }));
      expect(box.w, `${sel} width`).toBeGreaterThan(200);
      expect(box.h, `${sel} height`).toBeGreaterThanOrEqual(150);
    }
  });

  test('body text computes to at least 16px', async ({ page }) => {
    const sizes = await page.$$eval(
      [
        '.step p:not(.step-label)',
        '#coda p',
        '#lab .lab-intro',
        '#lab .lab-summary',
        '#lab .lab-readout',
        'footer p',
      ].join(', '),
      (els) => els.map((el) => ({ text: el.textContent.slice(0, 40), px: parseFloat(getComputedStyle(el).fontSize) }))
    );
    expect(sizes.length).toBeGreaterThan(10);
    for (const s of sizes) expect(s.px, `font-size of "${s.text}"`).toBeGreaterThanOrEqual(16);
  });

  test('inactive steps are not dimmed (C23)', async ({ page }) => {
    await scrollToStep(page, 3);
    const report = await page.$$eval('.step:not([aria-current="step"])', (steps) =>
      steps.map((step) => {
        const colors = [...step.querySelectorAll('p:not(.step-label)')].map((p) => getComputedStyle(p).color);
        let minOpacity = 1;
        for (let el = step; el; el = el.parentElement) {
          minOpacity = Math.min(minOpacity, parseFloat(getComputedStyle(el).opacity));
        }
        return { step: step.dataset.step, colors, minOpacity };
      })
    );
    expect(report.length).toBeGreaterThanOrEqual(4);
    for (const s of report) {
      expect(s.colors.length, `step ${s.step} paragraphs`).toBeGreaterThan(0);
      for (const c of s.colors) expect(c, `step ${s.step} text color`).toBe('rgb(38, 38, 38)');
      expect(s.minOpacity, `step ${s.step} opacity`).toBe(1);
    }
  });

});

test.describe('layout with motion allowed', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the scroll cue bounces once, never infinitely', async ({ page }) => {
    await page.goto('/');
    const anim = await page
      .locator('.scroll-cue')
      .evaluate((el) => ({ name: getComputedStyle(el).animationName, count: getComputedStyle(el).animationIterationCount }));
    expect(anim.name).not.toBe('none');
    expect(anim.count).toBe('1');
  });
});

test.describe('layout under reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the scroll cue is static', async ({ page }) => {
    await page.goto('/');
    const name = await page.locator('.scroll-cue').evaluate((el) => getComputedStyle(el).animationName);
    expect(name).toBe('none');
  });
});
