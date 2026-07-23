---
phase: quick/260723-ju7
plan: 01
subsystem: ui
tags: [react, recharts, svg, kde, split-violin, trend-chart]

# Dependency graph
requires:
  - phase: 08-split-violin-trend-view
    provides: buildViolinPaths (split-violin KDE geometry), TrendDayChart per-half mean ticks, TrendLegend
provides:
  - ViolinHalf.meanWidth field (both curve and rug variants) computed via kdeAt at the half's own mean, reusing the shared pooled bandwidth h and sharedMax
  - Per-half mean tick x-extent driven by meanWidth instead of a fixed MEAN_TICK_LEN (29px)
  - --color-chart-mean recolored from accent-blue to #08060d (near-black), tile tick and legend swatch both at strokeWidth 3
affects: [08-split-violin-trend-view, future trend-chart polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mean-tick length reuses the exact curve-edge density-to-pixel formula (kdeAt(mean, samples, h) / sharedMax * maxHalfWidth) rather than a fixed constant, so a derived visual mark can never drift from the curve it summarizes."

key-files:
  created: []
  modified:
    - src/app/trend.ts
    - src/app/TrendDayChart.tsx
    - src/index.css
    - src/app/TrendLegend.tsx
    - src/app/trend.test.ts
    - src/app/TrendDayChart.test.tsx
    - src/app/TrendLegend.test.tsx

key-decisions:
  - "meanWidth computed inside buildViolinPaths' existing half() closure, reusing h/sharedMax already in scope - never recomputed, preserving the shared-pooled-bandwidth invariant."
  - "Rug half (below halfDrawsCurve's n_min=20) has no density curve to land a tick on, so a non-empty rug falls back to full maxHalfWidth; truly empty half (n=0) is 0."
  - "--color-chart-mean is the single shared token driving both the tile mean-tick and the TrendLegend 'Period average' swatch - one edit recolors both in lockstep."

patterns-established:
  - "Derived visual-mark geometry (tick length) computed from the same pixel-mapping function as the primary mark (curve edge) it annotates, rather than an independent fixed constant."

requirements-completed: [PD-07, PD-12]

coverage:
  - id: D1
    description: "Per-half mean tick's x-extent equals meanWidth (density-curve edge at the mean), not a fixed 29px; sparse (rug) half with non-null mean still renders a full-width tick; empty half renders 0."
    requirement: "PD-07"
    verification:
      - kind: unit
        ref: "src/app/trend.test.ts#buildViolinPaths > gives a half with n >= 20 kind:\"curve\" with a path starting \"M\" and ending \"Z\" (meanWidth bounds)"
        status: pass
      - kind: unit
        ref: "src/app/trend.test.ts#buildViolinPaths > gives identical curve halves (mirror recent/prior) equal meanWidth"
        status: pass
      - kind: unit
        ref: "src/app/trend.test.ts#buildViolinPaths > gives a half with n = 19 (just under N_MIN) kind:\"rug\" (meanWidth === maxHalfWidth)"
        status: pass
      - kind: unit
        ref: "src/app/trend.test.ts#buildViolinPaths > returns mean:null for a truly empty half (n=0) (meanWidth === 0)"
        status: pass
      - kind: unit
        ref: "src/app/TrendDayChart.test.tsx#TrendDayChart > renders two per-half mean-tick lines and the actual diamond (tick extent (0,36], not 29)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Mean tick and 'Period average' legend swatch both render at #08060d, strokeWidth 3, updating in lockstep via --color-chart-mean; every mark stays native SVG (no raw-HTML sink)."
    requirement: "PD-12"
    verification:
      - kind: unit
        ref: "src/app/TrendLegend.test.tsx#TrendLegend > renders the mean-tick swatch as a <line> (stroke-width === '3')"
        status: pass
      - kind: unit
        ref: "src/app/TrendLegend.test.tsx#TrendLegend > never uses dangerouslySetInnerHTML (T-03-07)"
        status: pass
    human_judgment: true
    rationale: "Color/weight is a visual design change (#08060d bold near-black vs. prior accent-blue) - tests lock the token value and strokeWidth attribute, but whether the tile tick actually looks 'bold near-black' and lands its endpoint visibly on the curve edge is a rendering/visual judgment best confirmed by a quick look at the running dashboard."

# Metrics
duration: ~15min
completed: 2026-07-23
status: complete
---

# Quick Task 260723-ju7 Summary

**Split-violin per-half mean ticks now length-align to the density-curve edge (via a new meanWidth field reusing the curve's own pooled-bandwidth KDE math) and recolor from accent-blue to a bold near-black (#08060d, strokeWidth 3) shared with the legend swatch.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-07-23
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- `ViolinHalf` (both `curve` and `rug` variants) gains a `meanWidth: number` field; `buildViolinPaths` computes it for curve halves via `kdeAt(mean, samples, h) / sharedMax * maxHalfWidth` — the identical density-to-pixel formula the curve edge itself uses, so the tick's end lands exactly on the curve
- Rug halves fall back to `maxHalfWidth` when non-empty (mean not null), `0` when truly empty (n=0)
- `TrendDayChart`'s mean-tick `<line>` x2 is now `CX + side * meanWidth` instead of the old fixed `MEAN_TICK_LEN` (29px), which is deleted
- `--color-chart-mean` flipped from `var(--color-accent)` to `#08060d` (the app's existing body-text ink), and both the tile mean-tick and the `TrendLegend` "Period average" swatch bumped `strokeWidth` 2 → 3, staying in lockstep via the one shared CSS token
- All marks remain native SVG (`<line>`/`<title>`) — no raw-HTML sink (T-03-07)

## Task Commits

Each task was committed atomically:

1. **Task 1: Length-align the mean tick to the density-curve edge** - `37b8570` (feat)
2. **Task 2: Recolor + embolden the mean mark (tile + legend, in lockstep)** - `63bff27` (feat)

_Note: no TDD RED/GREEN split was required — plan tasks were `type="auto"` (Task 1 carried `tdd="true"` but the plan's `<action>` directed implementation-then-test-extension inline rather than a strict RED/GREEN commit split, matching the existing test-extension style of this file's prior plans)._

## Files Created/Modified
- `src/app/trend.ts` - `ViolinHalf` gains `meanWidth`; `buildViolinPaths`' `half()` helper computes it via `kdeAt` reusing shared `h`/`sharedMax`
- `src/app/TrendDayChart.tsx` - `MEAN_TICK_LEN` removed; `makeMeanTickShape` takes `meanWidth` and drives `x2`; tick `strokeWidth` bumped to 3
- `src/index.css` - `--color-chart-mean` changed from `var(--color-accent)` to `#08060d`, comment updated
- `src/app/TrendLegend.tsx` - "Period average" swatch `strokeWidth` bumped to 3 (color already inherited via the shared token)
- `src/app/trend.test.ts` - extended the three existing `buildViolinPaths` cases (n≥20 curve, n=19 rug, n=0 empty) plus a new mirror-half equality case with `meanWidth` assertions
- `src/app/TrendDayChart.test.tsx` - extended the mean-tick test to assert x1=44 and extent in `(0, 36]`, not 29
- `src/app/TrendLegend.test.tsx` - extended the mean-tick swatch test to assert `stroke-width="3"`

## Decisions Made
- Reused the exact curve-edge pixel-mapping formula for `meanWidth` rather than any independent geometry, guaranteeing the tick end and curve edge can never visually drift apart even as bandwidth/sample data change.
- Kept the rug-fallback width at full `maxHalfWidth` (not a partial value) — a sparse half has no density curve to derive a proportional length from, and a full-width tick stays readable against the rug dots.
- Deferred strokeWidth/color changes to a second, separately-committed task per the plan's own task split, keeping geometry and visual-weight changes independently revertible.

## Deviations from Plan

**1. [Rule 1 - Bug] React lowercases `strokeWidth` to `stroke-width` in the rendered DOM attribute**
- **Found during:** Task 2 (TrendLegend.test.tsx update)
- **Issue:** The plan's test guidance implied asserting the JSX prop name (`strokeWidth`) as the DOM attribute; `container.querySelector('line')?.getAttribute('strokeWidth')` returned `null` because React serializes SVG presentation attributes in kebab-case (`stroke-width`), not camelCase.
- **Fix:** Asserted `getAttribute('stroke-width')` instead — matches the existing convention already used elsewhere in this test suite for SVG attributes.
- **Files modified:** src/app/TrendLegend.test.tsx
- **Verification:** `npm test` — full suite green after the fix.
- **Committed in:** 63bff27 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor test-assertion correction; no scope creep, no behavior change.

## Issues Encountered
None beyond the deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `npm test` (190/190 tests) and `npm run build` both pass with the new geometry and coloring.
- Dev server was left untouched/untouched-down so the change can be visually confirmed by running `npm run dev` and inspecting a trend tile's mean ticks (should land on the curve edge, render bold near-black) plus the legend's "Period average" swatch.
- No violin path anchor logic or `TrendYAxisColumn` touched, per constraint.

---
*Quick task: 260723-ju7*
*Completed: 2026-07-23*

## Self-Check: PASSED

All 7 modified files found on disk; both task commit hashes (`37b8570`, `63bff27`) found in git history.
