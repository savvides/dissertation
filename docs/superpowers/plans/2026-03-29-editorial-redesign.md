# Editorial Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the dissertation scrolltelling site from its bare default aesthetic into a warm editorial experience with a mystery narrative arc.

**Architecture:** Three-file static site (index.html, style.css, script.js). No build tools, no frameworks. Google Fonts via CDN link tags, D3.js v7 already loaded via CDN. Site must work from `file://`. Changes are purely visual/narrative — no new data or analysis.

**Tech Stack:** HTML5, Vanilla CSS, Vanilla JS, D3.js v7, Google Fonts (Playfair Display, Libre Baskerville, Inter)

**Spec:** `docs/superpowers/specs/2026-03-29-editorial-redesign.md`

---

## File Map

| File | Role | Action |
|------|------|--------|
| `index.html` | Page structure, narrative content, font loading | Rewrite — new 7-section structure (hero + 5 steps + coda), Google Fonts links, progress bar element |
| `style.css` | All visual styling | Rewrite — new color palette, typography, hero/coda layouts, step styling, animations, progress bar |
| `script.js` | D3 charts, scroll observer, micro-interactions | Modify — updated chart styling (rounded bars, shadows, warm colors, tooltips, stagger), progress bar listener, hero fade, twist animation sequence |

---

### Task 1: HTML — Restructure to 7-Section Layout

**Files:**
- Modify: `index.html` (full rewrite of body content and head)

- [ ] **Step 1: Rewrite `index.html`**

Replace the entire contents of `index.html` with the new 7-section structure. Key changes:
- Add Google Fonts `<link>` tags in `<head>` for Playfair Display (weights 400, 700), Libre Baskerville (400, 400 italic), and Inter (400, 500)
- Add a `<div id="progress-bar"></div>` as the first child of `<body>`
- Add a `<header id="hero">` section with title, subtitle, author line, and scroll indicator
- Restructure the 5 `.step` divs with new `data-step` values (1–5), section labels, headings, and narrative copy
- Add a `<footer id="coda">` section with heading, reflection text, author attribution, and PDF link
- Keep `<script src="script.js"></script>` at the end of body

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="An interactive scrolltelling presentation of the 2018 VR Learning Dissertation results and 2026 retrospective on presence and cognitive load.">
    <title>Are Virtual Simulations Effective? — Dissertation Results</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Libre+Baskerville:ital,wght@0,400;1,400&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
    <script src="https://d3js.org/d3.v7.min.js" defer></script>
