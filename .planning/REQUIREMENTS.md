# Requirements — Milestone v1.2: UI Layout Redesign & Explanatory Legend

**Goal:** Make every part of the anomaly view self-explanatory — restructure the resolved view into clearly-headlined panels, add methodology and inline explainers, and replace the trend row with a per-day split-violin visualization.

**Scope decision:** Desktop-focused reflow. Mobile-responsive layout (PLAT-03) remains deferred.

## v1.2 Requirements

### Layout (LAYOUT)

- [x] **LAYOUT-01**: User sees today's current temperature and the anomaly delta in two separate, distinct panels — the combined hero is split into a "Current conditions" panel and a "Delta" panel.
- [x] **LAYOUT-02**: User sees a clear headline on every panel (Location, Current conditions, Delta, History), in the style of the existing "Last 7 days" headline, so it is immediately obvious what each panel shows.
- [x] **LAYOUT-03**: User still perceives the anomaly delta as the dominant focal point after the split — it remains the largest, color-driven, Δ-glyph-led element, not visually equal to the other panels.

### Explainers (EXPLAIN)

- [x] **EXPLAIN-01**: User sees short inline micro-copy on each panel stating in plain language what its number means (current temperature, delta, z-score).
- [x] **EXPLAIN-02**: User can reveal an in-place explanation of the delta, the z-score, and the current-temperature reading via an accessible info affordance (info icon / tooltip usable by mouse and keyboard).
- [x] **EXPLAIN-03**: User can expand a collapsed-by-default methodology section that briefly explains how the anomaly is computed (30-year baseline, day-of-year window, z-score, delta) and what the tool is for.
- [x] **EXPLAIN-04**: User sees a plain-language percentile framing (e.g. "warmer than 98% of years for this date") presented alongside the z-score.

### Trend (TREND)

- [x] **TREND-01**: User sees, for each of the last ~7 days, a split-violin tile comparing that day's recent-5-year temperature distribution against its prior-25-year distribution, on the shared Y-axis, replacing the dot-strip tiles.
- [x] **TREND-02**: User sees a graceful fallback when a violin half has too few samples — a per-half data-sufficiency gate degrades the sparse half (curve → rug/dot strip or omission) rather than drawing a misleadingly confident curve.
- [ ] **TREND-03**: User sees an updated, legible trend legend that correctly explains the new split-violin marks (recent vs prior halves, and any retained mean/actual-value marks), finalized via a reviewer copy round-trip.

## Future Requirements (Deferred)

- [ ] **TREND-04**: Explicit climate-shift callout when a day's recent-5yr and prior-25yr distributions have visibly diverged — deferred; layered on top of the base split-violin once validated.
- [ ] **PLAT-03**: Mobile-responsive layout — map, panels, and charts usable on touch/small screens — deferred (v1.2 is a desktop-focused reflow).
- [ ] **LOC-04**: Current-location button with explicit user-initiated geolocation (never auto-prompted) — deferred to a later milestone.
- [ ] **ANOM-05**: "Since when" record context (e.g. "warmest for this date since 2019") — requires a full historical-series scan; deferred.

## Out of Scope

- **Dedicated anomaly color-scale legend** — would compete with the reviewer-locked trend legend; "legend" this milestone means panel headlines + inline explainers, not a color key. (User-confirmed during scoping.)
- **First-run / onboarding intro screen** — the "what/how/why" is served by the methodology section + per-panel micro-copy; no separate empty-state intro. (User-confirmed during scoping.)
- **Dynamic / location-specific tooltip & methodology copy** — explainer copy is static/general for v1.2.
- **Nested or multi-level disclosure** — the methodology section is a single, flat disclosure level (UX guidance warns against 3+ levels).

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LAYOUT-01 | Phase 6 | Complete |
| LAYOUT-02 | Phase 6 | Complete |
| LAYOUT-03 | Phase 6 | Complete |
| EXPLAIN-01 | Phase 6 | Complete |
| EXPLAIN-02 | Phase 6 | Complete |
| EXPLAIN-03 | Phase 7 | Complete |
| EXPLAIN-04 | Phase 7 | Complete |
| TREND-01 | Phase 8 | Complete |
| TREND-02 | Phase 8 | Complete |
| TREND-03 | Phase 8 | Pending |
