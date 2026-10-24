// Data freshness and statistics spot checks. Pure Node (no browser); tagged @once so
// the suite runs them in a single project.
const { test, expect } = require('@playwright/test');
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const GENERATOR = path.join(ROOT, 'scripts', 'csv_to_js.js');
const DATA_JS = path.join(ROOT, 'data.js');
const DATA_CSV = path.join(ROOT, 'data.csv');

const generate = () => execFileSync('node', [GENERATOR, '--stdout'], { cwd: ROOT });

/** Evaluate the committed data.js the way a browser would and return window.STUDY. */
function loadStudy() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(DATA_JS, 'utf8'), sandbox);
  return sandbox.window.STUDY;
}

const round = (x, dp) => Number(x.toFixed(dp));

test.describe('data.js', { tag: '@once' }, () => {
  test('regenerating produces exactly the committed bytes', () => {
    expect(generate().equals(fs.readFileSync(DATA_JS))).toBe(true);
  });

  test('generation is deterministic', () => {
    expect(generate().equals(generate())).toBe(true);
  });

  test('is marked generated, with a trailing newline', () => {
    const text = fs.readFileSync(DATA_JS, 'utf8');
    expect(text.split('\n')[0]).toMatch(/^\/\/ .*generated/i);
    expect(text).toMatch(/node scripts\/csv_to_js\.js/);
    expect(text.endsWith('};\n')).toBe(true);
  });

  test('sha256 matches data.csv and metadata is present', () => {
    const study = loadStudy();
    const hash = crypto.createHash('sha256').update(fs.readFileSync(DATA_CSV)).digest('hex');
    expect(study.sha256).toBe(hash);
    expect(study.generatedFrom).toBe('data.csv');
    expect(study.labels).toEqual({ High: 'VR headset', Medium: 'Desktop sim', Low: 'Video + text' });
  });

  test('108 points with 35/36/37 per condition and the pinned shape', () => {
    const { points } = loadStudy();
    expect(points).toHaveLength(108);
    const count = (c) => points.filter((p) => p.condition === c).length;
    expect([count('High'), count('Medium'), count('Low')]).toEqual([35, 36, 37]);
    points.forEach((p, k) => {
      expect(Object.keys(p)).toEqual(['i', 'condition', 'presence', 'learning_gains', 'cognitive_load', 'jx', 'jy']);
      expect(p.i).toBe(k);
    });
    const csv = fs.readFileSync(DATA_CSV, 'utf8').trim().split('\n').slice(1);
    csv.forEach((line, k) => {
      const [lg, cond, pres, cl] = line.split(',');
      expect(points[k]).toMatchObject({
        condition: cond.trim(),
        presence: Number(pres),
        learning_gains: Number(lg),
        cognitive_load: Number(cl),
      });
    });
  });

  test('stats shape: groups, cor and group n', () => {
    const { stats } = loadStudy();
    for (const g of ['High', 'Medium', 'Low']) {
      for (const y of ['learning_gains', 'cognitive_load']) {
        expect(Object.keys(stats.groups[g][y])).toEqual(['mean', 'sd', 'ci']);
        expect(stats.groups[g][y].ci).toHaveLength(2);
      }
      expect(Object.keys(stats.groups[g])).toEqual(['n', 'learning_gains', 'cognitive_load']);
    }
    expect([stats.groups.High.n, stats.groups.Medium.n, stats.groups.Low.n]).toEqual([35, 36, 37]);
    for (const y of ['learning_gains', 'cognitive_load']) {
      for (const g of ['all', 'High', 'Medium', 'Low']) {
        expect(Object.keys(stats.cor[y][g])).toEqual(['r', 'p', 'n', 'slope', 'intercept', 'xmin', 'xmax']);
      }
      expect(stats.cor[y].all.n).toBe(108);
    }
  });

  test('learning gains vs presence correlations', () => {
    const { cor } = loadStudy().stats;
    const lg = cor.learning_gains;
    expect(round(lg.all.r, 3)).toBe(0.506);
    expect(lg.all.p).toBeLessThan(0.001);
    expect(round(lg.High.r, 3)).toBe(0.156);
    expect(round(lg.Medium.r, 3)).toBe(-0.186);
    expect(round(lg.Low.r, 3)).toBe(0.115);
    expect(round(lg.High.p, 3)).toBe(0.372);
    expect(round(lg.Medium.p, 3)).toBe(0.278);
    expect(round(lg.Low.p, 3)).toBe(0.497);
  });

  test('cognitive load vs presence correlations', () => {
    const { cor } = loadStudy().stats;
    const cl = cor.cognitive_load;
    expect(round(cl.all.r, 3)).toBe(0.118);
    expect(round(cl.all.p, 3)).toBe(0.225);
    expect(round(cl.High.r, 3)).toBe(-0.171);
    expect(round(cl.Medium.r, 3)).toBe(-0.043);
    expect(round(cl.Low.r, 3)).toBe(0.288);
    expect(round(cl.Low.p, 3)).toBe(0.084);
  });

  test('regression lines span the observed presence range', () => {
    const { points, stats } = loadStudy();
    for (const g of ['all', 'High', 'Medium', 'Low']) {
      const xs = points.filter((p) => g === 'all' || p.condition === g).map((p) => p.presence);
      expect(stats.cor.learning_gains[g].xmin).toBe(Math.min(...xs));
      expect(stats.cor.learning_gains[g].xmax).toBe(Math.max(...xs));
      expect(stats.cor.cognitive_load[g].xmin).toBe(Math.min(...xs));
    }
    // OLS identity: slope = r * sd(y) / sd(x); the line passes through the means.
    const ys = loadStudy().points.map((p) => p.learning_gains);
    const xs = loadStudy().points.map((p) => p.presence);
    const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
    const { slope, intercept } = stats.cor.learning_gains.all;
    expect(intercept + slope * mean(xs)).toBeCloseTo(mean(ys), 5);
  });

  test('group means and confidence intervals', () => {
    const { groups } = loadStudy().stats;
    expect(['High', 'Medium', 'Low'].map((g) => round(groups[g].cognitive_load.mean, 3))).toEqual([2.943, 2.167, 2.027]);
    const ci = (g, y) => groups[g][y].ci.map((v) => round(v, 2));
    expect(ci('High', 'learning_gains')).toEqual([3.58, 4.59]);
    expect(ci('Medium', 'learning_gains')).toEqual([3.28, 4.22]);
    expect(ci('Low', 'learning_gains')).toEqual([0.02, 0.9]);
    expect(ci('High', 'cognitive_load')).toEqual([1.98, 3.91]);
    expect(ci('Medium', 'cognitive_load')).toEqual([1.58, 2.75]);
    expect(ci('Low', 'cognitive_load')).toEqual([1.43, 2.63]);
  });

  test('jitter is bounded and not degenerate', () => {
    const { points } = loadStudy();
    for (const p of points) {
      expect(Math.abs(p.jx)).toBeLessThanOrEqual(0.9);
      expect(Math.abs(p.jy)).toBeLessThanOrEqual(0.28);
    }
    expect(new Set(points.map((p) => p.jx)).size).toBeGreaterThan(100);
    expect(Math.max(...points.map((p) => Math.abs(p.jx)))).toBeGreaterThan(0.6);
  });

  test('numbers are rounded to 6 decimal places', () => {
    const text = fs.readFileSync(DATA_JS, 'utf8');
    expect(text).not.toMatch(/\d\.\d{7,}/);
  });
});
