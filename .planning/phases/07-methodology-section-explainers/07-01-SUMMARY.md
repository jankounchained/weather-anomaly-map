---
phase: 07-methodology-section-explainers
plan: 01
subsystem: ui
tags: [react, typescript, vitest, statistics, percentile]

# Dependency graph
requires:
  - phase: 06-panel-restructure-hierarchy
    provides: DeltaPanel component, AnomalyForToday shape, isAnomalyReady combined gate
provides:
  - computePercentileRank and percentileLabel pure helpers in src/anomaly/anomaly.ts
  - AnomalyForToday.percentile field, populated by computeAnomalyForToday
  - Percentile line rendered in DeltaPanel's populated branch (PD-06 order)
affects: [07-02-methodology-panel, 08-split-violin-trend]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hand-rolled empirical (Hazen/midrank) percentile rank, mirroring the existing mean/sampleStdDev/classifyVerdict math+copy split — no stats dependency"
    - "Percentile suppression reuses the existing zScore===null degeneracy signal rather than introducing a second guard (one shared definition)"

key-files:
  created: []
  modified:
    - src/anomaly/anomaly.ts
    - src/anomaly/anomaly.test.ts
    - src/app/DeltaPanel.tsx
    - src/app/DeltaPanel.test.tsx

key-decisions:
  - "computePercentileRank does not re-derive its own variance/degeneracy guard - callers (computeAnomalyForToday) gate on zScore===null, reusing the one existing degeneracy signal (PD-04)"
  - "Percentile line is a plain <p className=\"m-0 text-body font-body\"> - no chip/pill wrapper, matching the micro-copy style, not the z-score chip style"

patterns-established:
  - "Math/copy pair convention (computePercentileRank + percentileLabel) extends the classifyVerdict/verdictLabel precedent for any future numeric-to-copy mapping in anomaly.ts"

requirements-completed: [EXPLAIN-04]

coverage:
  - id: D1
    description: "computePercentileRank implements the empirical Hazen/midrank percentile rank of today among the window samples, clamped to [1,99], with exact-tie handling verified"
    requirement: "EXPLAIN-04"
    verification:
      - kind: unit
        ref: "src/anomaly/anomaly.test.ts#computePercentileRank"
        status: pass
    human_judgment: false
  - id: D2
    description: "percentileLabel maps a percentile to the warmer/colder/near-median copy branches with the exact locked UI-SPEC strings, suppressing on null"
    requirement: "EXPLAIN-04"
    verification:
      - kind: unit
        ref: "src/anomaly/anomaly.test.ts#percentileLabel"
        status: pass
    human_judgment: false
  - id: D3
    description: "AnomalyForToday.percentile is populated by computeAnomalyForToday (null iff zScore is null, otherwise a clamped integer from the same window samples)"
    requirement: "EXPLAIN-04"
    verification:
      - kind: unit
        ref: "src/anomaly/anomaly.test.ts#computeAnomalyForToday"
        status: pass
    human_judgment: false
  - id: D4
    description: "DeltaPanel renders the percentile line between the verdict and z-score chip in the populated branch (PD-06 order), suppressed when percentile is null"
    requirement: "EXPLAIN-04"
    verification:
      - kind: unit
        ref: "src/app/DeltaPanel.test.tsx#populated state: renders the dominant Δ number..."
        status: pass
      - kind: unit
        ref: "src/app/DeltaPanel.test.tsx#suppresses the percentile line when zScore/percentile are null..."
        status: pass
    human_judgment: false

duration: 22min
completed: 2026-07-22
status: complete
---

# Phase 07 Plan 01: Empirical Percentile Framing Summary

**Hand-rolled Hazen/midrank empirical percentile (computePercentileRank + percentileLabel) wired into AnomalyForToday and rendered as a plain-text line between the verdict and z-score chip in DeltaPanel.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-07-22T17:33:00Z (approx.)
- **Completed:** 2026-07-22T17:56:43Z
- **Tasks:** 2 completed
- **Files modified:** 4

