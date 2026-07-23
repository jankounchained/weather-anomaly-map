---
phase: 08-split-violin-trend-view
plan: 03
subsystem: ui
tags: [split-violin, recharts, custom-shape, svg-geometry, typescript, vitest, tailwind-v4]

# Dependency graph
requires:
  - phase: 08-split-violin-trend-view
    provides: "08-01: kde.ts (silvermanBandwidth, kdeCurve, halfDrawsCurve, N_MIN=20) and the two-sample TrendDayResult/computeTrendDay (recentSamples/priorSamples/recentMean/priorMean)"
  - phase: 08-split-violin-trend-view
    provides: "08-02: src/app/trend.ts buildViolinPaths(recentSamples, priorSamples, opts) + ViolinHalf discriminated union + extended computeSharedYDomain; --color-chart-prior/-recent-* tokens in src/index.css"
provides:
  - "src/app/TrendDayChart.tsx: split-violin per-day tile render - two ViolinHalf marks (filled KDE curve or jittered rug), two per-half mean-tick <line>s, the preserved actual-value diamond, all on ONE explicit-margin pixel scale"
  - "TrendDayChart.tsx: makeViolinShape/makeMeanTickShape zero-arg Recharts custom shapes (same precedent as the file's existing emptyShape), yFromValue/formatTemp/formatCurveTitle/formatRugTitle/formatMeanTickTooltip helpers"
  - "Confirmed App.tsx + TrendRow.tsx flow the two-sample TrendDayResult through unchanged (zero code edits needed in either file) - project-wide npx tsc -b --noEmit now green"
