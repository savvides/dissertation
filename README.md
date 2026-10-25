![CI](https://github.com/savvides/dissertation/actions/workflows/ci.yml/badge.svg)
![Deploy](https://github.com/savvides/dissertation/actions/workflows/deploy.yml/badge.svg)
![License: CC BY 4.0](https://img.shields.io/badge/License-CC_BY_4.0-lightgrey.svg)
![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)

# Teaching Science Lab Safety: Are Virtual Simulations Effective?

An interactive data story exploring VR, learning, and a surprising statistical fallacy.

![Step 4, "Look Closer": dots colored and shaped by condition, each group with its own weak, non-significant trend line, and a dashed line for all 108 pooled that climbs far more steeply](docs/screenshot.png)

The 2018 PhD study (n=108) asked whether VR headsets improve learning. VR did not significantly beat a desktop version of the same simulation (Cohen's d = 0.23, p = .33; the study was too small to detect a difference that size). Both simulation groups far outperformed a video-and-handout control (d > 2.4), though that comparison also changed the content and the session length. A 2026 reanalysis added something the original paper missed: the presence-learning correlation is an ecological fallacy — real at the group level, gone within each condition.

[**View the Interactive Story**](https://savvides.github.io/dissertation/)

## What You'll See

The page opens on a **hero strip**: 108 marks grouped by condition (35 VR headset, 36 desktop, 37 video and text), one mark per participant. From there, a sticky chart redraws as you scroll through five steps, then hands over to an interactive Lab.

1. **The Experiment** — 108 participants randomly assigned to VR, desktop simulation, or video/text control
2. **The Promise** — Simulations work, but VR doesn't significantly beat desktop
3. **The Deeper Question** — Presence as the theorized mechanism, with a convincing overall correlation
4. **The Twist** — The ecological fallacy reveal: color the dots by condition and the correlation disappears
5. **An Open Question** — The price of novelty? VR's cognitive load ran highest, but not significantly. The page frames novelty cost as a hypothesis the study raises, not one it confirms.
6. **The Evidence Lab** — An interactive scatter plot you can drive yourself: toggle overall vs. by-condition views, swap the y-axis between learning gains and cognitive load, and show or hide the trend lines to replay the fallacy on demand. Hover, tap or focus any dot (or arrow through them with the keyboard) and a readout shows that participant's values; a summary sentence under the chart restates the current view from the computed statistics.

The charts, their text descriptions and the Lab's readout and summary take every number from `data.js`, which `scripts/csv_to_js.js` generates from `data.csv`; the browser never calculates a statistic. The statistics quoted in the text (the hero strip's counts, step 4's within-group r values and step 5's cognitive-load figures) are written by hand, and the test suite checks them against `data.js`.

## The Data

The study data is included so the 2026 reanalysis can be reproduced:

- [`data.csv`](data.csv) — De-identified data for all 108 participants: learning gains, condition, presence scores, cognitive load
- [`litreview.csv`](litreview.csv) — Raw Consensus search export: 249 rows covering 219 unique peer-reviewed papers (30 rows are exact duplicates), published 2021–2025

## How It Was Made

This entire site was built through conversation with [Claude Code](https://claude.ai/code). Read the full story: **[How It Was Made](HOW-IT-WAS-MADE.md)**

## Built With

- [D3.js](https://d3js.org/) 7.9.0, self-hosted in `vendor/` (no CDN), redraws every chart live at its container's width
- Vanilla CSS with the "Newsroom" design system: Libre Franklin for display and UI, Newsreader for reading text
- A [Playwright](https://playwright.dev/) test suite (Chromium and WebKit, six viewports from 320px to 1440px, plus axe-core accessibility and contrast checks)
- No build tools. Static HTML that works from `file://`

## Development

```
npm ci                      # dev-only tooling: Playwright and axe-core
npx playwright install chromium webkit
npx playwright test         # the full suite; it serves the repo itself
node scripts/csv_to_js.js   # regenerate data.js after changing data.csv
node scripts/screenshots.js # regenerate docs/screenshot.png and docs/social-preview.png
```

`data.js` is generated; never edit it by hand.

<details>
<summary><strong>Full Academic Details</strong></summary>

## Abstract

108 participants were randomly assigned to one of three conditions: high immersion (VR headset simulation), medium immersion (desktop simulation), or low immersion (video and text). Participants completed a pretest, lab safety training, posttest, presence questionnaire, cognitive load questionnaire, and a one-week follow-up test.

**Key findings:**

- Participants in high and medium immersion conditions scored significantly higher on knowledge tests at posttest and follow-up than the low immersion group
- High and medium immersion groups reported significantly higher presence scores than the low immersion group
- Higher immersion and presence correlated with higher knowledge scores
- Presence was a significant predictor of posttest knowledge scores (a 2026 reanalysis found this does not hold within conditions)

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

### Key Results (as reported in the dissertation)

These figures come from the 2018 analysis, which removed outliers. Descriptives recomputed from `data.csv` differ (presence means of 44.3, 41.8 and 16.6), and outlier removal alone does not explain the gap.

- **Knowledge**: High and medium immersion groups scored significantly higher at posttest (M = 9.03 and 9.34 vs. 6.13) and follow-up (M = 8.65 and 8.94 vs. 5.80) compared to low immersion. The interaction between immersion and time of test was significant, F(3.43, 154.14) = 42.77, p < .001, partial η² = .488.
- **Presence**: High and medium immersion groups reported significantly higher presence than low immersion (M = 46.26 and 46.22 vs. 11.24, p < .001). Notably, high and medium immersion presence scores were nearly identical — a surprising finding.
- **Cognitive Load**: No significant differences across conditions, F(2,104) = 2.28, p = .107, though the VR condition had the highest mean cognitive load (M = 2.85), which the dissertation suggested might reflect the headset's novelty (not tested).
- **Prediction**: The original analysis found that presence significantly improved the prediction of posttest knowledge scores (R² change = .057, p < .001). However, a 2026 reanalysis revealed this relationship is driven entirely by between-group differences — see reanalysis below.

## Updated Literature Review (2019–2026)

The original dissertation's literature review cited sources through 2018. In 2026, an updated literature review was conducted to situate the study's findings within the current state of knowledge, drawing on papers published 2021–2025, a period of rapid growth in VR education research — accelerated by the COVID-19 pandemic, advances in consumer VR hardware (Meta Quest, Apple Vision Pro), and a maturing theoretical understanding of immersive learning.

### Method

An AI-powered academic literature search was conducted using [Consensus](https://consensus.app), yielding 219 unique peer-reviewed papers, published 2021–2025 (the raw export has 249 rows, including 30 duplicates). Of these, 43 were selected for the addendum based on evidence quality and relevance:

- 18 meta-analyses and 51 systematic reviews in the search pool
- 33 randomized controlled trials
- 164 papers from Q1 journals (SJR quartile)

### How New Evidence Aligns with the Study

The post-2018 literature is largely consistent with the study's findings while providing new theoretical frameworks for interpreting them:

- **The CAMIL Model** (Makransky & Petersen, 2021) offers a theoretical framework predicting that presence mediates between immersion and learning outcomes — consistent with the original analysis, but challenged by the 2026 reanalysis
- **"Platform is not destiny"** (Johnson-Glenberg et al., 2021) — the degree of embodied interaction matters more than display technology, consistent with the lack of a significant VR-desktop difference
- **Novelty effects** (Miguel-Alonso et al., 2024) — VR novelty contributes to reduced learning during initial experiences, consistent with, though not evidence for, the cognitive-load hypothesis
- **Evidence on VR and learning outcomes is positive but mixed** — a K-6 meta-analysis found VR outperformed control conditions (Villena-Taranilla et al., 2022); a systematic review found immersive VR can improve learning performance but flagged usability and design issues (Pellas et al., 2021); a review of immersive VR for science learning found its effect on learning outcomes unclear (Matovu et al., 2022)

The full addendum with all citations is in [`dissertation.md`](dissertation.md#updated-literature-review-2019-2026).

## 2026 Retrospective

In 2026, I went back to the original data ([`data.csv`](data.csv)) and red-teamed the methodology with newer statistical tools. The headline finding holds: the simulation groups far outperformed the video-and-handout control (Cohen's d > 2.4), though content and session length differed too. The theoretical story about *why* doesn't:

- **Confounded conditions** — The low immersion group received fundamentally different content (video/text vs. interactive simulation), confounding immersion with interactivity
- **Uncontrolled session length** — VR sessions averaged 25.9 min vs. 16.2 min for control (whole session; intervention time was not recorded separately)
- **Ecological fallacy** — The overall presence-learning correlation (r = .506, p < .001) disappeared within conditions (High: r = .156, Medium: r = -.186, Low: r = .115 — all non-significant). The apparent relationship was driven by differences between conditions.
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
