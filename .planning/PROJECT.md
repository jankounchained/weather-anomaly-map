# Weather Anomaly Dashboard

## What This Is

A web dashboard where you drop a pin anywhere on a map and instantly see how anomalous today's weather is at that spot — how today's temperature compares to the 30-year historical average for that calendar day, expressed both as a z-score and a simple degree delta, plus a look at the recent trend. Built on free Open-Meteo data, shareable via URL, no login required.

## Core Value

For any location, the user can immediately tell how unusual today's temperature is compared to historical norms — the anomaly score must be accurate and easy to interpret at a glance.

## Current State

**Shipped:** v1.1 Tailwind Migration + Glass/Atmospheric Redesign (2026-07-21). The dashboard's styling layer now runs entirely on Tailwind CSS v4 (CSS-first, no config file), and the UI wears a cohesive glassy/atmospheric design language: an anomaly-driven gradient backdrop, translucent glass surfaces, a color-coded anomaly-delta hero (now led with a Δ so it never reads as the current temperature), a framed zero-delta case, and a re-themed trend chart — all within a disciplined-glass performance policy (real `backdrop-blur` only on static backdrops, no JS/canvas animation loops, all motion behind `prefers-reduced-motion`). No feature or behavior changed from v1.0.

**Next milestone:** Not yet scoped. Natural candidates from the deferred backlog: mobile-responsive layout (PLAT-03), current-location button (LOC-04), and "since when" record context (ANOM-05) — all deferred to v2. Start with `/gsd-new-milestone`.

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

- [x] User can see, for each of the last ~7 days, that day's temperature plotted against its own historical range/distribution for that calendar day — showing the underlying historical data points/distribution, not just a single average line, with the average visually emphasized (e.g. brighter/higher-opacity) so it stands out without hiding the spread — Validated in Phase 3
- [x] User sees a graceful message when a clicked location has no usable historical data (e.g. ocean, remote areas) — Validated in Phase 3

- [x] App styling implemented on Tailwind CSS v4 (CSS-first, `@tailwindcss/vite`, no config file); hand-written `index.css`/`App.css` removed; Leaflet + Preflight coexist — STYLE-01..04, Validated in Phase 4 (v1.1)
- [x] Cohesive glassy/atmospheric design language: anomaly-driven gradient backdrop, translucent depth surfaces, refined typography, strengthened anomaly-hero focal point, re-themed recharts trend visuals — DESIGN-01..05, Validated in Phase 5 (v1.1)
- [x] Zero-delta hero case reads clearly (framed "0°C" + "Right on the 30-year average"), closing the v1.0 bare-"0" UX gap — DESIGN-06, Validated in Phase 5 (v1.1)
- [x] Disciplined-glass performance: real `backdrop-blur` only on static backdrops (never over the live map); all motion gated behind `prefers-reduced-motion`; no JS/canvas animation loops — PERF-01, PERF-02, Validated in Phase 5 (v1.1)

### Active

- [ ] Current-location button with explicit user-initiated geolocation request (never auto-prompted on load) — LOC-04, deferred to v2
- [ ] Mobile-responsive layout — map, charts, and anomaly display usable on touch/small screens — PLAT-03, deferred to v2
- [ ] "Since when" record context (e.g. "warmest for this date since 2019") — ANOM-05, requires a full historical-series scan beyond the 30-year day-of-year baseline, deferred to v2

### Out of Scope

- User accounts / saved favorite locations — no persistence needed; user confirmed they'll just re-pick a location each visit (browser local storage for "last location" is fine, but not a requirement)
- Weather variables beyond temperature (precipitation, wind, etc.) — deferred; v1 is temperature-only
- Forecast anomaly for future days — deferred; v1 covers today + recent past only, not upcoming forecast
- Native mobile app — a responsive web app covers mobile browsers, no separate app needed
- Multi-location comparison view — dilutes the single-pin "at a glance" core value
- Ads / tracking / newsletter signup — conflicts with the quick, practical, no-accounts positioning of the tool
- Push notifications / alert thresholds — requires accounts and a backend scheduler, conflicting with the stateless, no-accounts constraint

## Context

