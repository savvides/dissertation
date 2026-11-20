// Page behavior for the v4.0.0 Dissertation Data Story.
// Classic deferred script loaded after vendor/d3.v7.9.0.min.js and data.js.
// Every number displayed by charts, descriptions, and readouts comes from window.STUDY.
//
// Sections:
//   1. Store      reads window.STUDY (points, stats, labels)
//   2. Format     typographic formatting shared across Narrative and Lab
//   3. Charts     unified D3 engine with persistent 108-dot object permanence
//   4. Layout     ResizeObserver + transition settle gate
//   5. Narrative  6-step scroll storytelling + quick-jump nav
//   6. Lab        Evidence Lab controls, presets, keyboard & pointer inspection
//   7. Cite       footer APA citation copy action
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');
  var d3 = window.d3;
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
    splitOrder: ['Low', 'Medium', 'High'],
  };

  // ---------------------------------------------------------------------------------------------
  // 2. Format
  // ---------------------------------------------------------------------------------------------
  var MINUS = '−';
  var Format = {
    num1: function (v) {
      var s = Math.abs(v).toFixed(1);
      return (v < 0 && Number(s) !== 0 ? MINUS : '') + s;
    },
    r: function (v) {
      var s = Math.abs(v).toFixed(2).replace(/^0/, '');
      return (v < 0 && Number(s) !== 0 ? MINUS : '') + s;
    },
    signed: function (v) {
      return (v > 0 ? '+' : v < 0 ? MINUS : '') + Math.abs(v);
    },
    plain: function (v) {
      return (v < 0 ? MINUS : '') + Math.abs(v);
    },
    p: function (p) {
      if (p < 0.001) return 'p\u00a0<\u00a0.001';
      var d = 2;
      while (p < 0.05 && (Number(p.toFixed(d)) >= 0.05 || Number(p.toFixed(d)) === 0)) d++;
      return 'p\u00a0=\u00a0' + p.toFixed(d).replace(/^0/, '') + (p < 0.05 ? '' : ', not statistically significant');
    },
    list: function (items) {
      return items.length < 2 ? items.join('') : items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
    },
  };

  // ---------------------------------------------------------------------------------------------
  // 3. Charts: unified persistent 108-dot engine
  // ---------------------------------------------------------------------------------------------
  var Charts = (function () {
    var STEP_MS = 700;
    var EXIT_MS = 280;
    var EMPH_MS = 150;
    var COMPACT_BELOW = 240;
    var SPLIT_STACK_BELOW = 460;
    // Grid stays first child of g.plot; trends stay before marks so no participant is obscured.
    var LAYERS = ['grid', 'panels', 'axes', 'trends', 'marks', 'overlays', 'annotations', 'labels', 'emph'];
    var DRAW_ORDER = { Low: 0, High: 1, Medium: 2 };
    var N_VERTS = 24;
    var C = {};

    function readTokens() {
      var css = getComputedStyle(root);
      var names = { bg: 'bg', ink: 'ink', muted: 'muted', axis: 'axis', ghost: 'ghost', neutral: 'neutral', High: 'high', Medium: 'medium', Low: 'low' };
      Object.keys(names).forEach(function (k) {
        C[k] = css.getPropertyValue('--' + names[k]).trim();
      });
    }

    function motion(opts) {
      var on = !opts.reducedMotion && opts.animate !== false;
      return {
        on: on,
        t: function (sel, ms) {
          return on ? sel.transition('step').duration(ms || STEP_MS).ease(d3.easeCubicInOut) : sel;
        },
      };
    }

    function exitFade(sel, m) {
      sel.interrupt('step');
      if (m.on) sel.classed('exiting', true).transition('step').duration(EXIT_MS).attr('opacity', 0).remove();
      else sel.remove();
    }

    function clearLayer(f, name, m) {
      exitFade(f.layer(name).selectAll(':scope > *'), m);
    }

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

    function dotStyle(g, byCondition, r, fillOp) {
      var op = fillOp !== undefined ? fillOp : 1;
      if (!byCondition) return { shape: 'circle', fill: C.neutral, fillOpacity: op, stroke: C.bg, sw: r * 0.22 };
      if (g === 'High') return { shape: 'circle', fill: C.High, fillOpacity: op, stroke: C.bg, sw: r * 0.22 };
      if (g === 'Medium') return { shape: 'ring', fill: C.bg, fillOpacity: 0.65, stroke: C.Medium, sw: r * 0.44 };
      return { shape: 'diamond', fill: C.Low, fillOpacity: op, stroke: C.bg, sw: r * 0.22 };
    }

    /** Persistent single frame for seamless 108-dot object permanence across all states. */
    function useFrame(svg, opts, m) {
      if (!C.ink) readTokens();
      svg.attr('width', opts.width).attr('height', opts.height).attr('viewBox', '0 0 ' + opts.width + ' ' + opts.height);
      svg.selectAll('*').interrupt('step');
      svg.selectAll('.exiting').remove();
      svg.selectAll('g.emph, g.emph-out').interrupt('emph').remove();
      var frame = svg.select('g.frame[data-frame="story"]');
      var entering = frame.empty();
      if (entering) {
        frame = svg.append('g').attr('class', 'frame').attr('data-frame', 'story').attr('aria-hidden', 'true').attr('opacity', 1);
        var plot = frame.append('g').attr('class', 'plot');
        LAYERS.forEach(function (l) {
          plot.append('g').attr('class', 'layer-' + l);
        });
      }
      frame.attr('opacity', 1);
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

    function gridLines(f, key, values, place, m) {
      var lines = f.layer('grid').selectAll('line.grid[data-key="' + key + '"]').data(values, function (v) {
        return key + ':' + v;
      }).join(
        function (enter) {
          var l = place(enter.append('line').attr('class', 'grid').attr('data-key', key));
          if (m.on) l.attr('opacity', 0);
          return l;
        },
        null,
        function (exit) { exitFade(exit, m); }
      );
      place(m.t(lines).attr('opacity', 1));
    }

    function axisX(f, x, ticks, atY, o, m) {
      var axis = f.layer('axes').selectAll('g.axis-x[data-id="' + (o.id || 'main') + '"]').data([0]).join('g')
        .attr('class', 'axis-x').attr('data-id', o.id || 'main');
      axis.attr('data-domain', x.domain().join(','));
      m.t(axis).attr('transform', 'translate(' + (o.ox || 0) + ',' + atY + ')');
      var fmt = o.tick || String;
      var tick = axis.selectAll('g.tick').data(ticks, String).join(
        function (enter) {
          var g = enter.append('g').attr('class', 'tick').attr('transform', function (v) { return 'translate(' + x(v) + ',0)'; });
          g.append('line').attr('class', 'tick-line').attr('y2', 5);
          g.append('text').attr('class', 't-tick').attr('y', 20).attr('text-anchor', 'middle');
          if (m.on) g.attr('opacity', 0);
          return g;
        },
        null,
        function (exit) { exitFade(exit, m); }
      );
      tick.attr('data-v', String).select('text').text(fmt).attr('text-anchor', function (v) {
        if (o.edgeAlign && v === ticks[0]) return 'start';
        if (o.edgeAlign && v === ticks[ticks.length - 1]) return 'end';
        return o.startFirst && v === x.domain()[0] ? 'start' : 'middle';
      });
      m.t(tick).attr('opacity', 1).attr('transform', function (v) { return 'translate(' + x(v) + ',0)'; });
      var domain = axis.selectAll('line.domain').data([0]).join('line').attr('class', 'domain');
      m.t(domain).attr('x1', 0).attr('x2', o.width);

      var span = o.grid || [0, 0];
      gridLines(f, o.gridKey || 'v', o.grid ? ticks.filter(function (v) { return v !== x.domain()[0]; }) : [], function (sel) {
        return sel.attr('x1', function (v) { return (o.ox || 0) + x(v); }).attr('x2', function (v) { return (o.ox || 0) + x(v); })
          .attr('y1', span[0]).attr('y2', span[1]);
      }, m);
    }

    function axisTitle(f, role, lines, x, y, anchor, m) {
      var t = f.layer('labels').selectAll('text.t-axis[data-role="' + role + '"]').data([0]).join(function (enter) {
        return enter.append('text').attr('class', 't-axis').attr('data-role', role).attr('x', x).attr('y', y);
      });
      t.attr('text-anchor', anchor);
      var spans = t.selectAll('tspan').data(lines).join(function (enter) {
        return enter.append('tspan').attr('x', x);
      }).text(String).attr('dy', function (_, i) { return i ? '1.25em' : 0; });
      m.t(t).attr('opacity', 1).attr('x', x).attr('y', y);
      m.t(spans).attr('x', x);
    }

    /** Draw or update the 108 persistent path.dot elements and cache their plot coordinates for hover/focus. */
    function renderDots(f, posOf, styleOf, m) {
      var data = Store.points.slice().sort(function (a, b) {
        return DRAW_ORDER[a.condition] - DRAW_ORDER[b.condition] || a.i - b.i;
      });
      var posMap = {};
      var dots = f.layer('marks').selectAll('path.dot').data(data, function (p) { return p.i; }).join(function (enter) {
        return enter.append('path').attr('class', 'dot').attr('transform', function (p) {
          var q = posOf(p);
          return 'translate(' + q.x.toFixed(2) + ',' + q.y.toFixed(2) + ')';
        }).attr('d', function (p) {
          var st = styleOf(p);
          return shapePath(st.shape, st.r);
        });
      }).order();

      dots.attr('data-i', function (p) { return p.i; }).attr('data-shape', function (p) { return styleOf(p).shape; });

      dots.each(function (p) {
        var q = posOf(p);
        var st = styleOf(p);
        posMap[p.i] = { x: q.x, y: q.y, r: st.r };
      });
      f.frame.property('__pos', posMap);

      m.t(dots).attr('transform', function (p) {
        var q = posMap[p.i];
        return 'translate(' + q.x.toFixed(2) + ',' + q.y.toFixed(2) + ')';
      }).attr('d', function (p) {
        var st = styleOf(p);
        return shapePath(st.shape, st.r);
      }).attr('fill', function (p) { return styleOf(p).fill; })
        .attr('fill-opacity', function (p) { return styleOf(p).fillOpacity; })
        .attr('stroke', function (p) { return styleOf(p).stroke; })
        .attr('stroke-width', function (p) { return styleOf(p).sw; });
    }

    // ---------------- Step 1: Experimental Design Schematic (3 balanced cohorts) ----------------
    function drawDesign(svg, opts) {
      var m = motion(opts);
      var f = useFrame(svg, opts, m);
      if (f.entering) m = motion({ animate: false });
      var W = opts.width;
      var H = opts.height;
      var wide = W >= 480;
      var showBracket = W >= 560 && H >= 230;
      var catW = measure(svg, 't-cat', Store.groups.map(function (g) { return Store.labels[g]; }));
      var subW = wide ? measure(svg, 't-sub', ['Same Labster sim · n = 36', 'Video + handout · n = 37']) : 0;
      var left = wide ? Math.ceil(Math.max(catW, subW) + 20) : 2;
      var right = showBracket ? 168 : 6;
      var plotW = Math.max(120, W - left - right);
      var top = 6;
      var bottom = 10;
      var stepH = Math.min((H - top - bottom) / 3, 185);
      var labelH = wide ? 0 : 22;
      var laneH = stepH - labelH;

      m.t(f.plot).attr('transform', 'translate(' + left + ',' + top + ')');
      exitFade(f.layer('panels').selectAll(':scope > :not(.panel-rule)'), m);
      clearLayer(f, 'grid', m);
      clearLayer(f, 'axes', m);
      clearLayer(f, 'trends', m);
      clearLayer(f, 'overlays', m);

      var band = {};
      Store.groups.forEach(function (g, i) {
        var y0 = i * stepH + labelH;
        band[g] = { top: i * stepH, y0: y0, mid: y0 + laneH / 2 };
      });

      // Subtle lane hairlines between groups.
      var div = f.layer('panels').selectAll('line.panel-rule').data([1, 2], String).join(
        function (enter) { return enter.append('line').attr('class', 'panel-rule').attr('opacity', m.on ? 0 : 1); },
        null,
        function (exit) { exitFade(exit, m); }
      );
      m.t(div).attr('opacity', 1).attr('x1', wide ? -left : 0).attr('x2', plotW)
        .attr('y1', function (i) { return i * stepH; }).attr('y2', function (i) { return i * stepH; });

      // Arrange 35/36/37 marks in clean columns inside each lane.
      var cols = wide ? 10 : 13;
      var colStep = Math.min(18, Math.max(9.5, (plotW - 18) / (cols - 1)));
      var rows = Math.ceil(37 / cols);
      var rowStep = Math.min(17, Math.max(9, (laneH * 0.62) / Math.max(1, rows - 1)));
      var dotR = Math.min(4.5, Math.max(2.6, Math.min(colStep, rowStep) * 0.34));
      var byGroup = {};
      Store.groups.forEach(function (g) {
        byGroup[g] = Store.points.filter(function (p) { return p.condition === g; }).sort(function (a, b) { return a.i - b.i; });
      });
      var coords = {};
      Store.groups.forEach(function (g) {
        var pts = byGroup[g];
        var nRows = Math.ceil(pts.length / cols);
        var startY = band[g].mid - ((nRows - 1) * rowStep) / 2;
        pts.forEach(function (p, idx) {
          var rIdx = Math.floor(idx / cols);
          var cIdx = idx % cols;
          coords[p.i] = { x: 8 + cIdx * colStep, y: startY + rIdx * rowStep };
        });
      });

      renderDots(
        f,
        function (p) { return coords[p.i]; },
        function (p) {
          var st = dotStyle(p.condition, true, dotR, 1);
          st.r = dotR;
          return st;
        },
        m
      );

      // Left category labels (+ subtitle on wide).
      var cats = f.layer('labels').selectAll('g.cat-row').data(Store.groups, String).join(
        function (enter) {
          var g = enter.append('g').attr('class', 'cat-row');
          g.append('text').attr('class', 't-cat');
          g.append('text').attr('class', 't-sub');
          if (m.on) g.attr('opacity', 0);
          return g;
        },
        null,
        function (exit) { exitFade(exit, m); }
      );
      cats.select('text.t-cat').attr('fill', function (g) { return C[g]; })
        .text(function (g) { return wide ? Store.labels[g] : Store.labels[g] + ' (' + Store.stats.groups[g].n + ')'; })
        .attr('x', wide ? -left + 1 : 0)
        .attr('y', function (g) { return wide ? band[g].mid - 4 : band[g].top + 14; })
        .attr('dy', wide ? '0' : '0');
      var DESCS = { High: 'Labster VR · n = 35', Medium: 'Same Labster sim · n = 36', Low: 'Video + handout · n = 37' };
      cats.select('text.t-sub')
        .attr('display', wide ? null : 'none')
        .text(function (g) { return DESCS[g]; })
        .attr('x', -left + 1)
        .attr('y', function (g) { return band[g].mid + 14; });
      m.t(cats).attr('opacity', 1);

      // Clean out scatter-only labels/axes before drawing design annotations.
      exitFade(f.layer('labels').selectAll(':scope > :not(.cat-row)'), m);

      var bData = showBracket ? [
        { id: 'sim', y1: band.High.y0 + laneH * 0.2, y2: band.Medium.y0 + laneH * 0.8, title: 'Same interactive sim', sub: 'Isolates immersion (n = 71)' },
        { id: 'ctrl', y1: band.Low.y0 + laneH * 0.25, y2: band.Low.y0 + laneH * 0.75, title: 'Different format', sub: 'Video & handout (n = 37)' },
      ] : [];
      var bx = Math.min(plotW - 4, 8 + (cols - 1) * colStep + 22);
      var br = f.layer('annotations').selectAll('g.design-br').data(bData, function (d) { return d.id; }).join(
        function (enter) {
          var g = enter.append('g').attr('class', 'design-br');
          g.append('path').attr('class', 'bracket');
          g.append('text').attr('class', 't-annot');
          g.append('text').attr('class', 't-sub');
          if (m.on) g.attr('opacity', 0);
          return g;
        },
        null,
        function (exit) { exitFade(exit, m); }
      );
      br.select('path.bracket').attr('d', function (d) {
        return 'M' + bx + ',' + d.y1 + 'H' + (bx + 8) + 'V' + d.y2 + 'H' + bx;
      });
      br.select('text.t-annot').attr('x', bx + 15).attr('y', function (d) { return (d.y1 + d.y2) / 2 - 3; }).text(function (d) { return d.title; });
      br.select('text.t-sub').attr('x', bx + 15).attr('y', function (d) { return (d.y1 + d.y2) / 2 + 13; }).text(function (d) { return d.sub; });
      m.t(br).attr('opacity', 1);
      exitFade(f.layer('annotations').selectAll(':scope > :not(.design-br)'), m);
    }

    // ---------------- Steps 2 & 6: Beeswarm Distribution + Mean / 95% CI ----------------
    function drawBeeswarm(svg, opts, cfg) {
      var m = motion(opts);
      var f = useFrame(svg, opts, m);
      if (f.entering) m = motion({ animate: false });
      var W = opts.width;
      var H = opts.height;
      var lg = Store.stats.groups;

      var valStrings = Store.groups.map(cfg.label);
      var catW = measure(svg, 't-cat', Store.groups.map(function (g) { return Store.labels[g]; }));
      var valW = measure(svg, 't-value', valStrings);
      var right = Math.ceil(valW + 16);
      var left = Math.ceil(catW + 16);
      var compact = W - left - right < COMPACT_BELOW;
      if (compact) left = 2;
      var plotW = Math.max(120, W - left - right);

      var titleLines = wrapLines(svg, 't-axis', cfg.title, W - 2);
      var showTopRef = cfg.medianRef !== undefined && H >= 220;
      var top = showTopRef ? 24 : 4;
      var bottom = 7 + 13 + 8 + titleLines.length * 16 + 4;
      var labelH = compact ? 20 : 0;
      var stepH = compact ? Math.min((H - top - bottom) / 3, 94) : (H - top - bottom) / 3;
      var laneH = stepH - labelH;
      var axisY = 3 * stepH + 6;
      var pad = cfg.floored ? 14 : 0;
      var x = d3.scaleLinear().domain(cfg.domain).range([pad, plotW - pad]);

      m.t(f.plot).attr('transform', 'translate(' + left + ',' + top + ')');
      clearLayer(f, 'panels', m);
      clearLayer(f, 'trends', m);
      exitFade(f.layer('grid').selectAll('line.grid:not([data-key="v"])'), m);
      exitFade(f.layer('axes').selectAll('g.axis-y, g.axis-x:not([data-id="main"])'), m);

      var band = {};
      Store.groups.forEach(function (g, i) {
        var y0 = i * stepH + labelH;
        band[g] = { top: i * stepH, y0: y0, h: laneH, mid: y0 + laneH / 2 };
      });

      var ticks = compact ? cfg.compactTicks : cfg.ticks;
      axisX(f, x, ticks, axisY, {
        id: 'main',
        width: plotW,
        grid: [compact ? labelH - 2 : 0, axisY],
        gridKey: 'v',
        startFirst: compact,
        tick: cfg.tickFmt || String,
      }, m);

      // Zero line (vertical).
      var z = f.layer('axes').selectAll('line.zero').data(['main'], String).join(
        function (enter) { return enter.append('line').attr('class', 'zero').attr('opacity', m.on ? 0 : 1); },
        null,
        function (exit) { exitFade(exit, m); }
      );
      m.t(z).attr('opacity', 1).attr('x1', x(0)).attr('x2', x(0)).attr('y1', compact ? labelH - 2 : 0).attr('y2', axisY);

      // Median reference line (Step 6 cognitive load).
      var refData = cfg.medianRef !== undefined ? [cfg.medianRef] : [];
      var ref = f.layer('axes').selectAll('line.ref-line').data(refData, String).join(
        function (enter) { return enter.append('line').attr('class', 'ref-line').attr('opacity', m.on ? 0 : 1); },
        null,
        function (exit) { exitFade(exit, m); }
      );
      m.t(ref).attr('opacity', 1).attr('x1', x).attr('x2', x).attr('y1', 0).attr('y2', axisY);

      // Pack 108 dots neatly into integer buckets within each lane.
      var dotR = compact ? 2.7 : Math.min(3.8, Math.max(2.8, laneH * 0.045));
      var spanUnits = Math.abs(cfg.domain[1] - cfg.domain[0]);
      var unitPx = (plotW - 2 * pad) / spanUnits;
      var slotY = Math.max(dotR * 2.25, 6.2);
      var maxRows = Math.max(3, Math.floor((laneH * 0.74) / slotY));
      var coords = {};

      Store.groups.forEach(function (g) {
        var buckets = {};
        Store.points.filter(function (p) { return p.condition === g; }).forEach(function (p) {
          var v = p[cfg.metric];
          if (!buckets[v]) buckets[v] = [];
          buckets[v].push(p);
        });
        Object.keys(buckets).forEach(function (k) {
          var list = buckets[k].sort(function (a, b) { return a.i - b.i; });
          var n = list.length;
          var cols = Math.ceil(n / maxRows);
          var perCol = Math.ceil(n / cols);
          var dy = Math.min(slotY, (laneH * 0.78) / Math.max(1, perCol - 1));
          var dx = cols > 1 ? Math.min(dotR * 2.15, (unitPx * 0.65) / (cols - 1)) : 0;
          var cx0 = x(Number(k));
          list.forEach(function (p, idx) {
            var cIdx = Math.floor(idx / perCol);
            var rIdx = idx % perCol;
            var colCount = Math.min(perCol, n - cIdx * perCol);
            var px = cx0 + (cIdx - (cols - 1) / 2) * dx;
            var py = band[g].mid + (rIdx - (colCount - 1) / 2) * dy;
            coords[p.i] = { x: px, y: py };
          });
        });
      });

      renderDots(
        f,
        function (p) { return coords[p.i]; },
        function (p) {
          var st = dotStyle(p.condition, true, dotR, 0.9);
          st.r = dotR;
          return st;
        },
        m
      );

      // 95% CI whiskers + mean markers in layer-overlays.
      var ov = f.layer('overlays');
      var capH = Math.min(12, laneH * 0.24);
      var mid = function (g) { return band[g].mid; };
      var ciVal = function (g) { return lg[g][cfg.metric].ci; };
      var meanVal = function (g) { return lg[g][cfg.metric].mean; };

      [['ci-halo', 'line'], ['ci', 'line']].forEach(function (spec) {
        var lines = ov.selectAll('line.' + spec[0]).data(Store.groups, String).join(
          function (enter) {
            var l = enter.append('line').attr('class', spec[0]).attr('data-group', String)
              .attr('x1', function (g) { return x(ciVal(g)[0]); }).attr('x2', function (g) { return x(ciVal(g)[1]); })
              .attr('y1', mid).attr('y2', mid);
            if (m.on) l.attr('opacity', 0);
            return l;
          },
          null,
          function (exit) { exitFade(exit, m); }
        );
        lines.attr('data-group', String);
        m.t(lines).attr('opacity', 1)
          .attr('x1', function (g) { return x(ciVal(g)[0]); }).attr('x2', function (g) { return x(ciVal(g)[1]); })
          .attr('y1', mid).attr('y2', mid);
      });

      var caps = ov.selectAll('line.ci-cap').data(Store.groups.flatMap(function (g) { return [[g, 0], [g, 1]]; }), function (d) { return d.join(':'); }).join(
        function (enter) {
          var l = enter.append('line').attr('class', 'ci-cap')
            .attr('x1', function (d) { return x(ciVal(d[0])[d[1]]); }).attr('x2', function (d) { return x(ciVal(d[0])[d[1]]); })
            .attr('y1', function (d) { return mid(d[0]) - capH / 2; }).attr('y2', function (d) { return mid(d[0]) + capH / 2; });
          if (m.on) l.attr('opacity', 0);
          return l;
        },
        null,
        function (exit) { exitFade(exit, m); }
      );
      m.t(caps).attr('opacity', 1)
        .attr('x1', function (d) { return x(ciVal(d[0])[d[1]]); }).attr('x2', function (d) { return x(ciVal(d[0])[d[1]]); })
        .attr('y1', function (d) { return mid(d[0]) - capH / 2; }).attr('y2', function (d) { return mid(d[0]) + capH / 2; });

      var means = ov.selectAll('circle.mean-mk').data(Store.groups, String).join(
        function (enter) {
          var c = enter.append('circle').attr('class', 'mean-mk').attr('data-group', String).attr('r', Math.max(4.5, dotR + 1.4))
            .attr('cx', function (g) { return x(meanVal(g)); }).attr('cy', mid);
          if (m.on) c.attr('opacity', 0);
          return c;
        },
        null,
        function (exit) { exitFade(exit, m); }
      );
      means.attr('fill', function (g) { return C[g]; });
      m.t(means).attr('opacity', 1).attr('cx', function (g) { return x(meanVal(g)); }).attr('cy', mid).attr('r', Math.max(4.5, dotR + 1.4));

      // Labels: left category names, right mean column, bottom axis title.
      exitFade(f.layer('labels').selectAll('g.cat-row, g.dlabel, g.panel-lbl, text.t-axis[data-role="y"]'), m);
      var cats = f.layer('labels').selectAll('text.t-cat').data(Store.groups, String).join(
        function (enter) { return enter.append('text').attr('class', 't-cat').attr('opacity', m.on ? 0 : 1); },
        null,
        function (exit) { exitFade(exit, m); }
      );
      cats.attr('data-group', String).attr('fill', function (g) { return C[g]; }).text(function (g) { return Store.labels[g]; });
      m.t(cats).attr('opacity', 1)
        .attr('x', compact ? 0 : -left + 1)
        .attr('y', function (g) { return compact ? band[g].top + 14 : band[g].mid; })
        .attr('dy', compact ? 0 : '0.35em');

      var vals = f.layer('labels').selectAll('text.t-value').data(Store.groups, String).join(
        function (enter) { return enter.append('text').attr('class', 't-value').attr('x', plotW + 12).attr('y', mid).attr('opacity', m.on ? 0 : 1); },
        null,
        function (exit) { exitFade(exit, m); }
      );
      vals.attr('data-group', String).attr('dy', '0.35em').text(cfg.label);
      m.t(vals).attr('opacity', 1).attr('x', plotW + 12).attr('y', mid);

      axisTitle(f, 'x', titleLines, plotW + right - 2, axisY + 7 + 13 + 8 + 12, 'end', m);

      // Step-specific quiet Knaflic callout annotations (gated on ample whitespace).
      var annots = [];
      if (showTopRef) {
        annots.push({ id: 'median-top', x: x(cfg.medianRef) + 5, y: -9, anchor: 'start', text: plotW >= 340 ? 'All groups share median = 2' : 'Median = 2' });
      }
      if (cfg.metric === 'cognitive_load' && plotW >= 360 && laneH >= 78) {
        annots.push({ id: 'vr-outliers', x: x(9.5), y: band.High.y0 + 13, anchor: 'middle', text: '4 VR outliers (7–12); avg gain +4.3' });
      }
      if (cfg.metric === 'learning_gains' && plotW >= 360 && laneH >= 78) {
        annots.push({ id: 'vr-desk-tie', x: x(-1.25), y: (band.High.mid + band.Medium.mid) / 2 + 4, anchor: 'middle', text: 'VR vs. Desktop: d = 0.23, p = .33 (n.s.)' });
      }

      exitFade(f.layer('annotations').selectAll('g.design-br, g.inplot-lbl'), m);
      var an = f.layer('annotations').selectAll('text.t-annot[data-id]').data(annots, function (d) { return d.id; }).join(
        function (enter) { return enter.append('text').attr('class', 't-annot').attr('data-id', function (d) { return d.id; }).attr('opacity', m.on ? 0 : 1); },
        null,
        function (exit) { exitFade(exit, m); }
      );
      an.attr('text-anchor', function (d) { return d.anchor; }).text(function (d) { return d.text; });
      m.t(an).attr('opacity', 1).attr('x', function (d) { return d.x; }).attr('y', function (d) { return d.y; });
    }

    // ---------------- Scatter & Small-Multiples Engine (Steps 3, 4, 5 & Evidence Lab) ----------------
    var AXES_CFG = {
      learning_gains: {
        xVar: 'presence', yVar: 'learning_gains',
        xTitle: 'Presence score →', yTitle: 'Learning gain (post − pre)',
        xDomain: [0, 60], xTicks: [0, 10, 20, 30, 40, 50, 60], xCompact: [0, 20, 40, 60], xPad: 0.9, yFloor: undefined,
      },
      cognitive_load: {
        xVar: 'presence', yVar: 'cognitive_load',
        xTitle: 'Presence score →', yTitle: 'Cognitive load (0–12)',
        xDomain: [0, 60], xTicks: [0, 10, 20, 30, 40, 50, 60], xCompact: [0, 20, 40, 60], xPad: 0.9, yFloor: 0,
      },
      load_vs_gain: {
        xVar: 'cognitive_load', yVar: 'learning_gains',
        xTitle: 'Cognitive load (0–12) →', yTitle: 'Learning gain (post − pre)',
        xDomain: [0, 12], xTicks: [0, 3, 6, 9, 12], xCompact: [0, 6, 12], xPad: 0.25, yFloor: undefined,
      },
    };

    var Y_TICK_FMT = { learning_gains: Format.signed, cognitive_load: Format.plain };

    function scatterJitterX(p, ax) {
      return ax.xVar === 'cognitive_load' ? p.cognitive_load + p.jx * 0.22 : p.presence + p.jx;
    }

    function rText(axesKey, key) {
      return 'r = ' + Format.r(Store.stats.cor[axesKey][key].r);
    }

    function spread(ys, lo, hi, gap) {
      var idx = ys.map(function (_, i) { return i; }).sort(function (a, b) { return ys[a] - ys[b]; });
      var v = idx.map(function (i) { return ys[i]; });
      if (v.length > 1) gap = Math.min(gap, (hi - lo) / (v.length - 1));
      for (var k = 0; k < v.length; k++) v[k] = Math.max(v[k], k ? v[k - 1] + gap : lo);
      for (k = v.length - 1; k >= 0; k--) v[k] = Math.min(v[k], k < v.length - 1 ? v[k + 1] - gap : hi);
      var out = [];
      idx.forEach(function (i, j) { out[i] = v[j]; });
      return out;
    }

    function drawSingleScatter(svg, opts, cfg, m, f) {
      var W = opts.width;
      var H = opts.height;
      var ax = AXES_CFG[cfg.axesKey];
      var yFmt = Y_TICK_FMT[ax.yVar];
      var ext = d3.extent(Store.points, function (p) { return p[ax.yVar]; });
      var flooredY = ax.yFloor !== undefined;
      var flooredX = ax.xVar === 'cognitive_load';
      var yDomain = [flooredY ? ax.yFloor : ext[0] - 0.5, ext[1] + 0.5];
      var yTicksAll = d3.range(Math.ceil(yDomain[0] / 2) * 2, yDomain[1], 2);
      var tickW = measure(svg, 't-tick', yTicksAll.map(yFmt));
      var left = Math.ceil(tickW + 10);

      var nameW = measure(svg, 't-name', Store.groups.map(function (g) { return Store.labels[g]; }).concat('Overall'));
      var rW = measure(svg, 't-r', Store.groups.concat('all').map(function (k) { return rText(cfg.axesKey, k); }));
      var gutter = cfg.labels ? Math.ceil(10 + 14 + 5 + Math.max(nameW, rW) + 2) : 12;
      var top = 30;
      var bottom = 7 + 13 + 8 + 16;
      var plotW = Math.max(120, W - left - gutter);
      var plotH = Math.max(110, H - top - bottom);
      var compact = plotW < COMPACT_BELOW;
      var r = compact ? 3.0 : 3.5;

      var xSpan = ax.xDomain[1] - ax.xDomain[0];
      var padX = Math.ceil((ax.xPad * plotW) / xSpan + 1.3 * r + 2);
      var x = d3.scaleLinear().domain(ax.xDomain).range([padX, plotW - padX]);
      var padY = flooredY ? Math.ceil((0.28 * plotH) / (yDomain[1] - yDomain[0]) + 1.3 * r + 2) : 0;
      var y = d3.scaleLinear().domain(yDomain).range([plotH - padY, 0]);
      var yTicks = plotH / yTicksAll.length < 24 ? yTicksAll.filter(function (v) { return v % 4 === 0; }) : yTicksAll;

      m.t(f.plot).attr('transform', 'translate(' + left + ',' + top + ')');
      clearLayer(f, 'panels', m);
      clearLayer(f, 'overlays', m);
      exitFade(f.layer('axes').selectAll('line.ref-line'), m);
      exitFade(f.layer('labels').selectAll('g.cat-row, text.t-cat, text.t-value, g.panel-lbl'), m);
      exitFade(f.layer('annotations').selectAll('g.design-br, text.t-annot[data-id]'), m);

      axisX(f, x, compact ? ax.xCompact : ax.xTicks, plotH, { id: 'main', width: plotW, grid: null }, m);

      // Left Y-axis ticks + horizontal gridlines.
      var axisY = f.layer('axes').selectAll('g.axis-y').data([0]).join('g').attr('class', 'axis-y');
      axisY.attr('data-domain', y.domain().join(','));
      m.t(axisY).attr('transform', 'translate(0,0)');
      var yTick = axisY.selectAll('g.tick').data(yTicks, String).join(
        function (enter) {
          var g = enter.append('g').attr('class', 'tick').attr('transform', function (v) { return 'translate(0,' + y(v) + ')'; });
          g.append('text').attr('class', 't-tick').attr('x', -9).attr('dy', '0.35em').attr('text-anchor', 'end');
          if (m.on) g.attr('opacity', 0);
          return g;
        },
        null,
        function (exit) { exitFade(exit, m); }
      );
      yTick.attr('data-v', String).select('text').text(yFmt);
      m.t(yTick).attr('opacity', 1).attr('transform', function (v) { return 'translate(0,' + y(v) + ')'; });

      exitFade(f.layer('grid').selectAll('line.grid:not([data-key="h"])'), m);
      gridLines(f, 'h', yTicks.filter(function (v) { return v !== 0; }), function (sel) {
        return sel.attr('x1', 0).attr('x2', plotW).attr('y1', y).attr('y2', y);
      }, m);

      var z = f.layer('axes').selectAll('line.zero').data(['main'], String).join(
        function (enter) { return enter.append('line').attr('class', 'zero').attr('opacity', m.on ? 0 : 1); },
        null,
        function (exit) { exitFade(exit, m); }
      );
      m.t(z).attr('opacity', 1).attr('x1', 0).attr('x2', plotW).attr('y1', y(0)).attr('y2', y(0));

      axisTitle(f, 'y', [ax.yTitle], -left + 1, -14, 'start', m);
      axisTitle(f, 'x', [ax.xTitle], plotW, plotH + 7 + 13 + 8 + 12, 'end', m);

      // Dots.
      var dotFillOp = cfg.byCondition ? 0.88 : 0.72;
      renderDots(
        f,
        function (p) { return { x: x(scatterJitterX(p, ax)), y: y(p[ax.yVar] + p.jy) }; },
        function (p) {
          var st = dotStyle(p.condition, cfg.byCondition, r, dotFillOp);
          st.r = r;
          return st;
        },
        m
      );

      // Trend lines.
      var cor = Store.stats.cor[cfg.axesKey];
      var lineW = compact ? 2.5 : 3;
      var keys = !cfg.lines ? [] : cfg.byCondition ? ['all'].concat(Store.groups) : ['all'];
      var seg = function (k, from) {
        var c = cor[from || k];
        var a = cor[k].xmin;
        var b = cor[k].xmax;
        return 'M' + x(a) + ',' + y(c.intercept + c.slope * a) + 'L' + x(b) + ',' + y(c.intercept + c.slope * b);
      };
      var ghost = function (k) { return cfg.byCondition && k === 'all'; };
      var stroke = function (k) { return k === 'all' ? (cfg.byCondition ? C.ghost : C.ink) : C[k]; };
      var width = function (k) { return ghost(k) ? 1.75 : lineW; };

      var trends = f.layer('trends').selectAll('g.trend-g').data(keys, String).join(
        function (enter) {
          var g = enter.append('g').attr('class', 'trend-g');
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
      trends.select('path.trend-halo').attr('stroke', C.bg).attr('stroke-opacity', function (k) { return ghost(k) ? 0.85 : 1; });
      trends.select('path.trend').attr('data-group', String).classed('ghost', ghost)
        .attr('stroke-dasharray', function (k) { return ghost(k) ? '6 4' : null; });
      m.t(trends.select('path.trend-halo')).attr('d', function (k) { return seg(k); }).attr('stroke-width', function (k) { return width(k) + 3; });
      m.t(trends.select('path.trend')).attr('d', function (k) { return seg(k); }).attr('stroke', stroke).attr('stroke-width', width);

      // Direct labels: when roomy on presence->gain byCondition, put Overall cleanly in-plot so the
      // right gutter holds only the 3 conditions with zero vertical crowding.
      var inPlotAll = cfg.labels && cfg.byCondition && cfg.lines && cfg.axesKey === 'learning_gains' && plotW >= 360 && plotH >= 240;
      var gutterKeys = !cfg.labels ? [] : cfg.lines ? (inPlotAll ? Store.groups : keys) : cfg.byCondition ? Store.groups : [];
      var inPlotData = inPlotAll ? ['all'] : [];

      var lx = plotW + 10;
      var ends = gutterKeys.map(function (k) {
        var c = cor[k];
        return [x(c.xmax), y(c.intercept + c.slope * c.xmax)];
      });
      var placed = spread(ends.map(function (e) { return e[1]; }), 14, plotH - 18, 37);
      var at = {};
      gutterKeys.forEach(function (k, i) { at[k] = { ly: placed[i], ex: ends[i][0], ey: ends[i][1] }; });

      var nameOf = function (k) { return k === 'all' ? 'Overall' : Store.labels[k]; };
      var colorOf = function (k) { return k === 'all' ? (cfg.byCondition ? C.ghost : C.ink) : C[k]; };
      var keyMid = -5;
      var placeLeader = function (sel) {
        return sel.attr('stroke', colorOf).attr('x1', function (k) { return at[k].ex + 4 - lx; })
          .attr('y1', function (k) { return at[k].ey - at[k].ly; }).attr('x2', -2).attr('y2', keyMid);
      };

      var labels = f.layer('labels').selectAll('g.dlabel').data(gutterKeys, String).join(
        function (enter) {
          var g = enter.append('g').attr('class', 'dlabel').attr('transform', function (k) { return 'translate(' + lx + ',' + at[k].ly + ')'; });
          placeLeader(g.append('line').attr('class', 'leader'));
          g.append('path').attr('class', 'key');
          g.append('text').attr('class', 't-name');
          g.append('text').attr('class', 't-r').attr('y', 16);
          if (m.on) g.attr('opacity', 0);
          return g;
        },
        null,
        function (exit) { exitFade(exit, m); }
      );
      labels.attr('data-group', String);
      m.t(labels).attr('opacity', 1).attr('transform', function (k) { return 'translate(' + lx + ',' + at[k].ly + ')'; });
      labels.select('line.leader').attr('display', cfg.lines ? null : 'none');
      placeLeader(m.t(labels.select('line.leader')));
      labels.select('path.key').each(function (k) {
        var el = d3.select(this);
        if (k === 'all') {
          el.attr('d', 'M0,' + keyMid + 'H' + 12).attr('transform', null).attr('fill', 'none').attr('stroke', colorOf(k))
            .attr('stroke-width', cfg.byCondition ? 2 : 2.5).attr('stroke-dasharray', cfg.byCondition ? '3 2' : null);
        } else {
          var st = dotStyle(k, true, r * 1.05, 1);
          el.attr('d', shapePath(st.shape, r * 1.05)).attr('transform', 'translate(6,' + keyMid + ')')
            .attr('fill', st.fill).attr('stroke', st.stroke).attr('stroke-width', st.sw).attr('stroke-dasharray', null);
        }
      });
      labels.select('text.t-name').attr('x', 19).attr('fill', colorOf).text(nameOf);
      labels.select('text.t-r').attr('x', 19).text(function (k) { return rText(cfg.axesKey, k); });

      // In-plot Overall callout inside verified empty mid-left pocket (x = 17, y = 2.75).
      var inLbl = f.layer('annotations').selectAll('g.inplot-lbl').data(inPlotData, String).join(
        function (enter) {
          var g = enter.append('g').attr('class', 'inplot-lbl');
          g.append('line').attr('class', 'leader');
          g.append('text').attr('class', 't-name');
          g.append('text').attr('class', 't-r');
          if (m.on) g.attr('opacity', 0);
          return g;
        },
        null,
        function (exit) { exitFade(exit, m); }
      );
      var cxAll = x(17);
      var lineYAll = y(cor.all.intercept + cor.all.slope * 17);
      var lblYAll = y(2.9);
      inLbl.select('line.leader').attr('stroke', C.ghost).attr('x1', cxAll).attr('x2', cxAll).attr('y1', lblYAll + 19).attr('y2', lineYAll - 3);
      inLbl.select('text.t-name').attr('x', cxAll).attr('y', lblYAll).attr('text-anchor', 'middle').attr('fill', C.ghost).text('Overall');
      inLbl.select('text.t-r').attr('x', cxAll).attr('y', lblYAll + 15).attr('text-anchor', 'middle').text(rText(cfg.axesKey, 'all'));
      m.t(inLbl).attr('opacity', 1);

      // Guarantee floored x domains match axis-x cleanly even when cognitive_load is on X.
      if (flooredX) f.layer('axes').select('g.axis-x').attr('data-domain', x.domain().join(','));
    }

    function drawSplitScatter(svg, opts, cfg, m, f) {
      var W = opts.width;
      var H = opts.height;
      var ax = AXES_CFG[cfg.axesKey];
      var yFmt = Y_TICK_FMT[ax.yVar];
      var ext = d3.extent(Store.points, function (p) { return p[ax.yVar]; });
      var flooredY = ax.yFloor !== undefined;
      var yDomain = [flooredY ? ax.yFloor : ext[0] - 0.5, ext[1] + 0.5];
      var yTicksAll = d3.range(Math.ceil(yDomain[0] / 2) * 2, yDomain[1], 2);
      var tickW = measure(svg, 't-tick', yTicksAll.map(yFmt));
      var left = Math.ceil(tickW + 10);
      var stacked = W < SPLIT_STACK_BELOW;
      var order = Store.splitOrder;
      var cor = Store.stats.cor[cfg.axesKey];

      exitFade(f.layer('overlays').selectAll(':scope > *'), m);
      exitFade(f.layer('axes').selectAll('line.ref-line'), m);
      exitFade(f.layer('labels').selectAll('g.cat-row, text.t-cat, text.t-value, g.dlabel'), m);
      exitFade(f.layer('annotations').selectAll(':scope > *'), m);

      var panels = {};
      var plotH, plotW, r, xScaleOf, yScaleOf, yTicks;

      if (!stacked) {
        var gap = 18;
        var right = 8;
        var top = 58; // 18px y-title + 36px 2-line panel headers
        var bottom = 7 + 13 + 8 + 16;
        plotW = Math.max(180, W - left - right);
        plotH = Math.max(100, H - top - bottom);
        var panelW = (plotW - 2 * gap) / 3;
        r = panelW < 150 ? 2.8 : 3.2;
        var xSpan = ax.xDomain[1] - ax.xDomain[0];
        var padX = Math.ceil((ax.xPad * panelW) / xSpan + 1.3 * r + 2);
        var padY = flooredY ? Math.ceil((0.28 * plotH) / (yDomain[1] - yDomain[0]) + 1.3 * r + 2) : 0;
        var yS = d3.scaleLinear().domain(yDomain).range([plotH - padY, 0]);
        yTicks = plotH / yTicksAll.length < 24 ? yTicksAll.filter(function (v) { return v % 4 === 0; }) : yTicksAll;

        m.t(f.plot).attr('transform', 'translate(' + left + ',' + top + ')');
        order.forEach(function (g, idx) {
          var ox = idx * (panelW + gap);
          var xS = d3.scaleLinear().domain(ax.xDomain).range([padX, panelW - padX]);
          panels[g] = { g: g, ox: ox, oy: 0, w: panelW, h: plotH, x: xS, y: yS };
        });
        xScaleOf = function (g) { return panels[g].x; };
        yScaleOf = function () { return yS; };
      } else {
        var rowGap = 24;
        var topS = 42;
        var bottomS = 7 + 13 + 8 + 16;
        plotW = Math.max(120, W - left - 8);
        var totalH = Math.max(120, H - topS - bottomS);
        var rowH = (totalH - 2 * rowGap) / 3;
        plotH = totalH;
        r = 2.6;
        var xSpanS = ax.xDomain[1] - ax.xDomain[0];
        var padXS = Math.ceil((ax.xPad * plotW) / xSpanS + 1.3 * r + 2);
        var xShared = d3.scaleLinear().domain(ax.xDomain).range([padXS, plotW - padXS]);
        yTicks = flooredY ? [0, 6, 12] : [0, 4];

        m.t(f.plot).attr('transform', 'translate(' + left + ',' + topS + ')');
        order.forEach(function (g, idx) {
          var oy = idx * (rowH + rowGap);
          var padYS = flooredY ? Math.ceil((0.28 * rowH) / (yDomain[1] - yDomain[0]) + 1.3 * r + 2) : 0;
          var yPanel = d3.scaleLinear().domain(yDomain).range([oy + rowH - padYS, oy]);
          panels[g] = { g: g, ox: 0, oy: oy, w: plotW, h: rowH, x: xShared, y: yPanel };
        });
        xScaleOf = function () { return xShared; };
        yScaleOf = function (g) { return panels[g].y; };
      }

      // Panel backdrops.
      var pBg = f.layer('panels').selectAll('rect.panel-bg').data(order, String).join(
        function (enter) { return enter.append('rect').attr('class', 'panel-bg').attr('opacity', m.on ? 0 : 1); },
        null,
        function (exit) { exitFade(exit, m); }
      );
      m.t(pBg).attr('opacity', 1).attr('x', function (g) { return panels[g].ox; }).attr('y', function (g) { return panels[g].oy; })
        .attr('width', function (g) { return panels[g].w; }).attr('height', function (g) { return panels[g].h; });
      exitFade(f.layer('panels').selectAll('line.panel-rule'), m);

      // Horizontal gridlines and zero lines per panel.
      var gridItems = [];
      var zeroItems = [];
      var yTickItems = [];
      order.forEach(function (g) {
        var P = panels[g];
        zeroItems.push({ g: g, x1: P.ox, x2: P.ox + P.w, y: P.y(0) });
        yTicks.forEach(function (v) {
          if (v !== 0) gridItems.push({ id: g + ':' + v, x1: P.ox, x2: P.ox + P.w, y: P.y(v) });
          if (!stacked || g !== null) {
            if (!stacked && g !== order[0]) return;
            yTickItems.push({ id: (stacked ? g + ':' : '') + v, v: v, y: P.y(v) });
          }
        });
      });

      exitFade(f.layer('grid').selectAll('line.grid:not([data-key="sp"])'), m);
      var hGrid = f.layer('grid').selectAll('line.grid[data-key="sp"]').data(gridItems, function (d) { return d.id; }).join(
        function (enter) { return enter.append('line').attr('class', 'grid').attr('data-key', 'sp').attr('opacity', m.on ? 0 : 1); },
        null,
        function (exit) { exitFade(exit, m); }
      );
      m.t(hGrid).attr('opacity', 1).attr('x1', function (d) { return d.x1; }).attr('x2', function (d) { return d.x2; })
        .attr('y1', function (d) { return d.y; }).attr('y2', function (d) { return d.y; });

      // X-axes: one per panel on horizontal layout, or single bottom axis when stacked.
      var xAxisKeys = stacked ? [order[2]] : order;
      var xTicksPerPanel = stacked ? ax.xCompact : panels[order[0]].w < 130 ? [ax.xDomain[0], ax.xDomain[1]] : [ax.xDomain[0], Math.round((ax.xDomain[0] + ax.xDomain[1]) / 2), ax.xDomain[1]];
      exitFade(f.layer('axes').selectAll('g.axis-x').filter(function () {
        var id = this.getAttribute('data-id');
        return xAxisKeys.indexOf(id) < 0;
      }), m);
      xAxisKeys.forEach(function (g) {
        var P = panels[g];
        axisX(f, P.x, xTicksPerPanel, P.oy + P.h, { id: g, ox: P.ox, width: P.w, grid: null, edgeAlign: !stacked }, m);
      });

      // Y-axis ticks.
      var axisY = f.layer('axes').selectAll('g.axis-y').data([0]).join('g').attr('class', 'axis-y');
      axisY.attr('data-domain', yDomain.join(','));
      m.t(axisY).attr('transform', 'translate(0,0)');
      var yt = axisY.selectAll('g.tick').data(yTickItems, function (d) { return d.id; }).join(
        function (enter) {
          var g = enter.append('g').attr('class', 'tick').attr('transform', function (d) { return 'translate(0,' + d.y + ')'; });
          g.append('text').attr('class', 't-tick').attr('x', -9).attr('dy', '0.35em').attr('text-anchor', 'end');
          if (m.on) g.attr('opacity', 0);
          return g;
        },
        null,
        function (exit) { exitFade(exit, m); }
      );
      yt.attr('data-v', function (d) { return String(d.v); }).select('text').text(function (d) { return yFmt(d.v); });
      m.t(yt).attr('opacity', 1).attr('transform', function (d) { return 'translate(0,' + d.y + ')'; });

      var zeros = f.layer('axes').selectAll('line.zero').data(zeroItems, function (d) { return d.g; }).join(
        function (enter) { return enter.append('line').attr('class', 'zero').attr('opacity', m.on ? 0 : 1); },
        null,
        function (exit) { exitFade(exit, m); }
      );
      m.t(zeros).attr('opacity', 1).attr('x1', function (d) { return d.x1; }).attr('x2', function (d) { return d.x2; })
        .attr('y1', function (d) { return d.y; }).attr('y2', function (d) { return d.y; });

      axisTitle(f, 'y', [ax.yTitle], -left + 1, stacked ? -28 : -42, 'start', m);
      axisTitle(f, 'x', [ax.xTitle], plotW, plotH + 7 + 13 + 8 + 12, 'end', m);

      // 108 persistent dots placed inside their own group's panel.
      renderDots(
        f,
        function (p) {
          var P = panels[p.condition];
          return { x: P.ox + xScaleOf(p.condition)(scatterJitterX(p, ax)), y: yScaleOf(p.condition)(p[ax.yVar] + p.jy) };
        },
        function (p) {
          var st = dotStyle(p.condition, true, r, 0.88);
          st.r = r;
          return st;
        },
        m
      );

      // Trend lines per panel: dashed pooled reference + solid condition trend.
      var lineKeys = cfg.lines ? order.flatMap(function (g) { return [g + ':all', g + ':' + g]; }) : [];
      var segSplit = function (key) {
        var parts = key.split(':');
        var panelG = parts[0];
        var modelG = parts[1];
        var P = panels[panelG];
        var c = cor[modelG];
        var a = c.xmin;
        var b = c.xmax;
        return 'M' + (P.ox + P.x(a)) + ',' + P.y(c.intercept + c.slope * a) + 'L' + (P.ox + P.x(b)) + ',' + P.y(c.intercept + c.slope * b);
      };
      var isGhost = function (key) { return key.endsWith(':all'); };
      var colorKey = function (key) {
        var parts = key.split(':');
        return parts[1] === 'all' ? C.ghost : C[parts[1]];
      };
      var trends = f.layer('trends').selectAll('g.trend-g').data(lineKeys, String).join(
        function (enter) {
          var g = enter.append('g').attr('class', 'trend-g');
          g.append('path').attr('class', 'trend-halo').attr('d', segSplit);
          g.append('path').attr('class', 'trend').attr('d', segSplit);
          if (m.on) g.attr('opacity', 0);
          return g;
        },
        null,
        function (exit) { exitFade(exit, m); }
      ).order();
      trends.attr('data-group', function (k) { return k.split(':')[1]; });
      trends.select('path.trend-halo').attr('stroke', C.bg).attr('stroke-opacity', function (k) { return isGhost(k) ? 0.8 : 1; });
      trends.select('path.trend').attr('data-group', function (k) { return k.split(':')[1]; })
        .classed('ghost', isGhost).attr('stroke-dasharray', function (k) { return isGhost(k) ? '5 4' : null; });
      m.t(trends).attr('opacity', 1);
      m.t(trends.select('path.trend-halo')).attr('d', segSplit).attr('stroke-width', function (k) { return (isGhost(k) ? 1.5 : 2.5) + 3; });
      m.t(trends.select('path.trend')).attr('d', segSplit).attr('stroke', colorKey).attr('stroke-width', function (k) { return isGhost(k) ? 1.5 : 2.5; });

      // Panel headers (title + r value).
      var pHdr = f.layer('labels').selectAll('g.panel-lbl').data(order, String).join(
        function (enter) {
          var g = enter.append('g').attr('class', 'panel-lbl');
          g.append('text').attr('class', 't-panel');
          g.append('text').attr('class', 't-panel-r');
          if (m.on) g.attr('opacity', 0);
          return g;
        },
        null,
        function (exit) { exitFade(exit, m); }
      );
      pHdr.each(function (g) {
        var P = panels[g];
        var el = d3.select(this);
        if (!stacked) {
          el.select('text.t-panel').attr('x', P.ox).attr('y', -24).attr('fill', C[g]).text(Store.labels[g]);
          el.select('text.t-panel-r').attr('x', P.ox).attr('y', -8).text(cfg.lines ? rText(cfg.axesKey, g) : 'n = ' + Store.stats.groups[g].n);
        } else {
          el.select('text.t-panel').attr('x', 0).attr('y', P.oy - 6).attr('fill', C[g])
            .text(Store.labels[g] + ' · ' + (cfg.lines ? rText(cfg.axesKey, g) : 'n = ' + Store.stats.groups[g].n));
          el.select('text.t-panel-r').text('');
        }
      });
      m.t(pHdr).attr('opacity', 1);
    }

    function scatter(svg, opts, cfg) {
      var m = motion(opts);
      var f = useFrame(svg, opts, m);
      if (f.entering) m = motion({ animate: false });
      exitFade(f.layer('grid').selectAll('line.grid[data-key="sp"]'), m);
      if (cfg.split) {
        exitFade(f.layer('axes').selectAll('g.axis-x[data-id="main"]'), m);
        drawSplitScatter(svg, opts, cfg, m, f);
      } else {
        exitFade(f.layer('axes').selectAll('g.axis-x:not([data-id="main"])'), m);
        drawSingleScatter(svg, opts, cfg, m, f);
      }
    }

    function emphasize(svg, point, opts) {
      var frame = svg.select('g.frame[data-frame="story"]');
      var on = !opts.reducedMotion;
      var rings = frame.select('g.layer-emph').selectAll('g.emph').data(point ? [point] : [], function (p) { return p.i; });
      rings.exit().interrupt('emph').each(function () {
        var sel = d3.select(this).attr('class', 'emph-out');
        if (on) sel.transition('emph').duration(EMPH_MS).attr('opacity', 0).remove();
        else sel.remove();
      });
      if (!point || frame.empty()) return;
      var posMap = frame.property('__pos');
      if (!posMap || !posMap[point.i]) return;
      var q = posMap[point.i];
      var g = rings.enter().append('g').attr('class', 'emph').attr('opacity', on ? 0 : 1);
      ['emph-halo', 'emph-ring'].forEach(function (cls) {
        g.append('circle').attr('class', cls).attr('cx', q.x).attr('cy', q.y).attr('r', q.r * 2.1);
      });
      if (on) g.transition('emph').duration(EMPH_MS).attr('opacity', 1);
    }

    var lg = Store.stats.groups;
    return {
      STEP_MS: STEP_MS,
      emphasize: emphasize,
      design: function (svg, opts) {
        drawDesign(svg, opts);
      },
      gains: function (svg, opts) {
        drawBeeswarm(svg, opts, {
          metric: 'learning_gains',
          domain: [-2.5, 7.5],
          ticks: [-2, 0, 2, 4, 6],
          compactTicks: [-2, 0, 3, 6],
          tickFmt: Format.signed,
          title: 'Learning gain (post − pre points)',
          label: function (g) { return '+' + Format.num1(lg[g].learning_gains.mean); },
        });
      },
      scatterPooled: function (svg, opts) {
        scatter(svg, opts, { axesKey: 'learning_gains', byCondition: false, split: false, lines: true, labels: true });
      },
      scatterByCondition: function (svg, opts) {
        scatter(svg, opts, { axesKey: 'learning_gains', byCondition: true, split: false, lines: true, labels: true });
      },
      scatterSplit: function (svg, opts) {
        scatter(svg, opts, { axesKey: 'learning_gains', byCondition: true, split: true, lines: true, labels: true });
      },
      load: function (svg, opts) {
        drawBeeswarm(svg, opts, {
          metric: 'cognitive_load',
          domain: [0, 12],
          floored: true,
          medianRef: 2,
          ticks: [0, 3, 6, 9, 12],
          compactTicks: [0, 6, 12],
          tickFmt: Format.plain,
          title: 'Cognitive load (0–12: sum of two 0–6 items)',
          label: function (g) { return Format.num1(lg[g].cognitive_load.mean); },
        });
      },
      labScatter: function (svg, opts, state) {
        scatter(svg, opts, {
          axesKey: state.axes,
          byCondition: state.view !== 'overall',
          split: state.view === 'split',
          lines: state.lines,
          labels: true,
        });
      },
    };
  })();

  // ---------------------------------------------------------------------------------------------
  // 4. Layout
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

    settle: function (svg, el, state, animated, done) {
      var gen = (el.__settleGen = (el.__settleGen || 0) + 1);
      svg.interrupt('settle');
      if (!animated) {
        el.setAttribute('data-state', state);
        if (done) done();
        return;
      }
      el.removeAttribute('data-state');
      svg.transition('settle').duration(Charts.STEP_MS).end().then(function () {
        if (gen !== el.__settleGen) return;
        el.setAttribute('data-state', state);
        if (done) done();
      }, function () {});
    },
  };

  // ---------------------------------------------------------------------------------------------
  // 5. Narrative (6 steps)
  // ---------------------------------------------------------------------------------------------
  var Narrative = (function () {
    var S = Store.stats;
    var L = Store.labels;
    var G = Store.groups;
    var ci1 = function (c) { return Format.num1(c[0]) + ' to ' + Format.num1(c[1]); };
    var withCi = function (v) {
      return G.map(function (g) { return L[g] + ' ' + Format.num1(S.groups[g][v].mean) + ' (' + ci1(S.groups[g][v].ci) + ')'; }).join(', ');
    };
    var within = G.map(function (g) { return 'r = ' + Format.r(S.cor.learning_gains[g].r) + ' for ' + L[g]; });

    var STEPS = [
      {
        state: 'design',
        desc: 'Dot matrix of 108 participants across three conditions: ' + G.map(function (g) { return L[g] + ' ' + S.groups[g].n; }).join(', ') +
          '. VR headset and desktop saw identical Labster content; video + text used different material.',
      },
      {
        state: 'gains',
        desc: 'Beeswarm distribution of all 108 learning gains with means and 95% confidence intervals: ' + withCi('learning_gains') +
          '. VR vs. desktop difference is not statistically significant.',
      },
      {
        state: 'scatterPooled',
        desc: 'Scatter plot of presence against learning gain for all ' + S.cor.learning_gains.all.n +
          ' participants. Pooled, the trend rises: r = ' + Format.r(S.cor.learning_gains.all.r) + ' (' + Format.p(S.cor.learning_gains.all.p) + ').',
      },
      {
        state: 'scatterByCondition',
        desc: 'Scatter plot of presence against learning gain, colored by condition. Within each condition: ' +
          Format.list(within) + '; none statistically significant. Pooled, r = ' + Format.r(S.cor.learning_gains.all.r) + '.',
      },
      {
        state: 'scatterSplit',
        desc: 'Small-multiples scatter plot separating Video + text, Desktop sim, and VR headset against the pooled r = ' +
          Format.r(S.cor.learning_gains.all.r) + ' trend. Within each panel, the relationship disappears.',
      },
      {
        state: 'load',
        desc: 'Beeswarm distribution of cognitive load across 0 to 12. All three groups share a median of 2; means and 95% confidence intervals are ' +
          withCi('cognitive_load') + '.',
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
    var navBtns = Array.prototype.slice.call(figure.querySelectorAll('.story-nav button[data-jump]'));
    var svg = d3.select(wrap).append('svg').attr('class', 'chart-svg').attr('role', 'img')
      .attr('aria-labelledby', 'chart-hed chart-desc');

    var shown = -1;
    var active = -2;
    var drawn = { width: 0, height: 0 };
    var ticking = false;

    function midline() {
      if (matchMedia(WIDE).matches || matchMedia(SHORT).matches) return innerHeight / 2;
      return (figure.getBoundingClientRect().bottom + innerHeight) / 2;
    }

    function show(i, animate) {
      var s = STEPS[i];
      if (i !== shown) {
        hed.textContent = steps[i].querySelector('.card-cap-hed').textContent;
        dek.textContent = steps[i].querySelector('.card-cap-dek').textContent;
        desc.textContent = s.desc;
      }
      shown = i;
      var box = wrap.getBoundingClientRect();
      drawn = { width: box.width, height: box.height };
      var reduced = matchMedia(REDUCE).matches;
      Charts[s.state](svg, { width: box.width, height: box.height, reducedMotion: reduced, animate: animate });
      Layout.settle(svg, figure, s.state, animate && !reduced);
    }

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
        var curStep = Math.max(1, idx + 1);
        navBtns.forEach(function (btn) {
          btn.setAttribute('aria-pressed', Number(btn.dataset.jump) === curStep ? 'true' : 'false');
        });
      }
      var state = Math.max(0, idx);
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
      navBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var n = Number(btn.dataset.jump) - 1;
          var r = steps[n].getBoundingClientRect();
          window.scrollTo({ top: r.top + window.scrollY + r.height / 2 - midline(), behavior: matchMedia(REDUCE).matches ? 'auto' : 'smooth' });
        });
      });
      Layout.observe(wrap, function (box) {
        if (Math.abs(box.width - drawn.width) < 0.5 && Math.abs(box.height - drawn.height) < 0.5) return;
        show(shown, false);
      });
      if (document.fonts && document.fonts.status !== 'loaded') {
        document.fonts.ready.then(function () { show(shown, false); });
      }
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
  // 6. Lab: Evidence Lab (Overall / Overlay / Split × Presence/Load axes × Trendlines + Presets)
  // ---------------------------------------------------------------------------------------------
  var Lab = (function () {
    var REDUCE = '(prefers-reduced-motion: reduce)';
    var HIT_RADIUS = 20;
    var G = Store.groups;
    var SHORT = { High: 'VR', Medium: 'desktop', Low: 'video' };
    var AXES_META = {
      learning_gains: { x: 'presence', xName: 'presence', y: 'learning_gains', yName: 'learning gain' },
      cognitive_load: { x: 'presence', xName: 'presence', y: 'cognitive_load', yName: 'cognitive load' },
      load_vs_gain: { x: 'cognitive_load', xName: 'cognitive load', y: 'learning_gains', yName: 'learning gain' },
    };
    var PRESETS = {
      fallacy: { view: 'condition', axes: 'learning_gains', lines: 'on', pinId: null },
      load: { view: 'condition', axes: 'load_vs_gain', lines: 'on', pinId: 50 },
      p88: { view: 'condition', axes: 'learning_gains', lines: 'on', pinId: 88 },
    };

    var section = document.getElementById('lab');
    var wrap = section.querySelector('.lab-svg-wrap');
    var readout = section.querySelector('.lab-readout');
    var summary = section.querySelector('.lab-summary');
    var segs = Array.prototype.slice.call(section.querySelectorAll('.seg[role="radiogroup"]'));
    var presetBtns = Array.prototype.slice.call(section.querySelectorAll('.preset-btn[data-preset]'));
    var desc = document.createElement('p');
    desc.id = 'lab-desc';
    desc.className = 'chart-desc visually-hidden';
    wrap.appendChild(desc);
    var svg = d3.select(wrap).append('svg').attr('class', 'chart-svg lab-svg')
      .attr('role', 'group').attr('aria-labelledby', 'lab-desc').attr('tabindex', -1);

    var state = {};
    segs.forEach(function (seg) {
      state[seg.dataset.control] = seg.querySelector('[aria-checked="true"]').dataset.value;
    });
    var pinned = null;
    var hover = null;
    var moving = false;
    var placed = '';
    var drawn = { width: 0, height: 0 };

    function orderedPoints() {
      var meta = AXES_META[state.axes];
      var grpRank = { Low: 0, Medium: 1, High: 2 };
      return Store.points.slice().sort(function (a, b) {
        if (state.view === 'split' && a.condition !== b.condition) return grpRank[a.condition] - grpRank[b.condition];
        var jScale = meta.x === 'cognitive_load' ? 0.22 : 1;
        return (a[meta.x] + a.jx * jScale) - (b[meta.x] + b.jx * jScale) || a.i - b.i;
      });
    }

    var current = orderedPoints()[0];
    var reduced = function () { return matchMedia(REDUCE).matches; };
    var key = function () { return state.view + ' ' + state.axes + ' ' + state.lines; };

    function readoutText(p) {
      var meta = AXES_META[state.axes];
      var xv = meta.x === 'cognitive_load' ? Format.plain(p[meta.x]) : String(p[meta.x]);
      var yv = meta.y === 'learning_gains' ? Format.signed(p[meta.y]) : Format.plain(p[meta.y]);
      return Store.labels[p.condition] + ' · ' + meta.xName + ' ' + xv + ' · ' + meta.yName + ' ' + yv;
    }

    function summaryText() {
      var cor = Store.stats.cor[state.axes];
      if (state.view === 'overall') {
        return 'Pooled across all ' + cor.all.n + ' participants: r = ' + Format.r(cor.all.r) + ' (' + Format.p(cor.all.p) + ').';
      }
      var sig = G.filter(function (g) { return cor[g].p < 0.05; }).map(function (g) { return SHORT[g]; });
      return 'Within each condition: r = ' + G.map(function (g) { return Format.r(cor[g].r) + ' for ' + SHORT[g]; }).join(', ') +
        ' — ' + (sig.length ? Format.list(sig) : 'none') + ' statistically significant.';
    }

    function dots() {
      return svg.selectAll('g.frame:not(.exiting) .dot');
    }

    function focusVisiblePoint() {
      var el = document.activeElement;
      if (!el || !wrap.contains(el) || !el.classList.contains('dot')) return null;
      try {
        if (!el.matches(':focus-visible')) return null;
      } catch (e) {}
      return d3.select(el).datum();
    }

    function setText(el, text) {
      if (el.textContent !== text) el.textContent = text;
    }

    function syncPresetButtons() {
      presetBtns.forEach(function (btn) {
        var cfg = PRESETS[btn.dataset.preset];
        var match = state.view === cfg.view && state.axes === cfg.axes && state.lines === cfg.lines &&
          (cfg.pinId === null ? !pinned : pinned && pinned.i === cfg.pinId);
        btn.setAttribute('aria-pressed', match ? 'true' : 'false');
      });
    }

    function render() {
      var shown = hover || pinned;
      setText(readout, shown ? readoutText(shown) : '');
      Charts.emphasize(svg, moving ? null : shown || focusVisiblePoint(), { reducedMotion: reduced() });
      dots().attr('tabindex', function (p) { return p === current ? 0 : -1; })
        .attr('aria-selected', function (p) { return p === pinned ? 'true' : 'false'; });
      syncPresetButtons();
    }

    function draw(animate) {
      var box = wrap.getBoundingClientRect();
      drawn = { width: box.width, height: box.height };
      var instant = !animate || reduced();
      var order = orderedPoints();
      var rank = {};
      order.forEach(function (p, k) { rank[p.i] = k; });
      if (!current) current = order[0];

      Charts.labScatter(svg, { width: box.width, height: box.height, reducedMotion: reduced(), animate: animate }, {
        view: state.view, axes: state.axes, lines: state.lines === 'on',
      });

      var frame = svg.select('g.frame:not(.exiting)').attr('aria-hidden', null);
      frame.selectAll('g.plot > g').attr('aria-hidden', function () {
        return this.classList.contains('layer-marks') ? null : 'true';
      });
      frame.select('g.layer-marks').attr('role', 'listbox').attr('aria-label', 'Participants in the selected view');
      dots().attr('role', 'option').attr('aria-label', readoutText).attr('aria-setsize', order.length)
        .attr('aria-posinset', function (p) { return rank[p.i] + 1; });

      var meta = AXES_META[state.axes];
      var text = summaryText();
      setText(summary, text);
      setText(desc, 'Scatter plot of ' + meta.xName + ' against ' + meta.yName + ' for all ' + Store.points.length +
        ' participants, ' + (state.view === 'overall' ? 'in one color' : state.view === 'split' ? 'split into three condition panels' : 'colored by condition') +
        (state.lines === 'on' ? ', with trend lines. ' : '. ') + text);

      var where = state.view + ' ' + state.axes;
      moving = !instant && (moving || where !== placed);
      placed = where;
      render();
      Layout.settle(svg, section, key(), !instant, function () {
        moving = false;
        render();
      });
    }

    function setSeg(control, value) {
      var seg = section.querySelector('.seg[data-control="' + control + '"]');
      var btn = seg.querySelector('[data-value="' + value + '"]');
      if (!btn) return;
      seg.querySelectorAll('[role="radio"]').forEach(function (b) {
        b.setAttribute('aria-checked', b === btn ? 'true' : 'false');
        b.tabIndex = b === btn ? 0 : -1;
      });
      state[control] = value;
    }

    function check(btn, focus) {
      var seg = btn.parentNode;
      var changed = state[seg.dataset.control] !== btn.dataset.value;
      setSeg(seg.dataset.control, btn.dataset.value);
      if (focus) btn.focus();
      if (changed) draw(true);
    }

    var STEP = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    segs.forEach(function (seg) {
      var radios = Array.prototype.slice.call(seg.querySelectorAll('[role="radio"]'));
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

    presetBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cfg = PRESETS[btn.dataset.preset];
        setSeg('view', cfg.view);
        setSeg('axes', cfg.axes);
        setSeg('lines', cfg.lines);
        hover = null;
        pinned = cfg.pinId !== null ? Store.points[cfg.pinId] : null;
        if (pinned) current = pinned;
        draw(true);
      });
    });

    function pin(p) {
      pinned = p;
      if (p) current = p;
      render();
    }

    function focusPoint(p) {
      current = p;
      render();
      var el = dots().filter(function (d) { return d === p; }).node();
      if (el && document.activeElement !== el) el.focus();
    }

    function nearest(event) {
      var frame = svg.select('g.frame:not(.exiting)');
      var posMap = frame.property('__pos');
      if (!posMap) return null;
      var m = d3.pointer(event, frame.select('g.plot').node());
      var best = null;
      var bestD = HIT_RADIUS;
      Store.points.forEach(function (p) {
        var q = posMap[p.i];
        if (!q) return;
        var d = Math.hypot(q.x - m[0], q.y - m[1]);
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
      if (event.pointerType === 'touch') return;
      hover = dotOf(event.target);
      render();
    }).on('pointerleave', function () {
      hover = null;
      render();
    }).on('click', function (event) {
      var p = dotOf(event.target) || nearest(event);
      if (!p) { pin(null); return; }
      pin(p);
      focusPoint(p);
    }).on('focusin', function (event) {
      var p = dotOf(event.target);
      if (p) pin(p);
    }).on('focusout', function () {
      requestAnimationFrame(render);
    }).on('keydown', function (event) {
      var p = dotOf(event.target);
      if (!p) return;
      var order = orderedPoints();
      var k = order.indexOf(p);
      var next = { ArrowRight: k + 1, ArrowDown: k + 1, ArrowLeft: k - 1, ArrowUp: k - 1, Home: 0, End: order.length - 1 }[event.key];
      if (next === undefined) return;
      focusPoint(order[Math.max(0, Math.min(order.length - 1, next))]);
      event.preventDefault();
    });

    section.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      hover = null;
      pin(null);
    });

    function init() {
      draw(false);
      summary.setAttribute('aria-live', 'polite');
      Layout.observe(wrap, function (box) {
        if (Math.abs(box.width - drawn.width) < 0.5 && Math.abs(box.height - drawn.height) < 0.5) return;
        draw(false);
      });
      if (document.fonts && document.fonts.status !== 'loaded') {
        document.fonts.ready.then(function () { draw(false); });
      }
    }

    return { init: init };
  })();

  // ---------------------------------------------------------------------------------------------
  // 7. Cite: APA citation copy button
  // ---------------------------------------------------------------------------------------------
  var Cite = (function () {
    var btn = document.getElementById('copy-cite');
    var CITE = 'Savvides, P. (2018). Teaching Science Lab Safety: Are Virtual Simulations Effective? (Doctoral dissertation, Arizona State University).';
    var timer = 0;

    function done() {
      if (!btn) return;
      btn.textContent = 'Citation copied';
      clearTimeout(timer);
      timer = setTimeout(function () {
        btn.textContent = 'Copy APA citation';
      }, 2400);
    }

    function init() {
      if (!btn) return;
      btn.addEventListener('click', function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(CITE).then(done, done);
        } else {
          done();
        }
      });
    }

    return { init: init };
  })();

  function start() {
    Narrative.init();
    Lab.init();
    Cite.init();
  }
  if (getComputedStyle(root).getPropertyValue('--ink').trim()) start();
  else window.addEventListener('load', start, { once: true });
})();
