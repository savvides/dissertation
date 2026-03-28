# Interactive Dissertation Site - Serverless (Static) Design

## Purpose and Scope
Convert the existing interactive dissertation presentation into a serverless (truly static) format so it can be viewed by double-clicking `index.html` on any local file system without a web server (avoiding CORS issues).

## Architecture & Tech Stack
- **Core:** The single-page architecture (`index.html`, `script.js`, `style.css`) remains.
- **Data Inlining:** The 108 rows from `data.csv` will be converted to a JavaScript array and embedded directly into `script.js`.
- **D3 Compatibility:** The logic will be updated to use the inlined `globalData` array instead of calling `d3.csv()`.
- **Initialization:** The application will initialize synchronously upon `DOMContentLoaded`.

## Changes Required
### 1. `script.js`
- **Variable Initialization:** Define `const globalData = [...]` with the complete dataset from `data.csv`.
- **Data Transformation:** The CSV strings will be converted to numeric values during the JSON conversion.
- **Refactor `init()`:** 
  - Remove the `d3.csv` fetch block.
  - Immediately call `initChart()`.
  - Immediately call `initObserver()`.

### 2. `data.csv`
- The file will be preserved in the repository for archival purposes, but will no longer be fetched by the application.

## Verification
- Double-click `index.html` in a local file browser (Chrome, Firefox, Safari).
- Verify all 5 narrative steps correctly trigger the D3 animations.
- Verify the 2026 reanalysis scatter plots (Steps 3 & 4) function with the full dataset.
- Confirm no CORS errors appear in the browser console.
