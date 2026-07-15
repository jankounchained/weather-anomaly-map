---
phase: 03-historical-trend-charts-edge-cases
plan: 04
subsystem: ui
tags: [recharts, react, human-verify, checkpoint]

# Dependency graph
requires:
  - phase: 03-historical-trend-charts-edge-cases (Plan 03)
    provides: TrendRow/TrendDayChart wired end-to-end into App.tsx
provides:
  - "Human verification verdict for the 7-day trend row (NOT a clean pass)"
  - "Two concrete visual/legibility issues documented for gap closure"
  - "One backlog item (decade-colored dots) noted for a future phase, non-blocking"
affects: [03-gap-closure]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified: []

key-decisions:
  - "Checkpoint 03-04 NOT approved as-is - human reviewer found 2 issues (leftmost chart squished, no legend) that must be fixed and re-verified before the phase closes"
  - "Decade-colored historical dots requested as a future enhancement, explicitly NOT part of this phase's fix scope - routed to ROADMAP backlog, not gap closure"

patterns-established: []

requirements-completed: []  # NOT marked complete - human sign-off did not pass cleanly; VIZ-01/VIZ-02/ROBU-01 remain open pending gap-closure fixes + re-verification

coverage:
  - id: D5
    description: "End-to-end visual verification: a pinned location shows 7 mini distribution charts (or placeholders) below the anomaly headline, on one shared y-scale, today rightmost, and the whole row omits itself on a total data outage"
    requirement: "VIZ-01"
    verification:
      - kind: manual_procedural
        ref: "Human reviewer walked through how-to-verify steps 1-4 against http://localhost:5173/ with live Open-Meteo data"
        status: fail
    human_judgment: true
    rationale: "Reviewer found 2 concrete issues (squished leftmost tile, missing legend) - the row is functionally wired but not yet legible/complete per VIZ-02's 'legible at a glance' bar. Does not auto-pass; routed to gap closure."

# Metrics
duration: 12min
completed: 2026-07-15
status: issues-found
---

# Phase 3 Plan 4: Human-Verify 7-Day Trend Row Summary

**Checkpoint run to completion but NOT approved - real user found the leftmost chart visually squished vs. its 6 siblings and the chart has no legend explaining the dots/line/diamond symbols; both must be fixed and re-verified before Phase 3 can close.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-15T09:37:55Z (approx., per STATE.md `stopped_at: Completed 03-03-PLAN.md`)
- **Completed:** 2026-07-15T09:48:41Z
- **Tasks:** 1 (checkpoint:human-verify)
- **Files modified:** 0 (verification-only plan, no source changes)

## Accomplishments
- Ran the app and had the real user walk through the how-to-verify steps against live Open-Meteo data at http://localhost:5173/.
- Captured a clear, actionable verdict: NOT an unconditional approval — 2 concrete issues identified, plus 1 explicitly-deferred backlog item.
- Confirmed via source inspection of `TrendRow.tsx`/`TrendDayChart.tsx` a plausible root cause for Issue 1 (see below), to accelerate the follow-up gap-closure plan.

## Task Commits

Each task was committed atomically:

1. **Task 1: Human-verify the 7-day trend row end-to-end** - (no code commit; verification-only task, no `files_modified`)

**Plan metadata:** committed as part of this plan's close-out (see final commit below).

## Files Created/Modified
None - this plan is verification-only per its frontmatter (`files_modified: []`). No production code was touched.

## Decisions Made
- The two reported issues (squished leftmost tile, missing legend) are treated as blocking gap-closure work, not deferred backlog — they directly affect VIZ-02's "legible at a glance" requirement and D-02/D-03 (distinct actual marker / emphasized mean must be interpretable).
- The decade-coloring request is explicitly NOT in scope for this phase's fix — it's a genuinely new visual enhancement (encoding decade via dot color), not a defect in what was built. Routed to ROADMAP backlog for a future phase.

## Deviations from Plan
None - plan executed exactly as written (run the app, walk the human through the verification steps, record the verdict). The plan's own `<resume-signal>` explicitly anticipates a "list the specific visual/behavioral issues... to route into gap closure" outcome as a valid result, not a plan-execution failure.

## Issues Encountered

**Checkpoint verdict: NOT approved.** The human reviewer identified 2 concrete issues during live verification against http://localhost:5173/:

