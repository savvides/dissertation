# How This Was Made

A PhD dissertation turned into an interactive data story, built entirely through conversation with AI.

## The Problem

I defended my dissertation in 2018. It was 76 pages on whether VR headsets improve learning. The study was solid: 108 participants, three conditions, statistically significant results. It sits in ProQuest where almost nobody will ever read it.

That's the fate of most dissertations. Years of work, compressed into a PDF, filed away. The format never matched the ambition.

## The Realization

In early 2026, I went back to the data with newer statistical tools. The original analysis had missed an ecological fallacy in the results. A correlation that looked real across the whole sample vanished within each condition. A real finding, eight years late.

I wanted to share it in a way that did the finding justice. Not as another paper. Not as a slide deck. As something people could experience.

Around the same time, I started using AI coding agents. I didn't need to know how to build a website from scratch; I could describe what I wanted and build it through conversation.

## The Process

The whole site was built through iterative conversation with AI coding agents. No hand-coding. Here's what that looked like at a high level:

1. **PDF to markdown.** I converted the dissertation into a markdown file, preserving the original text verbatim.

2. **Data preparation.** The original study data (de-identified, n=108) was already in a CSV. I made it available for visualization.

3. **Narrative design.** Instead of presenting results in the traditional order, I structured the story as a six-beat investigation: The Experiment, The Outcome, The 2018 Theory, The Twist, Why It Happened, and An Open Question. The ecological fallacy became the narrative turning point.

4. **Interactive charts.** D3.js animates one persistent set of 108 participant marks across all six beats — from experimental cohorts to learning-gain beeswarms with 95% confidence intervals, a pooled scatter plot, a color-and-shape overlay where the pooled line fractures, three small-multiple panels, and a cognitive-load beeswarm.

5. **Visual design.** A "Newsroom" direction: a white page, Libre Franklin for headlines and labels, Newsreader for the reading text, a distinct color and mark shape for each condition, and direct labels on the chart instead of a legend. The goal was to feel like an explainer in a newspaper, not a dashboard.

6. **The Evidence Lab.** After the scrollytelling narrative, a 3 × 3 × 2 interactive playground lets readers drive the same dataset themselves: toggle between Overall, Overlay, and Split views; switch relationships among Presence → Gain, Presence → Load, and Load → Gain; toggle trendlines; launch three guided investigation presets; and inspect any participant with a live readout and summary sentence.

7. **A personal coda and footer.** A first-person reflection closes the narrative ("Eight years later, I found a fallacy hiding in my own data."), followed by a three-card decision playbook for Learning Buyers, Analysts & Researchers, and VR Designers, and a two-column footer with an author bio, APA citation copy button, LinkedIn link, and the open data, PDF, and GitHub links.

8. **Iteration.** Many rounds of conversation, refining the narrative, polishing the charts, adjusting the pacing. The AI handled the code. I handled the taste. That included a full review of the first version, a round of corrections to claims the data didn't support, the Newsroom redesign, and a v4.0.0 narrative & data-visualization overhaul unifying all 108 participants across six beats, small multiples, an executive scorecard, and guided Evidence Lab presets.

The entire thing is static HTML. No build tools, no server, no database. It's four static files plus a charting library, and it deploys on GitHub Pages for free.

## Try It Yourself

If you have a dissertation (or any substantial research) and want to turn it into something like this, here's what you need:

- **Your research.** The PDF, the data, the story you want to tell.
- **An AI coding agent.** This is what I used to build the site through conversation. You describe what you want, it writes the code, and you iterate together.
- **A [GitHub](https://github.com) account.** For hosting the site for free via GitHub Pages.

You don't need to know how to code. You need to know what story your research tells and what you want people to feel when they see it. The technical barrier is gone. What remains is editorial judgment: what to emphasize, what to cut, how to sequence the reveal.

The best version of your research might not be another paper. It might be an experience.
