# Milestones

## v1.0 Weather Anomaly Dashboard MVP (Shipped: 2026-07-15)

**Phases completed:** 3 phases, 13 plans, 28 tasks

**Key accomplishments:**

- Vite + React 19 + TypeScript 6.0.3 app shell with a CARTO-tiled Leaflet map, click/drag pin interaction, and a unit-tested URL query string acting as the sole persistence layer for lat/lng/zoom (Czech Republic default, D-05).
- BigDataCloud reverse-geocoding hook with an AbortController ~3s timeout and coordinate fallback, wired into an Empty/Loading/Resolved/Fallback LocationDisplay panel.
- Phase 1's walking skeleton (map + pin + reverse geocode + URL state) is live on Cloudflare's free tier at a public URL, with no login and no backend, and a shared link reproduces the exact view for anyone.
- setLocation now clamps latitude and wraps longitude before every URL write, closing the shareable-URL round-trip blocker (CR-01) with direct renderHook test coverage.
- Open-Meteo forecast client + useCurrentWeather hook + AnomalyCard shell, wired into App so dropping a pin shows today's live temperature
- Pure ±5-day day-of-year anomaly math (sample stddev, null-safe z-score, 5-tier verdict) wired to a 30-year Open-Meteo archive baseline, rendering a hero delta + verdict headline + z-score badge together via a combined-resolve loading gate
- Human confirmed the full anomaly card (current temp, hero delta, verdict, z-score badge, tooltip, combined loading) works end-to-end against live Open-Meteo data — phase 2 is complete, with one deferred UX finding for the zero-delta case
- recharts@3.9.2 added as a runtime dependency after a human-approved legitimacy checkpoint, clean peer resolution against React 19.2.7, and a passing production build — unblocking Plan 03's trend charts.
- Shared `hasUsableSampleCount` gate (D-09/D-10) unifies today's anomaly and per-day trend usability; `getCurrentWeather` now returns the 7 recent daily means in one forecast request (D-13), exposed via `useCurrentWeather.recentDaily`.
- "Last 7 Days" small-multiples row: 7 mini recharts distribution charts (translucent 30-year dot strip + bright mean ReferenceLine + orange actual-value diamond) on one shared y-domain, with a bordered "Not enough data" placeholder per unusable day and full row omission on a total outage.
- Checkpoint run to completion but NOT approved - real user found the leftmost chart visually squished vs. its 6 siblings and the chart has no legend explaining the dots/line/diamond symbols; both must be fixed and re-verified before Phase 3 can close.
- Equalized all 7 trend-tile plot areas via a single shared Y-axis column (TrendYAxisColumn) instead of one tile carrying visible ticks, and added a persistent TrendLegend explaining the dot/line/diamond marks - closing both blocking gaps from the 03-04 human-verify checkpoint.
- Reviewer approved the corrected 7-day trend row after one legend-wording round-trip: leftmost tile now matches its 6 siblings, and the persistent TrendLegend — reworded to the reviewer's exact specified copy ("Temperatures on this day in the last 30 years" / "30-year average" / "Temperature now") — reads as legible at a glance, clearing Phase 3 to close.

---
