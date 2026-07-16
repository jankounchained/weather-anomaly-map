# Phase 2: Current Conditions & Anomaly Engine - Context

**Gathered:** 2026-07-14
**Status:** Ready for planning

<domain>
## Phase Boundary

For the selected location (from Phase 1's pin/URL state), users can see today's actual current temperature and a statistically sound comparison against that calendar day's 30-year historical norm — expressed as a °C delta (primary, most prominent), a z-score (secondary/supporting), and a plain-language verdict (e.g. "slightly warmer than usual"). The anomaly baseline is computed from a day-of-year window across 30 years of historical data using sample standard deviation, not a single-day sample. This phase does NOT cover the last-7-days trend chart or graceful no-data handling for locations without usable historical data — both are Phase 3 (VIZ-01, VIZ-02, ROBU-01).

</domain>

<decisions>
## Implementation Decisions

### Baseline Window & Feb 29
- **D-01:** Use a ±5-day day-of-year window around the target calendar day, across 30 years (~330 samples) — matches NOAA/ETCCDI climatological-normal conventions, smooths outlier years without blurring the season. Satisfies ANOM-04 (day-of-year window, not single-day sample).
- **D-02:** Feb 29 is folded into the window centered on Feb 28 — no special-case branch. It naturally inherits the same samples as late Feb/early Mar, matching NOAA's own approach to leap-day normals.

### Verdict Wording & Thresholds
- **D-03:** 5 verdict tiers, driven by z-score: Much colder than usual / Slightly colder than usual / Typical for today / Slightly warmer than usual / Much warmer than usual (ANOM-03).
- **D-04:** Tone is neutral/clinical, not conversational — matches PROJECT.md's framing as a practical daily-check tool, not a climate-research report or a playful app.
- **D-05:** Tier cutoffs, symmetric around 0: |z| < 0.5 → typical; 0.5 ≤ |z| < 1.5 → slight; |z| ≥ 1.5 → much.

### Precision & Data-Quality Framing
- **D-06:** Delta (°C) is displayed as a whole number (no decimals); z-score is displayed to 1 decimal place. Avoids implying station-level precision from what is actually modeled/reanalysis data (research PITFALLS.md Pitfall 4).
- **D-07:** Show a lightweight info-icon/tooltip near the anomaly card disclosing: "Based on modeled climate data for this area (~9-25km resolution)". Not an always-visible caption, not omitted — present but unobtrusive.

### Anomaly Card Layout & Loading
- **D-08:** Visual hierarchy: the delta number is large/hero-sized, paired with the verdict as a headline underneath it (they read together at a glance). The z-score appears as a small supporting badge/chip off to the side — clearly secondary, matching REQUIREMENTS.md's "delta primary, z-score secondary" mandate.
- **D-09:** Single combined loading state for the whole anomaly card — wait for BOTH the current-conditions call and the 30-year baseline call to resolve before revealing delta + z-score + verdict together. No progressive/partial reveal (avoids current-temp popping in, then a beat of "calculating..." before the anomaly appears).

### Claude's Discretion
- Exact component/file structure for the weather client, anomaly engine, and current-conditions/anomaly-card components (implementation detail, not a user-facing decision).
- Exact "today" derivation and timezone handling for the pin's location (research PITFALLS.md Pitfall 5 already specifies `timezone=auto` + location-local date — an engineering correctness requirement, not a UX choice).
- Data source split between Open-Meteo's forecast (`current`) endpoint for live temperature vs. the archive endpoint for the 30-year baseline (research PITFALLS.md Pitfall 3 already specifies this split — the archive endpoint has a multi-day data lag and cannot serve "today").
- Generic network/API-failure handling (as opposed to the "no historical data for this location" case, which is explicitly Phase 3's ROBU-01) — reasonable retry/error messaging left to implementation.
- Exact wording of the info-icon tooltip trigger (hover vs. tap target) and its precise placement within the card.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — core value, anomaly methodology summary, constraints, out-of-scope list
- `.planning/REQUIREMENTS.md` — CURR-01, ANOM-01, ANOM-02, ANOM-03, ANOM-04 (this phase's requirements)
- `.planning/ROADMAP.md` — Phase 2 goal and success criteria

### Research (informs this phase's implementation choices)
- `.planning/research/ARCHITECTURE.md` — Anomaly Engine as a pure, dependency-free, unit-tested module (`weather/anomaly.ts`) behind a single `weather/client.ts` integration boundary; suggested file layout (§ "Recommended Project Structure" / `anomaly.ts`, `client.ts`, `types.ts`); data flow #2 (location → 30-year baseline → z-score + delta)
- `.planning/research/PITFALLS.md` — Pitfall 1 (single-day n=30 baseline / Feb 29, resolved by D-01/D-02), Pitfall 2 (sample vs. population stddev — MUST use sample/n-1 stddev per ANOM-04), Pitfall 3 (archive API data lag — "today" must come from the forecast endpoint's `current` param, not archive), Pitfall 4 (reanalysis grid precision — resolved by D-06/D-07), Pitfall 5 (timezone/day-boundary mismatch — always use `timezone=auto` and derive "today" from the pin's local date)
- `.planning/research/STACK.md` — hook shape convention: `useHistoricalBaseline(lat, lon, variable)` should accept a `variable` param from day one even though v1 hard-codes `temperature_2m_mean`; no data-fetching library, no state manager; hand-rolled z-score/stddev (no `simple-statistics` dependency)
- `.planning/research/SUMMARY.md` — overall phase framing, P2 differentiator context

### Project Instructions
- `.claude/CLAUDE.md` — confirms hand-rolled stats module (Vitest-tested), `useCurrentWeather(lat,lon)` / `useHistoricalBaseline(lat,lon,variable)` hook naming, no backend/proxy needed (Open-Meteo is CORS-enabled and keyless)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/map/useSelectedLocation.ts` — exposes `{ lat, lng, zoom, setLocation }`, the single source of truth for the pinned location. Phase 2's weather/anomaly hooks consume `lat`/`lng` from this hook the same way `useReverseGeocode` does in `App.tsx`.
- `src/geocoding/useReverseGeocode.ts` — established hook pattern to follow: plain `useState`/`useEffect` (no data-fetching library), `AbortController`-based timeout, a request-id ref to ignore stale responses on rapid location changes, and a render-derived `status`/`data` pair (`idle` | `loading` | `resolved`) rather than synchronous `setState` in the effect body (satisfies `eslint-plugin-react-hooks`' set-state-in-effect rule). `useCurrentWeather` and `useHistoricalBaseline` should follow this same shape.
- `src/geocoding/types.ts` — precedent for a co-located `types.ts` per domain folder (e.g. `src/weather/types.ts` for `DailyPoint`, `BaselineStats`, `AnomalyResult`).

### Established Patterns
- One domain-per-folder structure: `src/geocoding/`, `src/map/`, `src/lib/`, `src/app/`. Phase 2 should add `src/weather/` (API client + hooks) and likely `src/anomaly/` (pure stats functions), matching ARCHITECTURE.md's recommended layout.
- Hooks gate their fetch on non-null lat/lng (see `useReverseGeocode(hasSelection ? lat : null, ...)` in `App.tsx`) — the same gating pattern applies to the new weather/anomaly hooks so no wasted fetch fires against the default Czech Republic center before a pin exists.
- Pure computation kept separate from fetching: `src/lib/coords.ts` (pure, unit-tested with `coords.test.ts`) is the existing precedent for the "anomaly math is pure and dependency-free, unit-tested with Vitest" pattern research recommends for `anomaly.ts`.

### Integration Points
- `src/app/App.tsx` — currently renders `MapView` + `LocationPanel`. Phase 2 adds a new current-conditions/anomaly card component here, wired to the same `lat`/`lng` (and `hasSelection` gating) already used for reverse geocoding.

</code_context>

<specifics>
## Specific Ideas

- Anomaly card visual hierarchy: **big delta number + verdict headline together**, with the z-score rendered as a small secondary badge/chip (D-08) — not three equally-weighted stats.
- Single unified loading state for the anomaly card (D-09) — no progressive reveal where current temperature appears before the anomaly finishes computing.
- Verdict tone should read like a practical weather check, not a climate report or a playful consumer app (D-04).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. The last-7-days trend chart (VIZ-01/VIZ-02) and no-historical-data messaging (ROBU-01) were not discussed here since they are explicitly Phase 3's scope per ROADMAP.md.

</deferred>

---

*Phase: 2-Current Conditions & Anomaly Engine*
*Context gathered: 2026-07-14*
