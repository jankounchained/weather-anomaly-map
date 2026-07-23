---
phase: 08-split-violin-trend-view
plan: 01
subsystem: anomaly-statistics
tags: [kde, silverman, gaussian-kde, statistics, typescript, vitest, discriminated-union]

# Dependency graph
requires:
  - phase: 03-trend-visualization
    provides: computeTrendDay, filterDayOfYearWindow, hasUsableSampleCount, computeWindowSamples, mean, sampleStdDev
provides:
  - "src/anomaly/kde.ts: hand-rolled Gaussian KDE + Silverman bandwidth module (silvermanBandwidth, kdeAt, kdeCurve, quantile, iqr) with the per-half curve-vs-rug gate (halfDrawsCurve, N_MIN=20)"
  - "computeTrendDay two-sample return: recentSamples/priorSamples/recentMean/priorMean re-windowed off the SAME baseline.daily series, no new fetch"
  - "TrendDayResult discriminated union promoted to the two-sample usable:true shape (single-sample samples/mean retired)"
affects: [08-02-violin-geometry, 08-03-violin-render, 08-04-trend-legend]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "kde.ts mirrors anomaly.ts's hand-rolled-math module discipline (doc-comment per function citing requirement/decision IDs, guards against NaN/Infinity/div-by-zero, no stats dependency)"
    - "Per-half data-sufficiency gate (halfDrawsCurve, PD-04 gate 2) is its own named helper, structurally distinct from the whole-tile hasUsableSampleCount desert gate (PD-04 gate 1) — same 'one shared definition' discipline as hasUsableSampleCount's own precedent"
    - "computeWindowSamples now also returns endYear so computeTrendDay can derive the recent/prior year split without re-deriving year-extraction logic inline"

key-files:
  created: [src/anomaly/kde.ts, src/anomaly/kde.test.ts]
  modified: [src/anomaly/types.ts, src/anomaly/anomaly.ts, src/anomaly/anomaly.test.ts]

key-decisions:
  - "Reused anomaly.ts's existing sampleStdDev (n-1, guarded <2→0) inside silvermanBandwidth instead of re-declaring a local stdDev/mean pair — avoids two implementations of the same variance formula, matching the hasUsableSampleCount 'one shared definition' precedent"
  - "TrendDayResult's usable:true shape promoted (not kept alongside) to recentSamples/priorSamples/recentMean/priorMean/actual, per the plan's assumption-delta decision — every consumer migrates to the two-half model across Plans 02-04 of this phase"
  - "computeWindowSamples' return type extended with endYear (non-breaking addition) so computeTrendDay derives the recent/prior year boundaries from the SAME year-extraction logic rather than duplicating it inline"

patterns-established:
  - "Silverman bandwidth = 0.9 * min(sd, iqr/1.349) * n^(-1/5) * factor (factor defaults to 1, textbook Silverman, no per-half tuning)"
  - "halfDrawsCurve(n) = n >= N_MIN (20), inclusive floor, is the ONE place N_MIN appears"

requirements-completed: [TREND-01, TREND-02]

coverage:
  - id: D1
    description: "kde.ts exports a hand-rolled Gaussian KDE + Silverman module (silvermanBandwidth, kdeAt, kdeCurve, quantile, iqr) with guards against NaN/Infinity/div-by-zero on degenerate input (n<2, all-equal, empty)"
    requirement: "TREND-01"
    verification:
      - kind: unit
        ref: "src/anomaly/kde.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "halfDrawsCurve(n) implements the per-half curve-vs-rug gate with N_MIN=20, inclusive at the floor (n=20 true, n=19 false), structurally distinct from hasUsableSampleCount"
    requirement: "TREND-02"
    verification:
      - kind: unit
        ref: "src/anomaly/kde.test.ts#halfDrawsCurve"
        status: pass
    human_judgment: false
  - id: D3
    description: "computeTrendDay returns a two-sample result (recentSamples/priorSamples/recentMean/priorMean/actual) re-windowed off the SAME daily series with no new fetch; TrendDayResult's usable:true shape is promoted to this two-sample model, the old single-sample shape retired"
    requirement: "TREND-01"
    verification:
      - kind: unit
        ref: "src/anomaly/anomaly.test.ts#computeTrendDay"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-07-23
status: complete
---

# Phase 8 Plan 1: KDE Module + Two-Sample computeTrendDay Summary

**Hand-rolled Gaussian KDE + Silverman bandwidth module (`kde.ts`) with a per-half n_min=20 curve-vs-rug gate, plus `computeTrendDay`'s transformation from a single-sample to a two-sample (recent-5yr / prior-25yr) result — the pure statistics + data-shape core the split-violin trend tile stands on.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-23T08:11:59Z
- **Completed:** 2026-07-23T08:21:02Z
- **Tasks:** 2
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- `src/anomaly/kde.ts`: `silvermanBandwidth`, `kdeAt`, `kdeCurve`, `quantile`, `iqr`, and the per-half `halfDrawsCurve` (N_MIN=20) gate — all guarded against NaN/Infinity/div-by-zero on degenerate input, ported from the validated spike source
- `computeTrendDay` now derives the recent-5-complete-year / prior-25-year split off the SAME `baseline.daily` series via two `filterDayOfYearWindow` calls (no new fetch), gated by the unchanged whole-tile `hasUsableSampleCount` check
- `TrendDayResult`'s `usable: true` member promoted to the two-sample shape (`recentSamples`/`priorSamples`/`recentMean`/`priorMean`/`actual`); the old single-sample `samples`/`mean` fields are retired, not kept alongside

