# Project Research Summary

**Project:** Weather Anomaly Dashboard
**Domain:** Client-rendered, map-based weather anomaly / climate-normal comparison dashboard (consumer, single-purpose, no backend)
**Researched:** 2026-07-13
**Confidence:** MEDIUM-HIGH

## Executive Summary

This is a single-page, client-only dashboard: users drop a pin on a map, and the app shows how today's temperature compares to the 30-year historical average for that calendar day (z-score + °C delta), plus a range chart and a recent-days trend. Experts building this in 2026 build it as a pure static SPA — React 19 + Vite 8 + TypeScript, react-leaflet for the single-pin map, Recharts for the two charts, no state manager, no data-fetching library, and critically **no backend**. Open-Meteo's forecast and archive APIs are both CORS-enabled and keyless, so the browser can call them directly; the only "database" needed is a client-side `localStorage` cache keyed by rounded lat/lon + day-of-year for the 30-year baseline, since that baseline barely changes day to day.

The recommended approach is to treat the anomaly calculation as its own pure, dependency-free, unit-tested module (`weather/anomaly.ts`) sitting behind a single integration boundary (`weather/client.ts`) that owns every Open-Meteo call — this makes the "add an edge cache later if traffic grows" escalation path a localized change rather than a rewrite. Feature-wise, the validated table-stakes set (map picker, reverse-geocoded name, current temp, delta as primary framing with z-score as secondary, range chart, recent trend chart, graceful no-data handling) matches PROJECT.md's Active requirements almost exactly, with a small but valuable set of P2 differentiators (plain-language verdict badge, shareable URL state, current-location button) to layer on after the core flow validates.

The key risks are almost entirely in the "looks done but is subtly wrong" category, not in build complexity: (1) computing the baseline from a naive single-day n=30 sample (unusable for Feb 29) instead of a day-of-year window; (2) mixing population vs. sample standard deviation, which silently biases every z-score; (3) trying to source "today" from the archive endpoint, which has a 2-7 day data lag; (4) timezone mismatches between the pin's local "today" and the browser's; and (5) routing calls through a shared backend proxy, which concentrates Open-Meteo's per-IP rate limit onto one bucket instead of distributing it across users. None of these require new technology to fix — they require getting the anomaly-calculation and data-fetching phases right the first time, since they're invisible until spot-checked against a reference calculation or a far-timezone pin.

## Key Findings

### Recommended Stack

