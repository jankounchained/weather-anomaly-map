# Phase 8: Split-Violin Trend View - Context

**Gathered:** 2026-07-23
**Status:** Ready for planning

> **Decision numbering:** Phase-context decisions below are prefixed `PD-`
> (Phase Decision) to avoid colliding with the codebase's own `D-NN` decision
> ids (e.g. `D-06` shared-y-domain, `D-09` combined-gate, `D-10`
> one-shared-definition) and with the Phase 6/7 `PD-NN` sets. Phase 8's `PD-`
> ids start fresh at `PD-01`.
>
> **Gate note (carried from Phases 6/7):** the decision-coverage plan gate only
> recognizes `D-NN` ids, so it will again report 0/0 against these `PD-` ids
> (a known false positive). The plan-checker verifies `PD-` citation coverage
> independently; do not treat the gate's 0/0 as a dropped decision.

<domain>
## Phase Boundary

Replace the per-day dot-strip tiles (`TrendDayChart`) with per-day **split
violins**. Each of the last ~7 days becomes one tile comparing that calendar
day's **recent-5-year** temperature distribution (right half) against its
**prior-25-year** distribution (left half), on the shared Y-axis, gated so thin
samples never draw a falsely confident curve. Purpose: surface climate-shift
signal (has the recent distribution moved relative to the older baseline?)
without overstating confidence on thin samples.

**In scope (TREND-01/02/03):**
- `computeTrendDay()` changes from a one-sample to a **two-sample**
  (`recentSamples` / `priorSamples`) return shape, splitting the existing
  ±5-day day-of-year window by year range (recent 5 yrs vs prior 25 yrs).
- New KDE / violin geometry built bottom-up: `kde.ts` math →
  `buildViolinPaths()` geometry → `violinShape()` render → updated legend.
- Per-half data-sufficiency gate: a thin half degrades to a rug/dot-strip
  (curve → raw dots), never a misleadingly smooth curve (TREND-02).
- Two per-half mean ticks, the preserved actual-value diamond, the shared
  padded Y-axis column, and a re-derived legend finalized via a reviewer copy
  round-trip (TREND-03).

**Out of scope (carried from REQUIREMENTS.md):**
- Any change to the fetch layer or the 30-year archive call — the SAME single
  `baseline.daily` series is re-windowed client-side (no new fetch).
- The explicit climate-shift callout when halves diverge (**TREND-04**) —
  deferred; layered on top of the base split-violin once validated.
- A separate color-scale legend; onboarding/intro screen; mobile-responsive
  layout (PLAT-03, deferred — desktop-focused reflow).
- The 7-tile small-multiples structure itself stays; only each tile's internals
  change.
