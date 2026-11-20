// Release hygiene for v4.0.0. Pure Node, no browser; tagged @once so the suite
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
    const links = ciJob('check-links');
    expect(links).toMatch(/lychee/);
    expect(links).toMatch(/--exclude-path node_modules/);
    expect(links).toMatch(/--exclude validator\.w3\.org\/nu\//);
    for (const f of ['index.html', 'README.md', 'CHANGELOG.md', 'HOW-IT-WAS-MADE.md', 'CLAUDE.md', 'GEMINI.md']) {
      expect(links).toContain(f);
    }
  });

  test('README describes the 4.0.0 page, build and development workflow', () => {
    const readme = read('README.md');
    const html = read('index.html');
    expect(readme).toMatch(/badge\/version-4\.0\.0-blue/);
    expect(readme).not.toMatch(/version-3\.0\.0/);
    expect(readme).toMatch(/!\[[^\]]+\]\(docs\/screenshot\.png\)/);
    const step4Match = html.match(/<div class="step" data-step="4"[\s\S]*?<h2>([\s\S]*?)<\/h2>/);
    expect(step4Match, 'Step 4 heading in index.html').not.toBeNull();
    const step4Heading = step4Match[1].replace(/<[^>]+>/g, '').trim();
    const shotAlt = readme.match(/!\[([^\]]+)\]\(docs\/screenshot\.png\)/);
    expect(shotAlt[1]).toContain(step4Heading);
    expect(readme).not.toMatch(/\b(Claude Code|Antigravity|Gemini)\b/i);
    expect(readme).not.toMatch(/claude\.ai\/code/i);
    expect(readme).not.toContain('Split by condition, the presence effect vanishes');
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
    expect(how).not.toMatch(/\b(Claude Code|Antigravity|Gemini)\b/i);
    expect(how).not.toMatch(/claude\.ai\/code/i);
    expect(how).not.toMatch(/bar charts?/i);
    expect(how).not.toMatch(/three-column|3-column/i);
    expect(how).not.toMatch(/setup,\s*promise,\s*question,\s*twist,\s*open question/i);
    expect(how).toMatch(/\*\*Visual design\.\*\*[^\n]*Newsroom/);
    expect(how).toMatch(/review[^\n]*correction[^\n]*redesign/i);
    expect(how).toMatch(/\b(?:six|6)\b[^\n]*(?:beats|steps)/i);
    for (const term of ['108', 'Split', 'Load', /presets?/i, 'readout', 'playbook', /two-column/i]) {
      expect(how).toMatch(term);
    }
  });

  test('CLAUDE.md and GEMINI.md map the files, tooling versions and test conventions', () => {
    const doc = read('CLAUDE.md');
    for (const f of ['`data.js`', '`vendor/', '`tests/', '`package.json`', '`playwright.config.js`', '`GEMINI.md`']) {
      expect(doc).toContain(f);
    }
    expect(doc).toContain('tests/chart-helpers.js');
    const pwVersion = JSON.parse(read('package.json')).devDependencies['@playwright/test'].replace(/^[\^~]/, '');
    expect(doc).toContain(pwVersion);
    expect(doc).toMatch(/npx playwright test/);
    expect(doc).toMatch(/npm ci/);
    expect(doc).toMatch(/never hand-edit[^\n]*`data\.js`|`data\.js`[^\n]*never hand-edit/i);
    expect(doc).not.toMatch(/inlined at the top of `script\.js`/);

    const gemini = read('GEMINI.md');
    expect(gemini).toContain('.step p:not(.step-label)');
    expect(gemini).not.toContain('.step:not(.step-label)');
    expect(gemini).toContain('tests/resilience.spec.js');
    expect(gemini).toContain('2-column');
  });

  test('CHANGELOG has a complete 4.0.0 entry and compare link', () => {
    const log = read('CHANGELOG.md');
    const entry = log.match(/^## \[4\.0\.0\][^\n]*\n([\s\S]*?)(?=^## \[)/m);
    expect(entry, '4.0.0 section').not.toBeNull();
    for (const h of ['Added', 'Changed', 'Removed', 'Fixed']) expect(entry[1]).toMatch(new RegExp(`^### ${h}$`, 'm'));
    expect(entry[1]).toMatch(/two-column|2-column/i);
    expect(entry[1]).not.toMatch(/three-column|3-column/i);
    expect(log).toContain('[4.0.0]: https://github.com/savvides/dissertation/compare/v3.0.0...v4.0.0');
    expect(log.indexOf('## [4.0.0]')).toBeLessThan(log.indexOf('## [3.0.0]'));
  });

  test('footer column count in index.html agrees with all project docs', () => {
    const html = read('index.html');
    const footer = html.match(/<footer[\s\S]*?<\/footer>/);
    expect(footer, 'footer element in index.html').not.toBeNull();
    const cols = footer[0].match(/class="about-column"/g) || [];
    expect(cols).toHaveLength(2);

    const log4 = read('CHANGELOG.md').match(/^## \[4\.0\.0\][^\n]*\n([\s\S]*?)(?=^## \[)/m)[1];
    for (const [name, text] of [
      ['HOW-IT-WAS-MADE.md', read('HOW-IT-WAS-MADE.md')],
      ['CHANGELOG.md [4.0.0]', log4],
      ['CLAUDE.md', read('CLAUDE.md')],
      ['GEMINI.md', read('GEMINI.md')],
    ]) {
      expect(text, `${name} should describe a 2-column/two-column footer`).toMatch(/two-column|2-column/i);
    }
  });

  test('all relative file and heading-anchor links in project docs resolve', () => {
    const docs = ['README.md', 'HOW-IT-WAS-MADE.md', 'CHANGELOG.md', 'CLAUDE.md', 'GEMINI.md'];
    const headingSlugs = (mdText) => {
      const counts = new Map();
      const slugs = new Set();
      let inFence = false;
      for (const line of mdText.split(/\r?\n/)) {
        if (/^\s*```/.test(line)) {
          inFence = !inFence;
          continue;
        }
        if (inFence) continue;
        const m = line.match(/^#{1,6}\s+(.+?)\s*#*$/);
        if (!m) continue;
        const plain = m[1].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[`*_~]/g, '');
        const base = plain
          .toLowerCase()
          .trim()
          .replace(/[^\p{L}\p{N}\s-]/gu, '')
          .replace(/\s+/g, '-');
        const n = counts.get(base) || 0;
        counts.set(base, n + 1);
        slugs.add(n === 0 ? base : `${base}-${n}`);
      }
      return slugs;
    };

    for (const doc of docs) {
      const text = read(doc);
      for (const m of text.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
        const rawTarget = m[1].trim().split(/\s+/)[0];
        if (/^(https?:|mailto:|data:)/i.test(rawTarget)) continue;
        const [filePart, anchor] = rawTarget.split('#');
        const targetPath = filePart ? path.resolve(ROOT, path.dirname(doc), filePart) : path.join(ROOT, doc);
        expect(fs.existsSync(targetPath), `${doc} link target "${rawTarget}" missing`).toBe(true);
        if (anchor) {
          const targetContent = fs.readFileSync(targetPath, 'utf8');
          const slugs = headingSlugs(targetContent);
          expect(slugs.has(anchor), `${doc} anchor "#${anchor}" not found in ${filePart || doc}`).toBe(true);
        }
      }
    }
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