- **Shipped state (v1.1, 2026-07-21):** Styling rebuilt on Tailwind CSS v4 (CSS-first, no config file) with a glassy/atmospheric design language layered on top; no feature/behavior change from v1.0. ~3,100 LOC TypeScript/TSX/CSS. Stack: Vite + React 19 + Tailwind v4 (`@tailwindcss/vite`) + react-leaflet (CARTO tiles) + recharts@3.9.2. Vitest suite (99 tests) and production build green.
- **Shipped state (v1.0, 2026-07-15):** Full MVP live on Cloudflare's free tier. ~2,800 LOC TypeScript/TSX. Stack: Vite + React 19 + react-leaflet (CARTO tiles) + recharts@3.9.2. All location, current-conditions, anomaly, and trend-visualization requirements validated end-to-end against live Open-Meteo data.
- **Data source:** Open-Meteo API (free, no API key required) — current weather endpoint for live conditions, historical/archive endpoint for the 30-year baseline used to compute anomalies
- **Anomaly methodology:** For a given location and calendar day, compute the mean and sample standard deviation of that day's temperature across a ±5-day day-of-year window over the last 30 complete years of historical data. Express today's reading both as a z-score (statistical deviation) and a raw delta in degrees (intuitive "X° hotter/colder than normal") against that baseline. The same `hasUsableSampleCount` gate covers both today's anomaly and each of the 7 trend days.
- **Trend view:** Each of the last ~7 days rendered as its own small-multiple chart — translucent 30-year dot strip + bright mean reference line + actual-value diamond marker, all sharing one Y-axis column so tiles are visually consistent. A persistent legend explains the three marks. Locations with insufficient historical data show a bordered "not enough data" placeholder per day, or the whole row is omitted on a total outage.
- **Visualization philosophy:** Avoid oversimplified charts. Prefer showing the underlying historical data (or its distribution/uncertainty) alongside the summary statistics, rather than reducing history to a single average line. The average should be visually emphasized (e.g. brighter color, higher opacity) so it stands out, without hiding the spread of the raw historical data behind it. (Backlog idea for v2: split-violin plot comparing last-5-years vs. prior-25-years distributions per day, to surface climate-shift signal.)
- **Primary use case:** Practical daily use — checking before going outside, or checking conditions before traveling somewhere new. Not a climate-research tool; the anomaly framing should read as "is today unusual" rather than a scientific report.
- **Usage pattern:** Both a recurring check of one go-to location and ad-hoc lookups of other places (e.g. before travel) — location picking needs to be fast for both cases.
- **Resolved UX gap (v1.1):** The v1.0 bare-"0" zero-delta ambiguity is fixed — the hero now renders a framed "0°C" immediately followed by "Right on the 30-year average" (DESIGN-06). The hero delta also now leads with a Δ glyph so it is never misread as the current temperature (v1.1 post-UAT polish).

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
| Deployed via Cloudflare's git-connected dashboard flow (not wrangler CLI), on a *.workers.dev subdomain | Matches research's recommended path; a *.workers.dev URL satisfies PLAT-01/PLAT-02 identically to *.pages.dev | ✓ Good — Validated in Phase 1 |
| Shared `hasUsableSampleCount` gate unifies today's-anomaly and per-day trend usability thresholds | Avoids two divergent "enough data?" rules for what is conceptually the same check | ✓ Good — Validated in Phase 3 |
| Trend tiles share one Y-axis column (TrendYAxisColumn) instead of each tile rendering its own ticks | A real user found the leftmost tile visually squished vs. its siblings during the 03-04 checkpoint; the shared-column fix equalizes all 7 plot areas | ✓ Good — fixed and re-verified in Phase 3 gap closure |
| Persistent TrendLegend added, worded to reviewer-supplied copy after one round-trip | Initial legend copy was rejected as confusing during human verification; exact wording matters for an at-a-glance chart | ✓ Good — Validated in Phase 3 |
| Tailwind CSS v4 adopted CSS-first (no `tailwind.config.js`); design tokens ported into an `@theme` block in `index.css`, both hand-written stylesheets removed | Matches the recommended v4 path; keeps a single styling source of truth and generates utilities from the existing tokens without a JS config | ✓ Good — Validated in Phase 4 (STYLE-01..04); visual equivalence to v1.0 confirmed by human walkthrough, Preflight/Leaflet interaction verified |
| Disciplined-glass performance policy: real `backdrop-blur` only on static backdrops, faux-frosted translucency over the live map, all motion behind `prefers-reduced-motion`, no JS/canvas loops | Live `backdrop-blur` over a panning map is the expensive case; cheap CSS gradients deliver the atmosphere without risking map smoothness | ✓ Good — Validated in Phase 5 (PERF-01/02); map region carries no glass/blur class by construction |
| Anomaly color driven by a registered `@property --anomaly-color` bridged via a single inline style on the LocationPanel; a continuous RGB two-segment lerp (not OKLCH) maps z-score → color | `@property` registration enables smooth CSS interpolation of the color; RGB lerp preserves the exact-hex unit-test anchors the anomaly math depends on | ✓ Good — Validated in Phase 5; entrance transition smoothed in post-UAT polish |
| Hero delta led with a Δ glyph; zero-delta framed as "0°C" + "Right on the 30-year average" | UAT found the bare bold number could be misread as the current temperature, and a bare "0" was ambiguous — the Δ and the framing make the anomaly reading unmistakable at a glance (the core value) | ✓ Good — DESIGN-04/06, confirmed in-app UAT (v1.1) |
| Phase 5 closed via conversational UAT (19/19, gaps fixed) instead of a formal VERIFICATION.md; milestone taken as an override closeout | For a styling-only phase with no behavior change, in-app UAT plus green tests/build is stronger evidence than an artifact check; the user accepted the override | — Pending — revisit whether design phases should still produce a VERIFICATION.md |

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
*Last updated: 2026-07-21 — v1.1 milestone (Tailwind Migration + Glass/Atmospheric Redesign) shipped; awaiting next milestone*
