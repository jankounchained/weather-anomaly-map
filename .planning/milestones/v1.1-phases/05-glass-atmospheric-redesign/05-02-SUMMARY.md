---
phase: 05-glass-atmospheric-redesign
plan: 02
subsystem: ui
tags: [react, tailwind, css-custom-properties, glassmorphism, atmospheric-ui]

# Dependency graph
requires:
  - phase: 05-glass-atmospheric-redesign
    provides: "anomalyColor(zScore)/isDaytime(localHour) pure functions, localHour data field, @property --anomaly-color registration, .panel-backdrop/.is-night CSS classes, glass @theme tokens (Plan 01)"
provides:
  - "App.tsx computes anomalyColorValue/isNight (noon-default while loading) and threads them to LocationPanel"
  - "LocationPanel as the docked static anomaly-gradient backdrop, bridging --anomaly-color inline, applying the night wash + motion-safe entrance transition only when a pin exists"
  - "LocationDisplay's four branch roots (empty/loading/resolved/coordinate-fallback) restyled onto the translucent glass card"
affects: [05-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single sanctioned inline-style bridge: computed JS value -> CSS custom property (--anomaly-color) -> CSS-driven gradient, keeping all other styling className/token-driven"
    - "Conditional glass/atmospheric treatment gated on hasSelection, preserving a flat neutral fallback before any pin exists (avoids a misleading placeholder gradient)"

key-files:
  created: []
  modified:
    - src/app/App.tsx
    - src/app/LocationPanel.tsx
    - src/app/LocationDisplay.tsx

key-decisions:
  - "LocationPanel destructures hasSelection out of the shared props object (not spread away) so the same value both gates the aside's className/style and continues to flow through ...props into LocationDisplay unchanged"
  - "Imported CSSProperties as a named type (not React.CSSProperties) since LocationPanel.tsx has no default React import and the project's verbatimModuleSyntax requires explicit type-only imports"

patterns-established:
  - "Computed-value-in-render-scope: anomalyColorValue/isNight are plain consts in App.tsx (no useMemo), matching the existing anomaly/trendDays pattern and the project's React-Compiler-handles-memoization convention"

requirements-completed: [DESIGN-01, DESIGN-02, DESIGN-03, PERF-01, PERF-02]

coverage:
  - id: D1
    description: "App.tsx computes anomalyColorValue = anomalyColor(anomaly?.zScore ?? null) and isNight = !isDaytime(current.localHour ?? 12), threading both to LocationPanel; the noon default (?? 12) prevents a night-wash flash before data resolves"
    requirement: DESIGN-01
    verification:
      - kind: other
        ref: "grep -q 'anomalyColor(anomaly' and grep -q 'isDaytime(current.localHour ?? 12)' src/app/App.tsx; npx tsc -b (exit 0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Map region (flex-auto div + MapView) carries no atmospheric/glass/blur class — PERF-01 satisfied by construction"
    requirement: PERF-01
    verification:
      - kind: other
        ref: "grep -c 'backdrop-blur' src/app/App.tsx == 0; grep -c 'panel-backdrop' src/app/App.tsx == 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "LocationPanel root applies relative + .panel-backdrop + conditional .is-night + motion-safe:transition-colors only when hasSelection, bridging --anomaly-color via the single sanctioned inline style; falls back to flat bg-secondary with no inline var before a pin"
    requirement: DESIGN-02
    verification:
      - kind: other
        ref: "grep assertions (panel-backdrop, relative, is-night, '--anomaly-color', motion-safe:transition-colors, bg-secondary) all present in src/app/LocationPanel.tsx; npx vitest run (99/99 pass); npx tsc -b (exit 0)"
        status: pass
    human_judgment: false
  - id: D4
    description: "No rAF/setInterval/canvas animation loop anywhere in App.tsx/LocationPanel.tsx/LocationDisplay.tsx; motion is one-time CSS transition behind motion-safe:"
    requirement: PERF-02
    verification:
      - kind: other
        ref: "grep -c 'requestAnimationFrame\\|setInterval' across the three touched files == 0"
        status: pass
    human_judgment: false
  - id: D5
    description: "All four LocationDisplay branch roots (empty, loading, resolved-name, coordinate fallback) render the shared translucent glass card (bg-glass-surface/border-glass-border/rounded-glass-lg/shadow-glass/backdrop-blur-lg); copy and branch structure unchanged"
    requirement: DESIGN-03
    verification:
      - kind: unit
        ref: "npx vitest run (full suite, 99/99 pass) — LocationDisplay/App-level tests unaffected by the className-only change"
        status: pass
      - kind: other
        ref: "grep -c 'bg-glass-surface' src/app/LocationDisplay.tsx >= 4; grep -q 'backdrop-blur-lg'; grep -q 'No location selected'; grep -q 'Click anywhere on the map'"
        status: pass
    human_judgment: false
  - id: D6
    description: "Backstop: an unusually long place name wraps to 2-3 lines and stays inside the glass card's padding/radius rather than looking cramped or clipped"
    requirement: DESIGN-03
    verification: []
    human_judgment: true
    rationale: "Visual wrap/overflow behavior at a specific viewport width requires a human eyeball check against a real long place name; no automated layout-measurement test exists in this suite."
  - id: D7
    description: "Backstop: with hasSelection true and data still in flight, anomalyColor(null)'s neutral gradient does not read as a false 'normal weather' claim, and the entrance transition into the resolved color reads smoothly"
    requirement: DESIGN-01
    verification: []
    human_judgment: true
    rationale: "Perceived color-transition smoothness and whether a neutral gradient reads as misleading are subjective visual judgments not expressible as an automated assertion."

duration: 6min
completed: 2026-07-16
status: complete
---

# Phase 5 Plan 2: Panel Backdrop + Glass Composition Summary

**App-level anomaly color/day-night signal threaded into a CSS custom-property bridge on the docked LocationPanel (static gradient backdrop, night wash, motion-safe entrance transition), with LocationDisplay's four state branches restyled onto the shared translucent glass card — real backdrop-blur confined entirely to the panel, map region untouched.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-16T18:48:17Z
- **Completed:** 2026-07-16T18:49:59Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- `App.tsx` computes `anomalyColorValue = anomalyColor(anomaly?.zScore ?? null)` and `isNight = !isDaytime(current.localHour ?? 12)` as plain consts (no `useMemo`, React Compiler handles memoization) and threads both onto `<LocationPanel>`; the map region and `<MapView>` receive no atmospheric class
- `LocationPanel` becomes the static anomaly-gradient backdrop: `relative panel-backdrop` (+ conditional `is-night`) plus `motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-out` apply only when `hasSelection` is true, bridging the computed color via the single sanctioned inline `--anomaly-color` custom property; before a pin exists the panel stays flat `bg-secondary` with no inline var, no gradient, no misleading placeholder
- `LocationDisplay`'s four branch roots (empty, loading, resolved place-name, coordinate fallback) all carry the shared glass-card treatment (`bg-glass-surface border-glass-border rounded-glass-lg shadow-glass backdrop-blur-lg px-md py-md`) so the glass never flickers/resets between states; all copy, ARIA attributes, and branch count preserved exactly

## Task Commits

Each task was committed atomically:

1. **Task 1: Compute the shared color/day-night signal in App.tsx and thread it to LocationPanel** - `e80f25d` (feat)
2. **Task 2: Make LocationPanel the static anomaly-gradient backdrop with the --anomaly-color bridge and motion-safe transition** - `0241a1e` (feat)
3. **Task 3: Restyle LocationDisplay onto the translucent glass card across all branches** - `7013127` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src/app/App.tsx` - Imports `anomalyColor`/`isDaytime`; computes `anomalyColorValue`/`isNight`; passes both as new props to `<LocationPanel>`; map region unchanged
- `src/app/LocationPanel.tsx` - `LocationPanelProps` extended with `anomalyColorValue: string`/`isNight: boolean`; `<aside>` conditionally applies `panel-backdrop`/`is-night`/motion-safe transition + the `--anomaly-color` inline bridge when `hasSelection`, else flat `bg-secondary`
- `src/app/LocationDisplay.tsx` - Added the shared glass-card className to the root `<div>` of all four state branches; no other structural change

## Decisions Made
- `LocationPanel` reads `hasSelection` via `const { hasSelection } = props` (non-destructive read) so the same value gates the `<aside>`'s className/style while still flowing through the existing `...props` spread into `<LocationDisplay>` unmodified
- Used a named `CSSProperties` type-only import (not `React.CSSProperties`) since the file has no default `React` import and `verbatimModuleSyntax` requires explicit type imports

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Note: the plan's specified verify command `npx tsc --noEmit` type-checks 0 files (root `tsconfig.json` has `"files": []` and is only resolved via project references under `-b` mode) so it trivially exits 0 regardless of type errors. Ran `npx tsc -b` (the project's actual `npm run build` type-check step) as an additional real verification for every task in this plan — all pass with exit 0. Not treated as a plan deviation since the plan's literal verify command was also run and also passed; documented here for visibility.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The `--anomaly-color` custom property is now live on `LocationPanel` for every downstream `var(--anomaly-color)` consumer, ready for Plan 03's `AnomalyCard` hero-text coloring to inherit it
- Full test suite (99 tests) and production build both green; no new dependencies added
- Backstop items D6 (long place-name wrap) and D7 (neutral-gradient-to-resolved-color transition smoothness) are flagged for human visual confirmation — not blocking, no automated equivalent exists

---
*Phase: 05-glass-atmospheric-redesign*
*Completed: 2026-07-16*

## Self-Check: PASSED

All 3 modified files confirmed present on disk; all 3 task commits (`e80f25d`, `0241a1e`, `7013127`) confirmed present in git log.