Pure static SPA: **React 19.2.7 + Vite 8 + TypeScript (pin to 6.x/5.9.x, not the just-GA'd 7.0)**, deployed to **Cloudflare Pages** (most generous free tier, explicitly commercial-use-friendly, unlike Vercel Hobby). No backend, no database, no state manager, no data-fetching library — `useState` + small custom hooks are sufficient for a single-view, two-data-source app.

**Core technologies:**
- React 19 + Vite 8 — industry-standard SPA stack; Vite produces the pure static `dist/` build free hosts want
- react-leaflet 5 + Leaflet 1.9.4 — simplest fit for a single click/drag pin picker; MapLibre GL is overkill (solves multi-marker/vector-tile problems this app doesn't have)
- Recharts 3.9.2 — dominant 2026 React charting default, composes declaratively for the range-band and trend-line charts, comfortably handles the small (30-90 point) dataset
- Hand-rolled z-score/delta math (~6 lines) — no stats dependency justified for mean/stddev/z-score
- Open-Meteo (`/v1/forecast` + `/v1/archive`) — keyless, CORS-enabled, no proxy needed

### Expected Features

**Must have (table stakes):** map pin picker, reverse-geocoded place name (fallback to coordinates), current temperature, anomaly delta (°C) as the *primary* framing, z-score as secondary, "today vs. historical range" chart (box-plot/band convention), recent-days trend chart, graceful no-data handling for ocean/remote pins, mobile-responsive layout.

**Should have (differentiators):** plain-language verdict badge ("slightly warmer than usual") translating the z-score, shareable URL state (lat/lon in query params), current-location button (explicit user-initiated geolocation, never auto-prompted), "since when" record context (v1.x — bigger data pull, defer).

**Defer (v2+):** additional weather variables (precipitation/wind/humidity), forecast-anomaly, multi-location comparison, user accounts/saved locations, push notifications — all explicitly ruled out by PROJECT.md's stateless/no-accounts/temperature-only scope.

### Architecture Approach

Fully static client architecture: Map+Pin Picker → Open-Meteo API Client (single integration boundary) → Anomaly Engine (pure functions) → presentational components, with a `localStorage`/`IndexedDB` read-through cache in front of only the 30-year baseline call. Selected location lives in URL query params as the single source of truth (shareable + drives re-fetch). No backend for v1; an optional Cloudflare Worker + Workers KV edge cache is the documented v2 escalation path if cross-user traffic to popular locations grows enough to strain Open-Meteo's shared rate limit.

**Major components:**
1. Map + Pin Picker — owns selected-location state, syncs to URL
2. Open-Meteo API Client (`weather/client.ts`) — sole module that knows Open-Meteo's URL shapes; one wide `/v1/archive` call per baseline (not 30 yearly calls), `/v1/forecast` for current + recent-days
3. Anomaly Engine (`weather/anomaly.ts`) — pure, framework/network-free, unit-testable mean/stddev/z-score/delta functions
4. Local Cache (`weather/cache.ts`) — decorator in front of the archive call only, keyed by rounded lat/lon + day-of-year

### Critical Pitfalls

1. **Single-day (n=30) baseline instead of a day-of-year window** — produces a noisy, unstable z-score and an unusable Feb 29 case (~7-8 samples). Use a ±3-7 day window across 30 years (~330 samples).
2. **Population vs. sample stddev inconsistency** — silently biases every z-score; must explicitly use sample stddev (n-1) with a unit test locking in the formula.
3. **Sourcing "today" or recent-trend days from the archive endpoint** — it has a 2-7 day data lag and simply doesn't have "today" yet. Use `/v1/forecast` (`current=` and `past_days=`) for today/recent, `/v1/archive` only for the far-past 30-year baseline.
4. **Timezone mismatch** — "today" must be relative to the pin's location, not the browser's; always pass `timezone=auto` and derive day-of-year from the API's location-local response.
5. **Routing calls through a shared backend proxy** — concentrates Open-Meteo's per-IP rate limit onto one bucket for all users. Call directly from the browser (CORS-enabled, keyless) so each visitor's IP is rate-limited independently.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Location Picker + Shell
**Rationale:** Every other feature depends on a selected location; this is the smallest possible vertical slice and establishes the URL-as-source-of-truth pattern early.
**Delivers:** Map with click/drag pin, reverse-geocoded place name display (with coordinate fallback), URL sync (`?lat=&lng=`), app shell/loading/error states.
**Addresses:** Map pin-drop location picker, reverse-geocoded place name (FEATURES.md table stakes).
**Avoids:** Map attribution/tile-policy pitfall (PITFALLS.md #7) — configure tile provider + visible attribution as part of initial setup, not an afterthought.

### Phase 2: Current Conditions + Data Layer Foundation
**Rationale:** Simplest data flow (lat/lng → single `/v1/forecast` call → direct render) — validates the Open-Meteo integration boundary (`weather/client.ts`) before the harder baseline logic is built on top of it.
**Delivers:** Current temperature display, `weather/client.ts` module with `getCurrent()`.
**Uses:** React + Vite + TypeScript scaffold, no state manager (STACK.md).
**Implements:** Open-Meteo API Client component, client-direct-call architecture (ARCHITECTURE.md Pattern 2).
**Avoids:** Timezone mismatch (PITFALLS.md #5) — wire `timezone=auto` through from this phase onward; shared-IP rate-limiting pitfall (PITFALLS.md #6) — decide client-direct architecture here, not later.

### Phase 3: Anomaly Calculation (Baseline, Delta, Z-Score)
**Rationale:** This is the core value flow and the one most worth getting right early — it's also where the highest-risk, hardest-to-notice pitfalls live (baseline methodology, stddev formula). Build and unit-test in isolation before any UI depends on it.
**Delivers:** Pure `weather/anomaly.ts` module (mean/stddev/z-score/delta), one wide `/v1/archive` call filtered client-side to a day-of-year window, `localStorage` read-through cache keyed by rounded lat/lon + day-of-year.
**Addresses:** Anomaly delta, anomaly z-score (FEATURES.md P1).
**Avoids:** Single-day baseline / Feb 29 pitfall (#1), population-vs-sample stddev pitfall (#2), archive-lag-breaks-today pitfall (#3) — all three are explicitly "core methodology, before UI" per PITFALLS.md phase mapping.

### Phase 4: Anomaly Display + Range/Trend Charts
**Rationale:** Once the anomaly engine and current-conditions data exist, compose them into the two required visualizations — this phase is presentation-layer work on top of already-validated data/math.
**Delivers:** Current Conditions Card, Anomaly Summary (delta primary, z-score secondary), "today vs. historical range" box-plot/band chart, recent-days trend chart (last ~7-14 days).
**Addresses:** Today-vs-range chart, recent trend chart, delta-as-primary-framing (FEATURES.md P1).
**Avoids:** False-precision pitfall (#4) — round sensibly, add a lightweight "modeled climate data" disclosure; silently-degraded-trend-chart UX pitfall — label recent days as forecast-model-based vs. recorded.

### Phase 5: Edge Cases + Polish (P2 differentiators)
**Rationale:** Core flow is validated by this point; layer on low-risk, high-perceived-value additions per FEATURES.md's "add after validation" guidance.
**Delivers:** Graceful no-data handling for ocean/remote pins, plain-language verdict badge, current-location button (explicit user-initiated geolocation), mobile-responsive pass.
**Addresses:** Graceful no-data handling (P1 edge case), verdict badge + current-location button (P2 differentiators).

### Phase Ordering Rationale

- Location picker first because every downstream feature (current conditions, baseline, charts) requires a selected lat/lng — this matches both the feature dependency graph in FEATURES.md and the "simplest vertical slice first" guidance in ARCHITECTURE.md.
- Current conditions before the baseline because it's the simpler data flow (single endpoint, no computation) — validates the API client boundary before the harder/riskier baseline logic is layered on.
- Anomaly calculation is isolated as its own phase, ahead of any chart/UI work, specifically because PITFALLS.md flags the baseline methodology (day-of-year window, sample stddev) as the highest-risk "looks done but isn't" area — it needs to be correct and unit-tested before anything visual depends on it.
- Display/charts come after the engine is proven, since they're presentation on top of already-computed, already-tested values.
- P2 differentiators (verdict badge, current-location button, shareable URL polish) are explicitly sequenced last per FEATURES.md's "add after validation" MVP staging — they're low-risk additions that shouldn't block or complicate the core methodology work.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Anomaly Calculation):** Needs explicit research/design-review on the exact day-of-year window width (±3 to ±7 days is the range cited, no single "correct" answer) and Feb 29 handling — this is a methodology decision, not a coding task.
- **Phase 2 (Data Layer Foundation):** Needs a documented architecture decision on client-direct-vs-proxy calls and cache-key rounding precision before the fetch layer is considered done.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Location Picker):** Well-documented Leaflet + reverse-geocoding pattern, standard across many implementation guides.
- **Phase 4 (Display/Charts):** Recharts' `LineChart`/box-plot-style composition is a standard, well-documented pattern for this exact "value vs. range" chart shape.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core package versions verified directly against npm registry; ecosystem/comparison claims cross-corroborated across multiple sources |
| Features | MEDIUM | Web search only, no MCP doc provider this run; claims cross-verified across 2+ independent sources where marked, but competitor feature analysis is inference from public sites, not user research |
| Architecture | MEDIUM | Open-Meteo endpoint/param details cross-verified across official docs + third-party sources; no single HIGH-tier curated doc provider available |
| Pitfalls | MEDIUM | Open-Meteo specifics cross-checked against official docs, GitHub issues, and creator statements; statistical/climatology conventions cross-checked against NOAA/NCEI |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Day-of-year window width for the baseline:** Research cites a 3-7 day range as standard practice but doesn't prescribe one exact number — needs to be a deliberate decision made and documented during Phase 3 planning, not left implicit.
- **Reverse geocoding provider:** FEATURES.md and ARCHITECTURE.md both assume reverse geocoding is needed but neither research file names a specific free/keyless provider (Open-Meteo's own geocoding API is a candidate, unverified in this pass) — needs a quick provider check during Phase 1 planning.
- **Tile provider selection:** PITFALLS.md flags bare OSM tile usage as risky for a public production app but leaves the specific provider choice (CARTO/Stadia/MapTiler) open — needs a decision during Phase 1 planning.

## Sources

### Primary (HIGH confidence)
- npm registry direct queries — exact current versions of react, vite, leaflet, react-leaflet, recharts, typescript, @types/leaflet, peerDependencies, engines
- Open-Meteo official docs (historical-weather-api, climate-api, docs, pricing) — endpoint structure, daily aggregation, rate limits, data lag

### Secondary (MEDIUM confidence)
- Open-Meteo GitHub issues/discussions (#1480, #361, #853) and HN creator comment — past_days behavior, archive lag, rate-limit accounting
- NOAA/NCEI (Climate at a Glance, U.S. Climate Normals, Feb 29 daily-normals documentation) — climatological baseline/window conventions
- OSM Foundation / OpenStreetMap Wiki tile usage policy — attribution and bulk-request prohibition
- Web search cross-corroborated across multiple independent sources (PkgPulse, LogRocket, npm trends, jawg.io) — 2026 stack conventions, map/chart library tradeoffs, hosting free-tier terms
- Statology, PMC academic source — z-score misinterpretation risk
- Atlassian, Tableau box-plot guides; WeatherSpark — range/band chart convention precedent

### Tertiary (LOW confidence)
- nologin.tools / nosignuptools.com — marketing-site framing for no-account/no-ad tool positioning, corroborates but doesn't independently establish PROJECT.md's constraints
- News examples (weather.com, Yale Climate Connections, etc.) — "warmest since X" consumer framing convention

---
*Research completed: 2026-07-13*
*Ready for roadmap: yes*