## Task Commits

Each task was committed atomically:

1. **Task 1: Hand-rolled Gaussian KDE + Silverman module (kde.ts) with the per-half n_min gate** - `a34e469` (feat)
2. **Task 2: computeTrendDay two-sample return + TrendDayResult discriminated union** - `d0eb1a7` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `src/anomaly/kde.ts` - hand-rolled Gaussian KDE + Silverman bandwidth module, per-half `halfDrawsCurve` gate (N_MIN=20)
- `src/anomaly/kde.test.ts` - Vitest coverage: Silverman formula, guards, `kdeAt`/`kdeCurve` shape, `halfDrawsCurve` n=19/n=20 boundary
- `src/anomaly/types.ts` - `TrendDayResult` promoted to the two-sample discriminated union
- `src/anomaly/anomaly.ts` - `computeTrendDay` rewritten for the two-sample split; `computeWindowSamples` now also returns `endYear`
- `src/anomaly/anomaly.test.ts` - two-sample healthy-day test, zero-sample data-desert test, and a contract test proving the retired `samples`/`mean` fields are gone

## Decisions Made
- Reused `anomaly.ts`'s existing `sampleStdDev` inside `silvermanBandwidth` rather than re-declaring a local `stdDev`/`mean` pair, avoiding a duplicate variance-formula implementation (one shared definition, matching `hasUsableSampleCount`'s own documented precedent). The plan's acceptance criteria (grep for `from './anomaly'` + no local `function mean`) are satisfied by this import; the plan's prose truth mentioning a `mean` import specifically is a looser paraphrase of the same "don't re-declare, reuse anomaly.ts" intent, not a literal separate requirement to import `mean` unused.
- Extended `computeWindowSamples`'s return type with `endYear` (additive, non-breaking — no existing caller destructures against an exact object shape) so `computeTrendDay` derives the recent/prior year boundaries from the same shared year-extraction logic instead of duplicating it inline.

## Deviations from Plan

None - plan executed exactly as written for this plan's own file scope (`kde.ts`, `kde.test.ts`, `types.ts`, `anomaly.ts`, `anomaly.test.ts`). All must-have truths, acceptance criteria greps, and behavior tests pass.

### Known Consumer Breakage (expected, not a Plan 01 defect)

Full-project `npx tsc -b --noEmit` currently fails with 9 errors, ALL in files outside this plan's scope:

- `src/app/trend.ts` (`computeSharedYDomain` references `day.samples`)
- `src/app/trend.test.ts`
- `src/app/TrendDayChart.tsx` (references `.samples`/`.mean`)
- `src/app/TrendDayChart.test.tsx`
- `src/app/TrendRow.test.tsx`

These files still reference the now-retired single-sample `.samples`/`.mean` fields on `TrendDayResult`. This is the intended, documented consequence of this phase's bottom-up sequencing (per the plan's own `assumption_delta_decision`: "every consumer... migrates to the two-half model **in this same phase**" — not in this plan). All five files are explicitly listed in `files_modified` for Plan 08-02 (`src/app/trend.ts`, `src/app/trend.test.ts`) and Plan 08-03 (`src/app/TrendDayChart.tsx`, `src/app/TrendDayChart.test.tsx`, `src/app/TrendRow.tsx`... `App.tsx`), which will restore project-wide green typecheck. This plan's own module (`src/anomaly/*`) typechecks cleanly in isolation — zero errors originate from `kde.ts`, `kde.test.ts`, `types.ts`, `anomaly.ts`, or `anomaly.test.ts`.

No stub tracking needed — no hardcoded empty/placeholder values were introduced; the "breakage" above is a type-level contract change awaiting its downstream migration in the next waves of this same phase.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `kde.ts`'s exports (`silvermanBandwidth`, `kdeAt`, `kdeCurve`, `halfDrawsCurve`) are ready for Plan 08-02's `buildViolinPaths` geometry to consume with ONE shared pooled bandwidth per day (per the statistics reference's "what to avoid: per-half Silverman" guidance).
- `computeTrendDay`'s two-sample return and the promoted `TrendDayResult` type are ready for Plan 08-02 (`computeSharedYDomain`) and Plan 08-03 (`TrendDayChart.tsx`, `TrendRow.tsx`, `App.tsx`) to consume — `App.tsx`'s wiring needs zero changes per the phase's pattern map (the `.map(computeTrendDay)` call site only changes the array's element type).
- Blocker: project-wide `tsc -b --noEmit` will not be green until Plan 08-02 and 08-03 land (see Known Consumer Breakage above) — expected mid-phase state, not a regression to chase down.

---
*Phase: 08-split-violin-trend-view*
*Completed: 2026-07-23*
