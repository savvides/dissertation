// Page behavior for the Newsroom data story (spec §5). Classic script, loaded with defer after
// vendor/d3.v7.9.0.min.js and data.js. Every number shown on the page comes from window.STUDY.
//
// Sections:
//   1. Store      reads window.STUDY (points, stats, labels)
//   2. Format     number formatting shared by the narrative and the Lab
//   3. Charts     pure chart functions drawn with keyed D3 joins, plus shared frame helpers
//   4. Narrative  the sticky figure: picks the active step on scroll and draws its chart
//   5. Lab        the Evidence Lab: controls, inspection, readout and summary
//   6. Layout     ResizeObserver redraws
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');
  var d3 = window.d3;
  // Without d3 (or data) the CSS shows the .chart-fallback notes and the text stands on its own.
  if (!d3 || !window.STUDY) return;
  root.classList.add('has-d3');

  // ---------------------------------------------------------------------------------------------
  // 1. Store
  // ---------------------------------------------------------------------------------------------
  var Store = {
    points: window.STUDY.points,
    stats: window.STUDY.stats,
    labels: window.STUDY.labels,
    groups: ['High', 'Medium', 'Low'],
  };

  // ---------------------------------------------------------------------------------------------
  // 2. Format: typographic minus, no leading zero on correlations and p values.
  // ---------------------------------------------------------------------------------------------
  var MINUS = '−';
  var Format = {
    /** One decimal, typographic minus: 2.9, −0.4. */
    num1: function (v) {
      var s = Math.abs(v).toFixed(1);
      return (v < 0 && Number(s) !== 0 ? MINUS : '') + s;
    },
    /** A correlation or p value: .16, −.19. */
    r: function (v) {
      var s = Math.abs(v).toFixed(2).replace(/^0/, '');
      return (v < 0 && Number(s) !== 0 ? MINUS : '') + s;
    },
    /** Signed integer tick: +6, 0, −2. */
    signed: function (v) {
      return (v > 0 ? '+' : v < 0 ? MINUS : '') + Math.abs(v);
    },
    plain: function (v) {
      return (v < 0 ? MINUS : '') + Math.abs(v);
    },
    /** Spec §6.4 p-text. */
    p: function (p) {
      if (p < 0.001) return 'p < .001';
      return 'p = ' + Format.r(p) + (p < 0.05 ? '' : ', not statistically significant');
    },
    /** "a, b and c" */
    list: function (items) {
      return items.length < 2 ? items.join('') : items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
    },
  };

  // ---------------------------------------------------------------------------------------------
  // 3. Charts
  //
  // Each chart function is (svg, {width, height, reducedMotion, animate}) => void and renders one
  // state into a persistent <svg> using keyed joins. Bars (steps 1, 2, 5) and scatter (steps 3, 4,
  // Lab) each own a g.frame; switching type fades the old frame out as a whole, so its elements are
  // never rebound mid-exit. Step changes use the transition name 'step'; hover emphasis uses 'emph'
  // on its own ring element, so it never fights a data transition (C02).
  // ---------------------------------------------------------------------------------------------
  var Charts = (function () {
    var STEP_MS = 700;
    var EXIT_MS = 300;
    var EMPH_MS = 150;
    var COMPACT_BELOW = 240; // plot width (px) below which the compact variant is used
    var LAYERS = ['grid', 'axes', 'marks', 'lines', 'labels', 'emph'];
    // Paint tokens come from the CSS custom properties (spec §4.5), read once the stylesheet applies.
    var C = {};
    function readTokens() {
      var css = getComputedStyle(root);
      var names = { bg: 'bg', ink: 'ink', ghost: 'ghost', neutral: 'neutral', High: 'high', Medium: 'medium', Low: 'low' };
      Object.keys(names).forEach(function (k) {
        C[k] = css.getPropertyValue('--' + names[k]).trim();
      });
    }

    /** Motion policy for one draw: transitions only when animating and motion is welcome. */
    function motion(opts) {
      var on = !opts.reducedMotion && opts.animate !== false;
      return {
        on: on,
        t: function (sel, ms) {
          return on ? sel.transition('step').duration(ms || STEP_MS).ease(d3.easeCubicInOut) : sel;
        },
      };
    }

    /** Fade an exiting selection out and remove it; never left behind if interrupted (see useFrame). */
    function exitFade(sel, m) {
      sel.interrupt('step');
      if (m.on) sel.classed('exiting', true).transition('step').duration(EXIT_MS).attr('opacity', 0).remove();
      else sel.remove();
    }

    /** Max rendered width of strings in a text class; CSS is the single source of chart type sizes. */
    function measure(svg, cls, strings) {
      var t = svg.append('text').attr('class', cls).attr('visibility', 'hidden');
      var w = 0;
      strings.forEach(function (s) {
        t.text(s);
        w = Math.max(w, t.node().getComputedTextLength());
      });
      t.remove();
      return w;
    }

    /** Break a title into lines that fit maxW (never shrinks the type). */
    function wrapLines(svg, cls, text, maxW) {
      var words = text.split(' ');
      var lines = [];
      var line = '';
      words.forEach(function (w) {
        var next = line ? line + ' ' + w : w;
        if (line && measure(svg, cls, [next]) > maxW) {
          lines.push(line);
          line = w;
        } else line = next;
      });
      lines.push(line);
      return lines;
    }

    /**
     * Size the svg (true pixels: viewBox == measured box), stop running step transitions, and
     * return the live frame of this type, creating it if needed. A frame of the other type exits.
     */
    function useFrame(svg, opts, type, m) {
      if (!C.ink) readTokens();
      svg.attr('width', opts.width).attr('height', opts.height).attr('viewBox', '0 0 ' + opts.width + ' ' + opts.height);
      svg.selectAll('*').interrupt('step');
      svg.selectAll('.exiting').remove(); // anything mid-exit is finished off now, never rebound
      svg.selectAll('g.emph').interrupt('emph').remove();
      exitFade(svg.selectAll('g.frame').filter(function () {
        return this.getAttribute('data-frame') !== type;
      }), m);
      var frame = svg.select('g.frame[data-frame="' + type + '"]');
      var entering = frame.empty();
      if (entering) {
        frame = svg.append('g').attr('class', 'frame').attr('data-frame', type).attr('aria-hidden', 'true');
        var plot = frame.append('g').attr('class', 'plot');
        LAYERS.forEach(function (l) {
          plot.append('g').attr('class', 'layer-' + l);
        });
        if (m.on) frame.attr('opacity', 0);
      }
      m.t(frame).attr('opacity', 1);
      var plotSel = frame.select('g.plot');
      return {
        frame: frame,
        plot: plotSel,
        entering: entering,
        layer: function (name) {
          return plotSel.select('g.layer-' + name);
        },
      };
    }

    /**
     * Value axis along x at y = atY: ticks, baseline (0..width) and optional vertical grid lines
     * (o.grid = [y1, y2]) in the bottom layer. o.startFirst left-aligns the domain-min tick label.
     */
    function axisX(f, x, ticks, atY, o, m) {
      var axis = f.layer('axes').selectAll('g.axis-x').data([0]).join('g').attr('class', 'axis-x');
      axis.attr('data-domain', x.domain().join(','));
      m.t(axis).attr('transform', 'translate(0,' + atY + ')');
      var tick = axis.selectAll('g.tick').data(ticks, String).join(
        function (enter) {
          var g = enter.append('g').attr('class', 'tick').attr('transform', function (v) {
            return 'translate(' + x(v) + ',0)';
          });
          g.append('line').attr('class', 'tick-line').attr('y2', 5);
          g.append('text').attr('class', 't-tick').attr('y', 20).attr('text-anchor', 'middle');
          if (m.on) g.attr('opacity', 0);
          return g;
        },
        null,
        function (exit) {
          exitFade(exit, m);
        }
      );
      tick.attr('data-v', String).select('text').text(String).attr('text-anchor', function (v) {
        return o.startFirst && v === x.domain()[0] ? 'start' : 'middle';
      });
      m.t(tick).attr('opacity', 1).attr('transform', function (v) {
        return 'translate(' + x(v) + ',0)';
      });
      var domain = axis.selectAll('line.domain').data([0]).join('line').attr('class', 'domain');
      m.t(domain).attr('x1', 0).attr('x2', o.width);

      var span = o.grid || [0, 0];
      gridLines(f, 'v', o.grid ? ticks.filter(function (v) { return v !== x.domain()[0]; }) : [], function (sel) {
        return sel.attr('x1', x).attr('x2', x).attr('y1', span[0]).attr('y2', span[1]);
      }, m);
    }

    /** Grid lines live in g.layer-grid, the first child of the plot, so they never cover marks (C08). */
    function gridLines(f, dir, values, place, m) {
      var lines = f.layer('grid').selectAll('line.grid').data(values, function (v) {
        return dir + v;
      }).join(
        function (enter) {
          var l = place(enter.append('line').attr('class', 'grid'));
          if (m.on) l.attr('opacity', 0);
          return l;
        },
        null,
        function (exit) {
          exitFade(exit, m);
        }
      );
      place(m.t(lines).attr('opacity', 1));
    }

    /** A single persistent line (zero line, etc.), keyed by class. */
    function oneLine(layer, cls, attrs, m) {
      var l = layer.selectAll('line.' + cls).data([0]).join('line').attr('class', cls);
      var t = m.t(l);
      Object.keys(attrs).forEach(function (k) {
        t.attr(k, attrs[k]);
      });
    }

    /** Axis title text with optional wrapped lines (tspans), keyed by role. */
    function axisTitle(f, role, lines, x, y, anchor, m) {
      var t = f.layer('labels').selectAll('text.t-axis[data-role="' + role + '"]').data([0]).join(function (enter) {
        return enter.append('text').attr('class', 't-axis').attr('data-role', role).attr('x', x).attr('y', y);
      });
      t.attr('text-anchor', anchor);
      var spans = t.selectAll('tspan').data(lines).join('tspan').text(String).attr('dy', function (_, i) {
        return i ? '1.25em' : 0;
      });
      m.t(t).attr('x', x).attr('y', y);
      m.t(spans).attr('x', x);
    }

    // ---------------- Bars (steps 1, 2, 5) ----------------

    /**
     * Shared frame for horizontal bars: geometry, value axis, grid and zero line.
     * cfg: { domain, ticks, compactTicks, title, values: [labels shown at bar ends] }
     */
    function barsFrame(svg, opts, cfg) {
      var m = motion(opts);
      var f = useFrame(svg, opts, 'bars', m);
      var W = opts.width;
      var H = opts.height;
      var catW = measure(svg, 't-cat', Store.groups.map(function (g) { return Store.labels[g]; }));
      var valW = measure(svg, 't-value', cfg.values);
      var right = Math.ceil(valW + 10);
      var left = Math.ceil(catW + 14);
      var compact = W - left - right < COMPACT_BELOW;
      if (compact) left = 1; // category labels move into the gutter above each bar
      var plotW = W - left - right;
      var titleLines = wrapLines(svg, 't-axis', cfg.title, W - 2);
      var top = 2;
      var bottom = 7 + 13 + 8 + titleLines.length * 16 + 4;
      var labelH = compact ? 20 : 0;
      var stepH = Math.min((H - top - bottom) / 3, compact ? 84 : 96);
      var barH = Math.max(10, Math.min(compact ? 30 : 34, (stepH - labelH) * (compact ? 0.62 : 0.56)));
      var axisY = 3 * stepH + 6;
      var x = d3.scaleLinear().domain(cfg.domain).range([0, plotW]);
      var band = {};
      Store.groups.forEach(function (g, i) {
        var y = i * stepH + labelH + (stepH - labelH - barH) / 2;
        band[g] = { top: i * stepH, y: y, h: barH, mid: y + barH / 2 };
      });

      m.t(f.plot).attr('transform', 'translate(' + left + ',' + top + ')');
      axisX(f, x, compact ? cfg.compactTicks : cfg.ticks, axisY, { width: plotW, grid: [compact ? labelH - 4 : 0, axisY], startFirst: compact }, m);
      oneLine(f.layer('axes'), 'zero', { x1: 0, x2: 0, y1: compact ? labelH - 4 : 0, y2: axisY }, m);
      axisTitle(f, 'x', titleLines, plotW + right - 1, axisY + 7 + 13 + 8 + 12, 'end', m);
      return { f: f, m: m, x: x, band: band, compact: compact, left: left, plotW: plotW };
    }

    /**
     * Horizontal bars ordered VR / Desktop / Video, starting at 0, with optional 95% CI whiskers.
     * cfg adds: value(g), label(g), ci(g) -> [lo, hi] | null
     */
    function bars(svg, opts, cfg) {
      cfg.values = Store.groups.map(cfg.label);
      var B = barsFrame(svg, opts, cfg);
      var f = B.f;
      var m = B.m;
      var x = B.x;
      var G = Store.groups;

      var rects = f.layer('marks').selectAll('rect.bar').data(G, String).join(function (enter) {
        return enter.append('rect').attr('class', 'bar').attr('x', x(0)).attr('width', 0).attr('y', function (g) {
          return B.band[g].y;
        }).attr('height', function (g) {
          return B.band[g].h;
        });
      });
      rects.attr('data-group', String).attr('fill', function (g) { return C[g]; });
      m.t(rects).attr('x', x(0)).attr('width', function (g) {
        return Math.max(0, x(cfg.value(g)) - x(0));
      }).attr('y', function (g) {
        return B.band[g].y;
      }).attr('height', function (g) {
        return B.band[g].h;
      });

      // 95% CI whiskers: a white halo, the whisker and two end caps, drawn over the bar.
      var ciData = cfg.ci ? G : [];
      var capH = function (g) {
        return Math.min(10, B.band[g].h * 0.4);
      };
      [['ci-halo', 'line'], ['ci', 'line']].forEach(function (spec) {
        var lines = f.layer('lines').selectAll('line.' + spec[0]).data(ciData, String).join(
          function (enter) {
            var l = enter.append('line').attr('class', spec[0]);
            if (m.on) l.attr('opacity', 0);
            return l;
          },
          null,
          function (exit) {
            exitFade(exit, m);
          }
        );
        lines.attr('data-group', String);
        m.t(lines).attr('opacity', 1).attr('x1', function (g) {
          return x(cfg.ci(g)[0]);
        }).attr('x2', function (g) {
          return x(cfg.ci(g)[1]);
        }).attr('y1', function (g) {
          return B.band[g].mid;
        }).attr('y2', function (g) {
          return B.band[g].mid;
        });
      });
      var caps = f.layer('lines').selectAll('line.ci-cap').data(cfg.ci ? G.flatMap(function (g) {
        return [[g, 0], [g, 1]];
      }) : [], function (d) {
        return d.join();
      }).join(
        function (enter) {
          var l = enter.append('line').attr('class', 'ci-cap');
          if (m.on) l.attr('opacity', 0);
          return l;
        },
        null,
        function (exit) {
          exitFade(exit, m);
        }
      );
      m.t(caps).attr('opacity', 1).attr('x1', function (d) {
        return x(cfg.ci(d[0])[d[1]]);
      }).attr('x2', function (d) {
        return x(cfg.ci(d[0])[d[1]]);
      }).attr('y1', function (d) {
        return B.band[d[0]].mid - capH(d[0]) / 2;
      }).attr('y2', function (d) {
        return B.band[d[0]].mid + capH(d[0]) / 2;
      });

      // Category labels: left of the bars, or above them in the compact variant.
      var cats = f.layer('labels').selectAll('text.t-cat').data(G, String).join(function (enter) {
        return enter.append('text').attr('class', 't-cat');
      });
      cats.attr('data-group', String).attr('fill', function (g) { return C[g]; }).text(function (g) {
        return Store.labels[g];
      });
      m.t(cats).attr('x', B.compact ? 0 : -B.left + 1).attr('y', function (g) {
        return B.compact ? B.band[g].top + 14 : B.band[g].mid;
      }).attr('dy', B.compact ? 0 : '0.35em');

      // Value labels sit past the bar end, or past the whisker's upper end when a CI is shown.
      var vals = f.layer('labels').selectAll('text.t-value').data(G, String).join(function (enter) {
        return enter.append('text').attr('class', 't-value').attr('x', x(0) + 6).attr('y', function (g) {
          return B.band[g].mid;
        });
      });
      vals.attr('data-group', String).attr('dy', '0.35em').text(cfg.label);
      m.t(vals).attr('x', function (g) {
        var end = cfg.ci ? Math.max(cfg.value(g), cfg.ci(g)[1]) : cfg.value(g);
        return x(end) + 6;
      }).attr('y', function (g) {
        return B.band[g].mid;
      });
    }

    // ---------------- Scatter (steps 3, 4 and the Lab) ----------------

    var Y_VARS = {
      learning_gains: { title: 'Learning gain (post − pre)', tick: Format.signed },
      // Cognitive load can't go below 0, so its axis starts there (C17), never at −1.
      cognitive_load: { title: 'Cognitive load (0–12)', tick: Format.plain, floor: 0 },
    };
    var DRAW_ORDER = { Low: 0, High: 1, Medium: 2 }; // open rings on top so they stay readable
    var N_VERTS = 24; // every dot shape is a 24-gon, so circle, ring and diamond morph smoothly

    /** Polygon path for a dot shape centred on 0,0; the diamond is an L1 ball with vertices on the axes. */
    function shapePath(shape, r) {
      var pts = [];
      for (var k = 0; k < N_VERTS; k++) {
        var a = (k / N_VERTS) * 2 * Math.PI - Math.PI / 2;
        var c = Math.cos(a);
        var s = Math.sin(a);
        var rad = shape === 'diamond' ? (r * 1.3) / (Math.abs(c) + Math.abs(s)) : shape === 'ring' ? r * 0.86 : r;
        pts.push((rad * c).toFixed(2) + ',' + (rad * s).toFixed(2));
      }
      return 'M' + pts.join('L') + 'Z';
    }

    /** Paint for one dot: pooled dots are neutral circles; by condition they take the group's shape. */
    function dotStyle(g, byCondition, r) {
      if (!byCondition) return { shape: 'circle', fill: C.neutral, fillOpacity: 1, stroke: C.bg, sw: r * 0.22 };
      if (g === 'High') return { shape: 'circle', fill: C.High, fillOpacity: 1, stroke: C.bg, sw: r * 0.22 };
      if (g === 'Medium') return { shape: 'ring', fill: C.bg, fillOpacity: 0.55, stroke: C.Medium, sw: r * 0.44 };
      return { shape: 'diamond', fill: C.Low, fillOpacity: 1, stroke: C.bg, sw: r * 0.22 };
    }

    /** "r = .16" strings for the direct labels, from stats. */
    function rText(yVar, key) {
      return 'r = ' + Format.r(Store.stats.cor[yVar][key].r);
    }

    /**
     * Shared scatter frame: presence (0–60) on x, the chosen variable on y, with a right gutter for
     * direct labels sized for the widest label in either view so the pooled ↔ by-condition morph
     * keeps one frame.
     * cfg: { yVar, labels (bool) }
     */
    function scatterFrame(svg, opts, cfg) {
      var m = motion(opts);
      var f = useFrame(svg, opts, 'scatter', m);
      var Y = Y_VARS[cfg.yVar];
      var W = opts.width;
      var H = opts.height;
      var ext = d3.extent(Store.points, function (p) {
        return p[cfg.yVar];
      });
      var floored = Y.floor !== undefined;
      var yDomain = [floored ? Y.floor : ext[0] - 0.5, ext[1] + 0.5]; // the data's real range, padded half a unit
      var yTicksAll = d3.range(Math.ceil(yDomain[0] / 2) * 2, yDomain[1], 2);
      var tickW = measure(svg, 't-tick', yTicksAll.map(Y.tick));
      var left = Math.ceil(tickW + 9 + 1);
      var nameW = measure(svg, 't-name', Store.groups.map(function (g) { return Store.labels[g]; }).concat('Overall'));
      var rW = measure(svg, 't-r', Store.groups.concat('all').map(function (k) { return rText(cfg.yVar, k); }));
      var key = 14; // marker or line key in front of each direct label
      var gutter = cfg.labels ? Math.ceil(10 + key + 5 + Math.max(nameW, rW) + 2) : 12;
      var top = 30;
      var bottom = 7 + 13 + 8 + 16;
      var plotW = W - left - gutter;
      var plotH = H - top - bottom;
      var compact = plotW < COMPACT_BELOW;
      var r = compact ? 3.1 : 3.6;
      var pad = Math.ceil((0.9 * plotW) / 60 + 1.3 * r + 2); // max |jx| plus the widest marker
      var x = d3.scaleLinear().domain([0, 60]).range([pad, plotW - pad]);
      // A floored domain leaves no room for markers jittered below the floor (|jy| ≤ 0.28), so the
      // plot gains that room in pixels instead, as x does.
      var padY = floored ? Math.ceil((0.28 * plotH) / (yDomain[1] - yDomain[0]) + 1.3 * r + 2) : 0;
      var y = d3.scaleLinear().domain(yDomain).range([plotH - padY, 0]);
      var yTicks = plotH / yTicksAll.length < 24 ? yTicksAll.filter(function (v) { return v % 4 === 0; }) : yTicksAll;

      m.t(f.plot).attr('transform', 'translate(' + left + ',' + top + ')');
      axisX(f, x, compact ? [0, 20, 40, 60] : [0, 10, 20, 30, 40, 50, 60], plotH, { width: plotW, grid: null }, m);

      // y axis: tick labels only; horizontal grid lines carry the scale.
      var axis = f.layer('axes').selectAll('g.axis-y').data([0]).join('g').attr('class', 'axis-y');
      axis.attr('data-domain', y.domain().join(','));
      var tick = axis.selectAll('g.tick').data(yTicks, String).join(
        function (enter) {
          var g = enter.append('g').attr('class', 'tick').attr('transform', function (v) {
            return 'translate(0,' + y(v) + ')';
          });
          g.append('text').attr('class', 't-tick').attr('x', -9).attr('dy', '0.35em').attr('text-anchor', 'end');
          if (m.on) g.attr('opacity', 0);
          return g;
        },
        null,
        function (exit) {
          exitFade(exit, m);
        }
      );
      tick.attr('data-v', String).select('text').text(Y.tick);
      m.t(tick).attr('opacity', 1).attr('transform', function (v) {
        return 'translate(0,' + y(v) + ')';
      });
      gridLines(f, 'h', yTicks.filter(function (v) { return v !== 0; }), function (sel) {
        return sel.attr('x1', 0).attr('x2', plotW).attr('y1', y).attr('y2', y);
      }, m);
      oneLine(f.layer('axes'), 'zero', { x1: 0, x2: plotW, y1: y(0), y2: y(0) }, m);

      axisTitle(f, 'y', [Y.title], -left + 1, -14, 'start', m);
      axisTitle(f, 'x', ['Presence score →'], plotW, plotH + 7 + 13 + 8 + 12, 'end', m);

      var scales = { x: x, y: y, r: r, yVar: cfg.yVar };
      f.frame.property('__scales', scales);
      return { f: f, m: m, x: x, y: y, r: scales.r, compact: compact, plotW: plotW, plotH: plotH };
    }

    /** Spread label anchors so blocks never overlap, keeping them as close to their lines as possible. */
    function spread(ys, lo, hi, gap) {
      var idx = ys.map(function (_, i) { return i; }).sort(function (a, b) { return ys[a] - ys[b]; });
      var v = idx.map(function (i) { return ys[i]; });
      if (v.length > 1) gap = Math.min(gap, (hi - lo) / (v.length - 1));
      for (var k = 0; k < v.length; k++) v[k] = Math.max(v[k], k ? v[k - 1] + gap : lo);
      for (k = v.length - 1; k >= 0; k--) v[k] = Math.min(v[k], k < v.length - 1 ? v[k + 1] - gap : hi);
      var out = [];
      idx.forEach(function (i, j) {
        out[i] = v[j];
      });
      return out;
    }

    /**
     * Scatter of presence against cfg.yVar. cfg: { yVar, byCondition, lines, labels }.
     * Dots are keyed by participant index, so pooled → by condition is an in-place morph.
     */
    function scatter(svg, opts, cfg) {
      var S = scatterFrame(svg, opts, cfg);
      var f = S.f;
      var m = S.m;
      var x = S.x;
      var y = S.y;
      var r = S.r;
      var cor = Store.stats.cor[cfg.yVar];
      var pos = function (p) {
        return 'translate(' + x(p.presence + p.jx) + ',' + y(p[cfg.yVar] + p.jy) + ')';
      };

      var data = Store.points.slice().sort(function (a, b) {
        return DRAW_ORDER[a.condition] - DRAW_ORDER[b.condition] || a.i - b.i;
      });
      var dots = f.layer('marks').selectAll('path.dot').data(data, function (p) {
        return p.i;
      }).join(function (enter) {
        var st = function (p) {
          return dotStyle(p.condition, cfg.byCondition, r);
        };
        return enter.append('path').attr('class', 'dot').attr('transform', pos).attr('d', function (p) {
          return shapePath(st(p).shape, r);
        }).attr('fill', function (p) {
          return st(p).fill;
        }).attr('stroke', function (p) {
          return st(p).stroke;
        });
      }).order();
      dots.attr('data-i', function (p) { return p.i; }).attr('data-shape', function (p) {
        return dotStyle(p.condition, cfg.byCondition, r).shape;
      });
      m.t(dots).attr('transform', pos).attr('d', function (p) {
        return shapePath(dotStyle(p.condition, cfg.byCondition, r).shape, r);
      }).attr('fill', function (p) {
        return dotStyle(p.condition, cfg.byCondition, r).fill;
      }).attr('fill-opacity', function (p) {
        return dotStyle(p.condition, cfg.byCondition, r).fillOpacity;
      }).attr('stroke', function (p) {
        return dotStyle(p.condition, cfg.byCondition, r).stroke;
      }).attr('stroke-width', function (p) {
        return dotStyle(p.condition, cfg.byCondition, r).sw;
      });

      // OLS trend lines from stats. The pooled line ('all') is the same element in both views:
      // solid ink when pooled, a dashed ghost by condition. Group lines split out of it.
      var lineW = S.compact ? 2.5 : 3;
      var keys = !cfg.lines ? [] : cfg.byCondition ? ['all'].concat(Store.groups) : ['all'];
      var seg = function (k, from) {
        var c = cor[from || k];
        var a = cor[k].xmin;
        var b = cor[k].xmax;
        return 'M' + x(a) + ',' + y(c.intercept + c.slope * a) + 'L' + x(b) + ',' + y(c.intercept + c.slope * b);
      };
      var ghost = function (k) {
        return cfg.byCondition && k === 'all';
      };
      var stroke = function (k) {
        return k === 'all' ? (cfg.byCondition ? C.ghost : C.ink) : C[k];
      };
      var width = function (k) {
        return ghost(k) ? 1.75 : lineW;
      };
      var trends = f.layer('lines').selectAll('g.trend-g').data(keys, String).join(
        function (enter) {
          var g = enter.append('g').attr('class', 'trend-g');
          // New lines start on the pooled line and swing out to their own slope.
          g.append('path').attr('class', 'trend-halo').attr('d', function (k) { return seg(k, 'all'); });
          g.append('path').attr('class', 'trend').attr('d', function (k) { return seg(k, 'all'); }).attr('stroke', C.ink);
          return g;
        },
        null,
        function (exit) {
          exit.selectAll('path').interrupt('step');
          if (m.on) {
            exit.classed('exiting', true).transition('step').duration(EXIT_MS).attr('opacity', 0).remove();
            exit.selectAll('path').transition('step').duration(EXIT_MS).attr('d', function (k) { return seg(k, 'all'); });
          } else exit.remove();
        }
      ).order();
      trends.attr('data-group', String);
      var halo = trends.select('path.trend-halo').attr('stroke', C.bg).attr('stroke-opacity', function (k) {
        return ghost(k) ? 0.85 : 1;
      });
      var line = trends.select('path.trend').attr('data-group', String).classed('ghost', ghost)
        .attr('stroke-dasharray', function (k) { return ghost(k) ? '6 4' : null; });
      m.t(halo).attr('d', function (k) { return seg(k); }).attr('stroke-width', function (k) { return width(k) + 3; });
      m.t(line).attr('d', function (k) { return seg(k); }).attr('stroke', stroke).attr('stroke-width', width);

      // With lines off, the by-condition labels stay (without leaders) as the key to colors and
      // shapes (C16, C19); the pooled view has nothing left to label.
      var labelKeys = !cfg.labels ? [] : cfg.lines ? keys : cfg.byCondition ? Store.groups : [];
      directLabels(S, cfg, labelKeys);
    }

    /** Right-gutter direct labels with leaders: key, name, r value (C16, C19: no legend needed). */
    function directLabels(S, cfg, keys) {
      var f = S.f;
      var m = S.m;
      var x = S.x;
      var y = S.y;
      var cor = Store.stats.cor[cfg.yVar];
      var lx = S.plotW + 10;
      var ends = keys.map(function (k) {
        var c = cor[k];
        return [x(c.xmax), y(c.intercept + c.slope * c.xmax)];
      });
      var placed = spread(ends.map(function (e) { return e[1]; }), 14, S.plotH - 18, 37);
      var at = {};
      keys.forEach(function (k, i) {
        at[k] = { ly: placed[i], ex: ends[i][0], ey: ends[i][1] };
      });
      var name = function (k) {
        return k === 'all' ? 'Overall' : Store.labels[k];
      };
      var labels = f.layer('labels').selectAll('g.dlabel').data(keys, String).join(
        function (enter) {
          var g = enter.append('g').attr('class', 'dlabel').attr('transform', function (k) {
            return 'translate(' + lx + ',' + at[k].ly + ')';
          });
          g.append('line').attr('class', 'leader');
          g.append('path').attr('class', 'key');
          g.append('text').attr('class', 't-name');
          g.append('text').attr('class', 't-r').attr('y', 16);
          if (m.on) g.attr('opacity', 0);
          return g;
        },
        null,
        function (exit) {
          exitFade(exit, m);
        }
      );
      labels.attr('data-group', String);
      m.t(labels).attr('opacity', 1).attr('transform', function (k) {
        return 'translate(' + lx + ',' + at[k].ly + ')';
      });
      var color = function (k) {
        return k === 'all' ? (cfg.byCondition ? C.ghost : C.ink) : C[k];
      };
      var keyMid = -5; // vertical middle of the name's x-height
      labels.select('line.leader').attr('display', cfg.lines ? null : 'none');
      m.t(labels.select('line.leader')).attr('stroke', color).attr('x1', function (k) {
        return at[k].ex + 4 - lx;
      }).attr('y1', function (k) {
        return at[k].ey - at[k].ly;
      }).attr('x2', -2).attr('y2', keyMid);
      // Key: the group's own marker, or a short solid/dashed stroke for the pooled line.
      labels.select('path.key').each(function (k) {
        var el = d3.select(this);
        if (k === 'all') {
          el.attr('d', 'M0,' + keyMid + 'H' + 12).attr('fill', 'none').attr('stroke', color(k))
            .attr('stroke-width', cfg.byCondition ? 2 : 2.5).attr('stroke-dasharray', cfg.byCondition ? '3 2' : null);
        } else {
          var st = dotStyle(k, true, S.r * 1.05);
          el.attr('d', shapePath(st.shape, S.r * 1.05)).attr('transform', 'translate(6,' + keyMid + ')')
            .attr('fill', st.fill).attr('stroke', st.stroke).attr('stroke-width', st.sw).attr('stroke-dasharray', null);
        }
      });
      labels.select('text.t-name').attr('x', 19).attr('fill', color).text(name);
      labels.select('text.t-r').attr('x', 19).text(function (k) {
        return rText(cfg.yVar, k);
      });
    }

    /**
     * Hover/focus emphasis: an ink ring over a white offset ring around one dot (or none), so it
     * reads over dark marks and lines too (spec §4.5 focus ring). Uses the 'emph' transition on its
     * own elements, so it can never interrupt or be interrupted by a 'step' transition.
     */
    function emphasize(svg, point, opts) {
      var frame = svg.select('g.frame[data-frame="scatter"]:not(.exiting)');
      var on = !opts.reducedMotion;
      var rings = frame.select('g.layer-emph').selectAll('g.emph').data(point ? [point] : [], function (p) {
        return p.i;
      });
      rings.exit().interrupt('emph').each(function () {
        var sel = d3.select(this);
        if (on) sel.transition('emph').duration(EMPH_MS).attr('opacity', 0).remove();
        else sel.remove();
      });
      if (!point || frame.empty()) return;
      var sc = frame.property('__scales');
      var g = rings.enter().append('g').attr('class', 'emph').attr('opacity', on ? 0 : 1);
      ['emph-halo', 'emph-ring'].forEach(function (cls) {
        g.append('circle').attr('class', cls).attr('cx', sc.x(point.presence + point.jx))
          .attr('cy', sc.y(point[sc.yVar] + point.jy)).attr('r', sc.r * 2.1);
      });
      if (on) g.transition('emph').duration(EMPH_MS).attr('opacity', 1);
    }

    var lg = Store.stats.groups;
    var mean = function (v) {
      return function (g) {
        return lg[g][v].mean;
      };
    };
    var ci = function (v) {
      return function (g) {
        return lg[g][v].ci;
      };
    };

    return {
      STEP_MS: STEP_MS,
      barsFrame: barsFrame,
      scatterFrame: scatterFrame,
      bars: bars,
      scatter: scatter,
      emphasize: emphasize,

      participants: function (svg, opts) {
        var n = function (g) { return lg[g].n; };
        bars(svg, opts, {
          domain: d3.scaleLinear().domain([0, d3.max(Store.groups, n)]).nice().domain(),
          ticks: [0, 10, 20, 30, 40], compactTicks: [0, 20, 40],
          title: 'Participants', value: n, label: function (g) { return String(n(g)); }, ci: null,
        });
      },
      gains: function (svg, opts) {
        var hi = d3.max(Store.groups, function (g) { return ci('learning_gains')(g)[1]; });
        var x = d3.scaleLinear().domain([0, hi]).nice();
        bars(svg, opts, {
          domain: x.domain(), ticks: x.ticks(6), compactTicks: x.ticks(3),
          title: 'Mean learning gain (points)', value: mean('learning_gains'), ci: ci('learning_gains'),
          label: function (g) { return '+' + Format.num1(lg[g].learning_gains.mean); },
        });
      },
      scatterPooled: function (svg, opts) {
        scatter(svg, opts, { yVar: 'learning_gains', byCondition: false, lines: true, labels: true });
      },
      scatterByCondition: function (svg, opts) {
        scatter(svg, opts, { yVar: 'learning_gains', byCondition: true, lines: true, labels: true });
      },
      /** The Evidence Lab: state = { view: 'overall' | 'condition', yVar, lines (bool) }. */
      labScatter: function (svg, opts, state) {
        scatter(svg, opts, { yVar: state.yVar, byCondition: state.view === 'condition', lines: state.lines, labels: true });
      },
      load: function (svg, opts) {
        bars(svg, opts, {
          domain: [0, 12], ticks: [0, 3, 6, 9, 12], compactTicks: [0, 6, 12],
          title: 'Cognitive load (0–12: sum of two 0–6 items)',
          value: mean('cognitive_load'), ci: ci('cognitive_load'),
          label: function (g) { return Format.num1(lg[g].cognitive_load.mean); },
        });
      },
    };
  })();

  // ---------------------------------------------------------------------------------------------
  // 6. Layout (defined before use): one ResizeObserver per figure container, debounced to a rAF,
  //    and the settled-state marker the tests wait on.
  // ---------------------------------------------------------------------------------------------
  var Layout = {
    observe: function (el, onResize) {
      var pending = 0;
      var box = null;
      var ro = new ResizeObserver(function (entries) {
        box = entries[entries.length - 1].contentRect;
        if (!pending) {
          pending = requestAnimationFrame(function () {
            pending = 0;
            onResize({ width: box.width, height: box.height });
          });
        }
      });
      ro.observe(el);
      return ro;
    },

    /**
     * Mark el[data-state] once the chart drawn into svg has settled: now when the draw was instant,
     * otherwise when its step transition ends. A newer call supersedes an older pending one.
     */
    settle: function (svg, el, state, animated) {
      var gen = (el.__settleGen = (el.__settleGen || 0) + 1);
      svg.interrupt('settle');
      if (!animated) {
        el.setAttribute('data-state', state);
        return;
      }
      el.removeAttribute('data-state');
      svg.transition('settle').duration(Charts.STEP_MS).end().then(function () {
        if (gen === el.__settleGen) el.setAttribute('data-state', state);
      }, function () {});
    },
  };

  // ---------------------------------------------------------------------------------------------
  // 4. Narrative
  // ---------------------------------------------------------------------------------------------
  var Narrative = (function () {
    var S = Store.stats;
    var L = Store.labels;
    var G = Store.groups;
    var ci1 = function (c) {
      return Format.num1(c[0]) + ' to ' + Format.num1(c[1]);
    };
    var withCi = function (v) {
      return G.map(function (g) {
        return L[g] + ' ' + Format.num1(S.groups[g][v].mean) + ' (' + ci1(S.groups[g][v].ci) + ')';
      }).join(', ');
    };
    var within = G.map(function (g) {
      return 'r = ' + Format.r(S.cor.learning_gains[g].r) + ' for ' + L[g];
    });
    var sig = G.filter(function (g) {
      return S.cor.learning_gains[g].p < 0.05;
    });

    // Captions are spec §5.3; descriptions (§5.5) are generated from stats.
    var STEPS = [
      {
        state: 'participants',
        hed: 'Three groups of nearly equal size',
        dek: 'Participants per condition, randomly assigned',
        desc: 'Bar chart. Participants per condition: ' + G.map(function (g) { return L[g] + ' ' + S.groups[g].n; }).join(', ') + '.',
      },
      {
        state: 'gains',
        hed: 'Both simulations far outpaced the video',
        dek: 'Average points gained on a 10-question safety test. Lines show 95% confidence intervals.',
        desc: 'Bar chart. Average learning gain in points, with 95% confidence intervals: ' + withCi('learning_gains') + '.',
      },
      {
        state: 'scatterPooled',
        hed: 'Pooled, presence tracks learning',
        dek: 'Each dot is one participant (n = 108). Points are jittered slightly so overlapping participants are visible.',
        desc: 'Scatter plot of presence against learning gain for all ' + S.cor.learning_gains.all.n +
          ' participants. Pooled, the trend rises: r = ' + Format.r(S.cor.learning_gains.all.r) + ' (' +
          Format.p(S.cor.learning_gains.all.p) + ').',
      },
      {
        state: 'scatterByCondition',
        hed: 'Within each group, the link fades',
        dek: 'Solid lines: trend within each condition. Dashed: all 108 pooled.',
        desc: 'Scatter plot of presence against learning gain, colored by condition. Within each condition: ' +
          Format.list(within) + '; ' + (sig.length ? Format.list(sig.map(function (g) { return L[g]; })) : 'none') +
          ' statistically significant. Pooled, r = ' + Format.r(S.cor.learning_gains.all.r) + '.',
      },
      {
        state: 'load',
        hed: 'VR felt hardest, but not significantly',
        dek: 'Self-reported load, two NASA-TLX items. Lines show 95% confidence intervals.',
        desc: 'Bar chart. Average cognitive load on a 0 to 12 scale, with 95% confidence intervals: ' + withCi('cognitive_load') + '.',
      },
    ];

    var WIDE = '(min-width: 900px) and (min-height: 501px)';
    var SHORT = '(max-height: 500px) and (orientation: landscape)';
    var REDUCE = '(prefers-reduced-motion: reduce)';

    var figure = document.getElementById('story-figure');
    var wrap = figure.querySelector('.chart-svg-wrap');
    var hed = figure.querySelector('.chart-hed');
    var dek = figure.querySelector('.chart-dek');
    var desc = figure.querySelector('.chart-desc');
    var steps = Array.prototype.slice.call(document.querySelectorAll('.step'));
    var svg = d3.select(wrap).append('svg').attr('class', 'chart-svg').attr('role', 'img')
      .attr('aria-labelledby', 'chart-hed chart-desc');

    var shown = -1; // index of the chart state currently drawn
    var active = -2; // index of the step carrying aria-current (-1: none yet)
    var drawn = { width: 0, height: 0 };
    var ticking = false;

    /** The midline of the visible text area (spec §5.1). */
    function midline() {
      if (matchMedia(WIDE).matches || matchMedia(SHORT).matches) return innerHeight / 2;
      return (figure.getBoundingClientRect().bottom + innerHeight) / 2; // phone: below the sticky band
    }

    /** Draw state i. Captions update first so the chart is measured at its final size. */
    function show(i, animate) {
      var s = STEPS[i];
      if (i !== shown) {
        hed.textContent = s.hed;
        dek.textContent = s.dek;
        desc.textContent = s.desc;
      }
      shown = i;
      var box = wrap.getBoundingClientRect();
      drawn = { width: box.width, height: box.height };
      var reduced = matchMedia(REDUCE).matches;
      Charts[s.state](svg, { width: box.width, height: box.height, reducedMotion: reduced, animate: animate });

      Layout.settle(svg, figure, s.state, animate && !reduced);
    }

    /** rAF-throttled scroll check: the active step is the last one whose top is at or above the midline. */
    function check() {
      ticking = false;
      var mid = midline();
      var idx = -1;
      steps.forEach(function (el, i) {
        if (el.getBoundingClientRect().top <= mid) idx = i;
      });
      if (idx !== active) {
        active = idx;
        steps.forEach(function (el, i) {
          if (i === idx) el.setAttribute('aria-current', 'step');
          else el.removeAttribute('aria-current');
        });
      }
      var state = Math.max(0, idx); // above step 1 the figure keeps step 1's chart
      if (state !== shown) show(state, shown !== -1);
    }

    function schedule() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(check);
      }
    }

    function init() {
      check();
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      // Redraw at the new size without a transition; skip when the size is what was just drawn.
      Layout.observe(wrap, function (box) {
        if (Math.abs(box.width - drawn.width) < 0.5 && Math.abs(box.height - drawn.height) < 0.5) return;
        show(shown, false);
      });
      // Direct-label gutters are measured text: redraw once the web fonts are in.
      if (document.fonts && document.fonts.status !== 'loaded') {
        document.fonts.ready.then(function () {
          show(shown, false);
        });
      }
      // Hover emphasis on dots (pointer only; never touches the dots themselves).
      svg.on('pointerover', function (event) {
        var dot = event.target.closest && event.target.closest('g.frame:not(.exiting) .dot');
        Charts.emphasize(svg, dot ? d3.select(dot).datum() : null, { reducedMotion: matchMedia(REDUCE).matches });
      }).on('pointerleave', function () {
        Charts.emphasize(svg, null, { reducedMotion: matchMedia(REDUCE).matches });
      });
    }

    return { init: init };
  })();

  // ---------------------------------------------------------------------------------------------
  // 5. Lab: three radiogroup controls, the Lab scatter (Charts.labScatter), point inspection with a
  // readout panel instead of floating tooltips (C07, C11, C26), and a summary sentence from stats.
  // ---------------------------------------------------------------------------------------------
  var Lab = (function () {
    var REDUCE = '(prefers-reduced-motion: reduce)';
    var HIT_RADIUS = 20; // px: a click or tap this close to a dot inspects it; farther away unpins
    var G = Store.groups;
    var SHORT = { High: 'VR', Medium: 'desktop', Low: 'video' }; // spec §6.4 wording
    var Y_NAME = { learning_gains: 'learning gain', cognitive_load: 'cognitive load' };

    var section = document.getElementById('lab');
    var wrap = section.querySelector('.lab-svg-wrap');
    var readout = section.querySelector('.lab-readout');
    var summary = section.querySelector('.lab-summary');
    var segs = Array.prototype.slice.call(section.querySelectorAll('.seg[role="radiogroup"]'));
    var desc = document.createElement('p');
    desc.id = 'lab-desc';
    desc.className = 'chart-desc visually-hidden';
    wrap.appendChild(desc);
    var svg = d3.select(wrap).append('svg').attr('class', 'chart-svg lab-svg')
      // A group, not an img: its dots are focusable, and an img's children are presentational.
      .attr('role', 'group').attr('aria-labelledby', 'lab-desc')
      .attr('tabindex', -1); // Chromium would otherwise add the svg itself as a tab stop before the dots

    // Arrow keys walk the dots in the order they sit along x (true presence plus its fixed jitter).
    var byX = Store.points.slice().sort(function (a, b) {
      return a.presence + a.jx - (b.presence + b.jx) || a.i - b.i;
    });
    var rank = {};
    byX.forEach(function (p, k) {
      rank[p.i] = k;
    });

    // Control state, read from the markup's checked options: view, y and lines.
    var state = {};
    segs.forEach(function (seg) {
      state[seg.dataset.control] = seg.querySelector('[aria-checked="true"]').dataset.value;
    });
    var pinned = null; // point inspected by click, tap or keyboard focus
    var hover = null; // point previewed under a mouse or pen
    var current = byX[0]; // the dot holding the chart's single tab stop
    var drawn = { width: 0, height: 0 };

    var reduced = function () {
      return matchMedia(REDUCE).matches;
    };
    var key = function () {
      return state.view + ' ' + state.y + ' ' + state.lines;
    };

    /** "Desktop sim · presence 41 · learning gain +4": the true, unjittered values. */
    function readoutText(p) {
      var v = p[state.y];
      return Store.labels[p.condition] + ' · presence ' + p.presence + ' · ' + Y_NAME[state.y] + ' ' +
        (state.y === 'learning_gains' ? Format.signed(v) : Format.plain(v));
    }

    /** Spec §6.4 summary sentence, worded by significance (p < .05). */
    function summaryText() {
      var cor = Store.stats.cor[state.y];
      if (state.view === 'overall') {
        return 'Pooled across all ' + cor.all.n + ' participants: r = ' + Format.r(cor.all.r) + ' (' + Format.p(cor.all.p) + ').';
      }
      var sig = G.filter(function (g) {
        return cor[g].p < 0.05;
      }).map(function (g) {
        return SHORT[g];
      });
      return 'Within each condition: r = ' + G.map(function (g) {
        return Format.r(cor[g].r) + ' for ' + SHORT[g];
      }).join(', ') + ' — ' + (sig.length ? Format.list(sig) : 'none') + ' statistically significant.';
    }

    function dots() {
      return svg.selectAll('g.frame:not(.exiting) .dot');
    }

    /** The dot under keyboard focus, when its focus is visible (it then keeps a ring after Escape). */
    function focusVisiblePoint() {
      var el = document.activeElement;
      if (!el || !wrap.contains(el) || !el.classList.contains('dot')) return null;
      try {
        if (!el.matches(':focus-visible')) return null;
      } catch (e) {} // very old engines: treat keyboard focus as visible
      return d3.select(el).datum();
    }

    /** Set text only when it changes, so live regions announce real changes only. */
    function setText(el, text) {
      if (el.textContent !== text) el.textContent = text;
    }

    /** Readout, ring, selection and the roving tab stop, from pinned / hover / focus. */
    function render() {
      var shown = hover || pinned;
      setText(readout, shown ? readoutText(shown) : '');
      Charts.emphasize(svg, shown || focusVisiblePoint(), { reducedMotion: reduced() });
      dots().attr('tabindex', function (p) {
        return p === current ? 0 : -1;
      }).attr('aria-selected', function (p) {
        return p === pinned ? 'true' : 'false';
      });
    }

    /** Draw the chart for the current state; animated for control changes, instant on resize. */
    function draw(animate) {
      var box = wrap.getBoundingClientRect();
      drawn = { width: box.width, height: box.height };
      var instant = !animate || reduced();
      Charts.labScatter(svg, { width: box.width, height: box.height, reducedMotion: reduced(), animate: animate }, {
        view: state.view, yVar: state.y, lines: state.lines === 'on',
      });

      // Accessibility: only the dots are exposed (a listbox of options, one tab stop); axes, grid,
      // lines and labels are decorative here, since the summary sentence carries the numbers.
      var frame = svg.select('g.frame:not(.exiting)').attr('aria-hidden', null);
      frame.selectAll('g.plot > g').attr('aria-hidden', function () {
        return this.classList.contains('layer-marks') ? null : 'true';
      });
      frame.select('g.layer-marks').attr('role', 'listbox').attr('aria-label', 'Participants by presence score');
      dots().attr('role', 'option').attr('aria-label', readoutText).attr('aria-setsize', byX.length)
        .attr('aria-posinset', function (p) {
          return rank[p.i] + 1;
        });

      var text = summaryText();
      setText(summary, text);
      setText(desc, 'Scatter plot of presence against ' + Y_NAME[state.y] + ' for all ' + Store.points.length +
        ' participants, ' + (state.view === 'overall' ? 'in one color' : 'colored by condition') +
        (state.lines === 'on' ? ', with trend lines. ' : '. ') + text);
      render();
      Layout.settle(svg, section, key(), !instant);
    }

    // ---- Controls: radiogroups with a roving tabindex; arrows move the checked option. ----
    function check(btn, focus) {
      var seg = btn.parentNode;
      seg.querySelectorAll('[role="radio"]').forEach(function (b) {
        b.setAttribute('aria-checked', b === btn ? 'true' : 'false');
        b.tabIndex = b === btn ? 0 : -1;
      });
      if (focus) btn.focus();
      if (state[seg.dataset.control] === btn.dataset.value) return;
      state[seg.dataset.control] = btn.dataset.value;
      draw(true);
    }

    var STEP = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    segs.forEach(function (seg) {
      var radios = Array.prototype.slice.call(seg.querySelectorAll('[role="radio"]'));
      // Buttons turn Enter and Space into clicks, so a click covers mouse, touch and those keys.
      seg.addEventListener('click', function (event) {
        var btn = event.target.closest('[role="radio"]');
        if (btn) check(btn, false);
      });
      seg.addEventListener('keydown', function (event) {
        var i = radios.indexOf(event.target);
        if (!STEP[event.key] || i < 0) return;
        event.preventDefault();
        check(radios[(i + STEP[event.key] + radios.length) % radios.length], true);
      });
    });

    // ---- Point inspection ----
    function pin(p) {
      pinned = p;
      if (p) current = p;
      render();
    }

    function focusPoint(p) {
      current = p;
      render(); // moves the tab stop first, so focus lands on a tabindex=0 dot
      var el = dots().filter(function (d) {
        return d === p;
      }).node();
      if (el && document.activeElement !== el) el.focus();
    }

    /** The dot nearest a pointer event, if within HIT_RADIUS px; taps on tiny dots need the slack. */
    function nearest(event) {
      var frame = svg.select('g.frame:not(.exiting)');
      var sc = frame.property('__scales');
      if (!sc) return null;
      var m = d3.pointer(event, frame.select('g.plot').node());
      var best = null;
      var bestD = HIT_RADIUS;
      Store.points.forEach(function (p) {
        var d = Math.hypot(sc.x(p.presence + p.jx) - m[0], sc.y(p[sc.yVar] + p.jy) - m[1]);
        if (d <= bestD) {
          best = p;
          bestD = d;
        }
      });
      return best;
    }

    function dotOf(target) {
      var el = target.closest && target.closest('g.frame:not(.exiting) .dot');
      return el ? d3.select(el).datum() : null;
    }

    svg.on('pointerover', function (event) {
      if (event.pointerType === 'touch') return; // touch has no hover; a tap pins instead
      hover = dotOf(event.target);
      render();
    }).on('pointerleave', function () {
      hover = null;
      render();
    }).on('click', function (event) {
      var p = dotOf(event.target) || nearest(event);
      if (!p) {
        pin(null); // empty plot space unpins
        return;
      }
      pin(p);
      focusPoint(p);
    }).on('focusin', function (event) {
      var p = dotOf(event.target);
      if (p) pin(p); // selection follows keyboard focus
    }).on('focusout', function () {
      // Let focus land first, then drop a focus-only ring.
      requestAnimationFrame(render);
    }).on('keydown', function (event) {
      var p = dotOf(event.target);
      if (!p) return;
      var k = rank[p.i];
      var next = { ArrowRight: k + 1, ArrowDown: k + 1, ArrowLeft: k - 1, ArrowUp: k - 1, Home: 0, End: byX.length - 1 }[event.key];
      if (event.key === 'Escape') {
        hover = null;
        pin(null);
      } else if (next !== undefined) {
        focusPoint(byX[Math.max(0, Math.min(byX.length - 1, next))]);
      } else return;
      event.preventDefault();
    });

    function init() {
      draw(false);
      // Screen readers hear the summary change with the controls (not on page load).
      summary.setAttribute('aria-live', 'polite');
      // Redraw at the new size without a transition; skip when the size is what was just drawn.
      Layout.observe(wrap, function (box) {
        if (Math.abs(box.width - drawn.width) < 0.5 && Math.abs(box.height - drawn.height) < 0.5) return;
        draw(false);
      });
      if (document.fonts && document.fonts.status !== 'loaded') {
        document.fonts.ready.then(function () {
          draw(false);
        });
      }
    }

    return { init: init };
  })();

  // WebKit can run deferred scripts before style.css applies; charts need its tokens and type sizes.
  function start() {
    Narrative.init();
    Lab.init();
  }
  if (getComputedStyle(root).getPropertyValue('--ink').trim()) start();
  else window.addEventListener('load', start, { once: true });
})();
