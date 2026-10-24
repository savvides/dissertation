# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- **CI/CD**: Deploy now runs only after CI passes; `vnu-jar` and `lychee-action` are pinned. Also includes the 2026-04-27 CI fixes (switch to the `vnu-jar` npm package; exclude linkedin.com from link checks).

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

[2.1.1]: https://github.com/savvides/dissertation/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/savvides/dissertation/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/savvides/dissertation/releases/tag/v2.0.0
