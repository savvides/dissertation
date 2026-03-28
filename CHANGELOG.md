# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-03-28

### Added
- **Interactive Scrolltelling Site**: A single-page web experience (`index.html`) using D3.js and Intersection Observer to narrate dissertation findings.
- **2026 Statistical Reanalysis**: Visualizations demonstrating the "Ecological Fallacy" in the original presence-learning correlation.
- **Serverless Execution**: Inlined `globalData` into `script.js` to allow `index.html` to run without a local web server (no CORS issues).
- **Data Conversion Utility**: `scripts/csv_to_js.js` Node.js script to reproduce the inlined data array from `data.csv`.
- **Implementation Plans & Specs**: Formal documentation of the 2026 update process in `docs/superpowers/`.

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

[2.0.0]: https://github.com/savvides/dissertation/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/savvides/dissertation/releases/tag/v1.0.0
