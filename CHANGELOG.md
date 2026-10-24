# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-10-24

The story, its order and the corrected 2.1.1 copy are unchanged. The page is rebuilt around them.

### Added
- **Newsroom design**: A white page with Libre Franklin for headlines and labels and Newsreader for reading text. Each condition has its own color and mark shape (VR a filled circle, desktop an open ring, video and text a diamond) and is labeled directly on the charts, so no chart relies on color alone.
- **Hero strip**: 108 marks grouped by condition (35, 36 and 37), one per participant: three rows on phones, three columns on wider screens.
- **Chart captions**: Each step has a headline and a dek above its chart, and each chart has a text description that updates for screen readers.
- **Responsive layout**: Charts redraw at their measured width from 320px to 1920px. On phones the chart sits in a sticky band above the text; on short landscape phones it pins to the left beside it.
- **Evidence Lab readout**: Hover, tap or focus a dot (or arrow through them with the keyboard) to see that participant's values in a readout below the chart, plus a summary sentence generated from the statistics.
- **`data.js`**: Generated from `data.csv` by `scripts/csv_to_js.js` with the points, labels and every statistic the page shows (means, 95% confidence intervals, correlations and p values). The browser calculates nothing.
- **Test suite**: Playwright tests in Chromium and WebKit at six viewports plus a `file://` run, including axe-core accessibility, contrast and color-vision checks, interrupted-transition stress cases, keyboard-only use of the Lab and a d3-unavailable fallback. CI runs them in a new `test` job.
- **`scripts/screenshots.js`**: Regenerates `docs/screenshot.png` and `docs/social-preview.png` from the live page.
- **README and docs**: A Development section, an updated "What You'll See" and "Built With", and a file map and command list in `CLAUDE.md`.

### Changed
- **d3**: Now self-hosted (`vendor/d3.v7.9.0.min.js`, with its license) instead of loaded from jsDelivr.
- **Charts**: Redrawn live with D3 on every step, with named transitions so a hover can't interrupt a step change, and with reduced-motion support.
- **Evidence Lab**: Rebuilt as three segmented controls (View, Y-axis, Trendlines) with a cognitive-load axis that starts at 0.
- **Lab chart semantics**: The Lab chart is a named `role="group"`, not `role="img"` like the narrative chart, because it contains focusable dots and axe's nested-interactive rule forbids focusable content inside an img.
- **Images**: `docs/screenshot.png` is now 1440×900 and `docs/social-preview.png` is exactly 1200×630, both showing step 4.
- **Docs**: The visual-design step in `HOW-IT-WAS-MADE.md` describes the Newsroom direction.
- **CI**: Runs on pull requests into any branch and on manual dispatch, and retries a failed test once on CI. Deploy still runs only after CI passes on a push to `main`.

### Removed
- **Old design**: The warm gold palette and serif display type, the reading progress bar, and the floating hover tooltips.
- **Inlined data**: The 108-row `globalData` array that was inlined at the top of `script.js`.
- **jsDelivr script tag** and its Subresource Integrity hash.

### Fixed
- **Step activation** on short and narrow viewports, in both directions, in Chromium and WebKit.
- **Interrupted transitions**: A hover during a step change no longer leaves stale dots or wrong fills.
- **Horizontal overflow** from tooltips and the rightmost Lab dot.
- **Fixed-size charts**: Text stays at least 12px and each chart fits its container after a resize or rotation, including at 320px.
- **d3 failure**: If d3 can't load, the text and coda stay readable and the chart areas show a note instead of erroring.
- **Accessibility**: Focus rings on every interactive element, 44px control targets, text contrast of at least 4.5:1, landmark structure, and a text alternative for every chart.

## [2.1.1] - 2026-10-24

