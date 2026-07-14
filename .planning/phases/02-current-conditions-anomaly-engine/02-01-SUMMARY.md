---
phase: 02-current-conditions-anomaly-engine
plan: 01
subsystem: api
tags: [react, typescript, open-meteo, fetch, hooks, vitest]

# Dependency graph
requires:
  - phase: 01-location-picker-shareable-shell
    provides: hasSelection gating pattern, useReverseGeocode async-hook idiom, LocationPanel/LocationDisplay shell
provides:
  - "src/weather/ domain folder (types, fetch client, hook) for Open-Meteo current conditions"
  - "AnomalyCard component shell (current-temperature branch) composed into LocationPanel"
  - "App.tsx wiring of useCurrentWeather alongside useReverseGeocode, same hasSelection gate"
affects: [02-02-PLAN (anomaly delta/z-score/verdict extends AnomalyCard), 02-03-PLAN (human verification checkpoint)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "weather/client.ts throws on failure (distinct error state) rather than reverseGeocode's silent-null fallback"
    - "useCurrentWeather mirrors useReverseGeocode's idle/loading/resolved render-derived-status hook contract exactly"
    - "LocationPanel now accepts optional children, composed below LocationDisplay"

key-files:
  created:
    - src/weather/types.ts
    - src/weather/client.ts
    - src/weather/client.test.ts
    - src/weather/useCurrentWeather.ts
    - src/app/AnomalyCard.tsx
  modified:
    - src/app/LocationPanel.tsx
    - src/app/App.tsx
    - src/app/App.css

key-decisions:
  - "getCurrentWeather throws on non-2xx or malformed temperature_2m (V5 defensive parsing) instead of reverseGeocode's silent-null fallback, since a weather-fetch failure needs its own distinct error state"
  - "useCurrentWeather's catch path resolves tempC/localDate/units to null (not an unhandled rejection), letting AnomalyCard render a generic error branch"

patterns-established:
  - "Pattern: fetch clients that need a distinct error state throw; clients where a UI fallback is acceptable resolve to null (documented divergence from the geocoding precedent)"

requirements-completed: [CURR-01]

coverage:
  - id: D1
    description: "getCurrentWeather fetches Open-Meteo forecast temperature with correct URL params and throws on failure/malformed response"
    requirement: "CURR-01"
    verification:
      - kind: unit
        ref: "src/weather/client.test.ts#getCurrentWeather"
        status: pass
    human_judgment: false
  - id: D2
    description: "localDateFrom derives the pin-local calendar date from Open-Meteo's current.time"
    requirement: "CURR-01"
    verification:
      - kind: unit
        ref: "src/weather/client.test.ts#localDateFrom"
        status: pass
    human_judgment: false
  - id: D3
    description: "useCurrentWeather exposes idle/loading/resolved status gated on hasSelection, with stale-response guarding"
    requirement: "CURR-01"
    verification:
      - kind: unit
        ref: "npm run lint (set-state-in-effect / refs-during-render rules)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Dropping a pin visibly shows today's current temperature in the panel via AnomalyCard"
    requirement: "CURR-01"
    verification: []
    human_judgment: true
    rationale: "Visual/interactive confirmation of the rendered temperature and empty/loading/error branches is deferred to Plan 03's human verification checkpoint for the full card"

duration: 20min
completed: 2026-07-14
status: complete
---

# Phase 2 Plan 1: Current-Temperature Vertical Slice Summary

**Open-Meteo forecast client + useCurrentWeather hook + AnomalyCard shell, wired into App so dropping a pin shows today's live temperature**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-07-14T19:05:01Z
- **Tasks:** 3 completed
- **Files modified:** 8 (5 created, 3 modified)

## Accomplishments
- `src/weather/client.ts` fetches Open-Meteo's `/v1/forecast` (`current=temperature_2m&timezone=auto`), throwing on non-2xx or missing/malformed `temperature_2m` rather than silently returning null
- `useCurrentWeather(lat, lng)` mirrors `useReverseGeocode`'s idle/loading/resolved contract, gated on `hasSelection` so no fetch fires against the default map center
- `AnomalyCard` renders empty/loading/error/current-temperature branches and is composed into `LocationPanel` below `LocationDisplay`, wired through `App.tsx`

## Task Commits

Each task was committed atomically:

1. **Task 1: weather types + forecast client (getCurrentWeather, localDateFrom) with tests** - `d28c4d9` (test, RED) → `f06242a` (feat, GREEN)
2. **Task 2: useCurrentWeather hook (idle/loading/resolved, gated, stale-guarded)** - `44ae23f` (feat)
3. **Task 3: AnomalyCard shell (current temp) + compose into panel + wire App** - `ed01f07` (feat)

**Plan metadata:** (pending final commit)

_Note: Task 1 used the mandated TDD flow (`test="true"`): RED commit `d28c4d9` (test fails - `client.ts` doesn't exist), then GREEN commit `f06242a` (all 5 tests pass)._

## Files Created/Modified
- `src/weather/types.ts` - `CurrentWeatherResponse`, `WeatherStatus`, `UseCurrentWeatherResult`
- `src/weather/client.ts` - `getCurrentWeather` (throws on failure/malformed data), `localDateFrom`, `CURRENT_TIMEOUT_MS`
- `src/weather/client.test.ts` - URL-param, success, throw-on-non-2xx, throw-on-missing-field, and `localDateFrom` split tests
- `src/weather/useCurrentWeather.ts` - idle/loading/resolved hook, stale-response guarded, catch path nulls out on failure
- `src/app/AnomalyCard.tsx` - empty/loading/error/current-temperature branches, plain JSX text nodes only
- `src/app/LocationPanel.tsx` - now accepts optional `children`, rendered below `LocationDisplay`
- `src/app/App.tsx` - wires `useCurrentWeather` with the same `hasSelection ? lat : null` gate as `useReverseGeocode`, composes `AnomalyCard` as `LocationPanel`'s child
- `src/app/App.css` - `anomaly-card` styles (loading spinner reuses `location-display-spin` keyframes, error branch uses `--color-destructive`)

## Decisions Made
- `getCurrentWeather` throws instead of following `reverseGeocode`'s silent-null-fallback pattern, per the plan's explicit V5/T-02-01 requirement that a weather-fetch failure needs a distinct error state
- `useCurrentWeather`'s `.catch` resolves a "failed" `ResolvedWeather` (all-null fields) rather than leaving an unhandled rejection, so `AnomalyCard`'s error branch has a well-defined trigger (`tempC === null` while `status === 'resolved'`)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `src/weather/` domain and `AnomalyCard` shell are in place for Plan 02 to extend with delta/z-score/verdict and the D-09 combined-loading gate (current + baseline both resolved)
- `npm test`, `npm run lint`, and `npm run build` all pass (43/43 tests green)

---
*Phase: 02-current-conditions-anomaly-engine*
*Completed: 2026-07-14*

## Self-Check: PASSED

All 5 created files found on disk. All 4 task commits (`d28c4d9`, `f06242a`, `44ae23f`, `ed01f07`) found in git log.
