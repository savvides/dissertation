# GEMINI.md

Project instructions for Antigravity/Gemini sessions on `savvides/dissertation`. See `CLAUDE.md` for dissertation history, file map, and addendum rules (`tests/repo.spec.js` pins `CLAUDE.md`, so keep it intact).

## Commands & Verification
- `npm ci` — install Playwright + axe-core in a fresh worktree (`chromium`/`webkit` binaries are cached in `~/Library/Caches/ms-playwright`).
- `node scripts/csv_to_js.js` — regenerate `data.js` after editing `data.csv` or stats; never hand-edit `data.js`.
- `node scripts/screenshots.js` — regenerate `docs/screenshot.png` (`1440×900`) and `docs/social-preview.png` (`1200×630`) at Step 4.
- `npx playwright test` — run all 13 projects (Chromium & WebKit × 6 viewports `320×640`–`1440×900` + `file://`).
- `npx playwright test tests/repo.spec.js --project=chromium-1440x900` — fast dead-code sweep (CSS selectors + `script.js` functions) and release-hygiene check.
- `curl -sS -H "Content-Type: text/html; charset=utf-8" -H "User-Agent: dissertation-ci-check" --data-binary @index.html "https://validator.w3.org/nu/?out=json"` — HTML5 Nu validation when local `/usr/bin/java` has no JRE for `vnu-jar`.

## Architecture & Invariants
- Unified 108-dot frame (`script.js`): all 6 narrative steps (`design`, `gains`, `scatterPooled`, `scatterByCondition`, `scatterSplit`, `load`) reuse `<g class="frame" data-frame="story">` so the 108 keyed `path.dot` nodes persist across transitions.
- Distinct D3 selection namespaces: keep single-scatter (`g.trend-g`, `g.axis-x[data-id="main"]`, `line.grid[data-key="h"|"v"]`) separate from split-panel (`g.trend-split`, `g.axis-x[data-id="Low"|"Medium"|"High"]`, `line.grid[data-key="sp"]`) so exit transitions never index split keys (`"Low:all"`) into `stats.cor`.
- Paint order inside `g.plot`: `layer-grid` must remain first child, and `layer-trends` must precede `layer-marks` (`tests/narrative.spec.js`).
- Sticky safety: never set `overflow` on `html`, `body`, `main`, or `#story` (`tests/layout.spec.js` enforces iOS sticky compatibility).

## Non-Obvious Gotchas
- SVG text overlap gate (`overlaps()` across 6 viewports): adding `stroke-width: 4px` halos expands `<text>` bounding boxes and makes tightly stacked labels (`.t-name`/`.t-r` at 15–16px) fail overlap tests — keep paint halos off multi-line scatter labels or space baselines `≥ 19px`.
- Typography & inactive-step rules (`tests/layout.spec.js`): every `<p>` in `.step:not(.step-label)`, `#coda`, `#lab`, and `footer` must compute `≥ 16px`, and inactive `.step p` must stay `opacity: 1` / `rgb(38, 38, 38)`. Use `<div>` (not `<p>`) for compact eyebrow kickers inside `#coda`.
- Collapsed `<details>` inside `.step`: hidden `<p>` children fail broad visibility checks — scope visible-prose selectors to `> p:not(.step-label)`.
- Contrast & HTML5/ARIA: keep `--high` (`#D0450C`) and `--medium` (`#2A6FDB`) text on `#FFFFFF` (`--bg`), not `--surface` (`#F7F6F2`), to stay `≥ 4.5:1`; never use `--accent` (`#FFDD33`) as text color; use `<div role="img" aria-label="...">` rather than `<figure role="img">` for inline SVG diagrams so `vnu-jar` passes cleanly.
- Scientific-claim guardrails (`tests/content.spec.js`): keep all `ABSENT` v2.1.1 phrases out of copy and keep quoted prose figures synced with `window.STUDY`.
- Public-page attribution & footer: keep AI tooling (Claude Code, Antigravity) and any "How This Was Made" section off `index.html`; `footer#about` is a 2-column grid (`Philippos Savvides, PhD` + `The Data`). Keep `HOW-IT-WAS-MADE.md` in the repo (`tests/repo.spec.js` pins it).
- Editorial style (`elements-of-style`): write page copy in active first-person voice with Oxford commas (including `Format.list()` in `script.js`), semicolons instead of non-temporal `while`, no dangling modifiers, and `mean` rather than `avg`.
- Copy-test & screenshot coupling: prose edits can require updating verbatim assertions in `tests/content.spec.js` (`PRESENT`), `tests/lab.spec.js` (`SUMMARIES`), and `tests/chart-helpers.js` (`HEADLINES`), plus rerunning `node scripts/screenshots.js` whenever Step 4 copy changes.
