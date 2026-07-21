---
phase: 05-glass-atmospheric-redesign
plan: 03
subsystem: ui
tags: [react, tailwind, css-custom-properties, glassmorphism, recharts, atmospheric-ui]

# Dependency graph
requires:
  - phase: 05-glass-atmospheric-redesign
    provides: "anomalyColor(zScore) pure function, glass @theme tokens (--color-glass-surface/border, --radius-glass-lg/sm, --shadow-glass), @property --anomaly-color registration with #57534e fallback, --color-chart-historical re-theme, VERDICT_LABEL.typical framed zero-delta copy (Plan 01)"
  - phase: 05-glass-atmospheric-redesign
    provides: "LocationPanel sets the live --anomaly-color custom property that AnomalyCard's hero text inherits via var(--anomaly-color) (Plan 02)"
provides:
  - "AnomalyCard's four branch roots (empty/loading/error/resolved) all render on the higher-opacity hero glass card (rgba(255,255,255,0.72))"
  - "AnomalyCard's resolved hero delta is color-coded via inline color: var(--anomaly-color) with a motion-safe transition, font size unchanged"
  - "TrendRow section root restyled onto the shared translucent glass card, layout/legend untouched"
  - "TrendDayChart 'not enough data' placeholder tile restyled to glass tokens, no nested blur"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Second and final sanctioned inline-style bridge of the phase: hero <p> color: var(--anomaly-color), paired with motion-safe:transition-colors"
    - "Glass-card treatment applied uniformly across every early-return branch root so the surface never flickers/resets between states"

key-files:
  created: []
  modified:
    - src/app/AnomalyCard.tsx
    - src/app/TrendRow.tsx
    - src/app/TrendDayChart.tsx

key-decisions: []

patterns-established: []

requirements-completed: [DESIGN-01, DESIGN-03, DESIGN-04, DESIGN-05, DESIGN-06]

coverage:
  - id: D1
    description: "All four AnomalyCard branch roots (empty, loading, error, resolved) carry the hero glass card (bg rgba(255,255,255,0.72), border-glass-border, rounded-glass-lg, shadow-glass, backdrop-blur-lg, p-lg); the resolved hero delta is color-coded via inline color: var(--anomaly-color) with a motion-safe transition and unchanged font size; the z-score chip and all copy stay untouched"
    requirement: DESIGN-04
    verification:
      - kind: unit
        ref: "npx vitest run (full suite, 99/99 pass)"
        status: pass
      - kind: other
        ref: "grep -c 'rgba(255,255,255,0.72)' src/app/AnomalyCard.tsx == 4; grep -q 'backdrop-blur-lg'/'shadow-glass'/'color: '\\''var(--anomaly-color)'\\'''/'motion-safe:transition-colors'/'text-\\[calc(var(--text-display)\\*1.7)\\]'/'text-muted bg-secondary' all present"
        status: pass
    human_judgment: false
  - id: D2
    description: "TrendRow section root is a translucent glass card (bg-glass-surface, border-glass-border, rounded-glass-lg, shadow-glass, backdrop-blur-lg, px-md py-md); null/empty guard, shared Y-axis layout, 7-tile mapping, and TrendLegend all unchanged"
    requirement: DESIGN-03
    verification:
      - kind: unit
        ref: "npx vitest run (full suite, 99/99 pass)"
        status: pass
      - kind: other
        ref: "grep -q 'bg-glass-surface'/'backdrop-blur-lg'/'rounded-glass-lg'/'TrendYAxisColumn'/'TrendLegend'/'computeSharedYDomain'/'days === null || days.length === 0' src/app/TrendRow.tsx"
        status: pass
    human_judgment: false
  - id: D3
    description: "TrendDayChart 'not enough data' placeholder box restyled to glass tokens (bg-glass-surface, border-glass-border, rounded-glass-sm) with no nested backdrop-blur; all var(--color-chart-*) SVG call sites and copy unchanged"
    requirement: DESIGN-05
    verification:
      - kind: unit
        ref: "npx vitest run (full suite, incl. TrendDayChart.test.tsx, 99/99 pass)"
        status: pass
      - kind: other
        ref: "grep -q 'bg-glass-surface'/'rounded-glass-sm'/'Not enough data' present; grep -c 'backdrop-blur' == 0; grep -q 'var(--color-chart-actual)'/'var(--color-chart-mean)'/'var(--color-chart-historical)' all present"
        status: pass
    human_judgment: false
  - id: D4
    description: "Zero/near-normal delta renders big '0°C' immediately followed by 'Right on the 30-year average' (VERDICT_LABEL.typical, changed in Plan 01) — never a bare ambiguous 0"
    requirement: DESIGN-06
    verification:
      - kind: unit
        ref: "src/anomaly/anomaly.test.ts#verdictLabel — expect(verdictLabel('typical')).toBe('Right on the 30-year average')"
        status: pass
    human_judgment: false
  - id: D5
    description: "Backstop: AnomalyCard error branch text-destructive (#dc2626) copy stays legibly high-contrast against the neutral-anchor translucent glass surface (rgba(255,255,255,0.72) over the #57534e-tinted gradient), not just the old flat bg-secondary"
    requirement: DESIGN-04
    verification: []
    human_judgment: true
    rationale: "Perceived text contrast against a translucent, gradient-backed surface is a visual judgment not expressible as an automated assertion — no contrast-ratio test harness exists in this suite."
  - id: D6
    description: "Backstop: hero-hierarchy strength (color + 700-weight + higher glass opacity) reads as the unmistakable focal point at a glance, and the recharts trend + panel surfaces read as one cohesive glassy visual system"
    requirement: DESIGN-04
    verification: []
    human_judgment: true
    rationale: "Visual hierarchy/cohesion strength is a subjective design-quality judgment requiring a human walkthrough; no automated layout/emphasis metric exists."

