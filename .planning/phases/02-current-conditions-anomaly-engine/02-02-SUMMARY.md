---
phase: 02-current-conditions-anomaly-engine
plan: 02
subsystem: api
tags: [react, typescript, open-meteo, fetch, hooks, vitest, statistics]

# Dependency graph
requires:
  - phase: 02-current-conditions-anomaly-engine (plan 01)
    provides: "src/weather/ domain folder (types, client, useCurrentWeather hook), AnomalyCard shell (current-temperature-only branch), App.tsx wiring with hasSelection gate"
provides:
  - "src/anomaly/ pure, dependency-free statistics module (mean, sampleStdDev, computeAnomaly, classifyVerdict, verdictLabel, formatDelta, windowBounds, filterDayOfYearWindow, computeAnomalyForToday)"
  - "getHistoricalBaseline + useHistoricalBaseline: 30-complete-past-year Open-Meteo archive fetch, idle/loading/resolved hook contract"
  - "AnomalyCard extended with D-09 combined loading gate, D-08 hero delta + verdict + z-score badge, D-07 data-quality tooltip"
affects: [02-03-PLAN (human verification checkpoint), phase-3 (last-7-days trend chart reuses computeAnomaly-adjacent helpers, ROBU-01 no-data messaging)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure math module convention (src/lib/coords.ts) extended to src/anomaly/anomaly.ts: one-line 'why' doc comments citing decision IDs, explicit early-return guards for degenerate inputs"
    - "useHistoricalBaseline mirrors useCurrentWeather's idle/loading/resolved render-derived-status hook contract exactly, with a third variable dependency added to the resolved-lookup key and effect deps"
    - "AnomalyCard's loading branch is a combined two-hook gate (currentStatus !== 'resolved' || baselineStatus !== 'resolved') rather than two independent checks - D-09"

key-files:
  created:
    - src/anomaly/types.ts
    - src/anomaly/anomaly.ts
    - src/anomaly/anomaly.test.ts
    - src/weather/useHistoricalBaseline.ts
  modified:
    - src/weather/types.ts
    - src/weather/client.ts
    - src/weather/client.test.ts
    - src/app/AnomalyCard.tsx
    - src/app/App.tsx
    - src/app/App.css

key-decisions:
  - "getHistoricalBaseline queries archive-api.open-meteo.com over [currentYear-30, currentYear-1] - 30 complete past years, current partial year always excluded to avoid baseline data-leakage (Pitfall 1)"
  - "computeAnomalyForToday derives startYear/endYear from the min/max year present in the passed daily series rather than hard-coding them, keeping anomaly.ts fully decoupled from the fetch layer"
  - "Degenerate variance (zScore null) falls back to verdictTier 'typical' via classifyVerdict(zScore ?? 0), never NaN - Pitfall 2"
  - "formatDelta uses the Unicode minus sign (U+2212), not ASCII hyphen, for negative deltas per D-06's exact reference values"

patterns-established:
  - "Two-hook composition with a single combined loading gate (D-09): App.tsx only calls the pure computeAnomalyForToday when both hook statuses are 'resolved', and AnomalyCard's own loading branch checks both statuses independently - the two checks are kept in sync by construction since both read the same status values"

requirements-completed: [ANOM-01, ANOM-02, ANOM-03, ANOM-04]

coverage:
  - id: D1
    description: "Pure anomaly math engine: mean, sample stddev (n-1), delta/z-score with null-safe degenerate-variance guard, five-tier verdict classification, whole-number delta formatting, Feb-29-folded day-of-year windowing with year-boundary wraparound"
    requirement: "ANOM-01, ANOM-02, ANOM-03, ANOM-04"
    verification:
      - kind: unit
        ref: "src/anomaly/anomaly.test.ts (19 tests, all passing)"
        status: pass
    human_judgment: false
  - id: D2
    description: "getHistoricalBaseline fetches the 30-complete-past-year Open-Meteo archive series with correct URL params and date span, throws on non-2xx or empty/missing daily series"
    requirement: "ANOM-04"
    verification:
      - kind: unit
        ref: "src/weather/client.test.ts#getHistoricalBaseline (5 tests, all passing)"
        status: pass
    human_judgment: false
  - id: D3
    description: "useHistoricalBaseline exposes the archive fetch via the idle/loading/resolved contract with a variable param, gated on hasSelection, satisfying react-hooks lint rules"
    requirement: "ANOM-04"
    verification:
      - kind: unit
        ref: "npm run lint (set-state-in-effect / refs-during-render rules) - pass"
      - kind: unit
        ref: "npm run build (tsc -b type-checks the hook against UseHistoricalBaselineResult) - pass"
    human_judgment: false
  - id: D4
    description: "AnomalyCard reveals hero delta + verdict headline + secondary z-score badge together only after both currentStatus and baselineStatus resolve (D-09), with the D-07 data-quality tooltip and degenerate-variance-safe 'z —' rendering"
    requirement: "ANOM-01, ANOM-02, ANOM-03"
    verification: []
    human_judgment: true
    rationale: "Visual/interactive confirmation of the combined loading gate, hero visual hierarchy, and tooltip copy in a real browser is deferred to Plan 03's human verification checkpoint for the full card"

duration: 7min
completed: 2026-07-14
status: complete
---

# Phase 2 Plan 2: Anomaly Engine Summary

**Pure ±5-day day-of-year anomaly math (sample stddev, null-safe z-score, 5-tier verdict) wired to a 30-year Open-Meteo archive baseline, rendering a hero delta + verdict headline + z-score badge together via a combined-resolve loading gate**

## Performance

- **Duration:** ~7 min
- **Completed:** 2026-07-14T19:13:29Z
- **Tasks:** 3 completed
- **Files modified:** 10 (4 created, 6 modified)

## Accomplishments
- `src/anomaly/anomaly.ts` implements `mean`, `sampleStdDev` (n-1, matches spreadsheet STDEV.S), `computeAnomaly` (null-safe zScore, never NaN/Infinity), `classifyVerdict`/`verdictLabel` (D-03/D-05 five-tier neutral-tone verdicts), `formatDelta` (whole-number, explicit sign per D-06), `windowBounds` (Feb-29 fold, year-boundary wraparound), `filterDayOfYearWindow`, and `computeAnomalyForToday` — all pinned by 19 Vitest cases using hand-computed reference values
- `getHistoricalBaseline` fetches Open-Meteo's `/v1/archive` over the 30 complete past calendar years (current year always excluded — Pitfall 1 data-leakage avoidance), validates the response before returning; `useHistoricalBaseline(lat, lng, variable)` exposes it via the established idle/loading/resolved contract
- `AnomalyCard` now reveals the hero delta, verdict headline, and secondary z-score badge together only once both the current-conditions and baseline hooks resolve (D-09 combined gate), with a D-07 data-quality tooltip and a null-safe "z —" fallback for degenerate-variance locations

## Task Commits

Each task was committed atomically:

1. **Task 1: pure anomaly math engine (window, mean, sample stddev, delta, z-score, verdict) + tests** - `0cdc459` (test, RED) → `76cf731` (feat, GREEN)
2. **Task 2: 30-year archive baseline client + useHistoricalBaseline hook** - `da22dc6` (feat)
3. **Task 3: extend AnomalyCard (delta hero, verdict, z-score badge, tooltip, combined gate) + wire App** - `f9b6a7d` (feat)

**Plan metadata:** (pending final commit)

_Note: Task 1 used the mandated TDD flow (`tdd="true"`): RED commit `0cdc459` (test fails - `anomaly.ts` doesn't exist), then GREEN commit `76cf731` (all 19 tests pass)._

## Files Created/Modified
- `src/anomaly/types.ts` - `BaselineStats`, `AnomalyResult`, `VerdictTier`
- `src/anomaly/anomaly.ts` - pure math: `mean`, `sampleStdDev`, `computeAnomaly`, `VERDICT_LABEL`, `classifyVerdict`, `verdictLabel`, `formatDelta`, `windowBounds`, `filterDayOfYearWindow`, `computeAnomalyForToday`
- `src/anomaly/anomaly.test.ts` - 19 Vitest cases: hand-computed stddev, null-zScore guards, D-05 boundaries, Feb-29 fold, year-boundary wraparound, window filtering, formatDelta signs, degenerate-baseline verdict fallback
- `src/weather/types.ts` - added `ArchiveDailyResponse`, `DailySeries`, `UseHistoricalBaselineResult`
- `src/weather/client.ts` - added `getHistoricalBaseline` (30-complete-past-year archive fetch, throws on failure/empty series) and `ARCHIVE_TIMEOUT_MS = 8000`
- `src/weather/client.test.ts` - added 5 `getHistoricalBaseline` cases: URL params, 30-year date span, throw-on-non-2xx, throw-on-empty-series, throw-on-missing-daily
- `src/weather/useHistoricalBaseline.ts` - idle/loading/resolved hook, gated on `hasSelection`, third `variable` dependency
- `src/app/AnomalyCard.tsx` - added `baselineStatus`/`anomaly` props, D-09 combined loading gate, hero delta/verdict/z-score rendering, D-07 info tooltip
- `src/app/App.tsx` - wires `useHistoricalBaseline` alongside `useCurrentWeather` (same `hasSelection` gate), computes `anomaly` via `computeAnomalyForToday` only when both hooks resolve
- `src/app/App.css` - `anomaly-card__header`/`__info`/`__delta`/`__verdict`/`__zscore` classes implementing the D-08 visual hierarchy on existing design tokens

## Decisions Made
- `formatDelta` uses the Unicode minus sign (U+2212), not the ASCII hyphen, for negative deltas — matches the plan's exact reference value `"−2"` character-for-character
- `computeAnomalyForToday` derives `startYear`/`endYear` from the min/max year actually present in the passed `daily.time` series rather than accepting them as separate params, keeping the pure module fully decoupled from any fetch-layer date logic
- Degenerate variance (`zScore === null`) falls back to `classifyVerdict(0)` → `'typical'`, so the UI never shows an undefined/NaN verdict for a zero-variance baseline (Pitfall 2)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The full anomaly-engine vertical slice (current temp + 30-year baseline + delta/z-score/verdict) is wired end-to-end and ready for Plan 03's human verification checkpoint (visual hierarchy, combined loading behavior, tooltip copy in a real browser)
- `npm test` (67/67), `npm run lint`, and `npm run build` all pass

---
*Phase: 02-current-conditions-anomaly-engine*
*Completed: 2026-07-14*

## Self-Check: PASSED

All 4 created files found on disk (`src/anomaly/types.ts`, `src/anomaly/anomaly.ts`, `src/anomaly/anomaly.test.ts`, `src/weather/useHistoricalBaseline.ts`). All 4 task commits (`0cdc459`, `76cf731`, `da22dc6`, `f9b6a7d`) found in git log.
