# Editorial Redesign: "The Mystery" Scrolltelling

## Purpose and Scope

Redesign the existing dissertation scrolltelling site from its current bare/default aesthetic into a warm editorial experience that serves both academic peers and a general audience. The narrative is restructured as a mystery arc that builds toward the ecological fallacy reveal as its climax.

This is a visual and narrative redesign of the existing single-page site. No new data, no build tools, no frameworks. The site must continue to work from `file://` (static/serverless).

## Audience

Dual audience: academic peers who expect scholarly credibility, and general readers who expect the polish and engagement of a data journalism piece (NYT, Pudding.cool). The warm editorial aesthetic bridges both.

## Architecture & Tech Stack

- **Core:** Single-page HTML (`index.html`), Vanilla JS (`script.js`), Vanilla CSS (`style.css`). No build tools.
- **Fonts:** Google Fonts loaded via `<link>` — Playfair Display (headings), Libre Baskerville (body), Inter (chart labels/UI).
- **Data Visualization:** D3.js v7 via CDN (already in use).
- **Scroll Tracking:** Intersection Observer API (already in use).
- **Data:** Inlined `globalData` array in `script.js` (already done).
- **Constraint:** Must work when opened via `file://` with no server. Google Fonts will gracefully degrade to system fonts if offline.

## Structure: 7-Section Mystery Arc

### 1. Hero (full viewport, no chart)

- Centered layout, vertically and horizontally.
- Title: *"Teaching Science Lab Safety: Are Virtual Simulations Effective?"* in large Playfair Display.
- Subtitle/hook: *"108 participants. Three conditions. One surprising fallacy."* in Libre Baskerville italic.
- Author line: *Philippos Savvides · Arizona State University · 2018* in small Inter.
- Scroll indicator: thin animated chevron or the word "Scroll" with a gentle pulse animation. Fades out once user begins scrolling.

### 2. The Experiment (step 1)

- Label: `01 — The Experiment`
- Heading: *"108 Participants, Three Worlds"*
- Narrative: Introduces the study setup with an intriguing tone. Ends with the question: "Would more immersion mean more learning?"
- Chart: Animated bar chart showing participant count per condition. Bars stagger in left-to-right.

### 3. The Promise (step 2)

- Label: `02 — The Promise`
- Heading: *"Simulations Work"*
- Narrative: Triumphant tone. VR and Desktop groups outperform control. But no significant difference between VR and Desktop.
- Chart: Bar chart of average learning gains by condition.

### 4. The Deeper Question (step 3)

- Label: `03 — The Deeper Question`
- Heading: *"But Why?"*
- Narrative: Introduces presence as the theorized mechanism. "If immersion causes presence, and presence causes learning..."
- Chart: Scatter plot of presence vs. learning gains (all dots neutral grey). Single overall trendline draws on with animation, showing a positive correlation.

### 5. The Twist (step 4) — CLIMAX

- Label: `04 — The Twist`
- Heading: *"Look Closer"*
- Narrative: Tone shifts. Explains the ecological fallacy. "The overall trend masked what was happening within each group."
- Chart animation sequence:
  1. Dots colorize by condition over ~800ms (grey → crimson/slate/blue).
  2. The single overall trendline fades out.
  3. Three per-condition trendlines draw in, each visibly flatter.
  4. The visual "oh" moment — the correlation was an artifact of group differences, not an individual-level relationship.

### 6. The Hidden Cost (step 5)

- Label: `05 — The Hidden Cost`
- Heading: *"The Price of Novelty"*
- Narrative: Cognitive load as the explanation. VR's novelty consumed cognitive resources that offset immersion benefits.
- Chart: Bar chart of average cognitive load by condition.

### 7. Coda (no chart)

- Full-width section, no sticky chart.
- Heading: *"What This Means"*
- Brief 2026 reflection paragraph: what the ecological fallacy finding means for VR in education, how the field has evolved.
- Author attribution.
- Link to the full dissertation PDF.
- Quiet, reflective close — the last page of an essay.

## Visual Design

### Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Background | Warm cream/ivory | `#FAF8F5` |
| Text | Deep warm charcoal | `#2D2A26` |
| VR (High Immersion) | Muted academic crimson | `#8B3A3A` |
| Desktop (Medium) | Warm slate | `#5C6B73` |
| Control (Low) | Deep steel blue | `#3A5A8B` |
| UI accent | Warm gold/amber | `#C4A35A` |
| Axis lines / borders | Light warm grey | `#D4CFC8` |

