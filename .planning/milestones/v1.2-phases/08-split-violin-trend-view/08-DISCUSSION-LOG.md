# Phase 8: Split-Violin Trend View - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-23
**Phase:** 8-split-violin-trend-view
**Areas discussed:** Sparse-half fallback, Width normalization, Retained marks + legend, Recent/prior encoding, Sequencing

---

## Sparse-half fallback (TREND-02)

### One thin half → what does the user see for that half?

| Option | Description | Selected |
|--------|-------------|----------|
| Degrade to rug/dots | Thin half renders as a rug / dot-strip (reusing the existing translucent historical-dot mark) instead of a curve; keeps tile symmetric and shows real spread | ✓ |
| Omit the thin half | Draw only the passing half; sparse side blank — lopsided, comparison silently gone | |
| Whole tile to rug | If either half thin, both halves fall back to rug/dots that day | |

### Both halves thin → what does the day show?

| Option | Description | Selected |
|--------|-------------|----------|
| Dual rug strip | Both halves as rug/dot strips on the shared Y-axis; only fall through to "Not enough data" when a half has essentially zero samples | ✓ |
| Keep "Not enough data" | Reuse the existing bordered placeholder verbatim when neither half clears the curve threshold | |
| Zero-sample = placeholder only | Same as dual rug, made explicit — placeholder ONLY for a true zero-sample day | |

**User's choice:** Degrade one thin half to rug/dots; dual rug strip when both thin.
**Notes:** Surfaced that this creates two distinct gates — the existing all-or-nothing `hasUsableSampleCount` (data-desert / whole-tile placeholder) vs. a new per-half `n_min` curve-vs-rug smoothing threshold (~15–20, spike-calibrated). Captured as PD-04.

---

## Width normalization

### Should a violin half's width encode its sample count?

| Option | Description | Selected |
|--------|-------------|----------|
| Equal width (shape-only) | Both halves same max width; reader compares shape/position, not sample counts; low-n honesty carried by rug fallback | ✓ |
| n-scaled width | Width ∝ sample count; thin recent half looks narrower/less certain but can shrink to a sliver at 88px | |

### How should each half's density be scaled to tile width?

| Option | Description | Selected |
|--------|-------------|----------|
| Shared peak per day | Both halves normalized to a single shared max density; within-day peakiness stays comparable | ✓ |
| Per-half peak | Each half normalized to its own max; both always reach full width — concentration non-comparable | |
| You decide (defer to spike) | Let the spike settle it against real densities | |

**User's choice:** Equal width, shared peak per day.
**Notes:** Rationale — the phase optimizes for shift-detection; n-scaling reads as noise and shared-peak preserves the within-day comparison that is the whole point.

---

## Retained marks + legend (TREND-03)

### How should the mean be marked now that the day is split?

| Option | Description | Selected |
|--------|-------------|----------|
| Two per-half means | A mean tick on each half (recent, prior); the gap between them IS the shift signal | ✓ |
| Single 30-yr mean line | Keep one full-width mean line (all 30 yrs) as before | |
| Drop the mean line | No mean marks; violin bodies carry the distribution | |

### Which marks should the updated legend name (finalized via reviewer round-trip)?

| Option | Description | Selected |
|--------|-------------|----------|
| Recent, prior, means, actual | Legend names both halves, mean tick(s), actual-value diamond, + thin-side rug note | |
| Minimal: recent vs prior + actual | Only the two halves and the actual marker | |
| You decide (draft, reviewer finalizes) | Draft to whatever marks survive, reviewer round-trip finalizes exact copy | ✓ |

**User's choice:** Two per-half mean ticks; legend drafted to surviving marks and finalized via reviewer copy round-trip.
**Notes:** Actual-value diamond and shared Y-axis column preserved (success criterion 3). Reviewer round-trip is the same process used for the reviewer-locked Phase 3 legend.

---

## Recent/prior encoding

### Which side is recent vs prior?

| Option | Description | Selected |
|--------|-------------|----------|
| Prior left, recent right | Older 25-yr baseline left, recent 5 yrs right; agrees with the row's oldest→Today left→right direction | ✓ |
| Recent left, prior right | Recent on the reading-entry side; runs opposite to the row ordering | |

### How to color-distinguish the two halves?

| Option | Description | Selected |
|--------|-------------|----------|
| New recent/prior token pair | Two chart tokens (muted "prior" + brighter "recent"); recent half pops as the one to watch | ✓ |
| Reuse existing historical token | Both halves in the current translucent token; distinguished only by side + means | |
| You decide (in UI-SPEC) | Defer exact hues to the design spike / 08-UI-SPEC | |

**User's choice:** Prior-left / recent-right; new recent/prior chart-token pair with the recent half emphasized.
**Notes:** Exact hues to be locked in 08-UI-SPEC within the glass/atmospheric palette; mean ticks and actual diamond keep their existing tokens.

---

## Sequencing (process)

| Option | Description | Selected |
|--------|-------------|----------|
| Spike, then UI-SPEC, then plan | Validate KDE/bandwidth + pin per-half n_min against real per-half sample sizes, then lock visuals, then plan | ✓ |
| UI-SPEC, then plan (spike inside) | Skip standalone spike; fold validation into planning research | |
| Straight to plan-phase | Phase-researcher handles everything together | |

**User's choice:** Spike → UI-SPEC → plan.
**Notes:** Matches the roadmap's "highest-risk phase / dedicated statistics+design spike" research flag.

## Claude's Discretion

- KDE bandwidth (Silverman vs. tuned) — spike-validated against real per-half sample sizes.
- Exact per-half `n_min` curve-vs-rug threshold (~15–20) — pinned empirically in the spike.
- Recent/prior year-split derivation mechanics (two `filterDayOfYearWindow` calls off the one baseline series); the 5/25 split point itself is locked by roadmap/backlog provenance.
- Exact recent/prior hues, mean-tick geometry, rug-mark styling, legend copy — settled in 08-UI-SPEC + reviewer round-trip.
- New module/component layout (`kde.ts`, `buildViolinPaths`, `violinShape()`; rewrite vs. replace `TrendDayChart`).

## Deferred Ideas

- **TREND-04** — explicit climate-shift callout when the recent-5yr and prior-25yr distributions visibly diverge. Already a deferred requirement; layered on top of the base split-violin once validated. Not in this phase — the two-means-gap is the implicit v1.2 signal.
