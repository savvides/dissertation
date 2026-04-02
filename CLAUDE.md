# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains Philippos Savvides's 2018 PhD dissertation from Arizona State University: "Teaching Science Lab Safety: Are Virtual Simulations Effective?" The study investigated VR/desktop/video immersion levels (n=108) on knowledge, cognitive load, and presence for lab safety training.

## Repository Structure

- `Savvides_asu_0010E_18427.pdf` — Original dissertation PDF (source of truth for figures and formatting)
- `dissertation.md` — Full markdown conversion with an "Updated Literature Review (2019-2026)" addendum section
- `data.csv` — De-identified study data (n=108): learning gains, condition, presence, cognitive load
- `litreview.csv` — Consensus search results (219 unique papers, 2019-2026)
- `README.md` — Project overview, study summary, literature review addendum summary, and methodological retrospective
- `HOW-IT-WAS-MADE.md` — Process write-up explaining how the interactive site was built with Claude Code

## Key Context

- The original dissertation was published December 2018; all original citations are pre-2019
- The markdown version preserves the original text verbatim; new content goes only in the addendum section
- A 2026 reanalysis found the presence-learning correlation is an ecological fallacy (significant overall, non-significant within conditions) — the README retrospective documents this
- Figures are referenced but not embedded — they live in the original PDF
- Citation style is APA 6th edition throughout
- The "Updated Literature Review (2019-2026)" addendum is organized to mirror the original literature review subsections: Simulations, Educational Virtual Environments, VR in Science Education, Immersion and Presence, Embodied Cognition, Constructivism, and Cognitive Load Theory

## Working with the Addendum

When adding new literature to the addendum section:
- Place content under the matching subsection heading
- Use APA 6th edition citation format consistent with the References section
- Add new references to the References section in alphabetical order
- Note whether new findings confirm, contradict, or extend the 2018 study results

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
