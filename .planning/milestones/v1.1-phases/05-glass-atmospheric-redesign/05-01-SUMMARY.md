---
phase: 05-glass-atmospheric-redesign
plan: 01
subsystem: ui
tags: [css, tailwind, anomaly, pure-functions, design-tokens]

# Dependency graph
requires:
  - phase: 04-tailwind-foundation-migration
    provides: Tailwind v4 CSS-first @theme token system in src/index.css
provides:
  - anomalyColor(zScore) and isDaytime(localHour) pure functions in src/anomaly/anomaly.ts
  - localHourFrom(currentTime) pure function and localHour field on UseCurrentWeatherResult
  - VERDICT_LABEL.typical framed zero-delta copy
  - Full glass/anomaly CSS token family, @property --anomaly-color registration, .panel-backdrop classes in src/index.css
affects: [05-02, 05-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Continuous z-score->color mapping via two-segment RGB lerp through a normal anchor (anomalyColor)"
    - "@property-registered CSS custom property for natively interpolable color transitions"

key-files:
  created: []
  modified:
    - src/anomaly/anomaly.ts
    - src/anomaly/anomaly.test.ts
    - src/weather/client.ts
    - src/weather/client.test.ts
    - src/weather/types.ts
    - src/weather/useCurrentWeather.ts
    - src/index.css

key-decisions:
  - "Implemented the RGB two-segment lerp exactly as specified (not OKLCH) to preserve exact-hex unit-test anchors"
  - "localHour defaults to null (not noon) at the data-signal layer - the noon/night-flash-avoidance default is Wave-2's concern in App.tsx, per Pitfall 5's note that this is handled downstream"

patterns-established:
  - "Pure-function-then-unit-test: anomalyColor/isDaytime/localHourFrom are colocated with their existing analogs (classifyVerdict/formatDelta/localDateFrom) and unit-tested with anchor-point exact-equality assertions"
  - "@theme token comment convention: every new token cites its UI-SPEC section/D-number"

requirements-completed: [DESIGN-02, DESIGN-03, DESIGN-05, DESIGN-06, PERF-02]

coverage:
  - id: D1
    description: "anomalyColor(zScore) pure function with exact anchor hex at z=-3/0/null/+3, clamping beyond [-3,3], and midpoint lerp values"
    requirement: DESIGN-02
    verification:
      - kind: unit
        ref: "src/anomaly/anomaly.test.ts#anomalyColor"
        status: pass
    human_judgment: false
  - id: D2
    description: "isDaytime(localHour) half-open [6,20) boundary"
    requirement: DESIGN-03
    verification:
      - kind: unit
        ref: "src/anomaly/anomaly.test.ts#isDaytime"
        status: pass
    human_judgment: false
  - id: D3
    description: "localHourFrom parses pin-local hour from Open-Meteo current.time with zero new fetches; UseCurrentWeatherResult exposes localHour across all lifecycle branches"
    requirement: DESIGN-03
    verification:
      - kind: unit
        ref: "src/weather/client.test.ts#localHourFrom"
        status: pass
    human_judgment: false
  - id: D4
    description: "VERDICT_LABEL.typical reads 'Right on the 30-year average' so a zero/near-normal delta never renders a bare ambiguous 0"
    requirement: DESIGN-06
    verification:
      - kind: unit
        ref: "src/anomaly/anomaly.test.ts#verdictLabel"
        status: pass
    human_judgment: false
  - id: D5
    description: "New @theme glass/anomaly tokens, @property --anomaly-color registration, .panel-backdrop/.is-night::before classes, and --color-chart-historical re-theme all present and production build compiles"
    requirement: DESIGN-05
    verification:
      - kind: other
        ref: "npx vite build (exit 0) + grep assertions for @property/--color-glass-*/--shadow-glass/.panel-backdrop/rgba(87, 83, 78, 0.22)/--color-chart-actual: #ea580c"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-16
status: complete
---

# Phase 5 Plan 1: Foundation Primitives Summary

**Continuous z-score-to-color RGB-lerp function, day/night axis, pin-local hour data signal, framed zero-delta copy, and the full glass/anomaly CSS token + `@property` + `.panel-backdrop` foundation that Wave-2 composition plans consume.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-16T18:40:41Z
- **Completed:** 2026-07-16T18:44:17Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- `anomalyColor(zScore: number | null): string` — pure, exported, two-segment RGB lerp through the cold/normal/hot anchors, exact-hex unit-tested at all four anchor points plus clamp and midpoint spot-checks
- `isDaytime(localHour: number): boolean` — half-open `[6, 20)` daytime range, independent axis from anomaly color
- `localHourFrom(currentTime: string): number` in `src/weather/client.ts`, with `localHour: number | null` now flowing through `UseCurrentWeatherResult` across every lifecycle branch (resolved, error, idle, loading) — zero new network calls
- `VERDICT_LABEL.typical` changed to `"Right on the 30-year average"`, framing the zero-delta case (D-06/D-07) without touching `formatDelta`'s whole-number rounding
- Full glass/anomaly `@theme` token family (`--color-anomaly-cold/normal/hot`, `--color-atmosphere-night-wash`, `--color-glass-surface/border`, `--radius-glass-lg/sm`, `--shadow-glass`), the `--color-chart-historical` re-theme to `rgba(87, 83, 78, 0.22)`, `@property --anomaly-color` registration, and `.panel-backdrop` / `.panel-backdrop.is-night::before` classes in `src/index.css`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add anomalyColor + isDaytime pure functions and the zero-delta verdict copy fix** - `3af9085` (feat)
2. **Task 2: Add the pin-local hour data signal (localHourFrom + localHour field + hook population)** - `78e0e7d` (feat)
3. **Task 3: Add anomaly/glass/backdrop CSS tokens, the @property registration, the panel-backdrop classes, and the chart re-theme token value** - `7e05d57` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src/anomaly/anomaly.ts` - Added `anomalyColor`, `isDaytime`, RGB anchor constants, `lerpChannel`/`toHex` helpers; changed `VERDICT_LABEL.typical` copy
- `src/anomaly/anomaly.test.ts` - Added `anomalyColor`/`isDaytime` describe blocks, updated `verdictLabel` expectation
- `src/weather/client.ts` - Added `localHourFrom` sibling to `localDateFrom`
- `src/weather/client.test.ts` - Added `localHourFrom` describe block
- `src/weather/types.ts` - Added `localHour: number | null` to `UseCurrentWeatherResult`
- `src/weather/useCurrentWeather.ts` - Populated `localHour` in `ResolvedWeather` and all four return branches
- `src/index.css` - New `@theme` tokens, `@property --anomaly-color`, `.panel-backdrop`/`.is-night::before` classes, `--color-chart-historical` re-valued

## Decisions Made
- Implemented the RGB two-segment lerp exactly as specified in the UI-SPEC/RESEARCH — not OKLCH — to keep the exact-hex unit-test anchors valid
- `localHour` stays `null` until resolved at this data-signal layer; the "default to noon while loading" behavior (Pitfall 5, avoiding a night-wash flash) is explicitly Wave-2's concern in `App.tsx`, not this plan's

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `anomalyColor`/`isDaytime` are the single shared color/time source ready for Wave-2 plans to consume in both the backdrop gradient and the hero delta
- `localHour` flows from the weather hook with zero new fetches, ready for `isDaytime(current.localHour ?? 12)` in `App.tsx`
- All new `@theme` tokens, the registered `--anomaly-color` custom property, and `.panel-backdrop`/`.is-night::before` classes are in place for Wave-2's `LocationPanel`/`AnomalyCard`/`TrendRow` composition work
- Full test suite (99 tests) and production build both green; no new dependencies added

---
*Phase: 05-glass-atmospheric-redesign*
*Completed: 2026-07-16*

## Self-Check: PASSED

All 7 modified files confirmed present on disk; all 3 task commits (`3af9085`, `78e0e7d`, `7e05d57`) confirmed present in git log.
