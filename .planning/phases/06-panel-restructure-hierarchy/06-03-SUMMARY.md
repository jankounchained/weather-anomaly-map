---
phase: 06-panel-restructure-hierarchy
plan: 03
subsystem: ui
tags: [react, typescript, tailwind, accessibility]

requires:
  - phase: 06-panel-restructure-hierarchy (plan 01)
    provides: "isAnomalyReady combined-gate predicate, PanelShell (tokenized glass card), PanelHeadline (TrendRow-verbatim eyebrow), InfoTooltip (WCAG 1.4.13 disclosure)"
  - phase: 06-panel-restructure-hierarchy (plan 02)
    provides: "TrendRow's new hasSelection/currentStatus/baselineStatus props contract that this plan's App.tsx rewire satisfies"
provides:
  - "CurrentConditionsPanel — self-explanatory today's-temperature panel (Display-size number + micro-copy + InfoTooltip)"
  - "DeltaPanel — the dominant focal panel (47.6px Δ number in var(--anomaly-color), PD-07 order, micro-copy, verdict, z-score chip, InfoTooltip)"
  - "App.tsx's 50/50 equal-width, equal-height two-up row composing the two new panels, with anomaly/trendDays gated through the single isAnomalyReady predicate"
affects: [07-methodology-section, 08-split-violin-trend]

tech-stack:
  added: []
  patterns:
    - "AnomalyCard's combined hero split into two independently self-gated panels sharing one predicate (isAnomalyReady) instead of one card re-checking a locally duplicated gate"
    - "Two-up row composed with flex flex-row items-stretch gap-md + flex-1 min-w-0 cells so the row stays 50/50 equal-width and equal-height (align-stretch) and is always rendered regardless of state (no reflow between empty/loading/error/resolved)"

key-files:
  created:
    - src/app/CurrentConditionsPanel.tsx
    - src/app/CurrentConditionsPanel.test.tsx
    - src/app/DeltaPanel.tsx
    - src/app/DeltaPanel.test.tsx
  modified:
    - src/app/App.tsx
  deleted:
    - src/app/AnomalyCard.tsx

key-decisions:
  - "DeltaPanel's InfoTooltip trigger sits in a header row beside the Δ number (flex justify-between), matching CurrentConditionsPanel's existing number+tooltip row layout convention rather than inventing a second placement pattern — an implementation detail left to Claude's discretion per 06-CONTEXT.md."

patterns-established:
  - "Both new panels + App.tsx call isAnomalyReady exactly — no panel re-derives the resolved-status comparison inline — closing PD-10/T-06-07 (gate-drift, partial-reveal) for the split hero."

requirements-completed: [LAYOUT-01, LAYOUT-02, LAYOUT-03, EXPLAIN-01, EXPLAIN-02]

