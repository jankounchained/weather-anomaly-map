---
phase: 03-historical-trend-charts-edge-cases
plan: 02
subsystem: api
tags: [typescript, vitest, open-meteo, anomaly-math, forecast-api]

# Dependency graph
requires:
  - phase: 02-current-conditions-anomaly-engine
    provides: computeAnomalyForToday, filterDayOfYearWindow, getCurrentWeather, useCurrentWeather, getHistoricalBaseline
provides:
  - "hasUsableSampleCount(samples, totalYears) - the single shared usable-data gate (D-09/D-10)"
  - "computeTrendDay(daily, dateStr, actualTemp) - per-day trend chart input or unusable marker (D-11/D-14)"
  - "TrendDayResult discriminated union type"
  - "getCurrentWeather's daily field (7 recent daily means, single request, D-13)"
  - "useCurrentWeather.recentDaily: DailySeries | null"
affects: [03-03, 03-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single shared threshold gate (hasUsableSampleCount) called by every consumer of 'is this baseline usable' rather than duplicated inline checks"
    - "Combining a second API param set (daily/past_days/forecast_days) onto an existing single-purpose fetch function rather than adding a parallel fetch/hook"

key-files:
  created: []
  modified:
    - src/anomaly/anomaly.ts
    - src/anomaly/types.ts
    - src/anomaly/anomaly.test.ts
    - src/weather/types.ts
    - src/weather/client.ts
    - src/weather/client.test.ts
    - src/weather/useCurrentWeather.ts

key-decisions:
  - "computeAnomalyForToday's old `samples.length < 2` gate retrofitted to hasUsableSampleCount per D-10 - today's anomaly and all 7 trend days now share one usable-data rule"
  - "computeTrendDay follows computeAnomalyForToday's exact year-derivation structure (min/max year from daily.time) rather than accepting startYear/endYear as params, for symmetry with the existing function"
  - "getCurrentWeather extended in place (not a new function/hook) to carry the 7-day recentDaily series in the same forecast request as current.temperature_2m, per RESEARCH.md Open Question 2's recommendation"

patterns-established:
  - "One threshold expression (Math.ceil(totalYears/2)) lives in exactly one function; grep-verifiable single-source-of-truth for a business rule shared across multiple call sites"

requirements-completed: [VIZ-01, ROBU-01]

coverage:
  - id: D1
    description: "hasUsableSampleCount(samples, totalYears) is the single usable-data gate, called by both computeAnomalyForToday and computeTrendDay"
    requirement: "ROBU-01"
    verification:
      - kind: unit
        ref: "src/anomaly/anomaly.test.ts#hasUsableSampleCount gates on ceil(totalYears/2)"
        status: pass
      - kind: unit
        ref: "src/anomaly/anomaly.test.ts#hasUsableSampleCount rounds the odd-totalYears boundary up"
        status: pass
    human_judgment: false
  - id: D2
    description: "computeAnomalyForToday now rejects a sparse 30-year baseline (2 samples) that the old >=2-samples floor would have accepted (D-10 regression)"
    requirement: "ROBU-01"
    verification:
      - kind: unit
        ref: "src/anomaly/anomaly.test.ts#computeAnomalyForToday returns null for a sparse 30-year baseline that clears the old floor but fails the D-10 stricter gate (regression)"
        status: pass
    human_judgment: false
  - id: D3
    description: "computeTrendDay returns a usable chart-input object or an unusable marker, gated on both null/non-finite actual temp and the shared sample-count threshold"
    requirement: "VIZ-01"
    verification:
      - kind: unit
        ref: "src/anomaly/anomaly.test.ts#computeTrendDay (4 cases: null actual, non-finite actual, sparse window, healthy day)"
        status: pass
    human_judgment: false
  - id: D4
    description: "getCurrentWeather issues one forecast request returning current.temperature_2m plus a 7-entry daily series (past_days=6, forecast_days=1), throwing on malformed/mismatched daily data"
    requirement: "VIZ-01"
    verification:
      - kind: unit
        ref: "src/weather/client.test.ts#getCurrentWeather (param assertions, healthy 7/7 resolution, mismatched-length throw, missing-daily throw)"
        status: pass
    human_judgment: false
  - id: D5
    description: "useCurrentWeather exposes recentDaily: DailySeries | null through the existing idle/loading/resolved contract"
    requirement: "VIZ-01"
    verification: []
    human_judgment: true
    rationale: "No dedicated hook-level test exists for useCurrentWeather (matches the existing untested pattern for useHistoricalBaseline); correctness is covered transitively by client.test.ts plus the lint/build gates confirming every return branch typechecks against the extended UseCurrentWeatherResult. Flagging for optional human spot-check rather than a false auto-pass."

duration: 10min
completed: 2026-07-15
status: complete
---

# Phase 3 Plan 2: Trend Data & Statistics Pipeline Summary

**Shared `hasUsableSampleCount` gate (D-09/D-10) unifies today's anomaly and per-day trend usability; `getCurrentWeather` now returns the 7 recent daily means in one forecast request (D-13), exposed via `useCurrentWeather.recentDaily`.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-15T11:15:00+02:00 (approx.)
- **Completed:** 2026-07-15T11:24:54+02:00
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Added `hasUsableSampleCount(samples, totalYears)` as the single "at least half the years" usable-data gate, replacing `computeAnomalyForToday`'s old `samples.length < 2` floor (D-09/D-10) - the retrofit is a real, tested behavior change: a sparse 30-year baseline that used to pass now correctly returns `null`.
- Added `computeTrendDay(daily, dateStr, actualTemp)` returning `{ usable: true, samples, mean, actual, dateStr }` or `{ usable: false, dateStr }`, routed through the same shared gate (D-11/D-14) - one code path for both a genuine data desert and a fetch-timing gap.
- Extended `getCurrentWeather` to request `daily=temperature_2m_mean&past_days=6&forecast_days=1` alongside the existing `current=temperature_2m` param - one HTTP request now returns today's temperature plus the 7 most recent daily means, oldest-to-today, sidestepping the archive API's observation lag (D-13).
- Added a V5 structural guard on the new `daily` field (throws on missing/non-array/mismatched-length arrays; individual null values still allowed through for D-14's downstream handling).
- `useCurrentWeather` now exposes `recentDaily: DailySeries | null` through its existing idle/loading/resolved contract.

## Task Commits

Each task was committed atomically:

1. **Task 1: shared hasUsableSampleCount gate + computeTrendDay + D-10 retrofit** - `b2ba76d` (feat)
2. **Task 2: extend getCurrentWeather + useCurrentWeather to carry the 7 recent daily means (single request)** - `a046f38` (feat)

_Note: Both tasks were marked `tdd="true"` in the plan; tests were written alongside the implementation in the same commit per this project's established single-commit-per-task convention (matching Phase 2's prior plans) rather than separate RED/GREEN commits._

## Files Created/Modified
- `src/anomaly/anomaly.ts` - added `hasUsableSampleCount`, `computeTrendDay`; retrofitted `computeAnomalyForToday`'s gate
- `src/anomaly/types.ts` - added `TrendDayResult` discriminated union
- `src/anomaly/anomaly.test.ts` - `hasUsableSampleCount` boundary block, D-10 regression case, `computeTrendDay` block, audited/annotated existing `computeAnomalyForToday` fixtures against the stricter gate
- `src/weather/types.ts` - `CurrentWeatherResponse.daily` (optional), `UseCurrentWeatherResult.recentDaily`
- `src/weather/client.ts` - `getCurrentWeather` requests + validates the `daily` field
- `src/weather/client.test.ts` - daily/past_days/forecast_days param assertions, healthy 7/7 case, mismatched-length and missing-daily throw cases
- `src/weather/useCurrentWeather.ts` - `recentDaily` threaded through every return branch (idle/loading/resolved) and the `.then`/`.catch` continuation

## Decisions Made
- Retrofitted `computeAnomalyForToday`'s gate in place rather than leaving the old `< 2` check alongside the new helper - D-10 requires exactly one usable-data rule, so the old inline check was removed, not just supplemented.
- `computeTrendDay` mirrors `computeAnomalyForToday`'s year-derivation approach (deriving `startYear`/`endYear` from `daily.time`'s min/max year internally) rather than accepting them as parameters, keeping the two functions structurally parallel per the plan's `read_first` guidance.
- Kept the existing three `computeAnomalyForToday` test fixtures for the happy-path/degenerate-variance cases since their small `totalYears` (2) values already clear the new `ceil(totalYears/2)=1` threshold with their existing sample counts - no widening was needed for those two. The third existing fixture ("fewer than 2 samples" with a single represented year) DID silently pass under the new gate (1 sample clears `ceil(1/2)=1`), so it was rewritten to a 3-year/1-sample scenario that still correctly fails the new threshold, preserving the test's original intent without silently going green for the wrong reason.

