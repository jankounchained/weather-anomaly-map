---
phase: 06-panel-restructure-hierarchy
plan: 02
subsystem: ui
tags: [react, typescript, tailwind, accessibility]

requires:
  - phase: 06-panel-restructure-hierarchy (plan 01)
    provides: "isAnomalyReady combined-gate predicate, PanelShell (tokenized glass card), PanelHeadline (TrendRow-verbatim eyebrow)"
provides:
  - "LocationDisplay migrated onto PanelShell + PanelHeadline('Location') in all four branches (empty/loading/resolved/coordinate-fallback)"
  - "TrendRow migrated onto PanelShell(as='section') + PanelHeadline('Last 7 Days'), with new empty/loading/error/populated state branches wired to the exact UI-SPEC copy"
  - "TrendRow's new props contract (hasSelection, currentStatus, baselineStatus) that 06-03's App.tsx rewire must satisfy"
affects: [06-03-location-trend-migration, 07-methodology-section, 08-split-violin-trend]

tech-stack:
  added: []
  patterns:
    - "Sequential early-return state branching (empty -> loading -> error -> populated) extended to TrendRow, matching the pattern already established in LocationDisplay/AnomalyCard"
    - "Loading-branch spinner row keeps role=\"status\" on the inner flex-row div nested inside PanelShell, not on PanelShell itself — PanelShell stays a plain content container while the ARIA live-region semantics live on the specific row that changes"

key-files:
  created:
    - src/app/TrendRow.test.tsx
  modified:
    - src/app/LocationDisplay.tsx
    - src/app/TrendRow.tsx

key-decisions:
  - "TrendRow's error branch (isAnomalyReady true but days null/empty) reuses the exact text-destructive styling AnomalyCard's error branch already established, keeping error-copy treatment consistent across panels ahead of 06-03's CurrentConditionsPanel/DeltaPanel split."

patterns-established:
  - "TrendRow is now a 4-branch state machine self-gated via isAnomalyReady, matching the shape CurrentConditionsPanel/DeltaPanel will also follow in 06-03 — all three panels share one loading-gate predicate, so History can never show a different loading window than the anomaly panels."

requirements-completed: [LAYOUT-02]

coverage:
  - id: D1
    description: "LocationDisplay renders inside PanelShell with a 'Location' PanelHeadline eyebrow in all four branches (empty/loading/resolved-with-name/coordinate-fallback), preserving existing branch behavior"
    requirement: LAYOUT-02
    verification:
      - kind: other
        ref: "grep -c 'bg-glass-surface\\|backdrop-blur-lg' src/app/LocationDisplay.tsx returns 0 (no raw glass classes remain); grep -c 'PanelShell\\|PanelHeadline' returns 14"
        status: pass
      - kind: unit
        ref: "npx vitest run src/app/ (full app suite, 7 files / 27 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "TrendRow renders inside PanelShell(as='section') with a 'Last 7 Days' PanelHeadline in every state (empty/loading/error/populated), using the exact UI-SPEC copy for the three new non-populated states, while the chart-internals block stays byte-for-byte unchanged"
    requirement: LAYOUT-02
    verification:
      - kind: unit
        ref: "src/app/TrendRow.test.tsx (4 tests: empty/loading/error/populated)"
        status: pass
      - kind: other
        ref: "grep -c isAnomalyReady src/app/TrendRow.tsx returns 2 (>=1); grep -c TrendYAxisColumn returns 4 (>=1); grep -c TrendLegend returns 5 (>=1)"
        status: pass
    human_judgment: false

duration: 7min
completed: 2026-07-22
status: complete
---

# Phase 6 Plan 2: Location & History Panel Migration Summary

**LocationDisplay and TrendRow rebuilt on PanelShell/PanelHeadline; History (TrendRow) gained UI-SPEC-authored empty/loading/error state branches wired through the shared isAnomalyReady gate, closing the pre-split gap where the trend panel rendered nothing outside the populated case.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-22T11:59:18+02:00
- **Completed:** 2026-07-22T12:05:49+02:00
- **Tasks:** 2 completed
- **Files modified:** 3 (2 modified, 1 new test file)

