# Dissertation Interactive Scrolltelling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page interactive scrolltelling site to present the 2018 dissertation findings and 2026 reanalysis.

**Architecture:** A static HTML/JS page using Intersection Observer to detect scroll position, which triggers D3.js to update and smoothly morph a fixed chart based on the parsed `data.csv`.

**Tech Stack:** Vanilla HTML/JS/CSS, D3.js (via CDN).

---

### Task 1: Project Skeleton & Styling

**Files:**
- Create: `index.html`
- Create: `style.css`
- Create: `script.js`

- [ ] **Step 1: Write the HTML skeleton**
Write `index.html` with a two-column layout (`#text-column` and `#chart-container`). Include D3.js via CDN (`<script src="https://d3js.org/d3.v7.min.js"></script>`). Create the narrative sections (`<div class="step" data-step="X">`) for the 5 steps outlined in the spec.

- [ ] **Step 2: Write the CSS**
Write `style.css` implementing the Academic Minimalist design. Serif headers, sans-serif body. Implement the 50/50 desktop split using CSS Grid or Flexbox, and `position: sticky` on the `#chart-container`. On mobile, ensure the chart pins to the top and text scrolls underneath. Add a stark color palette (mostly black/white, with dark red/blue/grey for the 3 conditions).

- [ ] **Step 3: Setup empty script**
Write `script.js` with an empty `init()` function that runs on `DOMContentLoaded`.

- [ ] **Step 4: Verify visually**
Start a local server (e.g., `python3 -m http.server 8000`) and manually check the browser to ensure the layout is sticky and scrolling correctly.

- [ ] **Step 5: Commit**
```bash
git add index.html style.css script.js
git commit -m "feat: setup basic scrolltelling layout and styling"
```

### Task 2: Data Loading & Intersection Observer

**Files:**
- Modify: `script.js`

- [ ] **Step 1: Load Data**
In `script.js`, use `d3.csv('data.csv')` to load and parse the data. Convert numerical fields (learning_gains, presence, cognitive_load) to numbers.

- [ ] **Step 2: Implement Intersection Observer**
Create an `IntersectionObserver` to track the `.step` elements. When a step intersects the viewport (e.g., threshold: 0.5), update an active state and call a stubbed `updateChart(stepIndex)` function.

- [ ] **Step 3: Add console logging to verify**
Make `updateChart(stepIndex)` log the step index to the console to verify the observer triggers correctly as you scroll.

- [ ] **Step 4: Verify logic**
Scroll through the page and check the browser console to confirm `updateChart()` logs steps 0 through 4 correctly.

- [ ] **Step 5: Commit**
```bash
git add script.js
git commit -m "feat: add data loading and scroll observer"
```

### Task 3: D3 Base Setup & Step 1 (Participant Breakdown)

**Files:**
- Modify: `script.js`

- [ ] **Step 1: Initialize D3 SVG**
In `script.js`, set up the D3 SVG canvas inside `#chart-container`. Define margins, width, and height. Create empty `<g>` groups for the x-axis, y-axis, and main content.

- [ ] **Step 2: Implement Step 1 Drawing Logic**
In `updateChart()`, if `stepIndex === 0`, draw a bar chart showing the count of participants per condition. Compute the aggregates using D3. Implement standard axis updates with transitions.

- [ ] **Step 3: Clean up elements**
Ensure D3's `.join()` or explicit `.enter().append()` and `.exit().remove()` is used so old chart elements from other steps (which we'll build later) can be smoothly transitioned or removed.

- [ ] **Step 4: Verify visually**
Reload the page and verify the bar chart renders correctly on load (Step 0/1).

- [ ] **Step 5: Commit**
```bash
git add script.js
git commit -m "feat: add d3 setup and step 1 participant chart"
```

### Task 4: Step 2 & 5 (Learning Gains & Cognitive Load Bar Charts)

**Files:**
- Modify: `script.js`

- [ ] **Step 1: Implement Step 2 Drawing Logic**
In `updateChart()`, if `stepIndex === 1`, draw a bar chart showing average `learning_gains` by condition. Since this is also a bar chart (like step 1), use D3 transitions to smoothly morph the bars and axes from the count data to the learning gains data.

- [ ] **Step 2: Implement Step 5 Drawing Logic**
If `stepIndex === 4`, draw a bar chart showing average `cognitive_load` by condition. (We skip straight to step 5 here because it shares the bar chart format).

- [ ] **Step 3: Verify visually**
Scroll between Step 1, 2, and 5 to verify the bars smoothly animate their heights and the axes update. (We will handle steps 3 and 4 next).

- [ ] **Step 4: Commit**
```bash
git add script.js
git commit -m "feat: add step 2 and 5 bar charts"
```

### Task 5: Step 3 & 4 (The Presence Hypothesis Scatter Plot)

**Files:**
- Modify: `script.js`

- [ ] **Step 1: Implement Step 3 Logic (Overall Correlation)**
If `stepIndex === 2`, remove the bars and draw a scatter plot. X-axis = `presence`, Y-axis = `learning_gains`. Draw all 108 points in a single neutral color. Draw a single trendline representing the overall correlation.

- [ ] **Step 2: Implement Step 4 Logic (Ecological Fallacy)**
If `stepIndex === 3`, keep the same scatter plot but transition the points to be colored by their `condition`. Remove the overall trendline and draw three separate trendlines (one for each condition), visually demonstrating the ecological fallacy.

- [ ] **Step 3: Add smooth transitions**
Ensure the transitions between the bar charts (Step 2) and the scatter plot (Step 3) are graceful (e.g., fading bars out, fading points in), and the transition from Step 3 to Step 4 involves a smooth color change and trendline morph.

- [ ] **Step 4: Verify visually**
Scroll down the entire page. Ensure the narrative flows and the charts update exactly as specified in the spec.

- [ ] **Step 5: Commit**
```bash
git add script.js
git commit -m "feat: add step 3 and 4 scatter plots and transitions"
```