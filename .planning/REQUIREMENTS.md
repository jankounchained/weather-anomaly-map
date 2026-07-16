# Requirements: Weather Anomaly Dashboard — v1.1

**Defined:** 2026-07-16
**Milestone:** v1.1 Tailwind Migration + Glass/Atmospheric Redesign
**Core Value:** For any location, the user can immediately tell how unusual today's temperature is compared to historical norms — the anomaly score must be accurate and easy to interpret at a glance.

**Milestone goal:** Rebuild the styling layer on Tailwind CSS and elevate the app to a polished, glassy/atmospheric "design-studio" look — without degrading map or app responsiveness. Styling and visual design only; no feature or behavior changes.

## v1.1 Requirements

Requirements for this milestone. Each maps to a roadmap phase.

### Styling System — Tailwind

- [x] **STYLE-01**: App styling is implemented with Tailwind CSS v4 (via `@tailwindcss/vite`, CSS-first, no config file), replacing the hand-written `index.css` / `App.css`
- [ ] **STYLE-02**: The old hand-written CSS is removed once migrated — no component depends on it
- [x] **STYLE-03**: The Leaflet map renders correctly alongside Tailwind's Preflight reset — controls, markers, and layout intact
- [ ] **STYLE-04**: The production build and the existing test suite pass with Tailwind in place

### Visual Design — Glass / Atmospheric

- [ ] **DESIGN-01**: The app presents a cohesive glassy/atmospheric visual design — a noticeable, intentional uplift over v1.0 (not pixel-identical)
- [ ] **DESIGN-02**: A condition/anomaly-driven CSS gradient backdrop sets the atmospheric mood
- [ ] **DESIGN-03**: Content surfaces (anomaly card, location panel, trend area) use translucent depth/glass treatment with refined typography and spacing
- [ ] **DESIGN-04**: The anomaly hero (delta) has strengthened visual hierarchy as the app's focal point
- [ ] **DESIGN-05**: Recharts trend visuals (dot strip, mean line, actual-value marker) are re-themed to match the new palette for visual cohesion
- [ ] **DESIGN-06**: The zero-delta hero case reads clearly (no bare, ambiguous "0") — folds the known v1.0 UX gap into the hero redesign

### Performance Discipline

- [ ] **PERF-01**: Real `backdrop-blur` is applied only to static backdrops, never to surfaces over the live map; map pan/zoom stays smooth
- [ ] **PERF-02**: All motion/animation is gated behind `prefers-reduced-motion`; no JS/canvas animation loops

## Future Requirements

Deferred to a future release. Tracked but not in this milestone's roadmap.

### Location

- **LOC-04**: Current-location button with explicit user-initiated geolocation request (never auto-prompted on load)

### Platform

- **PLAT-03**: Mobile-responsive layout — map, charts, and anomaly display usable on touch/small screens

### Anomaly

- **ANOM-05**: "Since when" record context (e.g. "warmest for this date since 2019") — requires a full historical-series scan, not just the 30-year day-of-year baseline

## Out of Scope

Explicitly excluded from v1.1. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Feature / behavior changes of any kind | v1.1 is styling + visual design only; the app's functionality is unchanged |
| Mobile-responsive layout (`PLAT-03`) | Deferred; a genuine responsive pass is its own milestone — this redesign targets the existing layout envelope |
| Current-location / geolocation (`LOC-04`) | Deferred v2 feature, unrelated to styling |
| "Since when" record context (`ANOM-05`) | Deferred v2 feature, unrelated to styling |
| Weather variables beyond temperature | Still deferred from v1.0 |
| Forecast anomaly for future days | Still deferred from v1.0 |
| Heavy glassmorphism over the live map | Rejected on performance grounds — live `backdrop-blur` over a panning map is the expensive case (see PERF-01) |
| JS/canvas weather animation (rain, moving clouds) | Rejected on performance grounds; atmosphere comes from cheap CSS gradients, not animation loops (see PERF-02) |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| STYLE-01 | Phase 4 | Complete |
| STYLE-02 | Phase 4 | Pending |
| STYLE-03 | Phase 4 | Complete |
| STYLE-04 | Phase 4 | Pending |
| DESIGN-01 | Phase 5 | Pending |
| DESIGN-02 | Phase 5 | Pending |
| DESIGN-03 | Phase 5 | Pending |
| DESIGN-04 | Phase 5 | Pending |
| DESIGN-05 | Phase 5 | Pending |
| DESIGN-06 | Phase 5 | Pending |
| PERF-01 | Phase 5 | Pending |
| PERF-02 | Phase 5 | Pending |

**Coverage:**

- v1.1 requirements: 12 total
- Mapped to phases: 12 (Phase 4: 4 · Phase 5: 8)
- Unmapped: 0

---
*Requirements defined: 2026-07-16 · Mapped to phases: 2026-07-16*
