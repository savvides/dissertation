// Renders the two README/social images from the live page (dev-only; needs `npm ci` and
// `npx playwright install chromium`). Both show step 4 ("Look Closer"), the page's turning point.
//   docs/screenshot.png      1440×900
//   docs/social-preview.png  1200×630 (the og:image size)
// Usage: node scripts/screenshots.js
const { chromium } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const PAGE = pathToFileURL(path.join(ROOT, 'index.html')).href;

const SHOTS = [
  { file: 'docs/screenshot.png', width: 1440, height: 900 },
  { file: 'docs/social-preview.png', width: 1200, height: 630 },
];

async function render(browser, { file, width, height }) {
  // Reduced motion makes step changes land immediately, so the capture is deterministic.
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(PAGE);
  await page.evaluate(() => document.fonts.ready);
  // Center step 4 on the viewport midline, where the page activates steps on wide screens.
  await page.evaluate(() => {
    const r = document.querySelector('.step[data-step="4"]').getBoundingClientRect();
    window.scrollTo(0, r.top + window.scrollY + r.height / 2 - window.innerHeight / 2);
  });
  await page.waitForFunction(() => document.getElementById('story-figure').dataset.state === 'scatterByCondition');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ROOT, file) });
  await context.close();
  console.log(`wrote ${file} (${width}×${height})`);
}

(async () => {
  const browser = await chromium.launch();
  try {
    for (const shot of SHOTS) await render(browser, shot);
  } finally {
    await browser.close();
  }
})();