## Accomplishments
- `LocationDisplay` now renders through `PanelShell` in all four of its branches, with a new "Location" `PanelHeadline` eyebrow above the existing place-name `h2`/coordinate-fallback/empty/loading content — no raw `bg-glass-surface`/`backdrop-blur-lg` classes remain inline in the file.
- `TrendRow` swapped its outer glass `<section>` + inline eyebrow `<p>` for `PanelShell(as="section")` + `PanelHeadline`, and gained three new state branches (empty, loading, error) ahead of the existing populated branch — the "Last 7 Days" headline and self-explanatory copy now show in every state, not only when data is available.
- `TrendRow`'s loading branch routes through the shared `isAnomalyReady(currentStatus, baselineStatus)` predicate from 06-01 (verified via `grep -c isAnomalyReady` >= 1) rather than re-deriving the `=== 'resolved'` comparison inline — keeping History's loading window locked to the same gate the upcoming Current Conditions/Delta panels use.
- The chart-internals block (`TrendYAxisColumn` + 7x `TrendDayChart` + `TrendLegend`) is untouched byte-for-byte inside the populated branch, preserving the stable wrapper Phase 8 depends on.

## Task Commits

Each task was committed atomically (TDD RED -> GREEN where a new test file was in scope):

1. **Task 1: Migrate LocationDisplay onto PanelShell + PanelHeadline("Location")** - `31b5b68` (feat)
2. **Task 2: Migrate TrendRow onto the primitives and wire its four states** - `2e79b92` (test, RED) -> `edb58a5` (feat, GREEN)

_Task 1 is a pure structural refactor with no new externally-observable behavior beyond the headline (already covered by the existing LocationDisplay-consuming suite plus grep-based structural acceptance criteria) — the plan's own `files_modified` list scopes no new LocationDisplay test file for this task, so verification ran via `npm run build` + the full `src/app/` suite instead of a RED/GREEN test cycle._

## Files Created/Modified
- `src/app/LocationDisplay.tsx` - All 4 branches now wrap content in `PanelShell` with a "Location" `PanelHeadline` as the first child; loading branch keeps `role="status"` on its inner spinner row.
- `src/app/TrendRow.tsx` - `TrendRowProps` gained `hasSelection`/`currentStatus`/`baselineStatus`; four sequential branches (empty -> loading -> error -> populated) each wrapped in `PanelShell(as="section")` + `PanelHeadline("Last 7 Days")`; chart-internals block unchanged.
- `src/app/TrendRow.test.tsx` - New: 4 tests covering the "Last 7 Days" headline presence and exact copy in empty/loading/error states, plus a populated-state smoke test asserting the chart (svg + legend label) still renders.

## Decisions Made
- Reused AnomalyCard's existing `text-destructive` treatment for TrendRow's new error state, keeping error-copy styling consistent with the rest of the app ahead of 06-03's panel split (no new class introduced).
- Placed `role="status"` on the inner spinner-row `<div>` inside `PanelShell` (matching the PATTERNS.md-documented spinner markup convention), rather than forwarding `role` onto `PanelShell` itself — keeps `PanelShell` a plain content container in both LocationDisplay and TrendRow.

## Deviations from Plan

None - plan executed exactly as written. Task 1 deliberately ran without a dedicated RED/GREEN test cycle because the plan's `files_modified` list scopes no new LocationDisplay test file for this task (verification was build + full-suite + grep-based acceptance criteria, as specified in the plan's own `<verify>` block for Task 1).

## Issues Encountered
- `npm run build` currently fails on `src/app/App.tsx` (`TS2739: missing hasSelection, currentStatus, baselineStatus`) because `App.tsx` still calls `TrendRow` with the old two-prop signature. This is the expected, plan-documented cross-plan dependency: 06-02-PLAN.md's `key_links` states "App.tsx (plan 06-03) passes these; this is why 06-03 depends on this plan's TrendRow interface," and 06-03-PLAN.md's `files_modified` includes `src/app/App.tsx` with the rewire. Not auto-fixed here — App.tsx is out of this plan's file scope and touching it would duplicate 06-03's work. `npx vitest run src/app/TrendRow.test.tsx` and the full `src/app/` test suite (which does not import App.tsx) both pass green.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `TrendRow`'s new prop contract (`hasSelection`, `currentStatus`, `baselineStatus`) is ready for 06-03 to satisfy when it rewires `App.tsx`'s two-up row composition and retires `AnomalyCard.tsx`.
- `LocationDisplay` and `TrendRow` are both fully migrated onto `PanelShell`/`PanelHeadline` — all remaining panel work in 06-03 (CurrentConditionsPanel, DeltaPanel) follows the same primitives with no further LocationDisplay/TrendRow changes expected.
- Known, expected blocker for 06-03 to clear: `npm run build` will not fully type-check until `App.tsx` passes the three new `TrendRow` props (tracked above, not a regression — it's the documented handoff boundary between these two plans).

---
*Phase: 06-panel-restructure-hierarchy*
*Completed: 2026-07-22*

## Self-Check: PASSED

All 3 created/modified source files verified present on disk (LocationDisplay.tsx, TrendRow.tsx, TrendRow.test.tsx); all 3 commit hashes (31b5b68, 2e79b92, edb58a5) verified present in `git log --oneline --all`.
