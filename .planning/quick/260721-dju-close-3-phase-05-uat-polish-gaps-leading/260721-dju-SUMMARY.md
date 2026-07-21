---
phase: quick-260721-dju
plan: 01
subsystem: ui
tags: [react, tailwind, recharts, css-custom-properties, accessibility]

requires:
  - phase: 05-glass-atmospheric-redesign
    provides: glass card system, anomalyColor gradient, trend re-theme, shared Y-axis column

provides:
  - Leading Δ glyph on the AnomalyCard resolved hero delta, disambiguating it from current temperature
  - Zero-width hidden per-tile YAxis in TrendDayChart so each 88px tile's marks center within the tile
  - Smooth prefers-reduced-motion-gated CSS transition on the registered --anomaly-color custom property

affects: []

tech-stack:
  added: []
  patterns:
    - "@property-registered CSS custom properties can be transitioned directly (transition: --custom-prop) to get color interpolation instead of a snap, without touching the components that read the var()"

key-files:
  created: []
  modified:
    - src/app/AnomalyCard.tsx
    - src/app/TrendDayChart.tsx
    - src/index.css

key-decisions:
  - "TrendRow.tsx's secondary justify-center safeguard was NOT applied: the chart-group row's intrinsic content width (~712px: 40px axis column + gap + 7x88px tiles + gaps) is already close to the glass card's available content width (~694px), so centering would clip the leftmost Y-axis tick labels by roughly the same amount it currently overflows on the right — exactly the case the plan's guard says to avoid. The per-tile width={showYAxis ? AXIS_WIDTH : 0} fix alone resolves the reported imbalance (each tile's marks were pushed right within their own 88px slot); TrendRow.tsx is unmodified."
  - "Wrapped the Δ glyph in <span className=\"opacity-70\"> per the plan's optional-polish suggestion, so it reads as a qualifier rather than competing with the delta magnitude, and added an aria-label on the hero <p> naming it as the anomaly delta vs. 30-year average."

patterns-established: []

requirements-completed: [DESIGN-04, DESIGN-05, DESIGN-01, PERF-02]

coverage:
  - id: D1
    description: "AnomalyCard resolved hero delta carries a leading Δ glyph across positive/negative/zero deltas, disambiguating it from the current temperature, without touching formatDelta or the z-score pill"
    requirement: "DESIGN-04"
    verification:
      - kind: unit
        ref: "npm test (full suite, 99 tests) — anomaly.test.ts formatDelta anchors unchanged and green"
        status: pass
      - kind: other
        ref: "grep -c 'Δ' src/app/AnomalyCard.tsx"
        status: pass
    human_judgment: true
    rationale: "Visual legibility of the hero delta (does it read unambiguously as a difference-from-normal, not the current temperature) is a perceptual judgment call best confirmed by a human dropping a pin and eyeballing the +/-/0 cases, per the plan's human-check."
  - id: D2
    description: "Hidden per-tile TrendDayChart YAxis reserves zero horizontal width (width={showYAxis ? AXIS_WIDTH : 0}) so each 88px tile's historical dot-cloud, mean line, and actual diamond center within the tile"
    requirement: "DESIGN-05"
    verification:
      - kind: unit
        ref: "src/app/TrendDayChart.test.tsx (both showYAxis=true and showYAxis=false branches) — pass"
        status: pass
      - kind: other
        ref: "grep -q 'showYAxis ? AXIS_WIDTH : 0' src/app/TrendDayChart.tsx"
        status: pass
    human_judgment: true
    rationale: "Whether the 7-tile strip now reads as horizontally centered/balanced within the glass card (vs. merely per-tile-centered) is a visual layout judgment the plan explicitly reserves for a human-check; TrendRow.tsx's conditional secondary fix was deliberately not applied (see key-decisions) and that call benefits from human confirmation."
  - id: D3
    description: "--anomaly-color (registered via @property) now interpolates on a 400ms ease-out transition scoped to .panel-backdrop, gated behind prefers-reduced-motion: no-preference, with no JS animation loop"
    requirement: "PERF-02"
    verification:
      - kind: unit
        ref: "npm test (full suite) — no CSS-transition test exists; suite stays green"
        status: pass
      - kind: other
        ref: "grep -q 'transition: --anomaly-color' src/index.css && grep -q 'prefers-reduced-motion: no-preference' src/index.css"
        status: pass
    human_judgment: true
    rationale: "Whether the color-in reads as smooth (not jarring) and whether OS reduce-motion correctly yields an instant swap are perceptual/behavioral checks that require a human dropping a pin with and without reduce-motion enabled, per the plan's human-check."

