# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-04-25

### Added
- **Evidence Lab**: Interactive scatter plot at the end of the narrative letting visitors toggle between overall and by-condition views, switch the Y-axis between learning gains and cognitive load, and show or hide regression lines. Replays the ecological fallacy reveal on demand.
- **Personal coda**: Replaced the academic summary with a first-person reflection, leading "Eight years later, I found a fallacy hiding in my own data."
- **Professional footer (`#about`)**: Three-column footer linking to the HOW-IT-WAS-MADE write-up, LinkedIn, and the open dataset (data.csv + dissertation PDF, CC BY 4.0).

### Changed
- **Mobile narrative chart**: Reduced sticky chart height from 50vh to 40vh so steps have more room to breathe at small viewports.

### Fixed
- **Mobile narrative readability**: Added an opaque background to the sticky chart container so step text no longer scrolls visibly behind the chart at narrow widths.

## [2.0.0] - 2026-03-28

### Added
- **Interactive Scrolltelling Site**: A single-page web experience (`index.html`) using D3.js and Intersection Observer to narrate dissertation findings.
- **2026 Statistical Reanalysis**: Visualizations demonstrating the "Ecological Fallacy" in the original presence-learning correlation.
- **Serverless Execution**: Inlined `globalData` into `script.js` to allow `index.html` to run without a local web server (no CORS issues).
- **Data Conversion Utility**: `scripts/csv_to_js.js` Node.js script to reproduce the inlined data array from `data.csv`.

### Changed
- **Visual Aesthetic**: Implemented "Academic Minimalist" design (serif headers, clean whitespace) for the interactive presentation.
- **D3.js Implementation**: Transitioned from async `d3.csv` fetching to synchronous, inlined data joins for improved performance and portability.

### Fixed
- Fixed CORS issues when viewing the dissertation results from a local file system.
- Corrected the presence narrative to acknowledge reanalysis findings where the overall correlation disappears within conditions.

## [1.0.0] - 2018-12-15

### Added
- **Original Dissertation**: PhD Dissertation "Teaching Science Lab Safety: Are Virtual Simulations Effective?" (Savvides, 2018).
- **Study Data**: De-identified dataset (`data.csv`) for the 108 study participants.
- **Literature Review (2018)**: Citations and analysis covering VR in science education through 2018.

[2.1.0]: https://github.com/savvides/dissertation/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/savvides/dissertation/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/savvides/dissertation/releases/tag/v1.0.0
