// Contrast and colour-vision gate (spec §4.5, §8.1 test 8; C13, C14, C16, C19, C21, C22, C24, C28).
// Pure Node, no browser: the tokens are read from the shipped style.css and checked with the WCAG
// relative-luminance formula; the condition colours are checked under Machado et al. (2009) CVD
// simulation with distances in OKLab. Tagged @once so the suite runs it in a single project.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const CSS = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

// Spec §4.5, verbatim. The stylesheet must ship exactly these values.
const SPEC_TOKENS = {
  bg: '#FFFFFF',
  ink: '#121212',
  text: '#262626',
  muted: '#5E5E5E',
  rule: '#121212',
  axis: '#767676',
  grid: '#E8E8E8',
  track: '#F2F2F2',
  accent: '#FFDD33',
  high: '#D0450C',
  medium: '#2A6FDB',
  low: '#3A3A3A',
  neutral: '#767676',
  ghost: '#6B6B6B',
};

// ---------- colour math ----------

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** The custom properties declared in the first :root block of a stylesheet. */
function rootTokens(css) {
  const root = /:root\s*\{([^}]*)\}/.exec(stripComments(css));
  const out = {};
  if (!root) return out;
  for (const m of root[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** WCAG 2.x relative luminance and contrast ratio. */
function luminance(hex) {
  const [r, g, b] = rgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Machado, Oliveira & Fernandes (2009) dichromacy matrices, severity 1.0, applied in linear RGB. */
const MACHADO = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const linearRgb = (hex) => rgb(hex).map(toLinear);
const simulate = (lin, m) => m.map((row) => clamp01(row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2]));

/** Linear sRGB → OKLab (Ottosson 2020). */
function oklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
const distance = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

/**
 * Declarations that paint text with the accent: `color` or `-webkit-text-fill-color` whose value is
 * the accent token, its hex, or another custom property that resolves to the accent.
 */
function accentTextUses(css) {
  const clean = stripComments(css);
  const tokens = rootTokens(clean);
  const accentHex = (tokens.accent || '').toLowerCase();
  const aliases = ['accent'].concat(Object.keys(tokens).filter((k) => tokens[k].toLowerCase() === 'var(--accent)'));
  const isAccent = (v) =>
    (accentHex && v.toLowerCase().includes(accentHex)) || aliases.some((a) => v.includes(`var(--${a})`));
  const hits = [];
  for (const block of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    for (const decl of block[2].split(';')) {
      const i = decl.indexOf(':');
      if (i < 0) continue;
      const prop = decl.slice(0, i).trim().toLowerCase();
      const value = decl.slice(i + 1).trim();
      if ((prop === 'color' || prop === '-webkit-text-fill-color') && isAccent(value)) {
        hits.push(`${block[1].trim()} { ${prop}: ${value} }`);
      }
    }
  }
  return hits;
}

// ---------- tests ----------

test.describe('contrast and colour vision', { tag: '@once' }, () => {
  const T = rootTokens(CSS);

  test('the colour math is right (known values)', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 6);
    expect(contrast('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2);
    const white = oklab(linearRgb('#FFFFFF'));
    expect(white[0]).toBeCloseTo(1, 3);
    expect(Math.abs(white[1]) + Math.abs(white[2])).toBeLessThan(1e-3);
    const red = oklab(linearRgb('#FF0000'));
    expect(red[0]).toBeCloseTo(0.628, 3);
    expect(red[1]).toBeCloseTo(0.2249, 3);
    expect(red[2]).toBeCloseTo(0.1258, 3);
    // Each Machado matrix leaves white (and so neutral greys) unchanged: rows sum to 1.
    for (const m of Object.values(MACHADO)) for (const row of m) expect(row[0] + row[1] + row[2]).toBeCloseTo(1, 4);
  });

  test('style.css ships the spec §4.5 tokens exactly', () => {
    for (const [name, value] of Object.entries(SPEC_TOKENS)) {
      expect(T[name] && T[name].toUpperCase(), `--${name}`).toBe(value);
    }
  });

  test('text colours are ≥ 4.5:1 where they are used', () => {
    const pairs = [
      // Every text token on the white page.
      ['ink', 'bg'],
      ['text', 'bg'],
      ['muted', 'bg'],
      // The condition colours as label text (hero strip names, chart direct labels).
      ['high', 'bg'],
      ['medium', 'bg'],
      ['low', 'bg'],
      // Text on the other fills the page uses.
      ['bg', 'ink'], // selected segmented-control option
      ['ink', 'accent'], // step number box, the highlighter <mark>
      ['ink', 'track'], // Lab readout, fallback notes
    ];
    for (const [fg, bg] of pairs) {
      expect(contrast(T[fg], T[bg]), `--${fg} on --${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('non-text graphics, focus and selected states are ≥ 3:1 on white', () => {
    // grid and track are decorative backgrounds (WCAG 1.4.11 exempt) and are not listed.
    const marks = {
      axis: 'axis lines and ticks',
      neutral: 'pooled (overall) dots',
      ghost: 'dashed pooled ghost line',
      ink: 'focus ring, selected segment fill, trend line, active-step rule',
      high: 'VR marks and line',
      medium: 'Desktop marks and line',
      low: 'Video + text marks and line',
    };
    for (const [name, what] of Object.entries(marks)) {
      expect(contrast(T[name], T.bg), `--${name} (${what})`).toBeGreaterThanOrEqual(3);
    }
  });

  test('the accent is never a text colour', () => {
    expect(accentTextUses('a { color: var(--accent); }')).toHaveLength(1);
    expect(accentTextUses(':root { --accent: #FFDD33; --hl: var(--accent); } b { color: var(--hl) }')).toHaveLength(1);
    expect(accentTextUses(':root { --accent: #FFDD33; } i { -webkit-text-fill-color: #ffdd33 }')).toHaveLength(1);
    expect(accentTextUses('mark { background: var(--accent); color: var(--ink); }')).toHaveLength(0);
    expect(accentTextUses(CSS)).toEqual([]);
  });

  test('condition colours stay distinguishable under protan, deutan and tritan simulation', () => {
    const conditions = { VR: T.high, Desktop: T.medium, Video: T.low };
    const report = [];
    for (const [vision, m] of [['normal', null]].concat(Object.entries(MACHADO))) {
      const lab = Object.fromEntries(
        Object.entries(conditions).map(([k, hex]) => [k, oklab(m ? simulate(linearRgb(hex), m) : linearRgb(hex))])
      );
      const names = Object.keys(lab);
      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          const d = distance(lab[names[i]], lab[names[j]]);
          report.push(`${vision} ${names[i]}–${names[j]} ΔOK=${d.toFixed(3)}`);
          expect(d, `${vision}: ${names[i]} vs ${names[j]}`).toBeGreaterThanOrEqual(0.1);
        }
      }
    }
    test.info().annotations.push({ type: 'cvd', description: report.join('; ') });
  });
});
