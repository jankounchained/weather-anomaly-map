# Phase 3: Historical Trend Charts & Edge Cases - Context

**Gathered:** 2026-07-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can see, for each of the last ~7 days (today + 6 prior), that day's actual temperature plotted against that day's own historical range/distribution (30-year day-of-year baseline) — with the raw historical data points visible, not just an average — and get a graceful message wherever historical data is insufficient for a given day. This covers VIZ-01, VIZ-02, ROBU-01. No new capabilities (no new weather variables, no forecast days, no accounts) — that's out of scope per PROJECT.md.

</domain>

<decisions>
## Implementation Decisions

### Distribution chart style (VIZ-02)
- **D-01:** Each day's historical spread renders as a dot/strip plot — every one of the ~30 years' values for that calendar day plotted as its own point (pale/translucent), not a box plot or shaded band alone.
- **D-02:** Today's/that-day's actual temperature is overlaid on the same strip as a visually distinct marker (different shape/color, e.g. diamond) at its value's position — directly comparable to the historical dots, not a separate text readout.
- **D-03:** The mean is emphasized as a bright, solid horizontal line/tick at its y-position, with the historical dots rendered pale/translucent behind it (per PROJECT.md: brighter/higher-opacity average without hiding the spread).
- **D-04:** Dot x-position within a day's strip is jittered (randomly offset) purely for de-clutter/readability — x carries no semantic meaning, only y (temperature) matters.
- Recharts (already the chosen chart lib per STACK.md) has no native box-plot primitive; this dot/strip approach composes naturally from Recharts' `Scatter` + `ReferenceLine`/`Line` — no box-plot composition needed.

### Small-multiples layout
- **D-05:** The 7 day-charts are arranged as a horizontal row, side by side — reads like a week strip. Desktop-first (mobile responsiveness deferred per PROJECT.md), so a fixed-width row is acceptable.
- **D-06:** All 7 mini-charts share one fixed y-axis (temperature) scale, so absolute temperature is visually comparable across days at a glance — not independently auto-scaled per day.
- **D-07:** The trend row sits below the existing AnomalyCard — today's headline anomaly (delta/verdict) stays the primary focus at the top; the trend row is supporting detail underneath.
- **D-08:** The row shows today + 6 prior days (7 total), today included as the rightmost/most recent slot — the trend row doubles as a restated view of today's position plus the preceding week's context.

### No-historical-data experience (ROBU-01)
- **D-09:** "No usable historical data" for a given day uses a stricter threshold than Phase 2's anomaly math: at least half of the ~30 years must have real (non-null) values in that day's window, not just Phase 2's looser "≥2 samples" floor. This avoids presenting a sparse 2-3-point strip as a full historical picture.
- **D-10:** **This stricter threshold applies everywhere, including AnomalyCard's existing "today" anomaly** — Phase 2's `computeAnomalyForToday` / `AnomalyCard` currently gates only on "≥2 samples" (see `src/anomaly/anomaly.ts`, `filterDayOfYearWindow` + the `samples.length < 2` check). This phase should tighten that shared gate to the new "≥half of 30 years" rule so today's anomaly and all 7 trend days use one consistent usable-data rule. This touches Phase 2 code but is in-scope tightening of ROBU-01's robustness behavior, not scope creep.
- **D-11:** The no-data check is evaluated **per-day** — each of the 7 mini-charts independently shows either its chart or its own empty-state placeholder. It is not a whole-location all-or-nothing gate.
- **D-12:** A day lacking usable historical data renders a placeholder card with a short message (e.g. "Not enough history for this day") in that day's slot — the row stays visually intact at 7 slots; days are never silently collapsed/omitted.

