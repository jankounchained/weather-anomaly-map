---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Tailwind Migration + Glass/Atmospheric Redesign
status: planning
last_updated: "2026-07-16T11:06:22.630Z"
last_activity: 2026-07-16
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-13)

**Core value:** For any location, the user can immediately tell how unusual today's temperature is compared to historical norms — the anomaly score must be accurate and easy to interpret at a glance.
**Current focus:** Phase 03 — historical-trend-charts-edge-cases

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-07-16 — Milestone v1.1 started

## Performance Metrics

**Velocity:**

- Total plans completed: 7
- Average duration: - min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 4 | - | - |
| 02 | 3 | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 01 P01 | 25min | 3 tasks | 20 files |
| Phase 01 P02 | 15min | 2 tasks | 7 files |
| Phase 01 P03 | 8min | 2 tasks | 1 files |
| Phase 01 P04 | 15min | 3 tasks | 8 files |
| Phase 02 P01 | 20min | 3 tasks | 8 files |
| Phase 02 P02 | 7min | 3 tasks | 10 files |
| Phase 02 P03 | 5min | 1 tasks | 0 files |
| Phase 03 P01 | 9min | 2 tasks | 2 files |
| Phase 03 P02 | 10min | 2 tasks | 7 files |
| Phase 03 P03 | 15min | 3 tasks | 8 files |
| Phase 03 P04 | 12min | 1 tasks | 0 files |
| Phase 03 P05 | 20min | 2 tasks | 6 files |
| Phase 03 P06 | 25min | 1 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: 3-phase structure (coarse granularity) — Location/Shell → Current Conditions/Anomaly Engine → Historical Charts/Edge Cases, following research's dependency-ordered vertical slices
- Roadmap: PLAT-01/PLAT-02 (no login, free hosting) assigned to Phase 1 since they are foundational architecture decisions established from the first deploy onward
- [Phase ?]: hasSelection (pin visibility) tracked locally in App.tsx via hasUrlSelection(), not added to useSelectedLocation's return shape, to keep Task 2's tested hook contract stable — Task 3 files_modified list only allows MapView.tsx/App.tsx, not useSelectedLocation.ts
- [Phase ?]: readLocationFromUrl falls back per-field to its own default rather than an all-or-nothing default object — Matches RESEARCH.md Pattern 2 reference implementation extended with V5 range validation
- [Phase ?]: Phase 1 Plan 2: useReverseGeocode(lat, lng) accepts nullable lat/lng so App gates the lookup on hasSelection, avoiding a wasted BigDataCloud fetch against the default Czech Republic center before any pin exists
- [Phase ?]: Phase 1 Plan 2: hook status/name derived at render time from a single resolved-lookup object rather than synchronous setState in the effect body, to satisfy eslint-plugin-react-hooks' set-state-in-effect rule
- [Phase 01-03]: Deployed via Cloudflare's git-connected Workers & Pages dashboard flow (not the wrangler CLI), matching research's recommended path
- [Phase 01-03]: Live URL is a *.workers.dev subdomain rather than *.pages.dev; both are Cloudflare Pages free-tier public hosting and satisfy PLAT-01/PLAT-02 identically
- [Phase 01]: wrapLng short-circuits for in-range values to avoid floating-point drift in the modulo wrap formula (Rule 1 auto-fix during 01-04) — The plan's literal formula introduced ~1e-13 drift for in-range longitudes, breaking exact idempotence required by the wrapLng(14.42)===14.42 acceptance case
- [Phase 01]: setLocation's locationRef is updated in a useEffect, not during render (Rule 1 auto-fix during 01-04, satisfies react-hooks refs-during-render lint rule) — Mutating ref.current in the render body is a hard eslint-plugin-react-hooks 7.x lint failure; the effect-based update preserves the stable dependency-free useCallback design
- [Phase 02]: getCurrentWeather throws (V5) instead of reverseGeocode's silent-null fallback, since weather-fetch failure needs a distinct error state
- [Phase ?]: getHistoricalBaseline queries archive-api.open-meteo.com over [currentYear-30, currentYear-1] - 30 complete past years, current partial year always excluded to avoid baseline data-leakage (Pitfall 1)
- [Phase ?]: formatDelta uses the Unicode minus sign (U+2212), not ASCII hyphen, for negative deltas per D-06's exact reference values
- [Phase ?]: computeAnomalyForToday derives startYear/endYear from the min/max year present in the passed daily series rather than hard-coding them, keeping anomaly.ts fully decoupled from the fetch layer
- [Phase 02]: Checkpoint 02-03 approved as-is; zero-delta hero rendering as bare '0' deferred to a future phase (backlog, not gap-closure)
- [Phase ?]: [Phase 03-01]: recharts installed at exact pinned version (npm records ^3.9.2) with no --legacy-peer-deps flag and no react-is override; peer resolution against React 19.2.7 was clean as predicted
- [Phase 03-02]: computeAnomalyForToday's old samples.length < 2 gate retrofitted to hasUsableSampleCount (D-10) - today's anomaly and all 7 trend days now share one usable-data rule
- [Phase 03-02]: getCurrentWeather extended in place to carry the 7-day recentDaily series in the same forecast request as current.temperature_2m (D-13), rather than a parallel fetch/hook
- [Phase 03-03]: Used custom Scatter shape render functions (native circle/polygon SVG) for both historical dots and the actual-value marker rather than recharts' built-in shape strings, so the actual marker's native title tooltip attaches directly to the rendered SVG node
- [Phase 03-03]: Paraphrased two doc-comment sentences in trend.ts/TrendDayChart.tsx to avoid the literal substrings 'Math.random(' and 'ResponsiveContainer' appearing anywhere in the files, since the plan's acceptance-criteria greps scan whole-file text including comments
- [Phase ?]: Phase 3 Plan 5: Chose the shared Y-axis column approach (TrendYAxisColumn) over per-tile width compensation to close VIZ-02 Gap 1 - all 7 trend tiles now present an identical plot-area width
- [Phase ?]: Phase 3 Plan 5: location-panel widened 720px -> 760px to fit the new shared axis column without introducing horizontal scroll
- [Phase ?]: Phase 3 Plan 5: Added TrendLegend (persistent, native-SVG key reusing the chart's own color tokens) to close VIZ-02 Gap 2 - no legend previously existed
- [Phase ?]: Phase 3 Plan 6: Reviewer rejected the 03-05 legend copy as confusing; supplied exact replacement wording (dot: 'Temperatures on this day in the last 30 years', diamond: 'Temperature now') applied verbatim and approved, clearing Phase 3 to close

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 2 planning needs a deliberate decision on day-of-year window width (±3 to ±7 days cited in research, no single correct answer) and Feb 29 handling
- Phase 1 planning needs a reverse-geocoding provider decision and a tile provider decision (attribution/usage-policy safe) — both flagged as open gaps in research/SUMMARY.md
- ~~Phase 3 gap closure needed before completion~~ — RESOLVED 2026-07-15. Both defects the 03-04 checkpoint found (squished leftmost tile; missing legend) were fixed in Plan 03-05 and re-verified/approved in Plan 03-06. VIZ-01/VIZ-02/ROBU-01 are now all marked Complete in REQUIREMENTS.md. (Non-blocking backlog item still open: color historical dots by decade — see Roadmap Evolution below.)

### Roadmap Evolution

- Phase 3 gains backlog item: AnomalyCard hero delta renders as a bare '0' when today's temp exactly matches the 30-year baseline - visually ambiguous, could be misread as an absolute 0C reading rather than 'no anomaly'. Deferred from Phase 2 Plan 3 human verification (02-14). Fix direction: render explicit sign/unit or lean on the verdict headline for the zero case.
- Phase 03 backlog: Backlog item: color historical dots by decade (e.g. distinct color per 1990s/2000s/2010s/2020s) in the 7-day trend chart instead of flat translucent-blue for all points, so multi-decade patterns are visible at a glance. Explicitly requested as a future enhancement (not a Phase 3 gap-closure fix) during checkpoint 03-04 human verification.

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-07-15T12:01:06.536Z
Stopped at: 03-06 checkpoint approved ("Approved.") after one legend-wording round-trip (see 03-06-SUMMARY.md). Both 03-04 gaps (squished leftmost tile, missing legend) are closed. Phase 3 complete; all v1 requirements satisfied. No further phases queued.
Resume file: None

## Operator Next Steps

- Start the next milestone with /gsd-new-milestone
