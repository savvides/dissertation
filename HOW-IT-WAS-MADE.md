# How This Was Made

A PhD dissertation turned into an interactive data story, built entirely through conversation with AI.

## The Problem

I defended my dissertation in 2018. It was 200+ pages on whether VR headsets improve learning. The study was solid: 108 participants, three conditions, statistically significant results. It sits in ProQuest where almost nobody will ever read it.

That's the fate of most dissertations. Years of work, compressed into a PDF, filed away. The format never matched the ambition.

## The Realization

In early 2026, I revisited my data with fresh eyes and modern tools. I found something the original analysis missed: an ecological fallacy hiding in the results. A correlation that looked real at the group level vanished within each condition. That was a genuine discovery, buried in an eight-year-old dataset.

I wanted to share it in a way that did the finding justice. Not as another paper. Not as a slide deck. As something people could experience.

Around the same time, I started using [Claude Code](https://claude.ai/code), Anthropic's AI coding tool. What I realized was that I didn't need to know how to build a website from scratch. I could describe what I wanted, and build it through conversation.

## The Process

The whole site was built through iterative conversation with Claude Code. No hand-coding. Here's what that looked like at a high level:

1. **PDF to markdown.** I converted the dissertation into a markdown file, preserving the original text verbatim.

2. **Data preparation.** The original study data (de-identified, n=108) was already in a CSV. I made it available for visualization.

3. **Narrative design.** Instead of presenting results in the traditional order, I restructured the story as a mystery: setup, promise, question, twist, resolution. The ecological fallacy became the narrative turning point.

4. **Interactive charts.** The site uses D3.js to animate scatter plots and bar charts that respond to scrolling. The key moment is when dots get colorized by condition and the overall correlation visually falls apart.

5. **Visual design.** An editorial design system with warm tones, serif typography, and generous whitespace. The goal was to feel like a magazine feature, not a dashboard.

6. **The Evidence Lab.** After the scrollytelling narrative, an interactive playground lets readers drive the same chart themselves — toggle overall vs. by-condition, swap the y-axis between learning gains and cognitive load, show or hide regression lines. The fallacy stops being a thing they watched and becomes a thing they can reproduce.

7. **A personal coda and footer.** A first-person reflection closes the narrative ("Eight years later, I found a fallacy hiding in my own data."), and a three-column footer points to this write-up, my LinkedIn, and the open dataset.

8. **Iteration.** Many rounds of conversation, refining the narrative, polishing the charts, adjusting the pacing. The AI handled the code. I handled the taste.

The entire thing is static HTML. No build tools, no server, no database. It runs from a single file and deploys on GitHub Pages for free.

## Try It Yourself

If you have a dissertation (or any substantial research) and want to turn it into something like this, here's what you need:

- **Your research.** The PDF, the data, the story you want to tell.
- **[Claude Code](https://claude.ai/code).** This is what I used to build the site through conversation. You describe what you want, it writes the code, you iterate together.
- **A [GitHub](https://github.com) account.** For hosting the site for free via GitHub Pages.

You don't need to know how to code. You need to know what story your research tells and what you want people to feel when they see it. The technical barrier is gone. What remains is editorial judgment: what to emphasize, what to cut, how to sequence the reveal.

The best version of your research might not be another paper. It might be an experience.