coverage:
  - id: D1
    description: "AnomalyCard's combined hero is split into CurrentConditionsPanel (today's temperature) and DeltaPanel (Δ + verdict + z-score), each its own PanelShell card; AnomalyCard.tsx no longer exists"
    requirement: LAYOUT-01
    verification:
      - kind: other
        ref: "test ! -f src/app/AnomalyCard.tsx (passes); npm run build succeeds with no dangling reference"
        status: pass
    human_judgment: false
  - id: D2
    description: "Current Conditions + Delta sit in a 50/50 equal-width, equal-height two-up row that stays side-by-side in every state; panel order is Location -> [Current Conditions | Delta] -> Last 7 Days"
    requirement: LAYOUT-02
    verification:
      - kind: other
        ref: "src/app/App.tsx: flex flex-row items-stretch gap-md wrapping two flex-1 min-w-0 cells, always rendered regardless of hasSelection/status"
        status: pass
    human_judgment: false
  - id: D3
    description: "Delta panel's Δ number renders at calc(var(--text-display)*1.7) = 47.6px in var(--anomaly-color), ~1.7x the Current Conditions panel's plain 28px Display temperature — inside the 1.5-2x dominance band"
    requirement: LAYOUT-03
    verification:
      - kind: other
        ref: "grep -c 'text-\\[calc(var(--text-display)\\*1.7)\\]' src/app/DeltaPanel.tsx returns 1; grep -c 'text-display' src/app/CurrentConditionsPanel.tsx returns 1"
        status: pass
    human_judgment: false
  - id: D4
    description: "Each panel shows always-visible micro-copy directly under its number: 'Today's measured temperature.' (Current Conditions) and 'How today compares to the 30-year average for this date.' (Delta, positioned before the verdict per PD-07)"
    requirement: EXPLAIN-01
    verification:
      - kind: unit
        ref: "src/app/CurrentConditionsPanel.test.tsx, src/app/DeltaPanel.test.tsx (populated-state assertions + DOM-order assertion)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Both panels expose an accessible InfoTooltip with the exact authored bodies (modeled-data caveat for Current Conditions; delta+z-score methodology for Delta)"
    requirement: EXPLAIN-02
    verification:
      - kind: unit
        ref: "src/app/CurrentConditionsPanel.test.tsx#InfoTooltip reveal, src/app/DeltaPanel.test.tsx#InfoTooltip reveal (fireEvent.click)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Both panels self-gate through isAnomalyReady for their loading branch; App.tsx's anomaly/trendDays computations also call isAnomalyReady instead of an inline resolved-status literal — the gate lives in exactly one place"
    requirement: LAYOUT-01
    verification:
      - kind: other
        ref: "grep -c isAnomalyReady returns >=1 for CurrentConditionsPanel.tsx and DeltaPanel.tsx, and 5 for App.tsx (>=2 required)"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-22
status: complete
---

# Phase 6 Plan 3: Panel Split, Two-Up Row & AnomalyCard Retirement Summary

