// Content regression for the page copy, ported from the v2.1.1 check_content.py "page" group,
// plus landmark/heading structure and a check that numbers in the copy match window.STUDY.
// Copy is compared on textContent (never innerText, which applies CSS text-transform).
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

// Phrases removed in v2.1.1 that must never come back.
const ABSENT = [
  'procedural knowledge', 'knowledge transfer', 'same lab safety curriculum', 'likely culprit',
  'usually doesn', 'watch the slope flatten', 'The full dataset', 'instead of a classroom',
  'VR participants had both', "one wasn't causing the other", '05 — The Hidden Cost', 'proved to be',
  'gained slightly more', "didn't go with learning more",
];

// Corrected v2.1.1 copy that must stay verbatim.
const PRESENT = [
  'a Labster lab-safety simulation in a VR headset',
  'On a 10-question lab-safety knowledge test',
  "More immersion didn't produce a detectably larger learning gain",
  'a group-level pattern mistaken for an individual-level one',
  'presence barely tracks learning (r = .16 for VR, −.19 for desktop and .12 for video; none statistically significant)',
  'there was no reliable link between feeling present and learning',
  "didn't learn less (r = .14, not significant)",
  '05 — An Open Question', 'The Price of Novelty?',
  'Novelty cost is a hypothesis this study raises, not one it confirms.',
  'In 2018, I reported that presence predicted how well participants scored after training.',
  "Here, it didn't.", 'one cheap precaution follows',
  'watch one steep line break into three nearly flat ones',
  'The de-identified study data (learning gains, presence, cognitive load)',
];

/** "r" formatting used in the copy: two decimals, no leading zero, typographic minus. */
const fmtR = (r) => {
  const s = Math.abs(r).toFixed(2).replace(/^0/, '');
  return (r < 0 ? '−' : '') + s;
};

const pageText = (page) =>
  page.evaluate(() => document.body.textContent.replace(/\s+/g, ' '));

test.describe('page copy and structure', { tag: '@once' }, () => {
  test('phrases removed in v2.1.1 stay absent (source and rendered text)', async ({ page }) => {
    const html = read('index.html');
    await page.goto('/');
    const text = await pageText(page);
    for (const p of ABSENT) {
      expect(html, `index.html source contains ${JSON.stringify(p)}`).not.toContain(p);
      expect(text, `page text contains ${JSON.stringify(p)}`).not.toContain(p);
    }
  });

  test('corrected copy is present verbatim', async ({ page }) => {
    await page.goto('/');
    const text = await pageText(page);
    for (const p of PRESENT) expect(text, `page text missing ${JSON.stringify(p)}`).toContain(p);
  });

  test('script.js has no console.log and the page keeps its favicon', () => {
    expect(read('script.js')).not.toContain('console.log');
    expect(read('index.html')).toContain('rel="icon"');
  });

  test('title, description and social tags are unchanged', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Are Virtual Simulations Effective? — Dissertation Results');
    const meta = (sel) => page.locator(sel).getAttribute('content');
    expect(await meta('meta[name="description"]')).toBe(
      'An interactive scrolltelling presentation of the 2018 VR Learning Dissertation results and 2026 retrospective on presence and cognitive load.'
    );
    expect(await meta('meta[property="og:title"]')).toBe('Are Virtual Simulations Effective?');
    expect(await meta('meta[property="og:description"]')).toBe(
      'An interactive data story exploring VR, learning, and a surprising statistical fallacy — built from a 2018 PhD study (n=108).'
    );
    expect(await meta('meta[property="og:type"]')).toBe('website');
    expect(await meta('meta[name="twitter:card"]')).toBe('summary_large_image');
    expect(await meta('meta[property="og:image"]')).toBe(
      'https://savvides.github.io/dissertation/docs/social-preview.png'
    );
  });

  test('scripts: self-hosted d3, data.js, script.js, classic and deferred, in order', async ({ page }) => {
    await page.goto('/');
    const scripts = await page.$$eval('script', (els) =>
      els.map((s) => ({ src: s.getAttribute('src'), defer: s.defer, type: s.getAttribute('type') }))
    );
    expect(scripts).toEqual([
      { src: 'vendor/d3.v7.9.0.min.js', defer: true, type: null },
      { src: 'data.js', defer: true, type: null },
      { src: 'script.js', defer: true, type: null },
    ]);
  });

  test('one <main> holds the story, coda and Lab; the footer sits outside it', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main')).toHaveCount(1);
    for (const id of ['story', 'coda', 'lab']) {
      await expect(page.locator(`main #${id}`)).toHaveCount(1);
    }
    await expect(page.locator('footer')).toHaveCount(1);
    await expect(page.locator('footer#about')).toHaveCount(1);
    expect(await page.locator('footer').evaluate((f) => f.closest('main') === null)).toBe(true);
  });

  test('exactly one h1 and heading levels never skip', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    const levels = await page.$$eval('h1, h2, h3, h4, h5, h6', (hs) => hs.map((h) => Number(h.tagName[1])));
    expect(levels[0]).toBe(1);
    for (let k = 1; k < levels.length; k++) {
      expect(levels[k], `heading ${k} (h${levels[k]}) skips after h${levels[k - 1]}`).toBeLessThanOrEqual(
        levels[k - 1] + 1
      );
    }
  });

  test('numbers in the copy match window.STUDY', async ({ page }) => {
    await page.goto('/');
    const study = await page.evaluate(() => window.STUDY);
    const { groups, cor } = study.stats;
    const text = await pageText(page);

    // Hero strip: labels and mark counts per condition.
    const strip = page.locator('.hero-strip');
    for (const [g, label] of Object.entries(study.labels)) {
      const item = strip.locator(`[data-group="${g}"]`);
      const itemText = (await item.textContent()).replace(/\s+/g, ' ').trim();
      expect(itemText).toBe(`${label} ${groups[g].n}`);
      await expect(item.locator('svg .mk')).toHaveCount(groups[g].n);
    }
    expect(text).toContain(`${study.points.length} university students`);

    // Step 4: within-condition r values.
    const lg = cor.learning_gains;
    expect(text).toContain(
      `r = ${fmtR(lg.High.r)} for VR, ${fmtR(lg.Medium.r)} for desktop and ${fmtR(lg.Low.r)} for video`
    );
    for (const g of ['High', 'Medium', 'Low']) expect(lg[g].p).toBeGreaterThanOrEqual(0.05);

    // Step 5: cognitive load means.
    const m = (g) => groups[g].cognitive_load.mean.toFixed(1);
    expect(text).toContain(`(${m('High')}, vs. ${m('Medium')} for desktop and ${m('Low')} for video)`);

    // Step 5: within-VR load vs learning gain is not in stats (it isn't presence-based), so derive it
    // from the points to confirm the copy's "r = .14".
    const vr = study.points.filter((p) => p.condition === 'High');
    const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const xs = vr.map((p) => p.cognitive_load);
    const ys = vr.map((p) => p.learning_gains);
    const mx = mean(xs);
    const my = mean(ys);
    const sxy = xs.reduce((a, x, k) => a + (x - mx) * (ys[k] - my), 0);
    const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    const syy = ys.reduce((a, y) => a + (y - my) ** 2, 0);
    expect(text).toContain(`(r = ${fmtR(sxy / Math.sqrt(sxx * syy))}, not significant)`);
  });
});