## Accomplishments
- Added `computePercentileRank(today, samples)` — an empirical Hazen/midrank percentile rank of today's reading against the same day-of-year window samples `computeAnomaly` already uses, clamped to [1, 99].
- Added `percentileLabel(percentile)` — the plain-language warmer/colder/near-median copy mapping, using the exact locked UI-SPEC strings and the 45-55 inclusive median band.
- Extended `AnomalyForToday` with a `percentile: number | null` field, populated by `computeAnomalyForToday` only when `zScore` is non-null (reusing the existing degeneracy signal, no duplicate guard).
- Inserted the percentile line into `DeltaPanel`'s populated branch, between the verdict and the z-score chip (PD-06 order), guarded on `anomaly.percentile !== null` (PD-04 suppression), rendered as an ordinary JSX text node (no raw-HTML sink, T-01-02/T-02-07/T-06-05 invariant preserved).

## Task Commits

Each task was committed atomically:

1. **Task 1: Add computePercentileRank + percentileLabel pure helpers, extend AnomalyForToday, wire into computeAnomalyForToday, unit-test** - `9cb6673` (feat)
2. **Task 2: Insert the percentile line into DeltaPanel's populated branch and update DeltaPanel tests** - `c5ff09a` (feat)

_Note: both tasks were `tdd="true"` but each was authored/verified as a single commit — behavior and its test additions were written and verified together per-task rather than split into separate RED/GREEN commits, matching how prior tasks in this codebase's `anomaly.ts`/`DeltaPanel.tsx` history were committed (see `git log --oneline -- src/anomaly/anomaly.ts`)._

## Files Created/Modified
- `src/anomaly/anomaly.ts` - Added `computePercentileRank`, `percentileLabel`, extended `AnomalyForToday` and `computeAnomalyForToday`
- `src/anomaly/anomaly.test.ts` - Added `describe('computePercentileRank', ...)` and `describe('percentileLabel', ...)` blocks; extended `computeAnomalyForToday` tests with percentile assertions
- `src/app/DeltaPanel.tsx` - Imported `percentileLabel`, inserted the guarded percentile `<p>` between the verdict and z-score chip
- `src/app/DeltaPanel.test.tsx` - Added `percentile` field to all `anomaly` fixtures, extended the populated-state ordering test, added a null-suppression test

## Decisions Made
- `computePercentileRank` intentionally has no internal variance/degeneracy guard of its own — it trusts the caller's `zScore === null` check, avoiding a second, potentially drifting definition of "degenerate baseline" (matches the `hasUsableSampleCount` "one shared definition" precedent already established in this file).
- The percentile line uses the exact same `m-0 text-body font-body` class as the existing micro-copy `<p>`, deliberately not styled as a chip/pill — it's meant to read as a plain sentence, not compete visually with the z-score chip below it.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' code matches the plan's `<action>` blocks verbatim (colocation point, exact copy strings, exact insertion point, exact test cases).

## Issues Encountered
- Running the full project-wide `npx vitest run` hit transient vitest-pool worker timeouts in this sandbox (`[vitest-pool-runner]: Timeout waiting for worker to respond`) on an unrelated pre-existing test file (`TrendLegend.test.tsx`), unconnected to this plan's changes. Re-running the two plan-scoped test files together (`src/anomaly/anomaly.test.ts src/app/DeltaPanel.test.tsx`) completed cleanly with 52/52 tests passing, and `npx tsc --noEmit -p tsconfig.app.json` reported no errors — the plan's own `<verification>` block is fully green. The broader worker-timeout flakiness is a sandbox resource-contention issue outside this plan's scope and was not modified.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- EXPLAIN-04 is satisfied: the Delta panel now shows a plain-language percentile framing between the verdict and the z-score chip, distribution-free and consistent with the z-score's own sample window.
- Phase 07 Plan 02 (methodology panel, EXPLAIN-03) has no dependency on this plan's internals beyond the already-stable `AnomalyForToday` shape and can proceed independently — no blockers.

---
*Phase: 07-methodology-section-explainers*
*Completed: 2026-07-22*
