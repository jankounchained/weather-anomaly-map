---
phase: 08-split-violin-trend-view
plan: 04
subsystem: ui
tags: [react, recharts, svg-legend, pd-10-reviewer-round-trip]

# Dependency graph
requires:
  - phase: 08-split-violin-trend-view (Plan 02)
    provides: "--color-chart-prior-fill/prior-stroke/recent-fill/recent-stroke chart tokens"
  - phase: 08-split-violin-trend-view (Plan 03)
    provides: "TrendDayChart split-violin render (curve/rug, mean ticks, diamond) the legend explains"
provides:
  - "5-item TrendLegend with reviewer-approved final copy, replacing the old 3-item dot/30-yr-line/diamond key"
  - "TrendDayResult.priorStart/priorEnd (usable:true variant) exposing the prior-25yr half's real calendar-year bounds"
  - "TrendRow -> TrendLegend year-range plumbing (dynamic '1997-2021' style label, static fallback when no usable day)"
affects: [future trend/legend work, TREND-04 climate-shift callout]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional component props with a static-literal fallback (TrendLegend priorStart?/priorEnd?) so a component stays renderable without its dynamic data source"

key-files:
  created: []
  modified:
    - src/app/TrendLegend.tsx
    - src/app/TrendLegend.test.tsx
    - src/anomaly/types.ts
    - src/anomaly/anomaly.ts
    - src/anomaly/anomaly.test.ts
    - src/app/TrendRow.tsx
    - src/app/TrendRow.test.tsx
    - src/app/trend.test.ts
    - src/app/TrendDayChart.test.tsx

key-decisions:
  - "PD-10 reviewer round-trip verdict: APPROVED with 3 revisions — prior half relabeled to a DYNAMIC real year range (not a static literal), mean tick -> 'Period average', actual diamond -> 'This week'; recent half and rug item unchanged."
  - "Dynamic year range is derived data (TrendDayResult.priorStart/priorEnd), not a hardcoded literal, per the reviewer's explicit instruction."
  - "TrendRow derives the range from the first usable day since all 7 days share the same endYear; guards the fully-unusable case by omitting the props so TrendLegend falls back to its static 'Prior 25 years' label rather than rendering undefined."

patterns-established:
  - "PD-10 reviewer copy round-trip for chart legends: draft in a first commit (marked DRAFT in code comments), route through an explicit blocking checkpoint, apply the verbatim verdict in a second commit — same process the Phase 3 legend used."

requirements-completed: [TREND-03]

coverage:
  - id: D1
    description: "TrendLegend renders a 5-item split-violin key (prior half, recent half, mean tick, actual diamond, rug/dots) with native-SVG swatches referencing the same --color-chart-* tokens the tiles render"
    requirement: "TREND-03"
    verification:
      - kind: unit
        ref: "src/app/TrendLegend.test.tsx#renders role=\"list\" with all 5 split-violin legend labels (PD-10 FINAL reviewer copy)"
        status: pass
      - kind: unit
        ref: "src/app/TrendLegend.test.tsx#renders exactly 5 native SVG swatches, one per legend item"
        status: pass
    human_judgment: false
  - id: D2
    description: "Final legend copy is reviewer-approved via the PD-10 round-trip (not written unilaterally); prior-half label renders a dynamic real year range, not a hardcoded literal"
    requirement: "TREND-03"
    verification:
      - kind: unit
        ref: "src/app/TrendLegend.test.tsx#falls back to the static \"Prior 25 years\" label when priorStart/priorEnd are not supplied"
        status: pass
      - kind: unit
        ref: "src/app/TrendRow.test.tsx#populated state: renders the headline and the split-violin chart (legend + svg) for a usable day"
        status: pass
    human_judgment: true
    rationale: "The PD-10 round-trip itself is the human-judgment step (T-08-07, no silent copy finalization) — this SUMMARY records the verbatim reviewer verdict as the audit trail; the unit tests above verify the resulting code matches that verdict exactly, but the wording decision itself was a human call, not an automated one."
  - id: D3
    description: "Native SVG only, no raw-HTML sink (T-03-07) — labels are static JSX text nodes / interpolated numbers, swatches are native SVG shapes"
    requirement: "TREND-03"
    verification:
      - kind: unit
        ref: "src/app/TrendLegend.test.tsx#never uses dangerouslySetInnerHTML (T-03-07)"
        status: pass
      - kind: other
        ref: "grep -c 'dangerouslySetInnerHTML' src/app/TrendLegend.tsx src/app/TrendRow.tsx src/anomaly/anomaly.ts src/anomaly/types.ts = 0"
        status: pass
    human_judgment: false