</head>
<body>
    <div id="progress-bar"></div>

    <header id="hero">
        <h1>Teaching Science Lab Safety:<br>Are Virtual Simulations Effective?</h1>
        <p class="hook">108 participants. Three conditions. One surprising fallacy.</p>
        <p class="author">Philippos Savvides &middot; Arizona State University &middot; 2018</p>
        <div class="scroll-indicator" aria-hidden="true">
            <span>Scroll</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M7 13l5 5 5-5M7 7l5 5 5-5"/>
            </svg>
        </div>
    </header>

    <main id="scroll-container">
        <div id="text-column">
            <div class="step" data-step="1">
                <span class="step-label">01 — The Experiment</span>
                <h2>108 Participants, Three Worlds</h2>
                <p>What happens when you teach lab safety inside a virtual world instead of a classroom? To find out, 108 university students were randomly assigned to one of three conditions: a fully immersive VR headset, a desktop-based 3D simulation, or a traditional video-and-text control group. Each participant completed the same lab safety curriculum — only the level of immersion changed.</p>
                <p>Would more immersion mean more learning?</p>
            </div>

            <div class="step" data-step="2">
                <span class="step-label">02 — The Promise</span>
                <h2>Simulations Work</h2>
                <p>The initial results were encouraging. Both the VR and Desktop groups significantly outperformed the control group in procedural knowledge and knowledge transfer. Simulations — regardless of immersion level — proved to be an effective teaching tool for lab safety.</p>
                <p>But here's the catch: the VR group did not significantly outperform the Desktop group. Higher immersion didn't translate to higher learning gains. Why not?</p>
            </div>

            <div class="step" data-step="3">
                <span class="step-label">03 — The Deeper Question</span>
                <h2>But Why?</h2>
                <p>The original hypothesis centered on <em>presence</em> — the psychological sense of "being there" inside a virtual environment. The theory was elegant: higher immersion induces stronger presence, and stronger presence drives deeper learning.</p>
                <p>When we plot every participant's presence score against their learning gains, the data seems to support this. A clear positive trend emerges across all 108 participants. Case closed?</p>
            </div>

            <div class="step" data-step="4">
                <span class="step-label">04 — The Twist</span>
                <h2>Look Closer</h2>
                <p>Not quite. A 2026 reanalysis revealed something the original study missed: an <em>ecological fallacy</em>. The overall correlation between presence and learning was real — but it was an artifact of the groups, not the individuals.</p>
                <p>When we color each dot by its experimental condition, the picture changes dramatically. Within each group, the relationship between presence and learning virtually disappears. The "trend" was created by the fact that VR participants had both higher presence <em>and</em> higher learning — but one wasn't causing the other.</p>
            </div>

            <div class="step" data-step="5">
                <span class="step-label">05 — The Hidden Cost</span>
                <h2>The Price of Novelty</h2>
                <p>If presence wasn't the mechanism, what was holding VR back from outperforming desktop? The likely culprit: <em>cognitive load</em>. The VR environment was novel and complex. Participants spent mental energy simply navigating the unfamiliar interface — energy that could have been directed toward learning.</p>
                <p>"More immersive" isn't automatically "better for learning" — not until the novelty cost is accounted for.</p>
            </div>
        </div>

        <div id="chart-container">
            <!-- D3 visualizations rendered here -->
        </div>
    </main>

    <footer id="coda">
        <h2>What This Means</h2>
        <p>Eight years after the original study, the ecological fallacy finding reframes what we thought we knew about VR and learning. Presence remains a compelling psychological phenomenon, but its role as a learning mechanism is far more nuanced than early theories suggested. The field has since moved toward understanding <em>when</em> and <em>for whom</em> immersion helps — not just <em>whether</em> it does.</p>
        <p>For designers of educational VR, the lesson is practical: reduce novelty-induced cognitive load before expecting immersion to pay off. Familiarity precedes flow.</p>
        <p class="coda-attribution">
            <strong>Philippos Savvides</strong><br>
            Arizona State University, 2018<br>
            <a href="Savvides_asu_0010E_18427.pdf">Read the full dissertation (PDF)</a>
        </p>
    </footer>

    <script src="script.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify the HTML renders in a browser**

Open `index.html` via `file://` in a browser. Expect to see all 7 sections with unstyled text (styling comes in Task 2). Verify no console errors about missing resources (fonts will load if online, degrade gracefully if not).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: restructure HTML to 7-section mystery arc with hero and coda"
```

---

### Task 2: CSS — Full Visual Restyle

**Files:**
- Modify: `style.css` (full rewrite)

- [ ] **Step 1: Rewrite `style.css`**

Replace the entire contents of `style.css` with the new warm editorial design system.

```css
/* ========================================
   Editorial Redesign — Warm Academic Style
   ======================================== */

:root {
    --bg-color: #FAF8F5;
    --text-color: #2D2A26;
    --vr-color: #8B3A3A;
    --desktop-color: #5C6B73;
    --control-color: #3A5A8B;
    --accent-color: #C4A35A;
    --axis-color: #D4CFC8;
    --dot-neutral: #A39E96;

    --font-display: 'Playfair Display', Georgia, 'Times New Roman', serif;
    --font-body: 'Libre Baskerville', Georgia, serif;
    --font-ui: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

/* ---- Reset & Base ---- */

*, *::before, *::after {
    box-sizing: border-box;
}

body, html {
    margin: 0;
    padding: 0;
    font-family: var(--font-body);
    background-color: var(--bg-color);
    color: var(--text-color);
    line-height: 1.75;
    -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-display);
    font-weight: 400;
    margin-top: 0;
    line-height: 1.3;
}

a {
    color: var(--vr-color);
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 2px;
}

a:hover {
    color: var(--accent-color);
}

/* ---- Progress Bar ---- */

#progress-bar {
    position: fixed;
    top: 0;
    left: 0;
    height: 3px;
    width: 0%;
    background-color: var(--accent-color);
    z-index: 1000;
    transition: width 50ms linear;
}

/* ---- Hero Section ---- */

#hero {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 2rem;
}

#hero h1 {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 2rem;
    max-width: 700px;
    margin-bottom: 1.5rem;
    line-height: 1.25;
}

