---
phase: 03-historical-trend-charts-edge-cases
plan: 03
subsystem: ui
tags: [recharts, react, typescript, vitest, chart, small-multiples]

# Dependency graph
requires:
  - phase: 03-historical-trend-charts-edge-cases (Plan 01)
    provides: recharts@3.9.2 installed and importable
  - phase: 03-historical-trend-charts-edge-cases (Plan 02)
    provides: computeTrendDay, TrendDayResult, useCurrentWeather.recentDaily
provides:
  - "TrendDayChart - a single mini distribution chart (dot/strip + mean line + actual diamond) or a 'Not enough data' placeholder"
  - "TrendRow - composes 7x TrendDayChart on one shared y-domain, gated to render nothing on total outage"
  - "trend.ts pure helpers: jitterX, buildHistoricalPoints, computeSharedYDomain, formatSlotLabel"
  - "App.tsx wiring: trendDays derived from the single already-fetched baseline.daily series, TrendRow rendered below AnomalyCard"
affects: [03-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Deterministic sine-based jitter (seeded by index) instead of Math.random(), so historical dots never visibly move on re-render"
    - "Recharts ComposedChart with explicit width/height (no ResponsiveContainer) to avoid a ResizeObserver dependency jsdom doesn't implement"
    - "Custom Scatter shape render functions returning native SVG <title> for hover tooltips - no Recharts Tooltip component, matches this codebase's title-attribute convention"
    - "Shared y-domain computed once in the parent (TrendRow) and passed identically to every child chart"

key-files:
  created:
    - src/app/trend.ts
    - src/app/trend.test.ts
    - src/app/TrendDayChart.tsx
    - src/app/TrendDayChart.test.tsx
    - src/app/TrendRow.tsx
  modified:
    - src/index.css
    - src/app/App.css
    - src/app/App.tsx

key-decisions:
  - "Both historical dots and the actual-value marker use custom Scatter shape render functions (native <circle>/<polygon> SVG) rather than relying on Recharts' built-in shape='circle'/'diamond' + a bare fill prop, since the built-in symbol sizing doesn't expose a direct radius control and a custom shape lets the actual marker's native <title> tooltip attach cleanly to the SVG node"
  - "Removed the literal strings 'ResponsiveContainer' and 'Math.random(' from all prose/comments in trend.ts and TrendDayChart.tsx (not just the code) so the plan's grep-based acceptance criteria (which scan the whole file, not just code) report the expected 0 count"

patterns-established:
  - "Presentational chart components take pre-computed data + a shared domain as props (TrendDayChart never fetches or computes stats itself) - mirrors the existing AnomalyCard convention of receiving already-derived data from App.tsx"

requirements-completed: [VIZ-01, VIZ-02, ROBU-01]

coverage:
  - id: D1
    description: "trend.ts pure helpers (jitterX, buildHistoricalPoints, computeSharedYDomain, formatSlotLabel) are unit-pinned, including the empty/all-unusable-days fallback and the exact 'Wed' UTC weekday case"
    requirement: "VIZ-02"
    verification:
      - kind: unit
        ref: "src/app/trend.test.ts (9 tests: jitterX determinism/band, buildHistoricalPoints order, computeSharedYDomain padding + empty-input guard, formatSlotLabel Today/weekday)"
        status: pass
    human_judgment: false
  - id: D2
    description: "TrendDayChart renders a real recharts SVG chart (dots + mean ReferenceLine + actual diamond) for a usable day, and the 'Not enough data' placeholder (with title/aria-label) for an unusable day - no svg in the placeholder case"
    requirement: "ROBU-01"
    verification:
      - kind: unit
        ref: "src/app/TrendDayChart.test.tsx (2 tests: populated chart renders <svg> and not the placeholder text; unusable day renders placeholder text + aria-label and no <svg>)"
        status: pass
    human_judgment: false
  - id: D3
    description: "TrendRow gates on days being null/empty (returns null, no placeholders, no duplicate error), computes computeSharedYDomain exactly once, and derives isToday/showYAxis correctly (today = rightmost index, only leftmost chart shows y-axis ticks)"
    requirement: "VIZ-01"
    verification:
      - kind: other
        ref: "Source inspection of src/app/TrendRow.tsx (grep-verified: no fetch/getCurrentWeather/getHistoricalBaseline calls; single computeSharedYDomain call; isToday={index === days.length - 1}; showYAxis={index === 0}) plus npm run build/lint/test all passing with TrendRow imported into App.tsx"
        status: pass
    human_judgment: false
  - id: D4
    description: "App.tsx derives trendDays via computeTrendDay against the single already-fetched baseline.daily series (no new network fetch) and renders TrendRow below AnomalyCard inside LocationPanel"
    requirement: "VIZ-01"
    verification:
      - kind: other
        ref: "Source inspection of src/app/App.tsx (trendDays derivation mirrors the existing anomaly derivation's combined-gate shape; <TrendRow> placed immediately after <AnomalyCard>) plus npm run build/test passing end-to-end"
        status: pass
    human_judgment: false
  - id: D5
    description: "End-to-end visual verification: a pinned location shows 7 mini distribution charts (or placeholders) below the anomaly headline, on one shared y-scale, today rightmost, and the whole row omits itself on a total data outage"
    verification: []
    human_judgment: true
    rationale: "Deferred to Plan 04's human-verify checkpoint per this plan's own <verification> section - real browser rendering of the visual layout/interaction (chart legibility, tooltip hover, placeholder styling) requires a human eyeball, not just component-level jsdom tests."

# Metrics
duration: 15min
completed: 2026-07-15
status: complete
---

# Phase 3 Plan 3: Historical Trend Charts Summary

**"Last 7 Days" small-multiples row: 7 mini recharts distribution charts (translucent 30-year dot strip + bright mean ReferenceLine + orange actual-value diamond) on one shared y-domain, with a bordered "Not enough data" placeholder per unusable day and full row omission on a total outage.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-15T09:27:00Z (approx.)
- **Completed:** 2026-07-15T09:36:05Z
- **Tasks:** 3
- **Files modified:** 8 (5 created, 3 modified)

## Accomplishments
- Added five chart color tokens to `src/index.css` (`--color-chart-historical`, `--color-chart-mean`, `--color-chart-actual`, `--color-muted`, `--color-border-subtle`) and widened `.location-panel` from 360px to 720px to fit the 7-chart row (D-06).
- Added `.trend-row`/`.trend-row__heading`/`.trend-row__charts`/`.trend-day`/`.trend-day__label`/`.trend-day__label--today`/`.trend-day__placeholder` to `src/app/App.css`.
- Built `src/app/trend.ts`: deterministic seeded `jitterX` (never `Math.random()`), `buildHistoricalPoints`, `computeSharedYDomain` (10%-padded, guards the empty/all-unusable case), and `formatSlotLabel` (UTC-stable weekday/"Today").
- Built `src/app/TrendDayChart.tsx`: a recharts `ComposedChart` (explicit width/height, no `ResponsiveContainer`) rendering translucent historical dots, a bright mean `ReferenceLine` with `ifOverflow="visible"`, and a distinct orange diamond actual-value marker with a native SVG `<title>` tooltip - or the one-path "Not enough data" placeholder for an unusable day. Confirmed all recharts 3.9.2 prop names (`ScatterShapeProps`, `hide`, `domain`, `ifOverflow`) against the installed package's bundled types (Assumption A1 spike).
- Built `src/app/TrendRow.tsx`: composes 7x `TrendDayChart` on one shared y-domain (computed once), gates to `null` when `days` is null/empty (no duplicate error, no 7 placeholders on total outage), places today as the rightmost slot, and shows y-axis ticks only on the leftmost chart.
- Wired `TrendRow` into `src/app/App.tsx`: derives `trendDays` via `computeTrendDay` against the single already-fetched `baseline.daily` archive series (no new network call), rendered as a sibling immediately after `<AnomalyCard>`.

## Task Commits

Each task was committed atomically:

1. **Task 1: chart color tokens + panel widening + trend-row/slot/placeholder styles** - `9632ed4` (feat)
2. **Task 2: pure trend helpers + single TrendDayChart mini-chart (recharts spike) + smoke tests** - `a2e8c34` (feat)
3. **Task 3: TrendRow (7 mini-charts, shared domain, gating) + wire into App** - `94a558c` (feat)

**Plan metadata:** committed as part of this plan's close-out (see final commit below).

## Files Created/Modified
- `src/index.css` - 5 new chart/muted/border color tokens
- `src/app/App.css` - `.location-panel` widened 360px→720px; new `.trend-row*`/`.trend-day*` rules
- `src/app/trend.ts` - `jitterX`, `buildHistoricalPoints`, `computeSharedYDomain`, `formatSlotLabel`
- `src/app/trend.test.ts` - 9 unit tests pinning the above
- `src/app/TrendDayChart.tsx` - populated chart / placeholder component (D-01..D-04, D-06, D-08, D-12, D-14)
- `src/app/TrendDayChart.test.tsx` - 2 smoke tests (populated svg, placeholder no-svg)
- `src/app/TrendRow.tsx` - composes 7 charts, gating, shared domain, isToday/showYAxis derivation
- `src/app/App.tsx` - derives `trendDays`, renders `<TrendRow>` below `<AnomalyCard>`

## Decisions Made
- Used custom Scatter `shape` render functions (native `<circle>`/`<polygon>` SVG elements) for both the historical dots and the actual-value marker, rather than the built-in `shape="circle"`/`"diamond"` string + bare `fill`/`r` props - recharts' built-in symbol sizing is driven by an abstract `size`/`sizeType` pair, not a direct pixel radius, and a custom shape function lets the actual marker's native `<title>` tooltip attach directly to the rendered SVG node without a separate Tooltip component.
- Rewrote two doc-comment sentences in `trend.ts` and `TrendDayChart.tsx` to avoid the literal substrings `Math.random(` and `ResponsiveContainer` appearing anywhere in those files (including prose) - the plan's acceptance-criteria greps scan the whole file text, not just executable code, so a comment merely *mentioning* the anti-pattern by name would have failed the intended-zero-occurrences check. Documentation intent (explaining what was deliberately avoided and why) is preserved with paraphrased wording.

## Deviations from Plan

None - plan executed exactly as written. The two items above (custom shape functions, comment rewording) are implementation-detail judgment calls within the plan's explicit discretion ("verify the exact Scatter/ReferenceLine/XAxis/YAxis prop names against the installed recharts 3.9.2 during implementation and adjust if the docs-sourced names drifted"), not deviations from a locked requirement.

## Issues Encountered
- Initial draft of `TrendDayChart.tsx`/`trend.ts` doc comments used the literal strings `Math.random(` and `ResponsiveContainer` while explaining what to avoid, which caused the plan's own grep-based acceptance criteria (`grep -c 'Math.random(' ...` and `grep -c 'ResponsiveContainer' ...`) to report 1 instead of the required 0. Resolved by paraphrasing the comments without changing their meaning; re-ran the greps to confirm 0 occurrences, then re-ran tests/lint/build to confirm no regression.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 04's human-verify checkpoint can now visually confirm: 7 mini charts render against live data, the shared y-scale is visually comparable across days, today is the rightmost/accent-labeled slot, and the placeholder renders correctly for a synthetic sparse series (per 03-RESEARCH.md Pitfall 1, real-world ERA5 coordinates are unlikely to trigger the placeholder naturally - use a simulated fetch failure or synthetic data for that check).
- No blockers for Plan 04. `TrendRow`/`TrendDayChart`/`trend.ts` are all self-contained and take pre-computed props - no further data-layer work needed.

---
*Phase: 03-historical-trend-charts-edge-cases*
*Completed: 2026-07-15*

## Self-Check: PASSED

All 5 created source files and the SUMMARY.md file exist on disk. All 3 task commits (`9632ed4`, `a2e8c34`, `94a558c`) verified present in git log.