## Deviations from Plan

None - plan executed exactly as written. The one interpretive judgment call (widening/rewriting the third `computeAnomalyForToday` fixture rather than leaving it as-is) is documented above under Decisions Made since it was explicitly anticipated and instructed by the plan's Task 1 action text ("audit the existing computeAnomalyForToday cases... any that expect a non-null result must have their synthetic fixture widened... so the retrofit does not silently break a previously-green assertion") - this is planned work, not a deviation.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `computeTrendDay` and `useCurrentWeather.recentDaily` are both ready for Plan 03 to consume: `App.tsx` can loop over `current.recentDaily.time`, call `computeTrendDay(baseline.daily, dateStr, current.recentDaily.values[i])` for each of the 7 days, and pass the resulting `TrendDayResult[]` into the new `TrendRow`/`TrendDayChart` components.
- `AnomalyCard.tsx` was intentionally left unmodified - the stricter D-10 gate already flows into it transitively via `computeAnomalyForToday` returning `null` in more cases, which its existing `anomaly === null` error branch already handles correctly (confirmed: no diff to this file in either task commit).
- No blockers for Plan 03 (chart rendering) or Plan 04 (layout/human-verify checkpoint).

---
*Phase: 03-historical-trend-charts-edge-cases*
*Completed: 2026-07-15*

## Self-Check: PASSED

All 7 created/modified source files and the SUMMARY.md file exist on disk. Both task commits (`b2ba76d`, `a046f38`) verified present in git log.