### Recent-day data gaps (data-freshness edge case)
- **D-13:** Actual temperatures for the 7 days should be sourced from Open-Meteo's **forecast API** (the same endpoint already used for CURR-01 in `src/weather/client.ts`'s `getCurrentWeather`), which can return recent past days' observed values alongside "current" — this avoids the archive/reanalysis endpoint's few-day lag entirely for the actual-value side. The archive API (`getHistoricalBaseline`) remains reserved for the 30-year baseline side only, per its existing Phase 2 design intent.
- **D-14:** A day whose historical baseline is missing/insufficient due to a fetch-timing edge case (rather than a genuine data desert like open ocean) is **not** visually distinguished from D-12's placeholder — one code path, one visual state, regardless of cause.

### Claude's Discretion
- Exact pixel/spacing/visual polish of the placement (D-07: "below AnomalyCard") — user confirmed the general position, fine details are Claude's call once laid out against the existing map + panel structure.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level vision (no dedicated ADR/spec docs exist for this phase)
- `.planning/PROJECT.md` §Context — "Trend view" and "Visualization philosophy" bullets are the source of the small-multiples concept and "don't hide the spread" principle this phase implements.
- `.planning/REQUIREMENTS.md` — VIZ-01, VIZ-02, ROBU-01 (exact requirement wording).
- `.planning/ROADMAP.md` §Phase 3 — phase goal and success criteria.

### Existing code this phase extends
- `src/anomaly/anomaly.ts` — `filterDayOfYearWindow`, `computeAnomalyForToday`, the `samples.length < 2` gate that D-09/D-10 supersede with a stricter threshold.
- `src/anomaly/types.ts` — `AnomalyResult`, `VerdictTier` types to extend/reuse.
- `src/weather/client.ts` — `getCurrentWeather` (forecast API, D-13's actual-value source) and `getHistoricalBaseline` (archive API, baseline-only per its existing design comment).
- `src/weather/useHistoricalBaseline.ts` — hook shape (`variable` param, idle/loading/resolved status) to mirror for any new per-day hooks.
- `src/app/AnomalyCard.tsx` — existing sequential-early-return empty/loading/error/resolved pattern to mirror for the new trend-row component, and the component D-10 requires touching for the shared threshold change.

No external specs beyond PROJECT.md/REQUIREMENTS.md/ROADMAP.md — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useHistoricalBaseline(lat, lng, variable)` hook (`src/weather/useHistoricalBaseline.ts`) — already fetches the 30-year archive series; the new per-day baselines can filter this same series per target day rather than issuing 7 separate archive fetches.
- `anomaly.ts`'s `filterDayOfYearWindow` / `windowBounds` — reusable as-is for computing each of the 7 days' historical sample sets from one fetched archive series.
- `AnomalyCard.tsx`'s idle/loading/error/resolved branching pattern — the template to follow for the new trend-row component's own empty/loading/error states.

### Established Patterns
- Plain `useState`/`useEffect` hooks, no data-fetching library (CLAUDE.md, followed consistently in `useCurrentWeather`/`useHistoricalBaseline`/`useReverseGeocode`).
- Hand-rolled math only, no stats dependency (CLAUDE.md) — the stricter "half of 30 years" threshold is a plain length check, no new dependency needed.
- Recharts not yet installed (`package.json` has no chart lib dependency yet) — this phase is the first to add it, per STACK.md's recommendation.
- Status contract convention: `'idle' | 'loading' | 'resolved'` (`WeatherStatus` in `src/weather/types.ts`) reused across hooks — new per-day-chart data should follow the same shape.

### Integration Points
- New trend-row component composes into `src/app/App.tsx` below the existing `<AnomalyCard>` (per D-07).
- One archive fetch (`getHistoricalBaseline`) already covers the full 30-year series; the 7-day windows can all be derived client-side from that single fetch rather than 7 round trips — an efficiency note for the planner, not a user-facing decision.

</code_context>

<specifics>
## Specific Ideas

- "Week strip" mental model: the 7-day row should read left-to-right (or right-to-left) as a single scannable week, with today anchoring one end (D-08).
- The distinct "actual" marker per day (D-02) should feel like a natural extension of AnomalyCard's existing delta/verdict framing — the trend row is answering the same "is this unusual" question, once per day, not a different kind of chart.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 3-Historical Trend Charts & Edge Cases*
*Context gathered: 2026-07-14*
