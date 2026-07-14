# Weather Anomaly Dashboard

## What This Is

A web dashboard where you drop a pin anywhere on a map and instantly see how anomalous today's weather is at that spot — how today's temperature compares to the 30-year historical average for that calendar day, expressed both as a z-score and a simple degree delta, plus a look at the recent trend. Built on free Open-Meteo data, shareable via URL, no login required.

## Core Value

For any location, the user can immediately tell how unusual today's temperature is compared to historical norms — the anomaly score must be accurate and easy to interpret at a glance.

## Requirements

### Validated

- [x] User can pick a location by clicking/dragging a pin on an interactive map — Validated in Phase 1
- [x] User sees the selected location's place name (reverse-geocoded), falling back to coordinates if lookup fails — Validated in Phase 1
- [x] Selected location is encoded in the URL so a specific view can be shared — Validated in Phase 1
- [x] Dashboard is usable by anyone via a shared URL — no accounts, no login — Validated in Phase 1
- [x] App runs entirely on free hosting tiers — Validated in Phase 1
- [x] User can see current weather conditions (temperature, at minimum) for the selected location — Validated in Phase 2
- [x] User can see today's temperature anomaly as a delta (°C) vs the 30-year historical average for that calendar day — shown as the primary, most prominent number — Validated in Phase 2
- [x] User can see today's temperature anomaly as a z-score vs the 30-year historical average — shown as a secondary/supporting stat — Validated in Phase 2
- [x] User can see a plain-language verdict (e.g. "slightly warmer than usual") translating the anomaly — Validated in Phase 2

### Active

- [ ] User can see, for each of the last ~7 days, that day's temperature plotted against its own historical range/distribution for that calendar day — showing the underlying historical data points/distribution, not just a single average line, with the average visually emphasized (e.g. brighter/higher-opacity) so it stands out without hiding the spread
- [ ] User sees a graceful message when a clicked location has no usable historical data (e.g. ocean, remote areas)

### Out of Scope

- User accounts / saved favorite locations — no persistence needed; user confirmed they'll just re-pick a location each visit (browser local storage for "last location" is fine, but not a requirement)
- Weather variables beyond temperature (precipitation, wind, etc.) — deferred; v1 is temperature-only
- Forecast anomaly for future days — deferred; v1 covers today + recent past only, not upcoming forecast
- Native mobile app — a responsive web app covers mobile browsers, no separate app needed
- Mobile-responsive layout polish — desktop-first for v1, responsive pass deferred
- Current-location button (auto-geolocation) — deferred to v1.x; map click covers location selection for v1

## Context

- **Data source:** Open-Meteo API (free, no API key required) — current weather endpoint for live conditions, historical/archive endpoint for the 30-year baseline used to compute anomalies
- **Anomaly methodology:** For a given location and calendar day, compute the mean and standard deviation of that day's temperature across the last 30 years of historical data. Express today's reading both as a z-score (statistical deviation) and a raw delta in degrees (intuitive "X° hotter/colder than normal") against that baseline.
- **Trend view:** Rather than a single anomaly-over-time line, show each of the last ~7 days as its own "day vs. that day's historical range" view — a small multiple/repeated version of the today chart, one per recent day — so the user can see both the pattern across days and how spread-out the historical range is for each.
- **Visualization philosophy:** Avoid oversimplified charts. Prefer showing the underlying historical data (or its distribution/uncertainty) alongside the summary statistics, rather than reducing history to a single average line. The average should be visually emphasized (e.g. brighter color, higher opacity) so it stands out, without hiding the spread of the raw historical data behind it.
- **Primary use case:** Practical daily use — checking before going outside, or checking conditions before traveling somewhere new. Not a climate-research tool; the anomaly framing should read as "is today unusual" rather than a scientific report.
- **Usage pattern:** Both a recurring check of one go-to location and ad-hoc lookups of other places (e.g. before travel) — location picking needs to be fast for both cases.

## Constraints

- **Hosting**: Free tier only — frontend and any backend/API layer must run within free hosting tiers (Open-Meteo itself is free and keyless, which makes this feasible)
- **Data**: Must use Open-Meteo for both current and historical weather data (current weather API + historical/archive API)
- **Scope**: No user accounts or server-side persistence — keeps the app stateless and easy to host for free

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Anomaly shown as both z-score and raw delta | Z-score gives statistical rigor ("2.3σ hotter"), delta gives intuitive framing ("6°C hotter than normal") — together they serve the "is today unusual" use case better than either alone | Validated in Phase 2 — delta is the hero number, z-score a secondary badge |
| Location picked via interactive map (click/drag pin) | Faster and more intuitive than typing lat/lng, fits both the "check my usual spot" and "check somewhere new" usage patterns | Validated in Phase 1 |
| 30-year historical baseline | Matches the standard meteorological definition of a "climatological normal," making the anomaly score interpretable against familiar conventions | Validated in Phase 2 — ±5-day day-of-year window across 30 complete past years, sample stddev |
| No accounts, no saved locations, no server-side persistence | User confirmed no need to remember locations; keeps the app stateless, simplifying free-tier hosting | Validated in Phase 1 — shell ships with URL-only state, no login, no backend |
| Temperature-only anomaly for v1 | Keeps initial scope tight and shippable; other variables (precipitation, wind) are natural v2 additions | — Pending |
| v1 covers today + recent past, not forecast | Anomaly for actual observed days is simpler and more defensible than forecasting future anomaly; forecast anomaly deferred to v2 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-14 after Phase 2 (Current Conditions & Anomaly Engine) completion*
