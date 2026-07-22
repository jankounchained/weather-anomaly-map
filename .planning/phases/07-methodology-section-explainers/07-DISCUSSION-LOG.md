# Phase 7: Methodology Section & Explainers - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-22
**Phase:** 7-methodology-section-explainers
**Areas discussed:** Percentile math, Percentile display, Methodology placement, Methodology content

---

## Percentile math (EXPLAIN-04)

### Q1 — Computation method

| Option | Description | Selected |
|--------|-------------|----------|
| Empirical rank | Share of the ~330 baseline samples below today; distribution-free, honest on skew, matches the app's "show the real distribution" ethos. | ✓ |
| Normal-curve CDF of z | Φ(z) restates the z-score; simplest, but assumes a bell curve and is undefined when z is null. | |
| Empirical, blend later | Start empirical, keep the door open to show both framings later. | |

**User's choice:** Empirical rank.
**Notes:** Framed to the user that the baseline is ~330 values (±5-day × ~30 years), not 30 discrete years, so "of years" is a plain-language gloss either way.

### Q2 — Extreme & degenerate behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Clamp + honest floor | Hazen/midrank ties, clamp displayed value to 1–99%, suppress the line when variance ~0 / z null. | ✓ |
| Raw rounded | Plain rounded share-below, allowing 0%/100%. | |
| You decide | Defer rank convention & clamp to implementation. | |

**User's choice:** Clamp + honest floor.
**Notes:** Suppression reuses the existing `zScore === null` degenerate-variance signal.

---

## Percentile display (EXPLAIN-04)

### Q1 — Placement relative to the z-score chip

| Option | Description | Selected |
|--------|-------------|----------|
| Plain line above the z chip | Plain-language sentence between verdict and z-chip; percentile leads, z stays as the precise footnote. | ✓ |
| Merge into the z chip | Fold both into one line, e.g. "z 1.3 · warmer than 91%". | |
| Only in the InfoTooltip | Hide the percentile behind the existing tooltip. | |

**User's choice:** Plain line above the z chip.

### Q2 — Cold-side wording

| Option | Description | Selected |
|--------|-------------|----------|
| Flip to 'colder than' | Phrase toward the majority side; "around the middle" near the median. | ✓ |
| Always 'warmer than X%' | One literal sentence regardless of side. | |
| You decide | Defer exact wording to UI-SPEC. | |

**User's choice:** Flip to 'colder than' at the median.

---

## Methodology placement (EXPLAIN-03)

### Q1 — Location in the column

| Option | Description | Selected |
|--------|-------------|----------|
| Full-width panel below History | Own PanelShell at the bottom, collapsed `<details>` with PanelHeadline-styled summary. | ✓ |
| Lighter footer treatment | Quieter un-shelled disclosure; breaks the PanelShell system. | |
| You decide | Lock "bottom, collapsed"; defer panel-vs-footer to UI-SPEC. | |

**User's choice:** Full-width panel below History.

### Q2 — Visibility before a pin is dropped

| Option | Description | Selected |
|--------|-------------|----------|
| Always visible | Show in every state; doubles as the "what is this" for newcomers (why the intro screen was dropped). | ✓ |
| Only when resolved | Hide until an anomaly resolves. | |

**User's choice:** Always visible.

---

## Methodology content (EXPLAIN-03)

### Q1 — Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Two labeled subsections | "What this shows" + "How it's computed" pipeline incl. percentile; flat single-level. | ✓ |
| Single prose blurb | One tight paragraph. | |
| You decide | Lock coverage; defer prose-vs-subsections to UI-SPEC. | |

**User's choice:** Two labeled subsections.

### Q2 — Trust & limitations detail (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| Data source credit | Name Open-Meteo (current + archive/ERA5). | ✓ |
| Reanalysis caveat | Modeled/reanalysis, not a single station — why the delta is whole degrees. | ✓ |
| Sparse-data / null note | Some remote spots lack enough history; anomaly/percentile may be unavailable. | ✓ |
| Keep it minimal | Just what-it's-for + pipeline, no caveats. | |

**User's choice:** All three caveats (data source, reanalysis, sparse-data).

---

## Claude's Discretion

- Exact copy wording for the methodology body, the percentile sentence, and the "around the middle" case (may be finalized by a `07-UI-SPEC.md`).
- New `MethodologyPanel.tsx` component vs. inline composition in `App.tsx` (leaning toward a new component per the flat one-per-file convention).
- Chevron / disclosure affordance styling; percentile line as chip vs. plain text.

## Deferred Ideas

- Show both percentile framings (empirical + normal-CDF) side by side — raised as the "blend later" option; not needed for v1.2. Empirical is the sole framing this phase.
