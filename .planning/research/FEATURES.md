# Feature Research

**Domain:** Self-explanatory statistical dashboard UI (panel restructuring, methodology disclosure, split-violin distribution chart) for the Weather Anomaly Dashboard v1.2 milestone
**Researched:** 2026-07-21
**Confidence:** MEDIUM (web-search cross-corroborated across multiple independent UX/dataviz sources; no single authoritative spec exists for "how to make a z-score legible," so synthesis is opinionated)

## Scope Note

This file supersedes the FEATURES.md from the v1.0/v1.1 research cycle (map/hero/trend features are shipped and validated — see PROJECT.md). It covers only the **v1.2 NEW features**: (1) headlined panel split + inline micro-copy, (2) collapsible methodology disclosure, (3) split-violin trend row. It does not re-research already-shipped v1.0/v1.1 features (map pin, hero delta, 7-day dot-strip trend, persistent legend) — those are treated as fixed dependencies this milestone must respect (reviewer-locked legend copy, `hasUsableSampleCount` gate, Δ-glyph hero convention).

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist once a dashboard claims to be "self-explanatory." Missing these = the v1.2 goal is not actually met.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Separate, clearly-headlined panels ("Current conditions", "Delta", joining "Location", "History") | Once a UI shows more than one number in a shared "hero" block, users need a visual boundary + label to know which number is which — whitespace and typographic hierarchy (value vs. label) is the standard mechanism dashboards use to prevent adjacent stats being misread as one thing | LOW | Mostly layout/copy work: reuse the existing "Last 7 days" headline pattern verbatim for the two new panels so the whole view reads as one consistent system, not a patched-together mix of old and new header styles |
| Inline info affordance (icon + tooltip, or always-visible micro-copy) explaining what "z-score" means, in place | A bare "z = 1.8" or "σ" glyph is meaningless to a lay user; convention is to either (a) never show the raw statistical term without an adjacent plain-language gloss, or (b) put an info icon directly next to it that reveals a one-line explanation on demand | LOW–MEDIUM | Keep tooltip copy short (~150 characters), never repeat what's already stated elsewhere on the panel, and make sure it's reachable via keyboard focus and tap (not hover-only) since touch users exist even though full mobile responsiveness is deferred |
| Inline gloss for "Delta" (Δ) and for "today's temperature" | Users need to be told, once and in-place, "this is X° warmer/colder than the 30-year average for today's date" — the existing Δ-glyph fix (v1.1) solved *mis-reading* the number as current temp, but a first-time or infrequent user still needs the *concept* spelled out somewhere reachable, not just implied by the glyph | LOW | This is largely copy, not new interaction machinery — a one-line caption under each panel headline (e.g. "Current conditions — what it feels like right now" / "Delta — how far from normal") does most of the work before any tooltip is even needed |
| Plain-language verdict remains attached to the Delta panel, not orphaned | The existing plain-language verdict ("slightly warmer than usual") is the single highest-leverage self-explanatory device already built — splitting the hero into panels must not separate the verdict from the number it explains | LOW | Pure layout constraint carried over from v1.0/v1.1, not new research — flagging here because a naive panel split could accidentally strand the verdict in the wrong panel |
| Accessible disclosure pattern for the methodology section (ARIA button/region, visible open/closed state, keyboard-operable) | A collapsible block that can't be opened via keyboard or doesn't announce its expanded/collapsed state to a screen reader fails baseline accessibility expectations for any disclosure widget, not just this app's | LOW–MEDIUM | Standard pattern: trigger is a real `<button aria-expanded>` controlling a region, a chevron or +/− icon that visibly flips state, ~200–300ms transition (gated behind `prefers-reduced-motion` per this project's existing performance policy) |
| Split-violin per-day tiles share one common density/value scale across the two halves (recent-5-yr vs prior-25-yr) | The entire point of a split violin is direct at-a-glance comparability; if the two halves used independent scales the comparison would be meaningless and misleading | MEDIUM | This is the direct visual analog of the existing "shared Y-axis column" fix already made for the dot-strip trend (Phase 3) — same principle, must be re-applied to the new chart type |
| Split-violin legend explains what each half/color represents | Users cannot infer "left half = recent 5 years, right half = prior 25 years" without being told; an unlabeled split violin is opaque even to people who understand violin plots in general | LOW–MEDIUM | This *extends* the existing reviewer-locked persistent legend rather than replacing it — new legend entries must sit alongside, not overwrite, the current wording (which is explicitly out of scope to change) |
| Today's actual-value marker still shown on the split-violin tile | The dot-strip trend's diamond actual-value marker is one of the three marks the current legend explains; removing it in the redesign would silently drop core information (how today compares) that the milestone's whole purpose is to preserve/improve, not lose | LOW | Straightforward carry-over requirement, not new design |
| Same "not enough data" graceful-degradation gate applies to the split-violin tiles | The existing `hasUsableSampleCount` gate already covers today's-anomaly and per-day trend; a split violin introduces *two* sub-samples (recent 5yr, prior 25yr) per day, each of which can independently be too sparse — the existing single gate is not sufficient as-is (see Dependencies) | MEDIUM | Needs a decision, not just reuse: what happens when the recent-5yr half lacks enough samples but the prior-25yr half doesn't (or vice versa)? Convention from general small-sample violin-plot guidance: don't render a half you don't have enough data for — show it as unavailable rather than drawing a misleadingly smooth density from too few points |

