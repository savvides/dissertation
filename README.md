# Teaching Science Lab Safety: Are Virtual Simulations Effective?

**Philippos Savvides** | Arizona State University | December 2018

PhD Dissertation investigating the impact of immersion on knowledge, cognitive load, and presence in virtual simulations for science lab safety training.

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

- **Embodied Cognition** -- Human cognition is connected with bodily interactions in the physical environment; VR enables gestural, congruent learning interactions
- **Cognitive Load Theory** -- Working memory is limited; VR's concrete, spatially integrated content was hypothesized to reduce extraneous load and maximize germane load
- **Constructivism & Problem-based Learning** -- Learners construct knowledge through active, authentic problem-solving; VR simulations afford real-world scenario practice
- **Immersion & Presence** -- Immersion (shutting out real-world cues) facilitates presence (the feeling of "being there"), which may enhance learning and engagement

### Design & Method

108 university students were randomly assigned to one of three conditions:

| Condition | Immersion Level | Medium | Content |
|-----------|----------------|--------|---------|
| High | VR headset | Lenovo Mirage Solo (standalone Daydream, WorldSense tracking) | Labster Lab Safety simulation |
| Medium | Desktop computer | Standard PC | Same Labster Lab Safety simulation |
| Low | Video + text | Standard PC | CrashCourse video + safety rules handout |

Participants completed a pretest, the intervention, a posttest, presence and cognitive load questionnaires, and a one-week follow-up test. Of the 108 participants, 92 completed the follow-up.

### Key Results