affects: [08-04-trend-legend]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Explicit ComposedChart margin (PLOT_MARGIN=5, matching Recharts' own CartesianChart default verbatim) declared rather than left implicit, so buildViolinPaths' precomputed pixel coordinates (yFromValue) can never silently drift from the diamond's Recharts-scale-driven cy - both derive from the SAME margin constant"
    - "Zero-arg Recharts custom shape functions (makeViolinShape, makeMeanTickShape) that ignore the cx/cy Recharts would compute for a dummy data point, instead rendering fully precomputed absolute-pixel marks - same structural precedent as the file's pre-existing emptyShape"
    - "A ViolinHalf's mean:null (truly empty half, n===0) skips rendering that mean tick entirely rather than risking a NaN pixel position/tooltip - defensive per T-08-05, never fires against real data (spike-confirmed halves are always ~55/275)"

key-files:
  created: []
  modified: [src/app/TrendDayChart.tsx, src/app/TrendDayChart.test.tsx, src/app/TrendRow.test.tsx]

key-decisions:
  - "Kept App.tsx and TrendRow.tsx as literal zero-edit files - Task 2's own verification (npm run build) confirmed the two-sample TrendDayResult already flows through the unchanged isAnomalyReady gate / computeSharedYDomain / TrendDayChart composition with no code change required, exactly as Plan 08-01's SUMMARY predicted"
  - "Fixed TrendRow.test.tsx's populated-state fixture (Rule 3 blocking-fix, within Task 2's own stated verify scope: `npm test -- src/app/TrendRow.test.tsx` exits 0) - it still used the retired single-sample samples/mean shape and failed to typecheck against the now-promoted two-sample TrendDayResult"
  - "Removed the now-unused buildHistoricalPoints import and standalone historicalDotShape function from TrendDayChart.tsx - the per-day dot-strip they powered is fully superseded by the split-violin's curve/rug marks; the rug fallback reuses the SAME r=3/--color-chart-historical styling inline instead of calling a separate named function, since it needs custom per-dot cx (jittered, bounded to its half) that a shared cx/cy-from-props shape can't express"
  - "Diamond's 'vs. 30-yr avg' tooltip baseline changed from day.mean (retired) to mean([...recentSamples, ...priorSamples]) computed inline - concatenation-then-mean naturally sample-weights by each half's count (55 vs 275), matching the UI-SPEC Copywriting Contract's explicit 'sample-weighted average' wording; guaranteed non-empty (no div-by-zero) since computeTrendDay's combined hasUsableSampleCount gate requires at least one sample in the full window before usable:true is ever returned"
  - "Chose to render prior-half, recent-half, and each mean tick as SEPARATE Scatter components (5 Scatters total per populated tile) rather than bundling all marks into one shape callback - mirrors the existing codebase's one-Scatter-per-mark-layer convention and keeps each mark independently testable via querySelectorAll"

patterns-established:
  - "PLOT_MARGIN/PLOT_TOP/PLOT_HEIGHT module constants + yFromValue() as the tile's single source of truth for value->pixel mapping - every non-Recharts-driven mark (violin curve/rug, mean ticks) uses this; only the diamond keeps going through Recharts' own domain-scale (via the {x:0.5,y:actual} data point trick, unchanged from the single-sample era), and the two are proven to agree by explicit margin equality rather than by accident"

requirements-completed: [TREND-01, TREND-02, TREND-03]

coverage:
  - id: D1
    description: "A usable day with both halves n>=20 renders exactly two filled <path> curves (prior-left in prior tokens, recent-right in recent tokens), 1.5px stroke, zero rug dots"
    requirement: "TREND-01"
    verification:
      - kind: unit
        ref: "src/app/TrendDayChart.test.tsx#renders two filled curve paths (prior + recent), no rug dots, for a day with both halves n>=20"
        status: pass
    human_judgment: false
  - id: D2
    description: "A usable day with exactly one half n<20 renders that half as jittered rug dots bounded to [cx, cx+side*maxHalfWidth] (never crossing cx) while the healthy half still draws its curve"
    requirement: "TREND-02"
    verification:
      - kind: unit
        ref: "src/app/TrendDayChart.test.tsx#renders one curve + a jittered rug (bounded to its own half) when exactly one half is n<20"
        status: pass
    human_judgment: false
  - id: D3
    description: "A usable day with both halves n<20 renders zero curve paths and dots on both sides (dual rug, reads as no-curve-today not an error); an unusable day still renders the unchanged 'Not enough data' placeholder with no svg"
    requirement: "TREND-02"
    verification:
      - kind: unit
        ref: "src/app/TrendDayChart.test.tsx#renders dual rug strips (zero curve paths) when both halves are n<20 / renders the \"Not enough data\" placeholder for an unusable day, no svg"
        status: pass
    human_judgment: false
  - id: D4
    description: "Two per-half mean-tick <line>s render at y(recentMean)/y(priorMean) extending side*29px from cx in --color-chart-mean, each wrapping a native <title>; the actual diamond renders at x=cx wrapping its native <title>; Copywriting Contract tooltip strings match exactly and no title ever contains NaN/undefined"
    requirement: "TREND-03"
    verification:
      - kind: unit
        ref: "src/app/TrendDayChart.test.tsx#renders two per-half mean-tick lines and the actual diamond, with exact Copywriting Contract tooltips (+ no-NaN/no-undefined title scan in every other test)"
        status: pass
    human_judgment: false
  - id: D5
    description: "App.tsx and TrendRow.tsx flow the two-sample TrendDayResult through with no structural change and no new fetch; project-wide npx tsc -b --noEmit and npm run build are green end-to-end"
    requirement: "TREND-01"
    verification:
      - kind: other
        ref: "npx tsc -b --noEmit (0 errors) and npm run build (succeeds) across the full App.tsx -> TrendRow.tsx -> TrendDayChart.tsx flow"
        status: pass
      - kind: unit
        ref: "src/app/TrendRow.test.tsx (4/4 passing, including the populated-state svg+legend assertion)"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-07-23
status: complete
---

# Phase 8 Plan 3: Split-Violin TrendDayChart Render Summary

**Rewrote the per-day trend tile from a dot-strip + single mean line into a split violin — two `ViolinHalf` marks (filled KDE curve or bounded jittered rug), two per-half mean ticks whose gap is the climate-shift signal, and the preserved actual-value diamond, all sharing one explicit-margin pixel scale — restoring project-wide green typecheck across Phase 8.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-07-23T10:25:11Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `TrendDayChart.tsx`'s usable branch is now a split violin: `buildViolinPaths` (from Plan 08-02) feeds two `makeViolinShape` custom Recharts shapes — a filled `<path>` curve when a half's `n>=20`, or a jittered rug of raw sample dots bounded to `[cx, cx+side*maxHalfWidth]` when it isn't — with prior drawing left in prior tokens and recent drawing right in recent tokens.
- The single full-width mean `ReferenceLine` was replaced by two short per-half mean-tick `<line>` marks (`makeMeanTickShape`, `side*MEAN_TICK_LEN` from `cx`, `--color-chart-mean` both sides) — the vertical gap between them is the climate-shift read.
- `makeActualShape` is reused verbatim for the diamond at `x=cx`; its "vs. 30-yr avg" tooltip baseline is now the sample-weighted combined mean of `[...recentSamples, ...priorSamples]`.
- Introduced an explicit `PLOT_MARGIN`/`yFromValue()` pixel-mapping (matching Recharts' own default margin verbatim, confirmed against `node_modules`) so every precomputed mark (violin curve/rug, mean ticks) provably shares the SAME y-scale as the diamond's Recharts-domain-driven position — the plan's "all marks share ONE y-scale" must-have.
- Every formatted temperature is guarded against NaN/undefined (`formatTemp`) before reaching a native `<title>`; a truly-empty half's mean tick is skipped entirely rather than rendered at a NaN position (T-08-05, never fires against real data).
- Confirmed `App.tsx` and `TrendRow.tsx` needed **zero code changes** — both already flow the two-sample `TrendDayResult` through their existing `isAnomalyReady` gate / `computeSharedYDomain` / composition unchanged, closing out the "Known Consumer Breakage" documented in Plans 08-01 and 08-02.

## Task Commits

Each task was committed atomically:

1. **Task 1: violinShape render — split-violin tile with mean ticks, rug fallback, preserved diamond + axis** - `87fa5e9` (feat)
2. **Task 2: Confirm App.tsx + TrendRow.tsx wiring flows the two-sample TrendDayResult unchanged** - `3369085` (test)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `src/app/TrendDayChart.tsx` — rewritten usable branch: `makeViolinShape`/`makeMeanTickShape` custom shapes, `CX`/`MAX_HALF_WIDTH`/`MEAN_TICK_LEN`/`PLOT_MARGIN`/`PLOT_TOP`/`PLOT_HEIGHT` constants, `yFromValue`/`formatTemp`/`formatCurveTitle`/`formatRugTitle`/`formatMeanTickTooltip` helpers; `makeActualShape`/`TrendYAxisColumn`/`emptyShape` unchanged
- `src/app/TrendDayChart.test.tsx` — rewritten: both-curve, one-rug (bounded jitter + count assertions), both-rug, mean-tick/diamond Copywriting-Contract-exact tooltip assertions, and the unchanged placeholder case, plus a no-NaN/no-undefined `<title>` scan on every populated test
- `src/app/TrendRow.test.tsx` — populated-state fixture updated from the retired single-sample `samples`/`mean` shape to a realistic `recentSamples`(55)/`priorSamples`(275) two-sample fixture (Rule 3 blocking-fix; `src/app/TrendRow.tsx`/`src/app/App.tsx` themselves needed no edits)

## Decisions Made
- Kept `App.tsx` and `TrendRow.tsx` as literal zero-edit files — Task 2's own `npm run build` verification confirmed the two-sample shape already flows through unchanged, exactly as Plan 08-01's SUMMARY predicted ("`App.tsx`'s wiring needs zero changes... the `.map(computeTrendDay)` call site only changes the array's element type").
- Fixed `TrendRow.test.tsx`'s populated-state fixture as a Rule 3 blocking-fix — it was still using the retired single-sample shape and failed to typecheck against the now-promoted two-sample `TrendDayResult`; this sits squarely within Task 2's own stated verify command (`npm test -- src/app/TrendRow.test.tsx` exits 0).
- Removed the now-dead `buildHistoricalPoints` import and standalone `historicalDotShape` function from `TrendDayChart.tsx` — the dot-strip they powered is fully superseded by the split-violin's curve/rug marks. The rug fallback reuses the identical `r=3`/`--color-chart-historical` styling inline (not via a shared cx/cy-from-props shape function), since it needs a custom per-dot `cx` (jittered, bounded to its own half) that the old shared shape signature can't express. `trend.ts`'s own `buildHistoricalPoints` export and its `trend.test.ts` coverage are untouched (out of this plan's file scope, Plan 08-02's territory).
- Changed the diamond's "vs. 30-yr avg" comparison baseline from the retired `day.mean` to `mean([...day.recentSamples, ...day.priorSamples])` computed inline — concatenation-then-mean naturally sample-weights by each half's count (55 vs 275), matching the UI-SPEC Copywriting Contract's explicit "sample-weighted average" wording. Guaranteed non-empty (no div-by-zero) because `computeTrendDay`'s combined `hasUsableSampleCount` gate requires at least one sample in the full window before `usable:true` is ever returned.
- Declared `PLOT_MARGIN=5` explicitly on `ComposedChart` (matching Recharts' own `CartesianChart` default verbatim — confirmed by reading `node_modules/recharts/lib/chart/CartesianChart.js`'s `defaultMargin`) rather than relying on the implicit default, so the violin/mean-tick marks' precomputed `yFromValue()` pixel positions are provably (not just numerically-coincidentally) locked to the same scale the diamond's Recharts-domain-driven `cy` uses. `TrendYAxisColumn` was left untouched (PD-09) — it already uses the same numeric default, so the shared axis stays aligned without needing the same explicit declaration.
- A `ViolinHalf`'s `mean: null` (the truly-empty, `n===0` case) causes that mean tick to be skipped entirely rather than rendered at a NaN pixel position with a malformed tooltip — a T-08-05 defensive guard that never fires against real data (the spike's statistics finding confirms real per-half sizes are always ~55/275).
- Rendered the two violin halves and two mean ticks as four separate `Scatter` components (plus the diamond's own, five total per populated tile) rather than bundling every mark into one shape callback — mirrors the codebase's existing one-Scatter-per-mark-layer convention and keeps each mark independently queryable in tests.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed TrendRow.test.tsx's stale single-sample fixture**
- **Found during:** Task 2 verification (`npm test -- src/app/TrendRow.test.tsx`)
- **Issue:** The populated-state test still constructed a `TrendDayResult` with the retired `samples`/`mean` fields, which no longer typecheck against the two-sample shape promoted in Plan 08-01 — blocking `tsc -b` and the test run.
- **Fix:** Replaced the fixture with a realistic `recentSamples`(55, spread 15-19)/`priorSamples`(275, spread 13-17) two-sample shape, keeping the same `dateStr`/`actual`/assertions (svg present, "30-year average" legend text present — legend copy is unchanged this plan, Plan 08-04's job).
- **Files modified:** `src/app/TrendRow.test.tsx`
- **Commit:** `3369085`

No other deviations — the rest of the plan executed exactly as written, including the App.tsx/TrendRow.tsx "verify, edit only if the typechecker demands" instruction resolving to zero edits in either file.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None. Every mark (curve, rug, mean tick, diamond) is wired to real geometry/data; no hardcoded empty/placeholder values were introduced.

## Threat Flags
None. All threats identified in this plan's `<threat_model>` (T-03-07 raw-HTML sink, T-08-05 malformed DOM, T-08-06 render throw, T-08-SC supply chain) were mitigated as specified — no new surface introduced beyond what the threat model already covers.

## Next Phase Readiness
- `TrendDayChart.tsx` and `TrendRow.tsx` are ready for Plan 08-04's `TrendLegend.tsx` rewrite — the legend's draft copy (5 items: prior/recent violin swatches, one mean-tick swatch, the actual diamond, and a new rug-dot-cluster item) is already scoped in `08-UI-SPEC.md` and needs the reviewer copy round-trip (PD-10) before landing.
- Project-wide `npx tsc -b --noEmit` and `npm test` are fully green (183/183 tests, 18/18 files) — no outstanding Known Consumer Breakage remains from Plans 08-01/08-02.
- The `--color-chart-prior/-recent-*` tokens (Plan 08-02) are now actually consumed by `TrendDayChart.tsx`'s render, so Plan 08-04's legend swatches can reference the same tokens with a working visual precedent already in the DOM.

---
*Phase: 08-split-violin-trend-view*
*Completed: 2026-07-23*

## Self-Check: PASSED

All modified files exist on disk (`src/app/TrendDayChart.tsx`, `src/app/TrendDayChart.test.tsx`, `src/app/TrendRow.test.tsx`, this SUMMARY.md). Both task commit hashes (`87fa5e9`, `3369085`) verified present in git log.