duration: 12min
completed: 2026-07-21
status: complete
---

# Quick Task 260721-dju: Close 3 Phase-05 UAT Polish Gaps Summary

**Leading-Δ hero delta disambiguation, zero-width hidden trend-tile Y-axes for true per-tile centering, and a prefers-reduced-motion-gated CSS transition on the registered --anomaly-color custom property**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-21T07:46:00Z
- **Completed:** 2026-07-21T07:58:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- AnomalyCard's resolved hero delta now reads unambiguously as a difference-from-normal (`Δ+3°C`, `Δ−2°C`, `Δ0°C`) instead of risking confusion with the current-temperature number above it, with an added aria-label for screen readers
- Each of the 7 TrendDayChart tiles now reserves zero width for its hidden per-tile YAxis, so historical dots/mean line/actual diamond center within the tile's full 88px plot area instead of being squeezed into the right ~48px
- `--anomaly-color`'s already-registered `@property` typed custom property now transitions on `.panel-backdrop` (400ms ease-out) behind `prefers-reduced-motion: no-preference`, so the panel gradient and inherited hero color fade in smoothly on resolve instead of snapping; reduced-motion users still get an instant swap with zero JS

## Task Commits

Each task was committed atomically:

1. **Task 1: Add a leading Δ delta indicator to the AnomalyCard hero** - `654302b` (feat)
2. **Task 2: Center the trend chart within its glass card** - `a67654d` (feat)
3. **Task 3: Smooth the anomaly-color entrance transition** - `4f18cfc` (feat)

_No TDD tasks in this plan; each task is a single commit._

## Files Created/Modified
- `src/app/AnomalyCard.tsx` - Prepends a `<span className="opacity-70">Δ</span>` before the formatted hero delta; adds an `aria-label` naming it as the anomaly delta vs. 30-year average
- `src/app/TrendDayChart.tsx` - Per-tile hidden `<YAxis>` now uses `width={showYAxis ? AXIS_WIDTH : 0}` instead of always reserving `AXIS_WIDTH` (40px)
- `src/index.css` - Adds a `@media (prefers-reduced-motion: no-preference) { .panel-backdrop { transition: --anomaly-color 400ms ease-out; } }` block after the existing `.panel-backdrop` rule

## Decisions Made
- Did not apply TrendRow.tsx's optional secondary `justify-center` safeguard (see frontmatter `key-decisions` for the width-math rationale: the row's content already nearly fills the card's available width, so centering would clip Y-axis tick labels on the left by roughly the amount it currently overflows on the right — the plan's own guard against exactly this outcome). Relied on the primary per-tile fix alone, as the plan permits.
- Followed the plan's optional-polish suggestions in full for Task 1: wrapped Δ in an `opacity-70` span and added an `aria-label`.

## Deviations from Plan

None - plan executed exactly as written (Task 2's conditional secondary fix was evaluated and, per its own written guard, correctly not applied).

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three Phase-05 UAT gaps (05-UAT.md `## Gaps`) are closed; `npm test` (99/99 passing, including `anomaly.test.ts` formatDelta hex/sign anchors and both `TrendDayChart.test.tsx` `showYAxis` branches, all unchanged) and `npm run build` (`tsc -b && vite build`) both green
- Locked v1.0/Phase-3 constraints preserved: `formatDelta` untouched, `TrendYAxisColumn`'s visible-axis width unchanged, `TrendLegend` wording/layout untouched, anomalyColor anchors/gradient stops/night-wash unchanged, no new JS animation loop
- Recommend a human pass over the three human-check items in 05-UAT.md's gap list (hero delta legibility across +/−/0, trend-strip visual balance, and the reduce-motion on/off color-in) to close out the milestone's remaining UAT polish items

---
*Phase: quick-260721-dju*
*Completed: 2026-07-21*

## Self-Check: PASSED

All claimed files found on disk (src/app/AnomalyCard.tsx, src/app/TrendDayChart.tsx, src/index.css, this SUMMARY.md); all three task commit hashes (654302b, a67654d, 4f18cfc) found in git log.
