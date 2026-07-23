# Milestones

## v1.2 UI Layout Redesign & Explanatory Legend (Shipped: 2026-07-23)

**Phases completed:** 3 phases, 10 plans, 22 tasks

**Key accomplishments:**

- Extracted `isAnomalyReady` combined-gate predicate plus `PanelShell`/`PanelHeadline`/`InfoTooltip` UI primitives — no existing panel touched, foundation-only for Wave 2/3 of Phase 6 and reused verbatim by Phases 7-8.
- LocationDisplay and TrendRow rebuilt on PanelShell/PanelHeadline; History (TrendRow) gained UI-SPEC-authored empty/loading/error state branches wired through the shared isAnomalyReady gate, closing the pre-split gap where the trend panel rendered nothing outside the populated case.
- Split the combined AnomalyCard hero into CurrentConditionsPanel (today's temperature) and DeltaPanel (the dominant 47.6px Δ focal point), composed as a 50/50 equal-height two-up row in App.tsx with a single shared isAnomalyReady gate — AnomalyCard.tsx deleted, full build and 128-test suite green.
- Portaled InfoTooltip's popover onto document.body with position:fixed and edge-aware coordinates, fixing the Current Conditions/Delta popover stacking and clipping bug (G-06-11) while preserving the WCAG 1.4.13 hover/focus/persist/dismiss contract.
- Hand-rolled Hazen/midrank empirical percentile (computePercentileRank + percentileLabel) wired into AnomalyForToday and rendered as a plain-text line between the verdict and z-score chip in DeltaPanel.
- New stateless MethodologyPanel — a native `<details>`/`<summary>` disclosure inside PanelShell, collapsed by default, mounted unconditionally as the final LocationPanel child so any visitor can read what the tool does and how the anomaly is computed.
- Hand-rolled Gaussian KDE + Silverman bandwidth module (`kde.ts`) with a per-half n_min=20 curve-vs-rug gate, plus `computeTrendDay`'s transformation from a single-sample to a two-sample (recent-5yr / prior-25yr) result — the pure statistics + data-shape core the split-violin trend tile stands on.
- Pure `buildViolinPaths` SVG geometry — one shared pooled Silverman bandwidth, one shared max density, equal-width prior-left/recent-right violin halves clamped to each half's own sample range — plus the four locked recent/prior chart tokens, turning the two-sample `computeTrendDay` output from Plan 1 into renderable split-violin shapes for Plan 3.
- Rewrote the per-day trend tile from a dot-strip + single mean line into a split violin — two `ViolinHalf` marks (filled KDE curve or bounded jittered rug), two per-half mean ticks whose gap is the climate-shift signal, and the preserved actual-value diamond, all sharing one explicit-margin pixel scale — restoring project-wide green typecheck across Phase 8.
- Rebuilt TrendLegend into a 5-item split-violin key with copy finalized through the PD-10 reviewer round-trip — the prior-25yr half now renders a dynamic real year range instead of a static literal, threaded through a new `TrendDayResult.priorStart/priorEnd` field.

---

## v1.1 Tailwind Migration + Glass/Atmospheric Redesign (Shipped: 2026-07-21)

**Phases completed:** 2 phases, 7 plans, 21 tasks
**Delivered:** Restyled the dashboard onto Tailwind CSS v4 (CSS-first) and layered a cohesive glassy/atmospheric design language — anomaly-driven gradient backdrop, translucent glass surfaces, a color-coded anomaly-delta hero, and a re-themed trend chart — all within a disciplined-glass performance policy, with no feature or behavior changes.
**Requirements:** 12/12 complete — STYLE-01..04, DESIGN-01..06, PERF-01..02
**Timeline:** 2026-07-16 → 2026-07-21 · 18 files changed (+647 / −478)
**Closeout:** override_closeout — see Known verification overrides below.

**Key accomplishments:**

- Installed Tailwind CSS v4 (tailwindcss@4.3.2 + @tailwindcss/vite@4.3.2) behind an approved supply-chain checkpoint, wired the Vite plugin, and rewrote src/index.css as the CSS-first Tailwind entry with all design tokens ported into @theme.
- App shell, map region, LocationPanel, LocationDisplay (4 branches), and AnomalyCard (4 branches) rewritten from BEM classes to Tailwind v4 utilities, with the Leaflet map-container sizing preserved via an arbitrary-variant descendant selector.
- Legacy App.css deleted, static/build/test gates all green, and human-confirmed visual equivalence of the Leaflet map and every component state vs v1.0 closes out the Tailwind v4 foundation migration
- Continuous z-score-to-color RGB-lerp function, day/night axis, pin-local hour data signal, framed zero-delta copy, and the full glass/anomaly CSS token + `@property` + `.panel-backdrop` foundation that Wave-2 composition plans consume.
- App-level anomaly color/day-night signal threaded into a CSS custom-property bridge on the docked LocationPanel (static gradient backdrop, night wash, motion-safe entrance transition), with LocationDisplay's four state branches restyled onto the shared translucent glass card — real backdrop-blur confined entirely to the panel, map region untouched.
- AnomalyCard hero glass cards with a color-coded delta focal point + framed zero-delta, TrendRow glass card, and TrendDayChart placeholder re-themed onto the glass tokens — completing the hero-first, cohesive glass system across all surfaces.
- Post-UAT polish (quick task 260721-dju): leading Δ on the hero delta (disambiguates it from current temperature), zero-width hidden per-tile trend YAxis to center each tile's marks, and a `prefers-reduced-motion`-gated transition on the `--anomaly-color` custom property to smooth the color entrance.

### Known verification overrides

- **Phase 5 (Glass / Atmospheric Redesign)** was verified via the conversational UAT path (`05-UAT.md`: 19/19 checkpoints passed, all 3 surfaced polish gaps fixed and re-confirmed in-app by the user) rather than a formal gsd-verifier `VERIFICATION.md`. All 8 of its requirements (DESIGN-01..06, PERF-01..02) are marked complete in the traceability table. No `v1.1-MILESTONE-AUDIT.md` was produced. Accepted as an override closeout at the user's direction on 2026-07-21.

---

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