### Issue 1 (visual bug): Leftmost chart tile looks different from the other 6

**User's words:** "First day (left-most) is too squished. This tile doesn't look like the rest."

**Root-cause hypothesis (confirmed plausible via source inspection, not yet fixed):**
In `src/app/TrendRow.tsx`, `showYAxis={index === 0}` is passed only to the leftmost `TrendDayChart` slot. In `src/app/TrendDayChart.tsx`, all 7 charts render a `ComposedChart` with an identical fixed `width={CHART_WIDTH}` (88px). The `YAxis` is always present in the chart tree with `hide={!showYAxis}` — for 6 of the 7 slots `hide` is `true` (no tick labels rendered, full 88px available for the plot area), but for the leftmost slot `hide` is `false`, so Recharts renders tick labels (`fontSize: 14`) that consume horizontal space *within that same fixed 88px total width*. This shrinks the leftmost chart's actual plotting area (where the dot cloud, mean line, and diamond render) relative to the other 6 tiles, which get the full 88px for plotting since their YAxis contributes no visible tick-label width. This matches the reported visual: the leftmost tile's content appears cramped/squished compared to its siblings.

**Not fixed in this plan** — plan frontmatter declares `files_modified: []` and this is a verification-only checkpoint; the fix belongs in a follow-up gap-closure plan. A plausible fix direction (for the follow-up plan to evaluate, not a commitment): give the leftmost chart a wider fixed width (e.g. `88 + axisWidth`) to absorb the tick-label space, keeping the plot-area width consistent across all 7 slots, or move the shared y-axis labeling outside the small-multiples row entirely (e.g. a single axis rendered once to the left of the row) rather than inside the first tile's own chart.

### Issue 2 (missing legibility feature): No legend for the chart symbols

**User's words:** "We also need legend for the plot, because it's unclear what the different symbols mean."

No legend currently exists anywhere in the trend row explaining that the pale/translucent dots represent the 30-year historical distribution (D-01), the bright line is the historical mean (D-03), and the orange diamond is the day's actual reading (D-02). The hover tooltip on the diamond (confirmed working) surfaces some of this per-day, but there's no persistent, glanceable key explaining the visual language before a user hovers anything — which undercuts VIZ-02's "legible at a glance" requirement for first-time viewers.

**Not fixed in this plan** — same reasoning as Issue 1; this is new UI surface (a legend component/row) that belongs in a follow-up gap-closure plan, not this verification-only checkpoint.

### Backlog item (explicitly NOT for this phase)

**User's words:** "Add to roadmap: color points by decade."

The user wants the historical dots to be colored by decade (e.g. 1990s/2000s/2010s/2020s each getting a distinct color) instead of the current flat translucent-blue for every historical point, to make multi-decade patterns visible at a glance. The user was explicit this is a **future enhancement**, not a defect blocking this phase's completion. Recorded here and flagged in STATE.md's Roadmap Evolution section — does NOT block Phase 3 gap closure or completion.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness

**Phase 3 is NOT ready to close.** VIZ-01, VIZ-02, and ROBU-01 are functionally wired and unit-tested end-to-end (per Plans 01-03's automated coverage — see `03-01-SUMMARY.md`/`03-02-SUMMARY.md`/`03-03-SUMMARY.md`), and the human reviewer confirmed the core mechanics work (row renders, updates per-pin, shared scale, tooltip, offline-path graceful degradation were not reported as broken). However, the phase's core value proposition — "easy to interpret at a glance" — is not yet fully met:

- **Blocking:** Issue 1 (squished leftmost tile) and Issue 2 (missing legend) must be fixed in a gap-closure plan and re-verified via a fresh human-verify checkpoint before Phase 3 can be marked complete.
- **Non-blocking:** The decade-coloring backlog item does not block this phase; it's future scope.
- Requirements VIZ-01, VIZ-02, and ROBU-01 remain in `### Active` in PROJECT.md and are **not** marked complete pending the fix + re-verification cycle.

---
*Phase: 03-historical-trend-charts-edge-cases*
*Completed: 2026-07-15*

## Self-Check: PASSED

No files were created or modified by this plan (verification-only, `files_modified: []`), so there are no file-existence claims to check. The SUMMARY.md itself is written to disk at this path.
