# Tier-1 Portfolio Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the dissertation repo into a tier-1 portfolio showcase with GitHub Pages deployment, CI, a visual README, and social preview assets.

**Architecture:** Add two GitHub Actions workflows (deploy + CI), rewrite README.md as a visual showcase, add OG meta tags to index.html, and capture screenshot/social-preview assets via headless browser.

**Tech Stack:** GitHub Actions, GitHub Pages, W3C Nu HTML Checker, Lychee link checker, shields.io badges

**Spec:** `docs/superpowers/specs/2026-03-29-tier1-portfolio-showcase.md`

**GitHub owner:** `savvides`
**Pages URL:** `https://savvides.github.io/dissertation/`

---

## File Map

| File | Role | Action |
|------|------|--------|
| `.github/workflows/deploy.yml` | GitHub Pages deployment | Create |
| `.github/workflows/ci.yml` | HTML validation + link checking | Create |
| `README.md` | Visual showcase README | Rewrite |
| `index.html` | OG meta tags | Modify (add 5 meta tags to `<head>`) |
| `docs/screenshot.png` | Hero screenshot for README | Create (captured via browse) |
| `docs/social-preview.png` | OG social preview image | Create (built in HTML, screenshotted) |

---

### Task 1: GitHub Pages Deployment Workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create the workflow directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Write the deploy workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: .

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Pages deployment workflow"
```

---

### Task 2: CI Workflow — HTML Validation & Link Checking

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write the CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate-html:
    name: Validate HTML
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install vnu
        run: |
          sudo apt-get update -qq
          sudo apt-get install -y -qq default-jre
          curl -sL https://github.com/validator/validator/releases/latest/download/vnu.jar_dist.zip -o vnu.zip
          unzip -q vnu.zip

      - name: Validate HTML
        run: java -jar dist/vnu.jar --errors-only index.html

  check-links:
    name: Check Links
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Check links
        uses: lycheeverse/lychee-action@v2
        with:
          args: --exclude fonts.googleapis.com --exclude fonts.gstatic.com --exclude d3js.org --exclude localhost --no-progress index.html README.md
          fail: true
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add HTML validation and link checking workflow"
```

---

### Task 3: OG Meta Tags in index.html

**Files:**
- Modify: `index.html` (add meta tags inside `<head>`, after the existing `<meta name="description">` tag)

- [ ] **Step 1: Add OG and Twitter meta tags**

In `index.html`, after line 6 (`<meta name="description" ...>`), add:

```html
    <meta property="og:title" content="Are Virtual Simulations Effective?">
    <meta property="og:description" content="An interactive data story exploring VR, learning, and a surprising statistical fallacy — built from a 2018 PhD study (n=108).">
    <meta property="og:image" content="https://savvides.github.io/dissertation/docs/social-preview.png">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
```

- [ ] **Step 2: Verify no syntax errors**