**Split the combined AnomalyCard hero into CurrentConditionsPanel (today's temperature) and DeltaPanel (the dominant 47.6px Δ focal point), composed as a 50/50 equal-height two-up row in App.tsx with a single shared isAnomalyReady gate — AnomalyCard.tsx deleted, full build and 128-test suite green.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-07-22
- **Tasks:** 3 completed
- **Files modified:** 6 (2 new components + 2 new test files, 1 modified, 1 deleted)

## Accomplishments

- `CurrentConditionsPanel` renders today's temperature at Display size (28px) with adjacent "Today's measured temperature." micro-copy and an accessible InfoTooltip explaining the modeled-data caveat, across empty/loading/error/populated states — the temperature slice of the old `AnomalyCard`, now self-explanatory in its own right.
- `DeltaPanel` renders the dominant Δ number at 47.6px in `var(--anomaly-color)`, in the PD-07-locked internal order (headline → Δ number → micro-copy → verdict → z-score chip), with an InfoTooltip covering both delta and z-score methodology — the unmistakable focal point of the view, ~1.7× the Current Conditions temperature.
- `App.tsx` now composes the two panels in a `flex flex-row items-stretch gap-md` row (each panel in a `flex-1 min-w-0` cell) that is always rendered regardless of `hasSelection`/status, so it never reflows between empty/loading/error/resolved states (PD-02/03/04).
- `App.tsx`'s `anomaly` and `trendDays` computations now call the shared `isAnomalyReady(current.status, baseline.status)` predicate instead of the inline `=== 'resolved'` literal — the combined loading gate now lives in exactly one canonical place, called by both panels and App.tsx (PD-10, closes T-06-07).
- `AnomalyCard.tsx` is deleted; `npm run build` confirms no dangling reference remains.

## Task Commits

Each task was committed atomically (TDD RED → GREEN for Tasks 1-2; single commit for Task 3's structural rewire):

1. **Task 1: Build CurrentConditionsPanel** — `7af6760` (test, RED) → `cb91ac3` (feat, GREEN)
2. **Task 2: Build DeltaPanel** — `3bee9f5` (test, RED) → `29dece0` (feat, GREEN)
3. **Task 3: Rewire App.tsx into the two-up row, retire AnomalyCard** — `7b0629f` (feat)

_Tasks 1-2 followed test-then-implementation commit ordering (test file committed first, implementation committed second) since both files were authored together against the plan's fully-specified `<action>`/`<behavior>` blocks; each test suite passed on first run against its paired implementation. Task 3 is a structural composition change with no new test file in its `files_modified` scope — verified via `npm run build` + the full `npm test` suite per the plan's own `<verify>` block._

## Files Created/Modified

- `src/app/CurrentConditionsPanel.tsx` — New: empty/loading/error/populated branches on `PanelShell` + `PanelHeadline("Current Conditions")`; loading gate calls `isAnomalyReady`; populated branch renders `Math.round(tempC)+units` at `text-display` beside an `InfoTooltip`, with "Today's measured temperature." directly under the number.
- `src/app/CurrentConditionsPanel.test.tsx` — New: 4 tests (empty/loading/error/populated), including the InfoTooltip reveal assertion.
- `src/app/DeltaPanel.tsx` — New: empty/loading/error/populated branches on `PanelShell` + `PanelHeadline("Delta")`; loading gate calls `isAnomalyReady`; populated branch renders the Δ number (`text-[calc(var(--text-display)*1.7)]`, `style={{ color: 'var(--anomaly-color)' }}`) beside an `InfoTooltip`, then micro-copy, verdict, and the z-score chip in PD-07 order.
- `src/app/DeltaPanel.test.tsx` — New: 6 tests (empty/loading/error/populated-with-DOM-order/z-score-null-fallback/InfoTooltip reveal).
- `src/app/App.tsx` — Modified: imports `CurrentConditionsPanel` + `DeltaPanel` + `isAnomalyReady` (dropped `AnomalyCard` import); `anomaly`/`trendDays` computations call `isAnomalyReady`; render composition replaces the single `<AnomalyCard>` with the two-up row; `<TrendRow>` now receives `hasSelection`/`currentStatus`/`baselineStatus`.
- `src/app/AnomalyCard.tsx` — Deleted (PD-09); no test file existed for it, so no companion test deletion was needed.

## Decisions Made

- DeltaPanel's `InfoTooltip` trigger sits beside the Δ number in a `flex justify-between` header row, mirroring `CurrentConditionsPanel`'s existing number+tooltip row layout rather than introducing a second placement pattern for the info affordance — trigger placement was explicitly left to Claude's discretion in `06-CONTEXT.md`.

## Deviations from Plan

None — plan executed exactly as written. All `must_haves.truths`, artifacts, and key_links from the plan frontmatter are satisfied: the split panels exist, the two-up row is 50/50 equal-width/equal-height and always rendered, the Delta dominance ratio (47.6px vs 28px) is preserved, both panels self-gate through the one shared `isAnomalyReady` predicate (App.tsx's own computations too), and `AnomalyCard.tsx` is retired.

## Issues Encountered

None. The known, plan-documented build failure carried over from 06-02 (`TrendRow`'s new required props not yet satisfied by `App.tsx`) was resolved by this plan's Task 3 as expected — `npm run build` and the full `npm test` suite (128/128 across 14 files) are both green after the final commit.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 6 (Panel Restructure & Hierarchy) is now fully complete: all three plans (06-01 primitives, 06-02 Location/History migration, 06-03 this split) landed. `PanelShell`, `PanelHeadline`, `InfoTooltip`, and `isAnomalyReady` are proven across all four panels (Location, Current Conditions, Delta, History).
- Phase 7 (Methodology Section & Explainers) and Phase 8 (Split-Violin Trend View) can import the shared primitives directly — no further extraction needed.
- `CurrentConditionsPanel`/`DeltaPanel` establish the split-hero pattern (each panel self-gates via `isAnomalyReady`, no re-derived inline comparison) that any future panel split should follow.
- No blockers for Phase 7.

---
*Phase: 06-panel-restructure-hierarchy*
*Completed: 2026-07-22*

## Self-Check: PASSED

All 5 created/modified source files verified present on disk (CurrentConditionsPanel.tsx, CurrentConditionsPanel.test.tsx, DeltaPanel.tsx, DeltaPanel.test.tsx, App.tsx); AnomalyCard.tsx verified absent (`test ! -f` passes); all 5 commit hashes (7af6760, cb91ac3, 3bee9f5, 29dece0, 7b0629f) verified present in `git log --oneline --all`.