duration: 3min
completed: 2026-07-16
status: complete
---

# Phase 5 Plan 3: Content-Surface Hero + Trend Re-theme Summary

**AnomalyCard's four branches unified onto the higher-opacity hero glass card with a color-coded, motion-safe hero delta inheriting `--anomaly-color`; TrendRow restyled onto the shared glass card and TrendDayChart's placeholder tile re-themed to glass tokens — all without touching the locked Phase-3 trend layout, legend copy, or any `var(--color-chart-*)` call site.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-16T18:51:40Z
- **Completed:** 2026-07-16T18:54:23Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- `AnomalyCard.tsx`: all four early-return branch roots (empty, combined-loading, error, resolved) carry the `rgba(255,255,255,0.72)` hero glass card (`border-glass-border`, `rounded-glass-lg`, `shadow-glass`, `backdrop-blur-lg`, `p-lg`) so the treatment never flickers between states; the resolved hero delta `<p>` gets the second and final sanctioned inline style of the phase — `color: var(--anomaly-color)` — plus `motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-out`, with font size (`text-[calc(var(--text-display)*1.7)]`) and the z-score chip's neutral `text-muted bg-secondary` pill left completely untouched
- `TrendRow.tsx`: the `<section>` root now carries `bg-glass-surface border-glass-border rounded-glass-lg shadow-glass backdrop-blur-lg px-md py-md`; the null/empty guard, `computeSharedYDomain`, `TrendYAxisColumn`, the 7-tile mapping, and `<TrendLegend />` are byte-identical to before
- `TrendDayChart.tsx`: the "not enough data" placeholder box's fill/border/radius changed from `bg-dominant border-border-subtle rounded-[8px]` to `bg-glass-surface border-glass-border rounded-glass-sm`, with zero nested `backdrop-blur` (the tile already sits inside the blurred `TrendRow` card); every `var(--color-chart-historical|mean|actual)` SVG call site and the "Not enough data" copy are unchanged
- The DESIGN-06 zero-delta framing (big `0°C` + "Right on the 30-year average") flows entirely from Plan 01's `VERDICT_LABEL.typical` change plus this plan's hero styling — confirmed still unit-tested and green

## Task Commits

Each task was committed atomically:

1. **Task 1: Elevate the anomaly hero — glass cards on all branches + color-coded delta** - `2732d82` (feat)
2. **Task 2: Restyle the TrendRow root onto the translucent glass card** - `4165cf7` (feat)
3. **Task 3: Give the TrendDayChart "not enough data" placeholder tile the glass finish (no nested blur)** - `6a6cd4c` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src/app/AnomalyCard.tsx` - Hero glass card on all 4 branch roots; color-coded + motion-safe hero delta via inline `--anomaly-color` bridge
- `src/app/TrendRow.tsx` - Glass-card treatment on the section root; layout/legend untouched
- `src/app/TrendDayChart.tsx` - "Not enough data" placeholder box restyled to glass tokens; all chart marks/tokens untouched

## Decisions Made
None - plan executed exactly as written.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 5 (all 3 plans) is now complete: foundation tokens/functions (Plan 01), panel backdrop + glass composition (Plan 02), and the content-surface hero + trend re-theme (Plan 03) are all shipped
- Full test suite (99 tests) and production build both green after every task; no new dependencies added
- Two backstop items remain for human visual confirmation (not blocking, no automated equivalent exists): D5 (error-branch `text-destructive` contrast on the new translucent glass surface) and D6 (overall hero-hierarchy/visual-cohesion strength) — carried alongside Plan 02's D6/D7 backstops for the phase-level human walkthrough
- Only two inline styles exist across the whole phase, as designed: the `LocationPanel` `--anomaly-color` bridge (Plan 02) and this plan's hero `color: var(--anomaly-color)` (Plan 03)

---
*Phase: 05-glass-atmospheric-redesign*
*Completed: 2026-07-16*

## Self-Check: PASSED

All 3 modified files confirmed present on disk; all 3 task commits (`2732d82`, `4165cf7`, `6a6cd4c`) confirmed present in git log.