#hero .hook {
    font-family: var(--font-body);
    font-style: italic;
    font-size: 1.15rem;
    margin-bottom: 1rem;
    opacity: 0.85;
}

#hero .author {
    font-family: var(--font-ui);
    font-size: 0.85rem;
    letter-spacing: 0.03em;
    opacity: 0.6;
    margin-bottom: 3rem;
}

.scroll-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    opacity: 0.5;
    animation: pulse 2.5s ease-in-out infinite;
    transition: opacity 0.6s ease;
}

.scroll-indicator span {
    font-family: var(--font-ui);
    font-size: 0.75rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
}

.scroll-indicator.hidden {
    opacity: 0;
    pointer-events: none;
}

@keyframes pulse {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(6px); }
}

/* ---- Scrolltelling Layout ---- */

#scroll-container {
    display: flex;
    flex-direction: column-reverse;
    position: relative;
}

#text-column {
    padding: 0 1.5rem;
    z-index: 5;
}

/* ---- Steps ---- */

.step {
    padding: 3rem 1.5rem;
    margin-bottom: 60vh;
    border-left: 4px solid transparent;
    opacity: 0.4;
    transition: opacity 0.4s ease, border-color 0.4s ease;
}

.step:last-child {
    margin-bottom: 20vh;
}

.step.active {
    opacity: 1;
    border-left-color: var(--accent-color);
}

.step-label {
    display: block;
    font-family: var(--font-ui);
    font-weight: 500;
    font-size: 0.8rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent-color);
    margin-bottom: 0.75rem;
}

.step h2 {
    font-family: var(--font-display);
    font-size: 1.8rem;
    margin-bottom: 1rem;
}

.step p {
    font-size: 1.05rem;
    margin-bottom: 1rem;
}

.step p:last-child {
    margin-bottom: 0;
}

/* ---- Chart Container ---- */

#chart-container {
    position: sticky;
    top: 0;
    height: 50vh;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    padding: 1rem;
}

/* ---- Coda / Footer ---- */

#coda {
    max-width: 640px;
    margin: 0 auto;
    padding: 6rem 2rem 4rem;
    text-align: center;
}

#coda h2 {
    font-size: 1.8rem;
    margin-bottom: 1.5rem;
}

#coda p {
    font-size: 1.05rem;
    margin-bottom: 1.25rem;
    text-align: left;
}

.coda-attribution {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid var(--axis-color);
    font-family: var(--font-ui);
    font-size: 0.9rem;
    text-align: center !important;
    line-height: 1.8;
}

/* ---- Chart Tooltip ---- */

.chart-tooltip {
    position: absolute;
    background: var(--text-color);
    color: var(--bg-color);
    font-family: var(--font-ui);
    font-size: 0.75rem;
    padding: 0.4rem 0.6rem;
    border-radius: 4px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s ease;
    z-index: 100;
    white-space: nowrap;
}

/* ---- Desktop Layout ---- */

@media (min-width: 768px) {
    #hero h1 {
        font-size: 3rem;
    }

    #scroll-container {
        flex-direction: row;
        max-width: 1200px;
        margin: 0 auto;
    }

    #text-column {
        width: 50%;
        padding: 0 3rem 0 2rem;
    }

    .step {
        padding: 50vh 0;
        margin-bottom: 0;
        padding-right: 2rem;
        border-left: 4px solid transparent;
    }

    .step.active {
        border-left-color: var(--accent-color);
    }

    #chart-container {
        width: 50%;
        height: 100vh;
        padding: 2rem;
    }
}
```

- [ ] **Step 2: Verify in browser**

Open `index.html` in a browser. Verify:
- Cream background, warm charcoal text throughout
- Hero section is centered and fills the viewport with Playfair Display title
- Scroll indicator pulses gently
- Steps show gold labels, serif headings, and fade to 0.4 opacity when inactive
- Coda is centered at the bottom with a top border on the attribution
- Progress bar is a thin gold line at the top (won't move yet — JS not updated)
- Desktop: 50/50 split layout. Mobile: single column with sticky chart at top.

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "feat: full CSS restyle with warm editorial design system"
```

---

### Task 3: JS — Chart Styling Updates (Axes, Titles, Grid)

**Files:**
- Modify: `script.js`

This task updates the chart infrastructure: title positioning, axis styling, grid lines, and the color constants. No changes to bar/scatter rendering logic yet.

