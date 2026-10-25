// Release hygiene for v3.0.0 (spec §9, §8.2). Pure Node, no browser; tagged @once so the suite
// runs it in a single project. Covers the regenerated images, the CI test job, the docs, the
// dead-code sweep (CSS selectors and script.js functions) and the "no local planning files" rule.
const { test, expect } = require('@playwright/test');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

/** Width and height from a PNG's IHDR chunk. */
function pngSize(file) {
  const b = fs.readFileSync(path.join(ROOT, file));
  expect(b.subarray(1, 4).toString()).toBe('PNG');
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

/** The text of a top-level job in ci.yml (from "  name:" to the next job or the end). */
function ciJob(name) {
  const m = read('.github/workflows/ci.yml').match(new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  [\\w-]+:\\n|(?![\\s\\S]))`, 'm'));
  expect(m, `ci.yml has a ${name} job`).not.toBeNull();
  return m[1];
}

test.describe('release hygiene', { tag: '@once' }, () => {
  test('docs images have the exact sizes (README screenshot, social preview)', () => {
    expect(pngSize('docs/screenshot.png')).toEqual([1440, 900]);
    expect(pngSize('docs/social-preview.png')).toEqual([1200, 630]);
    expect(read('index.html')).toContain('https://savvides.github.io/dissertation/docs/social-preview.png');
  });

  test('CI has a test job and keeps vnu and lychee', () => {
    const job = ciJob('test');
    expect(job).toMatch(/runs-on: ubuntu-latest/);
    expect(job).toMatch(/uses: actions\/checkout@v4/);
    expect(job).toMatch(/uses: actions\/setup-node@v4/);
    expect(job).toMatch(/node-version: 24/);
    expect(job).toMatch(/cache: npm/);
    expect(job).toMatch(/run: npm ci/);
    expect(job).toMatch(/run: npx playwright install --with-deps chromium webkit/);
    expect(job).toMatch(/run: npx playwright test/);
    expect(job).toMatch(/uses: actions\/upload-artifact@v4/);
    expect(job).toMatch(/if: failure\(\)/);
    expect(job).toMatch(/path: playwright-report/);
    expect(ciJob('validate-html')).toMatch(/vnu\.jar --errors-only index\.html/);
    expect(ciJob('check-links')).toMatch(/lychee/);
    expect(ciJob('check-links')).toMatch(/--exclude-path node_modules/);
  });

  test('README describes the 3.0.0 page, build and development workflow', () => {
    const readme = read('README.md');
    expect(readme).toMatch(/badge\/version-3\.0\.0-blue/);
    expect(readme).not.toMatch(/version-2\.1\.1/);
    expect(readme).toMatch(/!\[[^\]]+\]\(docs\/screenshot\.png\)/);
    expect(readme).toMatch(/^## What You'll See$/m);
    expect(readme).toMatch(/hero strip/i);
    expect(readme).toMatch(/An Open Question[^\n]*(not significantly|raises, not one it confirms|hypothesis)/i);
    expect(readme).toMatch(/readout/i);
    expect(readme).toMatch(/^## Built With$/m);
    expect(readme).toMatch(/D3\.js[^\n]*7\.9\.0[^\n]*self-hosted/i);
    expect(readme).toMatch(/Newsreader/);
    expect(readme).toMatch(/Libre Franklin/);
    expect(readme).toMatch(/Playwright/);
    expect(readme).toMatch(/^## Development$/m);
    expect(readme).toMatch(/npm ci/);
    expect(readme).toMatch(/npx playwright test/);
    expect(readme).toMatch(/node scripts\/csv_to_js\.js/);
  });

  test('HOW-IT-WAS-MADE names the Newsroom direction and the review → corrections → redesign sequence', () => {
    const how = read('HOW-IT-WAS-MADE.md');
    expect(how).not.toMatch(/warm tones/i);
    expect(how).toMatch(/\*\*Visual design\.\*\*[^\n]*Newsroom/);
    expect(how).toMatch(/review[^\n]*correction[^\n]*redesign/i);
  });

  test('CLAUDE.md maps the new files and states the data.js rule', () => {
    const doc = read('CLAUDE.md');
    for (const f of ['`data.js`', '`vendor/', '`tests/', '`package.json`', '`playwright.config.js`']) expect(doc).toContain(f);
    expect(doc).toMatch(/npx playwright test/);
    expect(doc).toMatch(/npm ci/);
    expect(doc).toMatch(/never hand-edit[^\n]*`data\.js`|`data\.js`[^\n]*never hand-edit/i);
    expect(doc).not.toMatch(/inlined at the top of `script\.js`/);
  });

  test('CHANGELOG has a complete 3.0.0 entry and compare link', () => {
    const log = read('CHANGELOG.md');
    const entry = log.match(/^## \[3\.0\.0\][^\n]*\n([\s\S]*?)(?=^## \[)/m);
    expect(entry, '3.0.0 section').not.toBeNull();
    for (const h of ['Added', 'Changed', 'Removed', 'Fixed']) expect(entry[1]).toMatch(new RegExp(`^### ${h}$`, 'm'));
    expect(log).toContain('[3.0.0]: https://github.com/savvides/dissertation/compare/v2.1.1...v3.0.0');
    expect(log.indexOf('## [3.0.0]')).toBeLessThan(log.indexOf('## [2.1.1]'));
  });

  test('no local planning files are tracked', () => {
    const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n');
    expect(tracked.filter((f) => /^(docs\/superpowers|\.superpowers)\//.test(f))).toEqual([]);
  });
});