# Metrics
duration: 63min
completed: 2026-07-23
status: complete
---

# Phase 8 Plan 4: Split-Violin Trend Legend Summary

**Rebuilt TrendLegend into a 5-item split-violin key with copy finalized through the PD-10 reviewer round-trip — the prior-25yr half now renders a dynamic real year range instead of a static literal, threaded through a new `TrendDayResult.priorStart/priorEnd` field.**

## Performance

- **Duration:** 63 min
- **Started:** 2026-07-23T10:29:33Z (Task 1 commit `ff38ef2`)
- **Completed:** 2026-07-23T11:32:42Z
- **Tasks:** 2 (Task 1 draft build, Task 2 PD-10 reviewer round-trip checkpoint)
- **Files modified:** 9

## Accomplishments
- Replaced the old 3-item TrendLegend (dot / 30-yr line / diamond) with a 5-item key matching every surviving split-violin mark: prior-25yr half, recent-5yr half, shared per-half mean tick, actual-value diamond, and the rug/dots fallback — swatches drawn as native SVG referencing the exact `--color-chart-prior/recent/mean/actual/historical` tokens the tiles render, so the key can never visually drift from the marks it explains.
- Ran the PD-10 reviewer copy round-trip (the same process that finalized the Phase 3 legend) on the 5 draft labels and applied the verbatim verdict — see "PD-10 Reviewer Verdict" below.
- Implemented the reviewer's one required code change: `TrendDayResult`'s `usable: true` variant now exposes `priorStart`/`priorEnd` (the prior-25yr half's real calendar-year bounds), populated in `computeTrendDay` and threaded through `TrendRow` into `TrendLegend`, which renders a dynamic `"{priorStart}–{priorEnd}"` label (falling back to the static `"Prior 25 years"` when the props are absent, e.g. an all-unusable row).

## Task Commits

Each task was committed atomically:

1. **Task 1: Rebuild TrendLegend with the 5 split-violin key items (draft copy)** - `ff38ef2` (feat)
2. **Task 2 continuation: Finalize TrendLegend copy via PD-10 reviewer round-trip** - `8213560` (feat)

**Plan metadata:** (this commit) — `docs(08-04): complete split-violin trend legend plan`

## PD-10 Reviewer Verdict

Recorded verbatim, per the checkpoint protocol (T-08-07 — no silent copy finalization):

> Reviewer approved the 5-item legend with 3 revisions — prior half relabeled to a DYNAMIC real year range (not a static literal), mean tick → "Period average", actual diamond → "This week"; recent half and rug item unchanged.

Final 5-item legend copy:

| # | Item | Draft (Task 1) | Final (reviewer-approved) |
|---|------|-----------------|----------------------------|
| 1 | Prior-25yr half | "Prior 25 years" (static) | `"{priorStart}–{priorEnd}"`, e.g. "1997–2021" (dynamic, derived from data) |
| 2 | Recent-5yr half | "Recent 5 years" | "Recent 5 years" (unchanged) |
| 3 | Per-half mean tick | "Average for that period" | "Period average" |
| 4 | Actual-value diamond | "Temperature now" | "This week" |
| 5 | Rug/dots fallback | "Too few years → shown as dots" | "Too few years → shown as dots" (unchanged) |

## Files Created/Modified
- `src/app/TrendLegend.tsx` - 5-item key with reviewer-final copy; `priorStart?`/`priorEnd?` optional props drive the dynamic prior-half label with a static fallback
- `src/app/TrendLegend.test.tsx` - asserts all 5 final labels (dynamic range + fallback case), the 5 swatch shapes, `role="list"`, and no `dangerouslySetInnerHTML`
- `src/anomaly/types.ts` - `TrendDayResult`'s `usable: true` variant gains `priorStart: number`/`priorEnd: number`
- `src/anomaly/anomaly.ts` - `computeTrendDay` populates `priorStart`/`priorEnd` from its existing `recentStart`/`priorEnd`/`priorStart` local computation
- `src/anomaly/anomaly.test.ts` - asserts the new fields' values against a 30-year fixture
- `src/app/TrendRow.tsx` - derives `priorStart`/`priorEnd` from the first usable day, passes to `TrendLegend`, guards the all-unusable case
- `src/app/TrendRow.test.tsx` - populated-state fixture updated with `priorStart`/`priorEnd`; asserts the dynamic range and "Period average" render through the row
- `src/app/trend.test.ts` - `computeSharedYDomain` fixtures updated with the new required fields
- `src/app/TrendDayChart.test.tsx` - `buildDay` fixture helper updated with the new required fields

## Decisions Made
- Dynamic year range over a static literal: the reviewer explicitly rejected a hardcoded "Prior 25 years" in favor of data-derived years, since the actual prior window shifts every year the app is used (endYear is always "now", not a fixed epoch).
- `priorStart`/`priorEnd` were added to the discriminated union's `usable: true` member (not as separate top-level state) to keep the single-source-of-truth discipline `TrendDayResult` already establishes — one shape, no parallel "where did these years come from" derivation elsewhere.
- `TrendLegend`'s dynamic label requires BOTH `priorStart` AND `priorEnd` to be present (not either alone) before switching from the static fallback — avoids ever rendering a partial/undefined range.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] TrendLegend.test.tsx cross-test DOM leakage without RTL cleanup**
- **Found during:** Implementing the fallback-label test (no props vs. dynamic-range props) in the same file
- **Issue:** This project has no global RTL `cleanup()` config; `render()`'s bound queries default to `baseElement=document.body`, so without an explicit `afterEach(cleanup)`, the fallback test's `queryByText(/–/)` matched the PREVIOUS test's still-mounted "1997–2021" text, failing spuriously
- **Fix:** Added `afterEach(cleanup)` to `TrendLegend.test.tsx`, matching the existing convention already used in `TrendRow.test.tsx`
- **Files modified:** `src/app/TrendLegend.test.tsx`
- **Verification:** `npm test` — all 189 tests pass
- **Committed in:** `8213560`

**2. [Rule 3 - Blocking] Reviewer-driven change touched files beyond the plan's declared scope**
- **Found during:** Task 2 (PD-10 reviewer round-trip)
- **Issue:** The plan's `files_modified` frontmatter declared only `src/app/TrendLegend.tsx`/`TrendLegend.test.tsx`. The reviewer's dynamic-year-range revision (item 1) required exposing new data (`priorStart`/`priorEnd`) that does not exist anywhere in the current codebase — it had to be computed in `computeTrendDay` and threaded through `TrendRow`, which meant touching `src/anomaly/types.ts`, `src/anomaly/anomaly.ts`, and `src/app/TrendRow.tsx` (plus their tests) in addition to the two declared files.
- **Fix:** Implemented the minimal plumbing: added `priorStart`/`priorEnd` to the existing `usable: true` union member (reusing `computeTrendDay`'s already-computed `recentStart`/`priorEnd`/`priorStart` locals — no new derivation logic), threaded through `TrendRow`, consumed as optional props in `TrendLegend` with a static fallback.
- **Files modified:** `src/anomaly/types.ts`, `src/anomaly/anomaly.ts`, `src/anomaly/anomaly.test.ts`, `src/app/TrendRow.tsx`, `src/app/TrendRow.test.tsx`, `src/app/trend.test.ts`, `src/app/TrendDayChart.test.tsx` (plus the two declared files)
- **Verification:** `npx tsc -b` clean, `npm test` (189/189 pass), `npm run build` succeeds
- **Committed in:** `8213560`

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking issues required to implement the reviewer's explicit, recorded verdict; neither is scope creep beyond what PD-10 required)
**Impact on plan:** The reviewer verdict is the authority here (PD-10 explicitly routes legend copy through this round-trip rather than unilateral executor decisions) — the file-scope expansion is a direct, necessary consequence of implementing that verdict, not independent scope creep.

## Issues Encountered
- `npx tsc --noEmit` (root tsconfig) passed cleanly after the `types.ts` change, but `npm run build`'s `tsc -b` (project-referenced build) caught 4 additional fixtures (`trend.test.ts` x3, `TrendDayChart.test.tsx` x1) missing the new required `priorStart`/`priorEnd` fields that the looser `--noEmit` invocation didn't surface — fixed by adding the fields to each fixture. Resolved before the build was considered green.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- TREND-03 is fully satisfied: the split-violin legend is reviewer-approved, all 5 items match the surviving marks, and the dynamic year range makes the legend accurate indefinitely (it will never drift stale as "prior 25 years" ages).
- Phase 8 (Split-Violin Trend View) is now complete — all 4 plans (08-01 through 08-04) executed, TREND-01/02/03 all satisfied.
- `TrendDayResult.priorStart`/`priorEnd` is now available for any future phase (e.g. deferred TREND-04 climate-shift callout) that needs the prior window's real year bounds without re-deriving them.

---
*Phase: 08-split-violin-trend-view*
*Completed: 2026-07-23*