Open `index.html` and confirm the `<head>` section has all meta tags in valid order, no unclosed tags.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add OG and Twitter meta tags for social sharing"
```

---

### Task 4: Capture Screenshot for README

**Files:**
- Create: `docs/screenshot.png`

This task captures a screenshot of the twist moment (step 4) at desktop width for use as the hero image in the README.

- [ ] **Step 1: Start a local server and navigate to the site**

```bash
cd /Users/philippossavvides/Desktop/GitHub/dissertation
python3 -m http.server 8765 &
```

Using the browse tool:
```bash
$B viewport 1280x800
$B goto "http://localhost:8765/index.html"
```

- [ ] **Step 2: Scroll to step 4 (The Twist) and wait for animations**

```bash
$B scroll ".step[data-step='4']"
```

Wait 2 seconds for chart animations to complete.

- [ ] **Step 3: Take a screenshot of the chart and narrative together**

```bash
$B screenshot --viewport /Users/philippossavvides/Desktop/GitHub/dissertation/docs/screenshot.png
```

This captures the full viewport showing the step 4 narrative on the left and the colorized scatter plot on the right.

- [ ] **Step 4: Stop the server**

```bash
kill %1
$B stop
```

- [ ] **Step 5: Verify the screenshot exists and looks correct**

```bash
ls -la docs/screenshot.png
```

Use the Read tool on `docs/screenshot.png` to visually confirm it shows the twist moment with colorized dots and per-condition trendlines.

- [ ] **Step 6: Commit**

```bash
git add docs/screenshot.png
git commit -m "docs: add hero screenshot of the ecological fallacy reveal"
```

---

### Task 5: Create Social Preview Image

**Files:**
- Create: `docs/social-preview.png`

Build a 1280x640 OG image using HTML/CSS rendered in the headless browser, then screenshot it.

- [ ] **Step 1: Create a temporary HTML file for the social preview**

Write `/tmp/social-preview.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital@0;1&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            width: 1280px;
            height: 640px;
            background: #FAF8F5;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Playfair Display', Georgia, serif;
            color: #2D2A26;
            overflow: hidden;
        }
        .container {
            text-align: center;
            max-width: 900px;
            padding: 0 3rem;
        }
        .label {
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            color: #C4A35A;
            margin-bottom: 1.5rem;
        }
        h1 {
            font-size: 52px;
            font-weight: 700;
            line-height: 1.2;
            margin-bottom: 1.5rem;
        }
        .subtitle {
            font-family: 'Libre Baskerville', Georgia, serif;
            font-style: italic;
            font-size: 22px;
            opacity: 0.8;
            margin-bottom: 2rem;
        }
        .author {
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            opacity: 0.5;
            letter-spacing: 0.03em;
        }
        .accent-line {
            width: 60px;
            height: 3px;
            background: #C4A35A;
            margin: 0 auto 2rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="accent-line"></div>
        <h1>Are Virtual Simulations Effective?</h1>
        <p class="subtitle">108 participants. Three conditions. One surprising fallacy.</p>
        <p class="author">Philippos Savvides &middot; Arizona State University &middot; 2018</p>
    </div>
</body>
</html>
```

- [ ] **Step 2: Open the preview HTML and screenshot it**

Using the browse tool:
```bash
$B viewport 1280x640
$B goto "file:///tmp/social-preview.html"
```

Wait for fonts to load (2 seconds), then:
```bash
$B screenshot --viewport /Users/philippossavvides/Desktop/GitHub/dissertation/docs/social-preview.png
```

Note: if the browse tool rejects `file://`, serve it instead:
```bash
cd /tmp && python3 -m http.server 8766 &
$B goto "http://localhost:8766/social-preview.html"
$B screenshot --viewport /Users/philippossavvides/Desktop/GitHub/dissertation/docs/social-preview.png
kill %1
```

- [ ] **Step 3: Verify the social preview**

Use the Read tool on `docs/social-preview.png` to visually confirm: cream background, large title, italic subtitle, gold accent line, author attribution.

- [ ] **Step 4: Clean up and commit**

```bash
rm /tmp/social-preview.html
git add docs/social-preview.png
git commit -m "docs: add social preview image for OG sharing"
```

---

### Task 6: README Rewrite

**Files:**
- Modify: `README.md` (full rewrite)

- [ ] **Step 1: Rewrite README.md**

Replace the entire contents of `README.md` with:

````markdown
![Deploy](https://github.com/savvides/dissertation/actions/workflows/deploy.yml/badge.svg)
![License: CC BY 4.0](https://img.shields.io/badge/License-CC_BY_4.0-lightgrey.svg)
![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)

# Teaching Science Lab Safety: Are Virtual Simulations Effective?

An interactive data story exploring VR, learning, and a surprising statistical fallacy.

![The ecological fallacy reveal — dots colorized by condition show the overall correlation disappears within each group](docs/screenshot.png)

An interactive data story built from a 2018 PhD study (n=108) that tested whether VR headsets improve learning. The answer was surprising: the simulation matters, not the headset — VR and desktop produced identical outcomes (Cohen's d = 0.23) while both massively outperformed passive instruction (d > 2.4). A 2026 reanalysis uncovered an ecological fallacy hiding in the original results: a correlation that looked real at the group level vanished within each condition.

[**View the Interactive Story**](https://savvides.github.io/dissertation/)

## What You'll See

1. **The Experiment** — 108 participants randomly assigned to VR, desktop simulation, or video/text control
2. **The Promise** — Simulations work, but VR doesn't beat desktop
3. **The Deeper Question** — Presence as the theorized mechanism, with a convincing overall correlation
4. **The Twist** — The ecological fallacy reveal: color the dots by condition and the correlation disappears
5. **The Hidden Cost** — Cognitive load and the price of novelty

## The Data

The study data is included for reproducibility:

- [`data.csv`](data.csv) — De-identified data for all 108 participants: learning gains, condition, presence scores, cognitive load
- [`litreview.csv`](litreview.csv) — 219 unique peer-reviewed papers (2019–2026) from an updated literature search

## Built With

- [D3.js](https://d3js.org/) v7 for data visualization
- Vanilla CSS with an editorial design system
- No build tools — static HTML that works from `file://`

<details>
<summary><strong>Full Academic Details</strong></summary>

## Abstract

108 participants were randomly assigned to one of three conditions: high immersion (VR headset simulation), medium immersion (desktop simulation), or low immersion (video and text). Participants completed a pretest, lab safety training, posttest, presence questionnaire, cognitive load questionnaire, and a one-week follow-up test.

**Key findings:**

- Participants in high and medium immersion conditions scored significantly higher on knowledge tests at posttest and follow-up than the low immersion group
- High and medium immersion groups reported significantly higher presence scores than the low immersion group
- Higher immersion and presence correlated with higher knowledge scores
- Presence was a significant predictor of posttest knowledge scores

## Study Overview

### Research Questions

This study addressed six research questions examining the relationship between immersion level and learning:

1. Do knowledge scores differ as a function of the different modes of immersion?
2. Is there a relationship between time of test and the level of immersion?
3. Does cognitive load (NASA Task Load Index) differ across immersion levels?
4. Does presence (Witmer & Singer questionnaire) differ across immersion levels?
5. Are there significant correlations between variables?
6. Can knowledge scores be predicted from the independent variables?

### Theoretical Framework

The study draws on four theoretical perspectives:

- **Embodied Cognition** — Human cognition is connected with bodily interactions in the physical environment; VR enables gestural, congruent learning interactions
- **Cognitive Load Theory** — Working memory is limited; VR's concrete, spatially integrated content was hypothesized to reduce extraneous load and maximize germane load
- **Constructivism & Problem-based Learning** — Learners construct knowledge through active, authentic problem-solving; VR simulations afford real-world scenario practice
- **Immersion & Presence** — Immersion (shutting out real-world cues) facilitates presence (the feeling of "being there"), which may enhance learning and engagement

### Design & Method

108 university students were randomly assigned to one of three conditions:

| Condition | Immersion Level | Medium | Content |
|-----------|----------------|--------|---------|
| High | VR headset | Lenovo Mirage Solo (standalone Daydream, WorldSense tracking) | Labster Lab Safety simulation |
| Medium | Desktop computer | Standard PC | Same Labster Lab Safety simulation |
| Low | Video + text | Standard PC | CrashCourse video + safety rules handout |

Participants completed a pretest, the intervention, a posttest, presence and cognitive load questionnaires, and a one-week follow-up test. Of the 108 participants, 92 completed the follow-up.

### Key Results

- **Knowledge**: High and medium immersion groups scored significantly higher at posttest (M = 9.03 and 9.34 vs. 6.13) and follow-up (M = 8.65 and 8.94 vs. 5.80) compared to low immersion. The interaction between immersion and time of test was significant, F(3.43, 154.14) = 42.77, p < .001, partial η² = .488.
- **Presence**: High and medium immersion groups reported significantly higher presence than low immersion (M = 46.26 and 46.22 vs. 11.24, p < .001). Notably, high and medium immersion presence scores were nearly identical — a surprising finding.
- **Cognitive Load**: No significant differences across conditions, F(2,104) = 2.28, p = .107, though the VR condition had the highest mean cognitive load (M = 2.85), possibly due to the novelty of the headset interface.
- **Prediction**: The original analysis found that presence significantly improved the prediction of posttest knowledge scores (R² change = .057, p < .001). However, a 2026 reanalysis revealed this relationship is driven entirely by between-group differences — see reanalysis below.

## Updated Literature Review (2019–2026)

The original dissertation's literature review cited sources through 2018. In 2026, an updated literature review was conducted to situate the study's findings within the current state of knowledge, covering seven years of rapid growth in VR education research — accelerated by the COVID-19 pandemic, advances in consumer VR hardware (Meta Quest, Apple Vision Pro), and a maturing theoretical understanding of immersive learning.

### Method

An AI-powered academic literature search was conducted using [Consensus](https://consensus.app), yielding 219 unique peer-reviewed papers (2019–2026). Of these, 43 were selected for the addendum based on evidence quality and relevance:

- 22 meta-analyses and 57 systematic reviews in the search pool
- 38 randomized controlled trials
- 185 papers from Q1 journals (SJR quartile)

### How New Evidence Aligns with the Study

The post-2018 literature broadly validates the study's findings while providing new theoretical frameworks for interpreting them:

- **The CAMIL Model** (Makransky & Petersen, 2021) offers a theoretical framework predicting that presence mediates between immersion and learning outcomes — consistent with the original analysis, but challenged by the 2026 reanalysis
- **"Platform is not destiny"** (Johnson-Glenberg et al., 2021) — the degree of embodied interaction matters more than display technology, directly explaining the VR-desktop equivalence
- **Novelty effects** (Miguel-Alonso et al., 2024) — VR novelty contributes to reduced learning during initial experiences, supporting the cognitive load interpretation
- **Interactive simulations consistently outperform passive instruction** across meta-analyses (Pellas et al., 2021; Villena-Taranilla et al., 2022; Matovu et al., 2022)

The full addendum with all citations is in [`dissertation.md`](dissertation.md#updated-literature-review-2019-2026).

## 2026 Retrospective

In 2026, I revisited this study with fresh eyes — red-teaming the methodology and reanalyzing the original data ([`data.csv`](data.csv)) using modern statistical tools. The core finding is rock-solid: interactive simulations produced massive learning gains over passive instruction (Cohen's d > 2.4). But the theoretical claims around *why* could be made much stronger. Key issues:

- **Confounded conditions** — The low immersion group received fundamentally different content (video/text vs. interactive simulation), confounding immersion with interactivity
- **Uncontrolled time on task** — VR group spent ~10 more minutes than control (25.9 vs. 16.2 min)
- **Ceiling effect** — 69% of VR participants scored 9-10/10, compressing score differences
- **Ecological fallacy** — The overall presence-learning correlation (r = .506, p < .001) disappeared within conditions (High: r = .156, Medium: r = -.186, Low: r = .115 — all non-significant). The apparent relationship was an artifact of condition assignment.
- **Instrument validity** — The Witmer & Singer presence questionnaire was meaningless for video-watching participants (38% scored exactly zero)

</details>

## Citation

```
Savvides, P. (2018). Teaching Science Lab Safety: Are Virtual Simulations Effective?
(Doctoral dissertation, Arizona State University).
```

## Committee

- **Brian Nelson**, Chair
- **Mina Johnson-Glenberg**
- **Robert Atkinson**

## License

This work is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). You are free to share and adapt this material with appropriate attribution.
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README as visual portfolio showcase"
```

---

### Task 7: Repository Metadata

**Files:** None (CLI commands only)

This task sets repository description and topics via the GitHub CLI. It must run after pushing to the remote.

- [ ] **Step 1: Push all commits to remote**

```bash
git push origin main
```

- [ ] **Step 2: Set repository description**

```bash
gh repo edit --description "An interactive data story exploring VR, learning, and a surprising statistical fallacy — built from a 2018 PhD study"
```

- [ ] **Step 3: Add repository topics**

```bash
gh repo edit --add-topic data-visualization --add-topic d3js --add-topic scrollytelling --add-topic virtual-reality --add-topic education-research --add-topic interactive
```

- [ ] **Step 4: Verify deployment**

After pushing, the GitHub Actions deploy workflow should trigger automatically. Check status:

```bash
gh run list --workflow=deploy.yml --limit=1
```

Wait for it to complete (typically 1-2 minutes):

```bash
gh run watch --exit-status
```

Then verify the site is live:

```bash
curl -s -o /dev/null -w "%{http_code}" https://savvides.github.io/dissertation/
```

Expected: `200`

- [ ] **Step 5: Remind user to set social preview**

Print this message:
> The social preview image needs to be set manually in GitHub: go to **Settings > General > Social preview** and upload `docs/social-preview.png`. This cannot be done via the CLI.
