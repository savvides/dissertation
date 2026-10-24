#!/usr/bin/env node
/*
 * Generates data.js from data.csv: the participant points (with deterministic
 * jitter) and every statistic the page shows, so the browser never computes any.
 *
 *   node scripts/csv_to_js.js            write data.js
 *   node scripts/csv_to_js.js --stdout   print it instead (used by the tests)
 *
 * No dependencies. Output is deterministic: stable key order, numbers rounded to
 * 6 decimal places, trailing newline.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const CSV_NAME = 'data.csv';
const SEED = 2018;
const CONDITIONS = ['High', 'Medium', 'Low'];
const LABELS = { High: 'VR headset', Medium: 'Desktop sim', Low: 'Video + text' };
const OUTCOMES = ['learning_gains', 'cognitive_load'];
const JX_MAX = 0.9; // jitter half-widths, in data units (presence points / outcome points)
const JY_MAX = 0.28;

// ---------- parsing ----------

function parseCsv(text) {
  const [header, ...rows] = text.trim().split(/\r?\n/);
  const cols = header.split(',').map((c) => c.trim());
  for (const needed of ['condition', 'presence', ...OUTCOMES]) {
    if (!cols.includes(needed)) throw new Error(`${CSV_NAME} is missing column "${needed}"`);
  }
  return rows.map((line, i) => {
    const cells = line.split(',').map((c) => c.trim());
    const row = Object.fromEntries(cols.map((c, k) => [c, cells[k]]));
    if (!CONDITIONS.includes(row.condition)) throw new Error(`Row ${i + 2}: unknown condition "${row.condition}"`);
    const out = { condition: row.condition };
    for (const c of ['presence', ...OUTCOMES]) {
      out[c] = Number(row[c]);
      if (!Number.isFinite(out[c])) throw new Error(`Row ${i + 2}: "${c}" is not a number`);
    }
    return out;
  });
}

// ---------- seeded jitter ----------

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- special functions (Numerical Recipes) ----------

function lgamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

// Continued fraction for the incomplete beta function (modified Lentz).
function betacf(a, b, x) {
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 500; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return h;
}

// Regularized incomplete beta I_x(a, b).
function betai(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}

// Two-sided p-value for a t statistic with df degrees of freedom.
const tTwoSidedP = (t, df) => betai(df / 2, 0.5, df / (df + t * t));

// Two-sided critical t (e.g. confidence 0.95), by bisection on the exact p-value.
function tCritical(df, confidence = 0.95) {
  const alpha = 1 - confidence;
  let lo = 0;
  let hi = 1000;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (tTwoSidedP(mid, df) > alpha) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// ---------- descriptive stats ----------

const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const sd = (a) => {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
};

function describe(values) {
  const m = mean(values);
  const s = sd(values);
  const half = tCritical(values.length - 1) * (s / Math.sqrt(values.length));
  return { mean: m, sd: s, ci: [m - half, m + half] };
}

// Pearson r (two-sided t test, df = n - 2) and OLS of y on x.
function correlate(xs, ys) {
  const n = xs.length;
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let k = 0; k < n; k++) {
    sxy += (xs[k] - mx) * (ys[k] - my);
    sxx += (xs[k] - mx) ** 2;
    syy += (ys[k] - my) ** 2;
  }
  const r = sxy / Math.sqrt(sxx * syy);
  const p = tTwoSidedP((r * Math.sqrt(n - 2)) / Math.sqrt(1 - r * r), n - 2);
  const slope = sxy / sxx;
  return { r, p, n, slope, intercept: my - slope * mx, xmin: Math.min(...xs), xmax: Math.max(...xs) };
}

// ---------- assemble ----------

function build(csvBuffer) {
  const rows = parseCsv(csvBuffer.toString('utf8'));
  const rand = mulberry32(SEED);
  const points = rows.map((row, i) => ({
    i,
    condition: row.condition,
    presence: row.presence,
    learning_gains: row.learning_gains,
    cognitive_load: row.cognitive_load,
    jx: (rand() * 2 - 1) * JX_MAX,
    jy: (rand() * 2 - 1) * JY_MAX,
  }));

  const inGroup = (g) => points.filter((p) => g === 'all' || p.condition === g);
  const groups = {};
  for (const g of CONDITIONS) {
    const pts = inGroup(g);
    groups[g] = { n: pts.length };
    for (const y of OUTCOMES) groups[g][y] = describe(pts.map((p) => p[y]));
  }
  const cor = {};
  for (const y of OUTCOMES) {
    cor[y] = {};
    for (const g of ['all', ...CONDITIONS]) {
      const pts = inGroup(g);
      cor[y][g] = correlate(pts.map((p) => p.presence), pts.map((p) => p[y]));
    }
  }

  return {
    points,
    stats: { groups, cor },
    labels: LABELS,
    generatedFrom: CSV_NAME,
    sha256: crypto.createHash('sha256').update(csvBuffer).digest('hex'),
  };
}

// Round every number to 6 dp (and drop negative zero) while serializing.
const round6 = (key, v) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 + 0 : v);

function render(study) {
  const json = (v, indent) => JSON.stringify(v, round6, indent);
  const indent = (text) => text.replace(/\n/g, '\n  ');
  const pointLines = study.points.map((p) => `    ${json(p)}`).join(',\n');
  return [
    '// GENERATED FILE. Do not edit by hand.',
    `// Source: ${CSV_NAME} via scripts/csv_to_js.js. After changing the data, regenerate with:`,
    '//   node scripts/csv_to_js.js',
    'window.STUDY = {',
    `  points: [\n${pointLines}\n  ],`,
    `  stats: ${indent(json(study.stats, 2))},`,
    `  labels: ${json(study.labels)},`,
    `  generatedFrom: ${json(study.generatedFrom)},`,
    `  sha256: ${json(study.sha256)}`,
    '};',
    '',
  ].join('\n');
}

const output = render(build(fs.readFileSync(path.join(ROOT, CSV_NAME))));
if (process.argv.includes('--stdout')) process.stdout.write(output);
else fs.writeFileSync(path.join(ROOT, 'data.js'), output);