### Fixed
- **Page claims**: Step 1 now describes the control condition accurately (different content, not just less immersion); step 2 describes the actual outcome measure (a 10-item lab-safety knowledge test) instead of procedural knowledge and transfer; step 4 credits the pooled trend to both simulation groups; step 5 and the coda present novelty cost as an untested hypothesis, since cognitive-load differences were not significant.
- **Step triggering**: Steps now activate at the viewport midline, so the chart works on landscape phones and short windows (previously blank at 844×390 and skipped step 4 at 800×600).
- **README and docs**: Removed overstated and unsourced claims, labeled dissertation-reported figures, deduplicated literature-search counts, and corrected the page count and file map.
- **dissertation.md**: Tables 6 and 7 now match the PDF; the 2019–2026 addendum no longer treats the non-significant cognitive-load difference as a finding.
- **Favicon**: Added an inline favicon, removing a 404 on every page load.
- **Evidence Lab**: Rapid toggle clicks are no longer dropped, and a stale static aria-label that drifted out of sync with the chart was removed.
- **Footer**: Removed an inaccurate author bio from the About column.

### Changed
- **d3**: Pinned to 7.9.0 on jsDelivr with a Subresource Integrity hash.
- **CI/CD**: Deploy now runs only after CI passes; `vnu-jar` and `lychee-action` are pinned. Also includes the 2026-04-27 CI fixes (switch to the `vnu-jar` npm package; exclude linkedin.com from link checks). The link check now excludes claude.ai, which serves a Cloudflare bot challenge to non-browser clients.

## [2.1.0] - 2026-04-25

### Added
- **Evidence Lab**: Interactive scatter plot at the end of the narrative letting visitors toggle between overall and by-condition views, switch the Y-axis between learning gains and cognitive load, and show or hide regression lines. Replays the ecological fallacy reveal on demand.
- **Personal coda**: Replaced the academic summary with a first-person reflection, leading "Eight years later, I found a fallacy hiding in my own data."
- **Professional footer (`#about`)**: Three-column footer linking to the HOW-IT-WAS-MADE write-up, LinkedIn, and the open dataset (data.csv + dissertation PDF, CC BY 4.0).
- **Deployment and CI**: GitHub Pages deploy workflow, plus a CI workflow that validates the HTML and checks links.
- **Social sharing**: Open Graph and Twitter meta tags, a README hero screenshot, and a social preview image.
- **Write-up**: `HOW-IT-WAS-MADE.md`, documenting how the site was built.

### Changed
- **Mobile narrative chart**: Reduced sticky chart height from 50vh to 40vh so steps have more room to breathe at small viewports.
- **Editorial redesign**: Restructured the narrative into a hero, five steps and a coda; restyled with a warm editorial type and color system; polished the bar and scatter charts (rounded bars, staggered animation, hover tooltips); added a reading progress bar and a fading scroll indicator.

### Fixed
- **Mobile narrative readability**: Added an opaque background to the sticky chart container so step text no longer scrolls visibly behind the chart at narrow widths.

## [2.0.0] - 2026-03-28

### Added
- **Interactive Scrolltelling Site**: A single-page web experience (`index.html`) using D3.js and Intersection Observer to narrate dissertation findings.
- **2026 Statistical Reanalysis**: Visualizations demonstrating the "Ecological Fallacy" in the original presence-learning correlation.
- **Serverless Execution**: Inlined `globalData` into `script.js` to allow `index.html` to run without a local web server (no CORS issues).
- **Data Conversion Utility**: `scripts/csv_to_js.js` Node.js script to reproduce the inlined data array from `data.csv`.
- **Study Data**: De-identified dataset (`data.csv`) for the 108 study participants, published with the repository on 2026-03-26.

### Changed
- **Visual Aesthetic**: Implemented "Academic Minimalist" design (serif headers, clean whitespace) for the interactive presentation.
- **D3.js Implementation**: Transitioned from async `d3.csv` fetching to synchronous, inlined data joins for improved performance and portability.

### Fixed
- Fixed CORS issues when viewing the dissertation results from a local file system.
- Corrected the presence narrative to acknowledge reanalysis findings where the overall correlation disappears within conditions.

## [1.0.0] - 2018-12-15

### Added
- **Original Dissertation**: PhD Dissertation "Teaching Science Lab Safety: Are Virtual Simulations Effective?" (Savvides, 2018).
- **Literature Review (2018)**: Citations and analysis covering VR in science education through 2018.

[3.0.0]: https://github.com/savvides/dissertation/compare/v2.1.1...v3.0.0
[2.1.1]: https://github.com/savvides/dissertation/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/savvides/dissertation/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/savvides/dissertation/releases/tag/v2.0.0