### Differentiators (Competitive Advantage)

Features that go beyond "self-explanatory" table stakes and actively serve the Core Value (instant, accurate, at-a-glance anomaly read).

| Feature | Value Proposition | Complexity | Notes |
|---------|--------------------|------------|-------|
| Percentile framing alongside the z-score (e.g. "warmer than roughly 96% of years on this date") | Percentile language is consistently reported as more intuitive to lay users than raw sigma/z units — a z of +2 says little to most people, "warmer than 98% of years" says everything | LOW–MEDIUM | Purely a copy/derivation addition on top of the already-computed z-score (percentile from the normal CDF); no new data fetch. Good candidate for the inline micro-copy under the z-score badge |
| Methodology disclosure content that mirrors the exact numbers currently on screen (e.g. "for this location, the 30-year window used N=... samples") | Ties the abstract explanation to the concrete instance the user is looking at, making the methodology feel verified rather than generic boilerplate | MEDIUM | Requires threading the sample count / window parameters that already exist internally (`hasUsableSampleCount` gate) into the disclosure copy — a nice reuse of existing data, not new computation |
| Split-violin visually calling out the climate-shift signal explicitly (e.g. a small annotation/caption noting when the recent-5yr half's center has visibly shifted from the prior-25yr half) | Per climate-visualization convention (see NASA SVS temperature-anomaly work), the *shift itself* is the story, and viewers reliably miss it if left to infer from shape alone — an explicit callout is what turns "here are two distributions" into "here's evidence something is changing," which is exactly this feature's stated purpose (surface climate-shift signal) | MEDIUM–HIGH | This is what elevates the split-violin from a nice chart to the differentiator the milestone intends; requires a simple shift-detection heuristic (e.g. compare sub-period means) and copy — not a full statistical test |
| Reusing/extending the existing anomaly-color gradient (already built, `@property --anomaly-color`) as an accent tying the Delta panel, z-score badge, and split-violin's "recent" half together | Creates one consistent color language across the whole redesigned view instead of three independent color choices — reinforces "at a glance" legibility because the same hue always means the same thing (how anomalous) | LOW–MEDIUM | Nearly free: the color-mapping logic already exists from v1.1; this is about applying it to two more surfaces rather than building new color logic |

### Anti-Features (Commonly Requested, Often Problematic)

Features that would seem to fit "make it self-explanatory" but were explicitly scoped out or would work against the milestone's own goals.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| A separate, dedicated anomaly color-scale legend/key | Feels like the "complete" self-explanatory solution — "if we color-code anomaly severity, we should have a legend for the color scale" | Explicitly out of scope per this milestone's scope decision; also risks becoming a second legend competing for attention with the already-reviewer-locked trend legend, diluting rather than clarifying | Fold color meaning into the plain-language verdict and panel micro-copy instead — the verdict already says "slightly warmer than usual" in words, which does the same job as a color key without adding a UI element |
| A first-run intro / onboarding tour modal | Feels natural for a data-heavy tool aimed at lay users ("walk them through it once") | Explicitly out of scope per this milestone's scope decision; also conflicts with the app's stateless, no-login, drop-in-and-use positioning — a modal gate before first use adds friction to the exact "quick daily check" use case this app is built for | In-place progressive disclosure (tooltips + collapsed methodology) lets users self-serve explanation only if/when they want it, with zero friction for users who don't |
| Deeply nested progressive disclosure (tooltip → expands to a panel → which itself expands to more detail) | Seems thorough — "give power users a path to the full statistical detail" | General UX guidance is explicit that 3+ levels of disclosure signals the feature is over-complex; for a tool whose stated primary use case is "is today unusual," not a climate-research report, deep drill-down actively works against the intended tone | Keep disclosure to exactly one level: inline micro-copy/tooltip (always one tap away) plus the single collapsed methodology section (one more tap) — no third level |
| Scaling split-violin half-width by raw sample count (n=5yr window vs n=25yr window) without normalizing | Feels "more honest" — showing the smaller recent-year group as visually thinner communicates it has less data | For a lay audience the two halves are meant to be compared shape-for-shape ("has the distribution moved"); an n-scaled width makes the recent (smaller, more important-to-notice) half visually recede exactly when it should be easiest to read, and is easy to misread as "this side matters less" | Use equal-width halves (shape-normalized) and state the differing sample sizes explicitly in copy/methodology instead of encoding it in geometry |
| A fully custom/mandatory-read methodology explainer (e.g., a screen the user must dismiss, or content that can't be collapsed back down) | Feels like it guarantees users understand the numbers before acting on them | Directly conflicts with "collapsed by default... briefly explains... without overwhelming the default view" — the whole point is that most users never need to open it | True collapsed-by-default accordion, dismissible/re-collapsible at will, with concise copy (a few sentences, not a page) |

## Feature Dependencies

```
[Panel headline pattern ("Last 7 days"-style)]
    └──required by──> [Current conditions panel headline]
    └──required by──> [Delta panel headline]

[Existing hero: Δ-glyph convention + framed zero-delta case]
    └──must survive──> [Delta panel split] (regression risk: don't lose the v1.1 UX fixes when the hero is broken into two panels)

[Plain-language verdict]
    └──must stay attached to──> [Delta panel] (not stranded elsewhere after the split)

[Anomaly-color mapping (@property --anomaly-color, existing)]
    └──enhances──> [Delta panel accent, z-score badge accent, split-violin "recent" half accent]

[hasUsableSampleCount gate (existing, single-window)]
    └──requires extension──> [Split-violin per-sub-period gate] (recent-5yr and prior-25yr each need their own sufficiency check; a day can have one usable half and one gated-out half)

[Persistent TrendLegend (existing, reviewer-locked copy)]
    └──extended by, not replaced by──> [Split-violin legend entries] (new "recent vs. prior period" key added alongside existing marks, exact old wording preserved)

[Shared Y-axis column pattern (existing, TrendYAxisColumn fix)]
    └──reused by──> [Split-violin shared density scale across both halves]

[Methodology disclosure]
    └──enhances──> [Current conditions panel, Delta panel, Split-violin tiles] (explains the numbers/chart shown in all three, doesn't gate or block them)

[Percentile framing] (differentiator)
    └──requires──> [existing z-score computation] (pure derivation, no new fetch)

[Climate-shift callout] (differentiator)
    └──requires──> [Split-violin sub-period means] (simple comparison, not a new stats dependency)

[Separate anomaly color-scale legend] (anti-feature)
    └──conflicts with──> [Persistent TrendLegend] (a second competing legend undermines the single-legend-at-a-glance goal) — do not build
```

### Dependency Notes

- **Panel split requires the existing headline pattern:** The "Last 7 days" headline is the only established precedent for panel labeling in this app; the two new panels must copy its visual treatment exactly, or the view will read as stylistically inconsistent rather than "restructured."
- **Delta panel must inherit, not re-derive, the Δ-glyph and zero-delta fixes:** These were hard-won UAT fixes in v1.1 (bare number was misread as current temp; bare "0" was ambiguous). Splitting the hero into a standalone "Delta" panel is a regression risk for exactly these two behaviors — plan and verify explicitly that both survive the refactor.
- **Split-violin's per-sub-period gate extends, not replaces, `hasUsableSampleCount`:** A single day can have a well-sampled prior-25-year half and a sparse recent-5-year half (or vice versa, e.g. a very remote station with only recent digitized records). The gate needs a per-half sufficiency check, with a defined per-half fallback state (render the available half only, or show the whole tile as "not enough data" if either half fails — this is a decision the roadmap/requirements phase should make explicitly, informed by which failure mode is less misleading).
- **Split-violin legend extends the reviewer-locked TrendLegend:** Because that copy was explicitly locked after a UAT round-trip, the new "recent vs. prior period" key must be additive — new legend line(s), same old wording untouched — not a rewrite.
- **Methodology disclosure enhances but doesn't gate other panels:** It is a supplementary explainer, not a prerequisite — all three panel/chart features must be independently legible without the user ever opening it (per the "self-explanatory in place" goal); the disclosure is a *deeper* level of explanation for the curious, not the *only* explanation.
- **Anti-feature conflict — separate color-scale legend vs. persistent TrendLegend:** Building a second legend directly undermines the "one legend, self-explanatory panels" goal of this milestone and was explicitly scoped out; flagging the conflict here so it doesn't get reintroduced accidentally during panel design.

## MVP Definition

### Launch With (v1.2)

Minimum viable product for this milestone — what's needed to validate "every part of the anomaly view is self-explanatory."

- [ ] Four headlined panels (Location, Current conditions, Delta, History) each with a clear headline matching the existing "Last 7 days" style — essential to the milestone's stated goal
- [ ] Inline micro-copy/info affordance on Current conditions (what "today's temperature" means) and on Delta (what Δ and z-score each mean) — this is the actual "self-explanatory" deliverable, not optional polish
- [ ] Collapsed-by-default methodology disclosure, single level, a few sentences — the other core deliverable
- [ ] Split-violin per-day tiles (recent-5yr vs prior-25yr halves), shared value scale, extended legend, actual-value marker retained, per-half data-sufficiency gate — the third core deliverable

### Add After Validation (v1.x)

- [ ] Percentile framing next to the z-score badge — add once the base panel/tooltip system is verified and there's room to enrich the copy without cluttering it
- [ ] Explicit climate-shift callout/annotation on the split-violin (e.g., "recent 5 years trending Xσ warmer than the prior baseline") — add once the base split-violin rendering and per-half data gate are solid; this is what turns the chart into a differentiator rather than just a nicer trend view

### Future Consideration (v2+)

- [ ] Dynamic/context-aware tooltip copy that varies by anomaly magnitude — nice but adds content-management complexity disproportionate to a stateless single-view app; only worth it if user feedback shows the static copy under- or over-explains for different severities
- [ ] A dedicated anomaly-severity color-scale legend — deliberately deferred/out of scope; only reconsider if user testing shows the verdict + color accents genuinely fail to communicate severity without one

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|----------------------|----------|
| Headlined panel split (Current conditions / Delta) | HIGH | LOW | P1 |
| Inline micro-copy / tooltips for temperature, delta, z-score | HIGH | LOW–MEDIUM | P1 |
| Collapsible methodology disclosure | MEDIUM | LOW–MEDIUM | P1 |
| Split-violin trend tiles (core rendering + shared scale + legend + gate) | HIGH | HIGH | P1 |
| Percentile framing alongside z-score | MEDIUM | LOW | P2 |
| Climate-shift callout annotation on split-violin | HIGH | MEDIUM | P2 |
| Methodology copy mirroring the exact on-screen sample counts | LOW–MEDIUM | MEDIUM | P3 |
| Dynamic/severity-aware tooltip copy | LOW | MEDIUM–HIGH | P3 (defer) |
| Dedicated color-scale legend | LOW | MEDIUM | Do not build (anti-feature) |

**Priority key:**
- P1: Must have for this milestone's launch
- P2: Should have, add when possible within v1.2 or immediately after
- P3: Nice to have, future consideration

## Competitor / Analogous Feature Analysis

No direct competitor exists for "z-score weather anomaly dashboard for lay users," so this draws on adjacent domains with the same underlying problem (making a statistical deviation legible at a glance).

| Feature | Financial/analytics dashboards | Climate science visualizations (e.g. NASA SVS) | Our approach |
|---------|-------------------------------|--------------------------------------------------|--------------|
| Explaining a deviation-from-normal metric | Typically pair a raw delta with a colored indicator (up/down arrow, red/green) and a hover tooltip defining the metric — rarely show a raw z-score to end users at all | Show anomaly-from-baseline directly on an axis (0 = baseline), with the shift itself called out in narration/caption, not left implicit | Keep z-score visible (it's part of this app's stated value prop — statistical rigor + intuitive delta together) but always paired with plain-language verdict and percentile gloss, never shown bare |
| Distribution comparison (two groups) | Rare in mainstream financial dashboards — usually just a single trend line + delta, not full distributions | Increasingly common (NASA's shifting-distribution animations) specifically to show a population-level pattern change over time | Split-violin is the differentiator here — genuinely underused in consumer-facing dashboards, but well-precedented in scientific climate communication for exactly this "has the norm shifted" story |
| Progressive/collapsed explainer | Common ("Learn more" links, info-icon popovers) but rarely a full expandable methodology section | Common in scientific contexts (caveats/methods footnotes) but usually always-visible, not collapsed, since the audience is technical | This app's collapsed-by-default approach is a deliberate middle ground: acknowledges the lay/practical primary audience (per PROJECT.md) while still giving the curious/skeptical user a path to the method |

## Sources

- Dashboard UX pattern research (Pencil & Paper, DataCamp, general dashboard-design surveys) — MEDIUM confidence, web search, cross-corroborated
- Tooltip/micro-copy conventions (Carbon Design System usage docs, Appcues, Eleken, UX Patterns for Developers) — MEDIUM confidence, web search
- Z-score/percentile lay-explanation conventions (MeasuringU, Statistics How To, general UX-for-stats guidance) — MEDIUM confidence, web search
- Progressive disclosure best practices (UXPin, GitLab Pajamas Design System, LogRocket) — MEDIUM confidence, web search
- Collapsible/disclosure widget accessibility conventions (general ARIA disclosure pattern guidance) — MEDIUM confidence, web search
- Split/half violin plot reading and legend conventions (R-bloggers "Split violin plots," CRAN `vioplot` split-violin vignette, GeeksforGeeks split/half violin guides, Domo/Mode violin plot explainers) — MEDIUM confidence, web search, cross-corroborated across multiple independent sources
- Climate-shift distribution visualization conventions (NASA Scientific Visualization Studio "Shifting Distribution of Land Temperature Anomalies," NOAA Climate.gov on climate normals) — MEDIUM confidence, web search
- Project-internal precedent: `.planning/PROJECT.md` (existing hero hierarchy, `hasUsableSampleCount` gate, reviewer-locked TrendLegend, disciplined-glass motion policy, anomaly-color mapping) — HIGH confidence, first-party source

---
*Feature research for: Weather Anomaly Dashboard v1.2 (self-explanatory panels, methodology disclosure, split-violin trend)*
*Researched: 2026-07-21*