### Typography

| Element | Font | Weight | Size guidance |
|---------|------|--------|---------------|
| Hero title | Playfair Display | 700 | ~3rem desktop, ~2rem mobile |
| Section headings | Playfair Display | 400 | ~1.8rem |
| Section labels ("01 — ...") | Inter | 500, letterspaced | ~0.8rem, gold accent color |
| Body text | Libre Baskerville | 400 | ~1.1rem, line-height 1.7–1.8 |
| Chart titles | Libre Baskerville | 400 | ~1rem, left-aligned |
| Chart labels / axes | Inter | 400 | ~0.75rem |

### Spacing

- Generous padding around text blocks (~2–3rem).
- Wide margins — cream background breathes intentionally.
- Chart area has inner padding so elements don't crowd edges.
- Steps separated by scroll distance (current `margin-bottom: 60vh` on mobile, `padding: 50vh 0` on desktop is reasonable).

## Layout

### Desktop (≥768px)

- 50/50 split: text column left, sticky chart column right.
- Max-width ~1200px, centered.
- Chart container: `position: sticky; top: 0; height: 100vh`.
- No visible border between columns — separation via whitespace.

### Mobile (<768px)

- Single column: chart sticks to top ~40vh, text scrolls below.
- Hero stacks naturally (still full viewport).
- Reduced font sizes and padding.

## Chart Design

### General

- No border or box around chart container. Charts render directly on cream canvas.
- Chart titles: left-aligned, editorial serif (Libre Baskerville), styled like figure captions.
- Axes: thin lines in `#D4CFC8`, tick labels in Inter sans-serif.
- Subtle horizontal grid lines only (very faint) to aid value reading.
- Remove the `border-bottom` / `border-left` dividers currently on the chart container.

### Bar Charts (steps 2, 3, 6)

- Rounded top corners on bars (`rx: 3`).
- Bars animate up from baseline with left-to-right stagger (~100ms delay between bars).
- Value labels appear above bars in Inter, fade in after bars finish growing.
- Hover: bar brightens slightly, tooltip shows exact value.

### Scatter Plots (steps 4, 5)

- Dot radius: 6–7px.
- Subtle warm drop shadow on dots so they feel layered on the page.
- Step 4 (overall): all dots in warm grey (`#A39E96`). Single trendline draws on smoothly.
- Step 5 (twist): color transition over ~800ms, single trendline fades, three condition trendlines draw in. This is the key visual moment.
- Hover: dot enlarges slightly, shows participant data (condition, presence score, learning gain).

### Transitions Between Chart Types

- When switching bar → scatter or scatter → bar, outgoing elements exit (shrink/fade) before incoming elements enter.
- Brief empty moment (~200ms) between exit and enter is acceptable — gives the eye a rest.

## Micro-interactions

### Active Step Indicator

- Current step gets a gold left-border (4px, `#C4A35A`) with smooth CSS transition.
- Inactive steps have reduced opacity (~0.5) to create focus.

### Text Fade-in

- Each step's text content fades in (opacity 0→1, ~400ms) as it enters the viewport via Intersection Observer.

### Progress Bar

- Thin bar (~3px) fixed to the very top of the page.
- Gold accent color (`#C4A35A`).
- Width represents scroll progress through the entire story (0% → 100%).

### Scroll Indicator (Hero)

- Gentle pulse/bounce animation on the chevron/text.
- Fades out (opacity → 0) once user scrolls past the hero section.

## What Is Explicitly Out of Scope

- No parallax effects.
- No background images or textures.
- No click-to-explore dashboard interactivity (hover tooltips only).
- No build tools, bundlers, or frameworks.
- No new data analysis or additional charts beyond the existing 5 visualizations.
- No responsive breakpoints beyond the existing mobile/desktop split.

## Files Modified

| File | Changes |
|------|---------|
| `index.html` | Add Google Fonts links. Restructure to 7 sections (hero + 5 steps + coda). Update narrative copy. Add progress bar element. |
| `style.css` | Full restyle: new color palette, typography, spacing, hero layout, coda layout, step styling, active states, animations, progress bar. Remove borders/boxes. |
| `script.js` | Update chart rendering (rounded bars, shadows, stagger animations, hover tooltips, left-aligned titles, warm grid lines). Add progress bar scroll listener. Add hero scroll-indicator fade. Update step transitions for the twist sequence. |
