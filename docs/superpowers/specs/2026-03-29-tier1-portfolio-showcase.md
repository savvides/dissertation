# Tier-1 Portfolio Showcase Spec

## Purpose and Scope

Transform the dissertation repository from a well-documented academic project into a tier-1 portfolio showcase. Focus on two dimensions: **first impressions** (a stranger lands on the GitHub page and immediately gets it) and **professional infrastructure** (CI/CD, deployment, automated checks).

This is NOT a community-building effort. No CONTRIBUTING.md, no CODE_OF_CONDUCT.md, no PR templates. The audience is people clicking a link — hiring managers, academics, peers — not potential contributors.

## Audience

Someone who clicks a link to this repo from a resume, LinkedIn, or academic profile. They have 10 seconds of attention. They need to see: what this is, why it's interesting, and a live demo link.

## Deliverables

### 1. GitHub Pages Deployment

**File:** `.github/workflows/deploy.yml`

GitHub Actions workflow that publishes the static site to GitHub Pages on every push to `main`.

- Uses `actions/upload-pages-artifact` and `actions/deploy-pages`
- No build step — uploads the root directory as-is (HTML, CSS, JS, PDF)
- Permissions: `pages: write`, `id-token: write`
- Concurrency group to prevent overlapping deployments
- Produces a deploy status badge

The site will be live at `https://<username>.github.io/dissertation/` (exact URL depends on GitHub username).

**GitHub owner placeholder:** Throughout this spec, `<owner>` appears in URLs. During implementation, resolve this by running `gh repo view --json owner -q '.owner.login'` and substituting the result.

**Note on asset paths:** The site currently uses relative paths (`style.css`, `script.js`, `Savvides_asu_0010E_18427.pdf`). These work correctly when served from a subdirectory (`/dissertation/`) because they're relative, not root-relative. No path changes needed.

### 2. CI Workflow — HTML Validation & Link Checking

**File:** `.github/workflows/ci.yml`

Lightweight CI that catches real problems in a static site.

- Triggers on push to `main` and on pull requests
- **Job 1: HTML Validation** — Uses the W3C Nu HTML Checker (`validator/vnu`) via a Docker action or npx to validate `index.html`. Catches malformed tags, accessibility issues, broken ARIA attributes.
- **Job 2: Link Checking** — Uses `lycheeverse/lychee-action` to verify all links in HTML and Markdown files. Catches broken hrefs, dead URLs. Excludes external URLs that may be flaky (fonts.googleapis.com, d3js.org CDN) via a `.lycheeignore` file or inline config.

**What is explicitly NOT included:**
- ESLint, Prettier, or any JS linting (one JS file, not worth the config)
- CSS validation (low signal, high noise)
- Lighthouse CI (overkill for this scope)
- package.json (still not needed)

### 3. README Overhaul

**File:** `README.md` (full rewrite)

Restructured as a visual showcase. New structure from top to bottom:

**Badge row:**
```
![Deploy](https://github.com/<owner>/dissertation/actions/workflows/deploy.yml/badge.svg)
![License: CC BY 4.0](https://img.shields.io/badge/License-CC_BY_4.0-lightgrey.svg)
![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
```

**Title & one-liner:**
```
# Teaching Science Lab Safety: Are Virtual Simulations Effective?
An interactive data story exploring VR, learning, and a surprising statistical fallacy.
```

**Hero screenshot:** Embedded image of the twist moment (step 4 — colorized scatter plot with three flat trendlines). Saved as `docs/screenshot.png`. This is the first visual a visitor sees.

**One-paragraph hook:** Written for a smart generalist:
> An interactive data story built from a 2018 PhD study (n=108) that tested whether VR headsets improve learning. The answer was surprising: the simulation matters, not the headset. A 2026 reanalysis uncovered an ecological fallacy hiding in the original results — a correlation that looked real at the group level but vanished within each condition.

**Live demo CTA:**
```
[**View the Interactive Story**](https://<owner>.github.io/dissertation/)
```

**"What You'll See" section:** One-line summary of each narrative step:
1. The Experiment — 108 participants, three conditions
2. The Promise — simulations work (but VR doesn't beat desktop)
3. The Deeper Question — presence as the theorized mechanism
4. The Twist — the ecological fallacy reveal
5. The Hidden Cost — cognitive load and novelty

**The Data:** Short section pointing to `data.csv` with a brief description. Mentions the 219-paper literature review in `litreview.csv`.

**Built With:** D3.js v7, vanilla CSS, no build tools. Static HTML — works from `file://`.

**Academic Details:** The existing study overview, theoretical framework, key results, literature review summary, and 2026 retrospective all move into a collapsible `<details><summary>Full Academic Details</summary>` block. Content is preserved verbatim but doesn't dominate first impressions.

**Citation & License:** Kept at the bottom. APA citation block, CC BY 4.0, committee.

### 4. Visual Assets

**Screenshot for README:**
- **File:** `docs/screenshot.png`
- Capture of step 4 (the twist) at desktop width (1280px) from the live site
- Shows the colorized scatter plot with per-condition trendlines, the gold step label, and the narrative text
- Captured via the browse tool during implementation

**Social preview image:**
- **File:** `docs/social-preview.png`
- Dimensions: 1280x640 (GitHub's recommended OG image size)
- Content: warm cream background (`#FAF8F5`), dissertation title in Playfair Display, subtitle hook in Libre Baskerville italic, a simplified or cropped version of the scatter plot visualization
- This is a static image, hand-crafted in HTML/CSS and screenshotted — not generated dynamically
- Set via `gh repo edit --description` and manually in GitHub Settings > Social preview

**OG meta tags in index.html:**
Add to `<head>`:
```html
<meta property="og:title" content="Are Virtual Simulations Effective?">
<meta property="og:description" content="An interactive data story exploring VR, learning, and a surprising statistical fallacy — built from a 2018 PhD study (n=108).">
<meta property="og:image" content="https://<owner>.github.io/dissertation/docs/social-preview.png">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
```

### 5. Repository Metadata

Set via CLI after deployment:
```bash
gh repo edit --description "An interactive data story exploring VR, learning, and a surprising statistical fallacy — built from a 2018 PhD study"
gh repo edit --add-topic data-visualization --add-topic d3js --add-topic scrollytelling --add-topic virtual-reality --add-topic education-research --add-topic interactive
```

Enable GitHub Pages in repository settings (or let the Actions workflow handle it via the `pages` environment).

## Files Created or Modified

| File | Action | Purpose |
|------|--------|---------|
| `.github/workflows/deploy.yml` | Create | GitHub Pages deployment |
| `.github/workflows/ci.yml` | Create | HTML validation + link checking |
| `README.md` | Rewrite | Visual showcase README |
| `index.html` | Modify | Add OG meta tags in `<head>` |
| `docs/screenshot.png` | Create | Hero screenshot for README |
| `docs/social-preview.png` | Create | OG social preview image |

## What Is Explicitly Out of Scope

- CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md
- Issue templates, PR templates
- package.json, ESLint, Prettier
- Lighthouse CI, CSS validation
- Branch protection rules
- Any changes to the scrolltelling site itself (style.css, script.js chart logic)
- Zenodo, DOI, CITATION.cff (academic discoverability — different goal)