- **Knowledge**: High and medium immersion groups scored significantly higher at posttest (M = 9.03 and 9.34 vs. 6.13) and follow-up (M = 8.65 and 8.94 vs. 5.80) compared to low immersion. The interaction between immersion and time of test was significant, F(3.43, 154.14) = 42.77, p < .001, partial n2 = .488.
- **Presence**: High and medium immersion groups reported significantly higher presence than low immersion (M = 46.26 and 46.22 vs. 11.24, p < .001). Notably, high and medium immersion presence scores were nearly identical -- a surprising finding.
- **Cognitive Load**: No significant differences across conditions, F(2,104) = 2.28, p = .107, though the VR condition had the highest mean cognitive load (M = 2.85), possibly due to the novelty of the headset interface.
- **Prediction**: The original analysis found that presence significantly improved the prediction of posttest knowledge scores (R2 change = .057, p < .001). However, a 2026 reanalysis revealed this relationship is driven entirely by between-group differences — see [reanalysis caveats below](#2026-retrospective).

## Updated Literature Review (2019-2026)

The original dissertation's literature review cited sources through 2018. In 2026, an updated literature review was conducted to situate the study's findings within the current state of knowledge, covering seven years of rapid growth in VR education research -- accelerated by the COVID-19 pandemic, advances in consumer VR hardware (Meta Quest, Apple Vision Pro), and a maturing theoretical understanding of immersive learning.

### Method

An AI-powered academic literature search was conducted using [Consensus](https://consensus.app), yielding 219 unique peer-reviewed papers (2019-2026). Of these, 43 were selected for the addendum based on evidence quality and relevance:

- 22 meta-analyses and 57 systematic reviews in the search pool
- 38 randomized controlled trials
- 185 papers from Q1 journals (SJR quartile)

The addendum is organized into six subsections mirroring the original literature review: Simulations & Educational Virtual Environments, Applications of VR in Science Education, Immersion & Presence, Embodied Cognition, Constructivism & Problem-based Learning, and Cognitive Load Theory.

### How New Evidence Aligns with the Study

The post-2018 literature broadly validates the study's findings while providing new theoretical frameworks for interpreting them:

**The CAMIL Model offers a theoretical framework for immersive learning.** Makransky and Petersen (2021, 723 citations) proposed the Cognitive Affective Model of Immersive Learning, which identifies presence and agency as the primary psychological affordances of VR learning. The model's prediction that presence mediates between immersion and learning outcomes is consistent with the original analysis. However, a 2026 reanalysis of the study data found that the presence-learning correlation disappears within conditions (see [retrospective below](#2026-retrospective)), suggesting the relationship may be an artifact of condition assignment rather than a genuine mediating mechanism.

**"Platform is not destiny" explains the VR-desktop equivalence.** Johnson-Glenberg, Bartolomea, and Kalina (2021) demonstrated that the degree of embodied and agentic interaction matters more than the display technology. This directly explains the study's most surprising finding -- that VR headset and desktop simulation produced nearly identical presence scores and knowledge outcomes -- since both conditions used the same interactive Labster simulation.

**Novelty effects explain higher cognitive load in VR.** Miguel-Alonso, Checa, Guillen-Sanz, and Bustillo (2024) showed that the novelty of VR contributes to reduced learning during initial experiences, and that tutorials can mitigate this effect. This supports the study's interpretation that unfamiliarity with VR headsets may have increased extraneous cognitive load in the high immersion condition.

**Cognitive load in VR is more nuanced than originally hypothesized.** The study hypothesized VR would reduce extraneous load through spatially integrated content. Multiple reviews (Skulmowski & Xu, 2021; Poupard et al., 2024) have since shown that while VR can reduce split attention, the sensory richness and novelty of the medium introduce new sources of extraneous load. Albus and Seufert (2023) found that the modality effect reverses in VR, suggesting established multimedia learning principles may not transfer directly to immersive environments.

**Interactive simulations consistently outperform passive instruction.** Across meta-analyses and systematic reviews (Pellas et al., 2021; Villena-Taranilla et al., 2022; Matovu et al., 2022), the evidence confirms that interactive VR simulations produce better learning outcomes than passive methods -- consistent with the study's central finding. However, the literature suggests that instructional design quality matters more than immersion level.

The full addendum with all citations is in [`dissertation.md`](dissertation.md#updated-literature-review-2019-2026).

## 2026 Retrospective

In 2026, I revisited this study with fresh eyes — red-teaming the methodology and reanalyzing the original data ([`data.csv`](data.csv)) using modern statistical tools. The core finding is rock-solid: interactive simulations produced massive learning gains over passive instruction (Cohen's d > 2.4, confirmed by both parametric and non-parametric methods). But the theoretical claims around *why* could be made much stronger. Here's what I'd change.

**Isolate immersion from interactivity.** The low immersion group received fundamentally different content (a video and text) while the simulation groups received the same interactive Labster simulation on different displays. This confounds immersion level with interactivity. A stronger design would use three versions of the same simulation at different immersion levels, or add a non-interactive VR condition (such as 360-degree video) to tease apart what's really driving the learning difference.

**Control time on task.** The high immersion group spent an average of 25.9 minutes while the low immersion group spent 16.2 minutes. That's nearly 10 extra minutes of learning time — enough to explain some of the difference on its own. Future studies should equalize exposure time across conditions.

**Use a longer knowledge test.** The 10-item multiple-choice test created a ceiling effect. A reanalysis showed that 69% of the high immersion group and 58% of the medium immersion group scored 9 or 10 out of 10 at posttest. With scores compressed at the top, the test couldn't differentiate between "learned a lot" and "learned even more." A 20-25 item test with greater difficulty range would allow finer discrimination between the simulation conditions.

**Rethink the presence claim.** This is the most significant finding from the reanalysis. The overall correlation between presence and learning gains was r = .506 (p < .001), as reported in the dissertation. But when I looked *within* each condition, the correlations disappeared entirely — High: r = .156 (p = .37), Medium: r = -.186 (p = .28), Low: r = .115 (p = .50). An ANCOVA confirmed that after controlling for condition, presence explained essentially zero additional variance (p = .756). The apparent presence-learning relationship was an ecological fallacy: condition assignment determined both presence scores and learning outcomes, creating a spurious overall correlation. Future studies should test mediation with within-condition analysis or structural equation modeling.

**Validate presence measurement for all conditions.** The Witmer & Singer presence questionnaire asks about "manipulating objects in the virtual environment" and "moving around inside the virtual environment." These questions are meaningless for participants who watched a video. The reanalysis showed that 38% of the low immersion group scored exactly zero, while 16% scored in the same range as VR users — suggesting either miscomprehension or instrument invalidity for that condition.

**Use the full NASA-TLX.** Only 2 of the 6 NASA-TLX subscales (mental demand and frustration) were used to measure cognitive load. The abbreviated measure may have lacked the sensitivity to detect real differences. The full instrument would provide better construct coverage.

**Measure what you speculate about.** The discussion speculated that VR unfamiliarity drove higher cognitive load, and that motivation and engagement were important factors — but neither VR prior experience nor motivation/engagement were measured. If it's worth discussing, it's worth measuring.

## Repository Contents

| File | Description |
|------|-------------|
| `Savvides_asu_0010E_18427.pdf` | Original dissertation (PDF) |
| `dissertation.md` | Full dissertation in markdown with updated literature review addendum |
| `data.csv` | De-identified study data (n=108): learning gains, condition, presence, cognitive load |
| `litreview.csv` | Consensus search results (219 unique papers, 2019-2026) |

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
