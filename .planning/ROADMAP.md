# Roadmap: Weather Anomaly Dashboard

## Milestones

- ✅ **v1.0 Weather Anomaly Dashboard MVP** — Phases 1-3 (shipped 2026-07-15)
- 🚧 **v1.1 Tailwind Migration + Glass/Atmospheric Redesign** — Phases 4-5 (in progress)

## Phases

<details>
<summary>✅ v1.0 Weather Anomaly Dashboard MVP (Phases 1-3) — SHIPPED 2026-07-15</summary>

Full detail archived at `.planning/milestones/v1.0-ROADMAP.md`.

- [x] Phase 1: Location Picker & Shareable Shell (4/4 plans) — completed 2026-07-14
- [x] Phase 2: Current Conditions & Anomaly Engine (3/3 plans) — completed 2026-07-14
- [x] Phase 3: Historical Trend Charts & Edge Cases (6/6 plans) — completed 2026-07-15

</details>

### 🚧 v1.1 Tailwind Migration + Glass/Atmospheric Redesign (In Progress)

**Milestone Goal:** Rebuild the styling layer on Tailwind CSS v4 and elevate the app to a polished, glassy/atmospheric "design-studio" look — without degrading map or app responsiveness. Styling and visual design only; no feature or behavior changes.

- [ ] **Phase 4: Tailwind Foundation Migration** — Swap hand-written CSS to Tailwind v4 with the UI visually unchanged; map, build, and tests stay green
- [ ] **Phase 5: Glass / Atmospheric Redesign** — Layer the cohesive glassy/atmospheric design language on the Tailwind base — hero-first, re-themed charts, performance-disciplined

## Phase Details

### Phase 4: Tailwind Foundation Migration

**Goal**: Move the app's entire styling layer onto Tailwind CSS v4 (`@tailwindcss/vite`, CSS-first, no config file) while keeping the rendered UI visually equivalent to v1.0. This is a deliberate de-risking step: it isolates the mechanical CSS migration from the later aesthetic redesign, so any regression here is caught before design work begins.
**Depends on**: Phase 3 (v1.0 baseline shipped)
**Requirements**: STYLE-01, STYLE-02, STYLE-03, STYLE-04
**Success Criteria** (what must be TRUE):

  1. The app renders visually equivalent to v1.0, with all styling expressed through Tailwind (utilities / CSS-first tokens) rather than the hand-written `index.css` / `App.css`.
  2. The Leaflet map — its zoom/attribution controls, tile layer, and draggable pin marker — renders and behaves correctly with Tailwind's Preflight reset active (the Preflight-vs-Leaflet interaction is resolved).
  3. The old hand-written CSS is deleted and no component imports it.
  4. `vite build` (production build) and the existing Vitest suite both pass with Tailwind in place.

**Plans**: 2/4 plans executed

Plans:
**Wave 1**

- [x] 04-01-PLAN.md — Tailwind v4 foundation: install (behind supply-chain gate), wire @tailwindcss/vite, rewrite index.css as the CSS-first entry (@theme tokens + spinner keyframe) [Wave 1]

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 04-02-PLAN.md — Layout + hero surfaces to utilities: App shell/map-region (Leaflet sizing preserved), LocationPanel, LocationDisplay, AnomalyCard; drop legacy CSS import [Wave 2]
- [ ] 04-03-PLAN.md — Trend visuals to utilities: TrendRow, TrendDayChart, TrendLegend (inline var(--color-*) SVG props untouched) [Wave 2]

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 04-04-PLAN.md — Teardown + verification: delete App.css, static/build/test gates, mandatory manual visual-equivalence walkthrough [Wave 3]

### Phase 5: Glass / Atmospheric Redesign

**Goal**: On the stable Tailwind base, establish a cohesive glassy/atmospheric design language — a condition/anomaly-driven gradient backdrop, translucent depth surfaces, refined typography, a re-themed trend chart, and a strengthened anomaly-hero focal point — all delivered within the disciplined-glass performance policy. Design intent is captured in a UI-SPEC design contract (`/gsd-ui-phase`) before build so the "noticeably sharper, hero-first" look is agreed up front rather than discovered during implementation.
**Depends on**: Phase 4
**Requirements**: DESIGN-01, DESIGN-02, DESIGN-03, DESIGN-04, DESIGN-05, DESIGN-06, PERF-01, PERF-02
**Success Criteria** (what must be TRUE):

  1. The app presents an intentional, noticeably sharper glassy/atmospheric look versus v1.0: a condition/anomaly-driven CSS gradient backdrop sets the mood, and content surfaces (anomaly card, location panel, trend area) carry translucent depth with refined typography and spacing.
  2. The anomaly delta reads as the unmistakable focal point of the view, and the zero-delta case reads clearly — never a bare, ambiguous "0".
  3. The recharts trend visuals (30-year dot strip, mean line, actual-value marker) are re-themed to the new palette and read as part of the same visual system.
  4. Map pan/zoom stays smooth: real `backdrop-blur` appears only on static backdrops, while surfaces layered over the live map use faux-frosted translucency instead.
  5. With `prefers-reduced-motion` set, all motion is disabled, and no JS/canvas animation loop runs at any point.

**Plans**: TBD
**UI hint**: yes

Plans:

- [ ] TBD (defined by `/gsd-plan-phase 5`)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Location Picker & Shareable Shell | v1.0 | 4/4 | Complete | 2026-07-14 |
| 2. Current Conditions & Anomaly Engine | v1.0 | 3/3 | Complete | 2026-07-14 |
| 3. Historical Trend Charts & Edge Cases | v1.0 | 6/6 | Complete | 2026-07-15 |
| 4. Tailwind Foundation Migration | v1.1 | 2/4 | In Progress|  |
| 5. Glass / Atmospheric Redesign | v1.1 | 0/TBD | Not started | - |

## Backlog

### Phase 999.1: split-violin-plot-for-trend-day-distributions (BACKLOG)

**Goal:** [Captured for future planning]
**Requirements:** TBD

Idea: replace (or offer as an alternative to) the trend row's current per-day dot-cloud + mean-line encoding with a split violin plot. Each day would show two distributions side by side: (1) the distribution of temperatures on that calendar day 5-30 years ago, and (2) the distribution of temperatures on that calendar day over the last 5 years. Purpose: surface not just "today vs. 30-year average" but whether the recent 5 years' distribution has shifted relative to the older 25 years — a climate-shift/recency signal. Status: tentative, may be rejected — captured for consideration only.

**Plans:** 0 plans

Plans:

- [ ] TBD (promote with /gsd-review-backlog when ready)