test.describe('dead-code sweep', { tag: '@once' }, () => {
  const html = read('index.html');
  const js = read('script.js');
  const css = read('style.css');

  /** Class, id and attribute names used by rules outside @keyframes and @font-face. */
  function selectorNames() {
    const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const classes = new Set();
    const ids = new Set();
    const attrs = new Set();
    let depth = 0;
    let skipUntil = -1; // brace depth at which a skipped at-rule block ends
    let start = 0;
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (c === '{') {
        const prelude = src.slice(start, i).trim();
        if (skipUntil < 0 && /^@(-webkit-)?keyframes|^@font-face/.test(prelude)) skipUntil = depth;
        else if (skipUntil < 0 && !prelude.startsWith('@')) {
          const sel = prelude.replace(/"[^"]*"|'[^']*'/g, '""');
          for (const m of sel.matchAll(/\[\s*([\w-]+)/g)) attrs.add(m[1]);
          const bare = sel.replace(/\[[^\]]*\]/g, '');
          for (const m of bare.matchAll(/\.([A-Za-z_][\w-]*)/g)) classes.add(m[1]);
          for (const m of bare.matchAll(/#([A-Za-z_][\w-]*)/g)) ids.add(m[1]);
        }
        depth++;
        start = i + 1;
      } else if (c === '}') {
        depth--;
        if (depth === skipUntil) skipUntil = -1;
        start = i + 1;
      } else if (c === ';' && skipUntil < 0) start = i + 1;
    }
    return { classes, ids, attrs };
  }

  const word = (name) => new RegExp(`(^|[^\\w-])${name}($|[^\\w-])`);

  test('every CSS class, id and attribute is in index.html or script.js', () => {
    const { classes, ids, attrs } = selectorNames();
    expect(classes.size).toBeGreaterThan(20);
    const haystack = html + '\n' + js;
    const missing = [
      ...[...classes].filter((n) => !word(n).test(haystack)).map((n) => `.${n}`),
      ...[...ids].filter((n) => !word(n).test(haystack)).map((n) => `#${n}`),
      ...[...attrs].filter((n) => !haystack.includes(n)).map((n) => `[${n}]`),
    ];
    expect(missing, `selectors matching nothing: ${missing.join(' ')}`).toEqual([]);
  });

  test('every function in script.js is referenced somewhere other than its definition', () => {
    // Comments don't count as references.
    const code = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const names = new Set();
    for (const m of js.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)) names.add(m[1]);
    for (const m of js.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*:\s*function\b/gm)) names.add(m[1]);
    expect(names.size).toBeGreaterThan(20);
    const unused = [...names].filter((n) => (code.match(new RegExp(`(^|[^\\w$])${n.replace(/\$/g, '\\$')}(?![\\w$])`, 'g')) || []).length < 2);
    expect(unused, `unreferenced functions: ${unused.join(' ')}`).toEqual([]);
  });
});