- Anything statistical the spike will calibrate is captured as INTENT here, not
  as a locked number (see Claude's Discretion + the sequencing note).

</domain>

<decisions>
## Implementation Decisions

### Sparse-Half Fallback (TREND-02)
- **PD-01:** **One thin half → degrade that half to a rug / dot-strip**, reusing
  the existing translucent historical-dot mark (`historicalDotShape`,
  `--color-chart-historical` today), while the healthy half still draws its
  curve. Keeps the tile symmetric and still shows the real spread — honestly
  "raw" on the thin side. Matches the app's "show the real distribution" ethos.
- **PD-02:** **Both halves thin → dual rug strip** (both sides render as rug/dot
  strips on the shared Y-axis). Still a real, comparable per-day picture, just no
  curves that day.
- **PD-03:** **The bordered "Not enough data" placeholder is reserved for a true
  zero-sample day only** (genuine data desert / fetch-timing gap) — i.e. still
  governed by the existing all-or-nothing `hasUsableSampleCount` gate. It must
  NOT appear merely because a half fell below the curve threshold.
- **PD-04 (two distinct gates — do not conflate):** There are now TWO separate
  data-sufficiency gates:
  1. The existing **`hasUsableSampleCount`** (≈ ceil(totalYears/2)) — an
     all-or-nothing "is this location a usable day at all" desert check
     (D-09/D-10). Governs the whole-tile placeholder (PD-03).
  2. A **NEW per-half curve-vs-rug threshold** (`n_min`, roadmap estimate
     ~15–20) — a smoothing floor deciding whether a half that HAS samples is
     drawn as a KDE curve or degrades to a rug (PD-01/02). Its exact value is
     spike-calibrated (see Claude's Discretion), but it is conceptually and
     structurally distinct from gate 1 and must live in its own named helper.

### Violin Width & Density Normalization
- **PD-05:** **Equal-width halves (shape-only comparison).** Both halves draw to
  the same maximum tile width; the reader compares the SHAPE/position of the two
  distributions, not their sample counts. The phase's job is shift-detection;
  n-scaling a narrow recent half to a sliver reads as noise, not signal.
  Sample-count honesty is carried by the curve→rug fallback (PD-01), not by
  width.
- **PD-06:** **Shared density peak per day.** Both halves of a given day are
  normalized to a single shared max density, so a taller/narrower peak on one
  side genuinely means that side is more concentrated — preserving within-day
  comparability of "peakiness," which is the whole point of the comparison. (Not
  per-half-normalized, which would make the two sides' concentration
  non-comparable.)

### Retained Marks & Legend (TREND-03)
- **PD-07:** **Two per-half mean ticks** (a short mean mark on the recent half
  and on the prior half) replace the old single full-width "30-year average"
  line. The GAP between the two means IS the climate-shift signal at a glance —
  it doubles as the shift indicator this phase exists to surface.
- **PD-08:** **The actual-value diamond is preserved** (success criterion 3),
  on the shared Y-axis so tiles stay comparable across days. Retain the existing
  diamond mark + its native SVG `<title>` tooltip (no raw-HTML sink).
- **PD-09:** **The shared padded Y-axis column (`TrendYAxisColumn`, D-06) is
  preserved** — all 7 tiles keep an identical plot-area width and one shared
  temperature scale.
- **PD-10:** **Legend is re-derived, drafted to whatever marks survive, then
  finalized via a reviewer copy round-trip** (the same process that fixed the
  Phase 3 legend). It should name: the recent-5yr half, the prior-25yr half, the
  per-half mean tick(s), the actual-value "temperature now" diamond, and a note
  that a thin side shows as raw dots. Exact wording is NOT locked here — reviewer
  finalizes. All labels remain ordinary JSX text nodes / native SVG (T-03-07
  security invariant preserved).

### Recent/Prior Visual Encoding
- **PD-11:** **Prior-25yr on the LEFT half, recent-5yr on the RIGHT half.**
  Reading left→right traces time forward toward "now," and the tile ROW already
  runs oldest→Today left→right (D-08) — the two time axes agree.
- **PD-12:** **A new recent/prior chart-token pair** distinguishes the halves
  (e.g. a muted "prior" and a brighter/warmer "recent" so the recent half is the
  one to watch). The mean ticks and actual diamond keep their existing tokens.
  The two halves must read as two distinct series — the current single
  `--color-chart-historical` token cannot express that. Exact hues defined in the
  UI-SPEC, within the glass/atmospheric palette.

### Sequencing (process decision)
- **PD-13:** **Spike → UI-SPEC → plan.** This is the milestone's highest-risk
  phase (roadmap research flag). Run `/gsd-spike` FIRST to validate KDE /
  Silverman bandwidth and pin the per-half `n_min` curve-vs-rug threshold against
  REAL Open-Meteo per-half sample sizes (build `kde.ts` → `buildViolinPaths()`
  geometry). THEN `/gsd-ui-phase` to lock the recent/prior colors, side,
  mean-tick treatment, and legend visuals into an `08-UI-SPEC.md`. THEN
  `/gsd-plan-phase`. Do not go straight to plan.

### Claude's Discretion (spike/researcher/UI-SPEC to settle — NOT vision calls)
- **KDE bandwidth** — Silverman's rule vs. a fixed/tuned bandwidth, validated
  against this app's actual per-half sample sizes in the spike.
- **Exact per-half `n_min` curve-vs-rug threshold** — roadmap estimate ~15–20;
  pinned empirically in the spike (PD-04 gate 2).
- **The recent/prior year-split boundary mechanics** — recent = last 5 complete
  years, prior = the 25 years before that; implement as two
  `filterDayOfYearWindow` calls with different startYear/endYear off the SAME
  `baseline.daily` series. (Split point of 5/25 is locked by the roadmap/backlog
  provenance; only the derivation mechanics are discretionary.)
- **Exact recent/prior hues, mean-tick geometry, rug-mark styling, and legend
  copy** — settled in `08-UI-SPEC.md` and the reviewer round-trip, within the
  decisions above.
- **New component/module layout** — likely `kde.ts` + `buildViolinPaths` in a
  pure math/geometry module (mirroring `src/anomaly/*` and `src/app/trend.ts`)
  and a `violinShape()` render helper; whether `TrendDayChart` is rewritten in
  place or replaced. Match the existing flat, one-component-per-file,
  hand-rolled-math convention. Not product-visible.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` §Trend (TREND-01, TREND-02, TREND-03) + the
  deferred **TREND-04** climate-shift callout + §Out of Scope — this phase's
  requirements and boundaries.
- `.planning/ROADMAP.md` §"Phase 8: Split-Violin Trend View" — goal, the four
  success criteria, and the **research flag** (highest-risk; dedicated
  statistics/design spike; validate Silverman bandwidth on per-half sample
  sizes; pin per-half `n_min` ~15–20; width-normalization; one-half-passes
  fallback; reviewer-locked legend marks; build `kde.ts` → `buildViolinPaths()`
  → `violinShape()` → legend; `computeTrendDay()` → two-sample return; fetch
  layer unchanged).

### Design contract & primitives (reused from Phases 6/7 — read first)
- `.planning/phases/06-panel-restructure-hierarchy/06-UI-SPEC.md` — **APPROVED**
  design contract. Defines the `PanelShell` / `PanelHeadline` primitives that
  `TrendRow` already wraps, plus the color/typography/spacing system the new
  chart tokens and legend must live within. Do not contradict it.
- `.planning/phases/06-panel-restructure-hierarchy/06-CONTEXT.md` — Phase 6
  decisions (esp. PD-08: TrendRow migrated onto PanelShell/PanelHeadline with
  its chart internals left untouched for THIS phase to rebuild).
- `.planning/phases/07-methodology-section-explainers/07-CONTEXT.md` — Phase 7
  decisions (hand-rolled pure math in `src/anomaly/`, no stats dependency —
  the same discipline `kde.ts` must follow).

### Existing code (touch points — see Code Context)
- `src/anomaly/anomaly.ts` (`computeTrendDay`, `computeWindowSamples`,
  `filterDayOfYearWindow`, `hasUsableSampleCount`, `mean`) ·
  `src/anomaly/types.ts` (`TrendDayResult` discriminated union) ·
  `src/app/trend.ts` (`computeSharedYDomain`, `buildHistoricalPoints`,
  `formatSlotLabel`, `jitterX`) · `src/app/TrendDayChart.tsx`
  (`TrendYAxisColumn`, dot/mean/diamond shapes) · `src/app/TrendRow.tsx` ·
  `src/app/TrendLegend.tsx` · `src/app/App.tsx` (trendDays wiring) ·
  `src/index.css` (`--color-chart-*` tokens, glass tokens).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/anomaly/anomaly.ts` `computeTrendDay`** — the split happens here. Today
  it calls `computeWindowSamples` once (whole 30-yr range) and returns one
  `samples`/`mean`/`actual`. It must instead window TWICE — recent-5yr and
  prior-25yr year ranges — via `filterDayOfYearWindow` off the SAME `daily`
  series, returning `recentSamples`/`priorSamples` (+ per-half means). No new
  fetch (D-13 efficiency invariant preserved).
- **`src/anomaly/anomaly.ts` `filterDayOfYearWindow`** — already takes explicit
  `startYear`/`endYear`; call it once per half with the 5/25 boundaries. The
  ±5-day window logic is unchanged.
- **`src/anomaly/anomaly.ts` `hasUsableSampleCount`** — keep as the whole-tile
  desert gate (PD-03). The NEW per-half `n_min` curve-vs-rug gate (PD-04) is a
  separate named helper — do NOT overload `hasUsableSampleCount`.
- **`src/app/trend.ts` `computeSharedYDomain`** — extend to flatten BOTH halves'
  samples (recent + prior) across all days when computing the one shared padded
  y-domain (D-06). Currently flattens `day.samples`; must become
  `[...recentSamples, ...priorSamples, actual, means]`.
- **`src/app/TrendDayChart.tsx`** — source of the marks that migrate:
  `historicalDotShape` (reuse for the rug fallback, PD-01), the actual-value
  diamond `makeActualShape` (preserve verbatim, PD-08), the mean `ReferenceLine`
  with `ifOverflow="visible"` (becomes two per-half mean ticks, PD-07),
  `TrendYAxisColumn` (preserve, PD-09). New `violinShape()` renders the KDE
  path. `CHART_WIDTH=88` / `CHART_HEIGHT=120` / `AXIS_WIDTH=40` are the fixed
  tile dims the geometry must fit within.
- **`src/app/TrendLegend.tsx`** — swatches are native SVG mirroring the tile
  marks exactly; extend to recent/prior half swatches + mean tick(s) + diamond.
  Reviewer round-trip finalizes copy (PD-10).
- **`src/app/TrendRow.tsx`** — the PanelShell/PanelHeadline wrapper + 4 state
  branches (no-selection / loading / unavailable / populated) are STABLE (Phase
  6 PD-08); only the populated chart-internals block (Y-axis column + 7 tiles +
  legend) changes.

### Established Patterns
- Pure hand-rolled math in `src/anomaly/` and `src/app/trend.ts`, unit-tested
  with Vitest — **no stats dependency** (CLAUDE.md "hand-roll, don't add a
  dependency"). `kde.ts` follows this: no `simple-statistics`, no KDE library.
- One-component-per-file, flat in `src/app/`; discriminated-union `TrendDayResult`
  branched on with sequential early returns (`usable` discriminant). The
  two-sample return will need a revised union shape (per-half usability).
- No auto-sizing container — explicit width/height props (jsdom has no
  ResizeObserver, 03-RESEARCH.md Pitfall 3). New violin geometry must render at
  the fixed 88×120 tile size.
- Recharts `ReferenceLine`/custom `shape` render as SVG; every dynamic string is
  a JSX text node or native SVG `<title>` — never a raw-HTML sink (T-03-02 /
  T-03-07 security invariant). The violin path + new legend must preserve this.
- Shared-scale discipline: ONE `computeSharedYDomain` result feeds every tile
  AND the axis column (D-06), so absolute temperature stays comparable.
- All motion behind `prefers-reduced-motion` (PERF-02); violin render is static
  (`isAnimationActive={false}`), consistent with the existing charts.

### Integration Points
- **`src/app/App.tsx`** (lines 64–75) builds `trendDays` by mapping
  `current.recentDaily.time` through `computeTrendDay(baseline.daily!, dateStr,
  actual)`. The two-sample return shape flows through here unchanged in wiring —
  only the element type of the array changes. Same `isAnomalyReady` gate.
- **`src/index.css`** — add the new recent/prior `--color-chart-*` token pair
  (PD-12) alongside the existing `--color-chart-historical/mean/actual`; defined
  in `08-UI-SPEC.md`.

</code_context>

<specifics>
## Specific Ideas

- **Tile anatomy (locked shape, visuals TBD in UI-SPEC):** per day, a split
  violin — **prior-25yr LEFT half, recent-5yr RIGHT half** (PD-11) — equal-width
  (PD-05), shared-peak-normalized (PD-06), each half carrying a mean tick
  (PD-07), the actual-value diamond overlaid on the shared axis (PD-08), all on
  the one shared padded Y-axis column (PD-09).
- **Two-means-gap = the story:** the vertical gap between the recent mean tick
  and the prior mean tick is the at-a-glance climate-shift read.
- **Graceful degradation, not a cliff:** thin half → that half becomes rug/dots;
  both thin → dual rug; only a true zero-sample day → bordered "Not enough data"
  (PD-01/02/03).
- **Reviewer-locked legend continuity:** the legend is re-derived and re-locked
  through the same reviewer copy round-trip the Phase 3 legend used (PD-10).
- **Visual system:** extend the existing hand-rolled glass/atmospheric system +
  Phase 6 primitives; no shadcn, no icon library, no charting/stats dependency.

</specifics>

<deferred>
## Deferred Ideas

- **TREND-04 — explicit climate-shift callout** when a day's recent-5yr and
  prior-25yr distributions have visibly diverged (e.g. a badge/annotation on the
  tile). Already a deferred requirement in REQUIREMENTS.md; layered on top of the
  base split-violin once validated. NOT in this phase — the two-means-gap (PD-07)
  is the implicit signal for v1.2.

*(No scope-creep ideas surfaced beyond TREND-04; discussion stayed within the
TREND-01/02/03 boundary.)*

</deferred>

---

*Phase: 8-split-violin-trend-view*
*Context gathered: 2026-07-23*
