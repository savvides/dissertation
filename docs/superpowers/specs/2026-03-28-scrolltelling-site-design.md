# Dissertation Interactive Scrolltelling Site Design

## Purpose and Scope
Create a single-page, interactive "scrolltelling" website that presents the findings of the 2018 dissertation ("Teaching Science Lab Safety: Are Virtual Simulations Effective?") and the critical insights from the 2026 retrospective. The goal is to visually guide the reader through the original findings and the subsequent reanalysis, culminating in the "aha!" moment regarding the presence ecological fallacy.

## Architecture & Tech Stack
- **Core:** Single-page HTML (`index.html`), Vanilla JavaScript (`script.js`), and Vanilla CSS (`style.css`). No build tools required.
- **Data Visualization:** Chart.js (or D3.js) loaded via CDN for handling smooth data transitions and rendering the statistical findings.
- **Scroll Tracking:** Intersection Observer API to detect active text sections and trigger chart updates.
- **Data Source:** Fetch and parse the existing `data.csv` on load to drive the visualizations dynamically.

## Layout & Interactions
- **Desktop:** A 50/50 split view. The left column contains scrollable narrative text broken into steps. The right column contains a sticky, fixed chart container.
- **Mobile:** The chart container uses `position: sticky` to pin to the top of the viewport, while the narrative text scrolls beneath it in a single column.
- **Transitions:** As the user scrolls into a new text section, the chart smoothly animates (morphs) to display the relevant data for that section.

## Narrative & Visual Flow
1. **Introduction:** Briefly explains the study (108 participants, 3 conditions). Chart shows the participant breakdown.
2. **Key Results (Learning):** Explains that simulations work. Chart animates to a bar chart showing the massive learning gains of VR/Desktop vs. Low Immersion.
3. **The Presence Hypothesis:** Explains the initial theory (higher presence = higher learning). Chart transitions to a single scatter plot showing a strong overall positive correlation (r = .506).
4. **The 2026 Retrospective (The Twist):** Explains the ecological fallacy. The scatter plot splits into three distinct clusters colored by condition, showing that the correlation disappears within each condition.
5. **Cognitive Load & Novelty:** Discusses why VR might have had higher cognitive load. Chart transitions to show cognitive load scores across conditions.

## Visual Aesthetic
- **Style:** Academic Minimalist. Clean, stark, and data-focused.
- **Typography:** Serif fonts (e.g., Georgia or Merriweather) for headings to evoke academic papers; clean serif or sans-serif for body text.
- **Color Palette:** Predominantly black and white with generous whitespace. Charts will use stark black, grey, and one muted accent color (e.g., a dark academic red or blue) solely to distinguish between the three experimental conditions.