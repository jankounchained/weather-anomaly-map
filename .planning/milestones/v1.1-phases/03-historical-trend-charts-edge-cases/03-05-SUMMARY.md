---
phase: 03-historical-trend-charts-edge-cases
plan: 05
subsystem: ui
tags: [recharts, react, css, gap-closure, viz]

# Dependency graph
requires:
  - phase: 03-historical-trend-charts-edge-cases (Plan 03)
    provides: TrendRow/TrendDayChart wired end-to-end into App.tsx
  - phase: 03-historical-trend-charts-edge-cases (Plan 04)
    provides: Human-verify checkpoint verdict identifying the two gaps closed here
provides:
  - "All 7 trend-row tiles present an identical plot-area width (leftmost tile no longer squished)"
  - "A persistent TrendLegend explaining the pale-dot / bright-line / orange-diamond marks"
  - "Corrected 03-UI-SPEC.md matching the shared-axis-column approach and documenting the new legend"
affects: [03-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared Y-axis rendered once via a standalone TrendYAxisColumn component, positioned alongside (not inside) the small-multiples row, instead of one tile's own axis carrying visible ticks"

key-files:
  created:
    - src/app/TrendLegend.tsx
    - src/app/TrendLegend.test.tsx
  modified:
    - src/app/TrendDayChart.tsx
    - src/app/TrendRow.tsx
    - src/app/App.css
    - .planning/phases/03-historical-trend-charts-edge-cases/03-UI-SPEC.md

key-decisions:
  - "Chose approach (b) from the plan's two sanctioned options: a single shared Y-axis column (TrendYAxisColumn) rendered once to the left of the 7-tile row, rather than widening only the leftmost tile to compensate for its own visible ticks - this makes all 7 tiles pixel-identical, the most literal fix for the reviewer's exact complaint ('this tile doesn't look like the rest')"
  - "TrendYAxisColumn lives in TrendDayChart.tsx (not a new file) since that file already owns the recharts ComposedChart/YAxis imports and AXIS_WIDTH constant - avoids a files_modified scope expansion"
  - "location-panel widened 720px -> 760px (both flex-basis and width) to fit the new 40px axis column + 8px gap without introducing horizontal scroll (row content width 712px vs. 728px panel content width, 16px slack)"
  - "TrendDayChart's own showYAxis prop is kept in the component's interface (unused in production now that TrendRow always passes false) rather than removed, since TrendDayChart.test.tsx explicitly exercises showYAxis={true}/{false} and must keep passing unchanged per the plan's acceptance criteria"
  - "Final legend copy adopted the plan's recommended strings verbatim: 'Each of the last 30 years' (dot), '30-year average' (line), 'That day's temperature' (diamond)"
  - "IN-03's null-units fallback only addresses the null case (units ?? 'C') as scoped by 03-REVIEW.md; a separate, pre-existing double-degree-symbol question (units already contains '°C' at all real call sites, per formatActualTooltip's own literal '°' prefix) was left untouched as out of this gap-closure plan's scope"

patterns-established:
  - "A row of small-multiples charts sharing one scale renders its shared axis chrome exactly once, in a sibling column, never inside one member of the repeated group - avoids asymmetric footprints across otherwise-identical repeated components"

requirements-completed: []  # NOT marked complete - this plan's own <verification> section defers authoritative pass/fail to the 03-06 human-verify checkpoint; VIZ-01/VIZ-02 remain open in PROJECT.md/REQUIREMENTS.md until 03-06 passes

coverage:
  - id: D1
    description: "All 7 day tiles present an equal plot-area width - the leftmost tile is no longer visually squished vs. its 6 siblings"
    requirement: "VIZ-02"
    verification:
      - kind: unit
        ref: "src/app/TrendDayChart.test.tsx - both existing tests pass unchanged"
        status: pass
      - kind: manual_procedural
        ref: "Structural fix only (shared axis column, all 7 tiles hide their own YAxis) - authoritative visual re-verification deferred to 03-06's fresh human-verify checkpoint per this plan's own scope"
        status: unknown
    human_judgment: true
    rationale: "'Legible at a glance' / 'no longer squished' is a visual judgment call the phase's own 03-04 checkpoint already established only a human can certify; this plan's own <verification> section explicitly defers authoritative pass/fail to the 03-06 re-verify checkpoint."
  - id: D2
    description: "A persistent legend explains the pale dots (30-year historical values), bright line (30-year average), and orange diamond (that day's reading) without requiring a hover"
    requirement: "VIZ-02"
    verification:
      - kind: unit
        ref: "src/app/TrendLegend.test.tsx - both tests pass (labels render, SVG swatches present)"
        status: pass
      - kind: manual_procedural
        ref: "grep -rin legend src/ >= 1 hit (closes the 03-VERIFICATION.md Gap-2 grep gate)"
        status: pass
    human_judgment: true
    rationale: "Whether the legend is genuinely 'glanceable' for a first-time viewer is the same category of visual judgment the 03-04 checkpoint reserved for a human; deferred to 03-06 alongside D1."

# Metrics
duration: 20min
completed: 2026-07-15
status: complete
---

# Phase 3 Plan 5: Trend-Row Gap Closure (Squished Tile + Missing Legend) Summary

**Equalized all 7 trend-tile plot areas via a single shared Y-axis column (TrendYAxisColumn) instead of one tile carrying visible ticks, and added a persistent TrendLegend explaining the dot/line/diamond marks - closing both blocking gaps from the 03-04 human-verify checkpoint.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-15T10:33:00Z (approx.)
- **Completed:** 2026-07-15T10:51:00Z
- **Tasks:** 2
- **Files modified:** 4 modified, 2 created

## Accomplishments

- Fixed Gap 1 (squished leftmost tile): every `TrendDayChart` tile now hides its own `YAxis` (`showYAxis={false}` uniformly), and a new standalone `TrendYAxisColumn` renders the shared temperature axis exactly once, in its own 40px explicit-width column to the left of the 7-tile row. All 7 tiles now present an identical plot-area width.
- Fixed Gap 2 (missing legend): a new `TrendLegend` component renders a persistent key with three entries (pale dot / bright line / orange diamond), each a native-SVG swatch reusing the exact `--color-chart-*` tokens the charts render with, mounted below the 7-tile row inside `TrendRow`.
- Widened `.location-panel` 720px → 760px (both `flex-basis` and `width`) to fit the new axis column without introducing horizontal scroll.
- Applied two trivial render-path hardenings from 03-REVIEW.md scoped to `TrendDayChart.tsx`: `formatActualTooltip` now guards against a malformed `dateStr` throwing a `RangeError` during render (IN-01), and falls back to a sensible default unit instead of leaving a dangling degree symbol when `units` is null (IN-03).
- Updated `03-UI-SPEC.md`'s Y-axis row, Per-slot footprint table, panel-width math, Component Inventory, and Copywriting Contract to describe the corrected axis approach and document the new legend.

## Task Commits

Each task was committed atomically:

1. **Task 1: Equalize the leftmost tile's plot area (Gap 1) + trivial render-path hardening** - `945c938` (fix)
2. **Task 2: Add a persistent legend explaining the dot / line / diamond marks (Gap 2)** - `221d4dd` (feat)

**Plan metadata:** committed separately (see final docs commit).

## Files Created/Modified

- `src/app/TrendDayChart.tsx` - Added `AXIS_WIDTH` constant and explicit `width` prop on `YAxis`; hardened `formatActualTooltip` (IN-01 date guard, IN-03 units fallback); added new exported `TrendYAxisColumn` component (shared axis, own doc comment citing D-06/VIZ-02)
- `src/app/TrendRow.tsx` - Dropped the per-index `showYAxis={index === 0}` asymmetry (now `false` for all 7 tiles); renders `TrendYAxisColumn` in a new `.trend-row__axis` column beside `.trend-row__charts`; mounts `<TrendLegend />` below the chart row
- `src/app/App.css` - `.location-panel` widened 720px → 760px; new `.trend-row__body`/`.trend-row__axis`/`.trend-row__axis-spacer` layout classes; new `.trend-legend`/`.trend-legend__item`/`.trend-legend__swatch`/`.trend-legend__label` styles (all reusing existing spacing/font/color tokens, no new tokens introduced)
- `src/app/TrendLegend.tsx` (new) - `TrendLegend` component: three legend entries with native-SVG swatches (circle/rect/polygon) matching TrendDayChart's own marks
- `src/app/TrendLegend.test.tsx` (new) - Render test asserting all three labels and the three SVG swatch shapes are present
- `.planning/phases/03-historical-trend-charts-edge-cases/03-UI-SPEC.md` - Corrected Y-axis row + Per-slot footprint table + panel-width math (Task 1); added `TrendYAxisColumn`/`TrendLegend` to Component Inventory, added the three legend labels to the Copywriting Contract, and noted the legend in Chart Visual Encoding (Task 2)

## Decisions Made

- Chose the plan's recommended approach (b) - a single shared Y-axis column - over per-tile width compensation, since it produces pixel-identical tiles and most directly answers the reviewer's exact complaint.
- Kept `TrendYAxisColumn` inside `TrendDayChart.tsx` rather than a new file, since that file already owns the relevant recharts imports and the plan's `files_modified` list didn't include a new axis-component file.
- Widened the panel by 40px (720px → 760px) rather than shrinking the axis width below a legible size, per the plan's explicit "do not shrink the plot below a legible size" constraint.
- Kept `showYAxis` in `TrendDayChart`'s prop interface (now unused by `TrendRow` in production) so the existing, unmodified `TrendDayChart.test.tsx` - which explicitly renders both `showYAxis={true}` and `showYAxis={false}` - keeps passing without any test-file changes.
- Adopted the plan's suggested legend copy verbatim rather than inventing alternate phrasing.

## Deviations from Plan

None - plan executed largely as written, with the following in-scope discretionary choice explicitly left open by the plan itself:

### Discretionary choices (both explicitly sanctioned by the plan, not deviations)

**1. Axis approach: shared column (b) over per-tile compensation (a)**
- **Found during:** Task 1
- **Context:** The plan explicitly left the choice of fix approach to the executor's discretion, recommending (b).
- **Choice:** Implemented (b) - single shared `TrendYAxisColumn`.
- **Files modified:** `src/app/TrendDayChart.tsx`, `src/app/TrendRow.tsx`, `src/app/App.css`
- **Verification:** `npm test -- src/app/TrendDayChart.test.tsx src/app/trend.test.ts && npm run build` - both pass.
- **Committed in:** `945c938`

**2. Panel width value (760px)**
- **Found during:** Task 1
- **Context:** The plan required recomputing the row-width math for whichever axis approach was chosen and widening the panel "just enough to fit" if needed.
- **Choice:** 760px (16px slack over the computed 712px row-content requirement against a 728px content width).
- **Files modified:** `src/app/App.css`, `.planning/phases/03-historical-trend-charts-edge-cases/03-UI-SPEC.md`
- **Verification:** Row-width arithmetic documented in 03-UI-SPEC.md; `flex-basis`/`width` kept equal per acceptance criteria.
- **Committed in:** `945c938`

---

**Total deviations:** 0 auto-fixed (Rules 1-4 not triggered; both items above are plan-sanctioned discretionary implementation choices, not unplanned work).
**Impact on plan:** None beyond the plan's own intended scope.

## Issues Encountered

None. Both tasks' automated verification (`npm test` for the relevant files, `npm run build`) and all acceptance-criteria greps passed on the first implementation pass; `npm run lint` and the full `npm test` suite (90 tests, 8 files) were also run as an extra check and pass cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Both blocking gaps from 03-04 are structurally closed:**
- Gap 1 (squished leftmost tile): fixed via the shared `TrendYAxisColumn` - all 7 tiles now share an identical plot-area width, verified structurally (existing unit tests + build pass, acceptance-criteria greps all pass) but not yet re-confirmed visually by a human.
- Gap 2 (missing legend): fixed via the new `TrendLegend` component - verified via a new unit test and the `grep -rin legend src/` gate.

Per this plan's own `<verification>` section, **authoritative pass/fail for both gaps is deferred to 03-06's fresh human-verify checkpoint** - this plan intentionally does not claim final sign-off on VIZ-01/VIZ-02. Phase 3 should proceed directly to 03-06 next.

---
*Phase: 03-historical-trend-charts-edge-cases*
*Completed: 2026-07-15*

## Self-Check: PASSED

- All 6 claimed files confirmed present on disk (`src/app/TrendLegend.tsx`, `src/app/TrendLegend.test.tsx`, `src/app/TrendDayChart.tsx`, `src/app/TrendRow.tsx`, `src/app/App.css`, `.planning/phases/03-historical-trend-charts-edge-cases/03-UI-SPEC.md`).
- Both task commit hashes (`945c938`, `221d4dd`) confirmed present in `git log --oneline --all`.