- [ ] **Step 1: Update CSS variable references and color constants at the top of `script.js`**

Replace the `conditionMapping` object to use the new hex values directly (D3 can't resolve CSS custom properties in SVG fill):

```js
const conditionMapping = {
    'High': { label: 'VR (High)', color: '#8B3A3A' },
    'Medium': { label: 'Desktop (Medium)', color: '#5C6B73' },
    'Low': { label: 'Control (Low)', color: '#3A5A8B' }
};
```

- [ ] **Step 2: Update `initChart()` to use new title styling**

Replace the chart title `text` element creation inside `initChart()` to be left-aligned and use the editorial serif:

```js
    svg.append('text')
        .attr('class', 'chart-title')
        .attr('x', margin.left)
        .attr('y', margin.top / 2 + 4)
        .attr('text-anchor', 'start')
        .attr('font-size', '16px')
        .attr('font-family', "'Libre Baskerville', Georgia, serif")
        .attr('fill', '#2D2A26');
```

- [ ] **Step 3: Add a helper function for horizontal grid lines after `initChart()`**

Add this function right after `initChart()`:

```js
function drawGridLines(yScale) {
    chartArea.selectAll('.grid-line').remove();
    const ticks = yScale.ticks(5);
    chartArea.selectAll('.grid-line')
        .data(ticks)
        .enter()
        .append('line')
        .attr('class', 'grid-line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', d => yScale(d))
        .attr('y2', d => yScale(d))
        .attr('stroke', '#D4CFC8')
        .attr('stroke-width', 0.5)
        .attr('opacity', 0.5);
}
```

- [ ] **Step 4: Update axis styling in `drawBarChart()` and `drawScatterPlot()`**

In both `drawBarChart()` and `drawScatterPlot()`, after each `xAxisGroup` and `yAxisGroup` transition/call, update the axis styling. After each axis call block, add:

```js
    // Style axes
    xAxisGroup.selectAll('path, line').attr('stroke', '#D4CFC8');
    xAxisGroup.selectAll('text').style('font-size', '12px').style('font-family', "'Inter', sans-serif").attr('fill', '#2D2A26');
    yAxisGroup.selectAll('path, line').attr('stroke', '#D4CFC8');
    yAxisGroup.selectAll('text').style('font-size', '12px').style('font-family', "'Inter', sans-serif").attr('fill', '#2D2A26');
```

Also add a `drawGridLines(y)` call after the y-axis is set up in both `drawBarChart()` and `drawScatterPlot()`.

- [ ] **Step 5: Update axis label font in `drawScatterPlot()`**

Update the two axis label creation blocks (`.x-label` and `.y-label`) to use Inter:

Change `style('font-size', '14px')` to `style('font-size', '12px').style('font-family', "'Inter', sans-serif")` in both the initial creation and the else-branch update for both labels.

- [ ] **Step 6: Verify in browser**

Open `index.html`. Scroll through all 5 steps. Verify:
- Chart titles are left-aligned in Libre Baskerville
- Axis labels and ticks are in Inter, with warm grey axis lines
- Faint horizontal grid lines appear behind chart data
- Condition colors match the new palette (crimson, slate, steel blue)

- [ ] **Step 7: Commit**

```bash
git add script.js
git commit -m "feat: update chart infrastructure — axes, titles, grid lines, color palette"
```

---

### Task 4: JS — Bar Chart Polish (Rounded Corners, Stagger, Hover)

**Files:**
- Modify: `script.js`

- [ ] **Step 1: Add a tooltip element to `initChart()`**

At the end of `initChart()`, add:

```js
    // Tooltip
    d3.select('#chart-container').append('div')
        .attr('class', 'chart-tooltip')
        .attr('id', 'tooltip');
```

- [ ] **Step 2: Update bar rendering in `drawBarChart()` for rounded corners and stagger**

In the `bars.enter()` block, add `rx` for rounded corners and add a stagger delay based on index. Replace the full `bars.enter()...merge(bars)` chain:

```js
    bars.enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.label))
        .attr('y', height)
        .attr('width', x.bandwidth())
        .attr('height', 0)
        .attr('rx', 3)
        .attr('fill', d => d.color)
        .on('mouseover', function(event, d) {
            d3.select(this).attr('opacity', 0.8);
            const tooltip = d3.select('#tooltip');
            tooltip.style('opacity', 1)
                .html(`<strong>${d.label}</strong><br>${metric === 'count' ? d.value + ' participants' : d.value.toFixed(2)}`);
        })
        .on('mousemove', function(event) {
            const tooltip = d3.select('#tooltip');
            const container = document.getElementById('chart-container').getBoundingClientRect();
            tooltip.style('left', (event.clientX - container.left + 12) + 'px')
                .style('top', (event.clientY - container.top - 28) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this).attr('opacity', 1);
            d3.select('#tooltip').style('opacity', 0);
        })
        .merge(bars)
        .transition()
        .duration(DURATION_LONG)
        .delay((d, i) => i * 100)
        .attr('x', d => x(d.label))
        .attr('y', d => y(d.value))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(d.value))
        .attr('rx', 3)
        .attr('fill', d => d.color);
```

- [ ] **Step 3: Update value labels to fade in after bars**

Update the `labels.enter()` chain to add a matching stagger delay plus an offset so labels appear after bars finish:

```js
    labels.enter()
        .append('text')
        .attr('class', 'bar-label')
        .attr('x', d => x(d.label) + x.bandwidth() / 2)
        .attr('y', height)
        .attr('text-anchor', 'middle')
        .attr('fill', '#2D2A26')
        .attr('font-size', '14px')
        .attr('font-family', "'Inter', sans-serif")
        .attr('font-weight', '500')
        .attr('opacity', 0)
        .text(d => metric === 'count' ? d.value : d.value.toFixed(1))
        .merge(labels)
        .transition()
        .duration(DURATION_LONG)
        .delay((d, i) => i * 100 + 300)
        .attr('x', d => x(d.label) + x.bandwidth() / 2)
        .attr('y', d => y(d.value) - 8)
        .attr('opacity', 1)
        .text(d => metric === 'count' ? d.value : d.value.toFixed(1));
```

- [ ] **Step 4: Verify in browser**

Open the site and scroll to steps 1, 2, and 5 (the bar chart steps). Verify:
- Bars have rounded top corners
- Bars animate in with a left-to-right stagger
- Value labels fade in after bars finish growing
- Hovering a bar shows a tooltip with the value and slightly dims the bar

- [ ] **Step 5: Commit**

```bash
git add script.js
git commit -m "feat: polish bar charts — rounded corners, stagger animation, hover tooltips"
```

---

### Task 5: JS — Scatter Plot Polish (Shadows, Hover, Twist Animation)

**Files:**
- Modify: `script.js`

- [ ] **Step 1: Add an SVG filter for dot drop shadow in `initChart()`**

After creating the `svg` element in `initChart()`, before creating `chartArea`, add:

```js
    // Drop shadow filter for scatter dots
    const defs = svg.append('defs');
    const filter = defs.append('filter')
        .attr('id', 'dot-shadow')
        .attr('x', '-50%').attr('y', '-50%')
        .attr('width', '200%').attr('height', '200%');
    filter.append('feDropShadow')
        .attr('dx', 0).attr('dy', 1)
        .attr('stdDeviation', 1.5)
        .attr('flood-color', '#2D2A26')
        .attr('flood-opacity', 0.15);
```

- [ ] **Step 2: Update dot rendering in `drawScatterPlot()` for hover, shadow, and twist animation**

Replace the full dot rendering section (the `dots.enter()...merge(dots)...` and `dots.exit()` block):

```js
    // 4. Draw Dots
    const dots = chartArea.selectAll('.dot')
        .data(globalData);

    dots.enter()
        .append('circle')
        .attr('class', 'dot')
        .attr('r', 6)
        .attr('cx', d => x(d.presence))
        .attr('cy', height)
        .attr('opacity', 0)
        .attr('fill', '#A39E96')
        .style('filter', 'url(#dot-shadow)')
        .on('mouseover', function(event, d) {
            d3.select(this).transition().duration(150).attr('r', 9);
            const tooltip = d3.select('#tooltip');
            const condLabel = conditionMapping[d.condition].label;
            tooltip.style('opacity', 1)
                .html(`<strong>${condLabel}</strong><br>Presence: ${d.presence}<br>Learning: ${d.learning_gains}`);
        })
        .on('mousemove', function(event) {
            const tooltip = d3.select('#tooltip');
            const container = document.getElementById('chart-container').getBoundingClientRect();
            tooltip.style('left', (event.clientX - container.left + 12) + 'px')
                .style('top', (event.clientY - container.top - 28) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this).transition().duration(150).attr('r', 6);
            d3.select('#tooltip').style('opacity', 0);
        })
        .merge(dots)
        .transition()
        .duration(isFaceted ? 800 : DURATION_LONG)
        .attr('cx', d => x(d.presence))
        .attr('cy', d => y(d.learning_gains))
        .attr('opacity', 0.75)
        .attr('fill', d => isFaceted ? conditionMapping[d.condition].color : '#A39E96');

    dots.exit().transition().duration(DURATION).attr('opacity', 0).remove();
```

- [ ] **Step 3: Verify in browser**

Scroll to steps 3 and 4 (scatter plots). Verify:
- Dots have a subtle shadow
- Hovering a dot enlarges it and shows a tooltip with condition, presence, and learning gain
- Step 3 (overall): dots are warm grey with a single trendline
- Step 4 (twist): dots colorize by condition over ~800ms, trendlines update

- [ ] **Step 4: Commit**

```bash
git add script.js
git commit -m "feat: polish scatter plots — drop shadow, hover tooltips, twist color transition"
```

---

### Task 6: JS — Progress Bar, Hero Fade, and Step Fade-in

**Files:**
- Modify: `script.js`

- [ ] **Step 1: Add progress bar scroll listener**

Add this function after the existing `initObserver()` function:

```js
function initProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    window.addEventListener('scroll', function() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBar.style.width = scrollPercent + '%';
    });
}
```

- [ ] **Step 2: Add hero scroll-indicator fade**

Add this function after `initProgressBar()`:

```js
function initHeroFade() {
    const indicator = document.querySelector('.scroll-indicator');
    if (!indicator) return;

    const hero = document.getElementById('hero');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                indicator.classList.add('hidden');
            } else {
                indicator.classList.remove('hidden');
            }
        });
    }, { threshold: 0.3 });

    observer.observe(hero);
}
```

- [ ] **Step 3: Call both new functions from `init()`**

Update the `init()` function:

```js
function init() {
    initChart();
    initObserver();
    initProgressBar();
    initHeroFade();
}
```

- [ ] **Step 4: Verify in browser**

Open the site and scroll through the full story. Verify:
- Gold progress bar at the top grows from 0% to 100% as you scroll
- Scroll indicator in the hero fades out once you scroll past the hero section
- Active step has full opacity, inactive steps are dimmed
- Steps are highlighted with a gold left border when active

- [ ] **Step 5: Commit**

```bash
git add script.js
git commit -m "feat: add progress bar, hero scroll-indicator fade, and step transitions"
```

---

### Task 7: Final Integration Verification

**Files:**
- All three files (read-only verification)

- [ ] **Step 1: Full walkthrough — desktop**

Open `index.html` in a desktop browser (width ≥ 768px). Scroll through the entire story end-to-end. Verify this checklist:

1. Hero: full viewport, centered title in Playfair Display, italic hook, author in Inter, pulsing scroll indicator
2. Progress bar: thin gold line grows across the top as you scroll
3. Scroll indicator fades out when hero scrolls out of view
4. Step 1 (Experiment): gold "01" label, bar chart with staggered animation, rounded corners, tooltips
5. Step 2 (Promise): bar chart transitions to learning gains
6. Step 3 (Deeper Question): scatter plot with grey dots, trendline draws on, axis labels in Inter
7. Step 4 (Twist): dots colorize by condition (~800ms), per-condition trendlines appear
8. Step 5 (Hidden Cost): transitions to cognitive load bar chart
9. Coda: full-width, centered text, author attribution with top border, PDF link works
10. Inactive steps are dimmed (0.4 opacity), active step has gold left border
11. No console errors

- [ ] **Step 2: Full walkthrough — mobile**

Resize to mobile width (<768px) or open on a phone. Verify:
1. Single column layout, chart sticky at top ~50vh
2. Hero stacks properly
3. All charts render correctly in the narrower container
4. Text is readable, padding is adequate

- [ ] **Step 3: Verify `file://` works**

Close any local server. Open `index.html` directly via file:// protocol. Verify no CORS errors in console. Charts and scroll behavior work. (Google Fonts may not load offline — that's expected and the fallback fonts should still look acceptable.)

- [ ] **Step 4: Commit any final fixes**

If any issues were found and fixed during verification:

```bash
git add index.html style.css script.js
git commit -m "fix: address integration issues from final walkthrough"
```
