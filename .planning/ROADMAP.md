# Roadmap: Weather Anomaly Dashboard

## Milestones

- ✅ **v1.0 Weather Anomaly Dashboard MVP** — Phases 1-3 (shipped 2026-07-15)
- ✅ **v1.1 Tailwind Migration + Glass/Atmospheric Redesign** — Phases 4-5 (shipped 2026-07-21)
- 🚧 **v1.2 UI Layout Redesign & Explanatory Legend** — Phases 6-8 (in progress)

## Phases

<details>
<summary>✅ v1.0 Weather Anomaly Dashboard MVP (Phases 1-3) — SHIPPED 2026-07-15</summary>

Full detail archived at `.planning/milestones/v1.0-ROADMAP.md`.

- [x] Phase 1: Location Picker & Shareable Shell (4/4 plans) — completed 2026-07-14
- [x] Phase 2: Current Conditions & Anomaly Engine (3/3 plans) — completed 2026-07-14
- [x] Phase 3: Historical Trend Charts & Edge Cases (6/6 plans) — completed 2026-07-15

</details>

<details>
<summary>✅ v1.1 Tailwind Migration + Glass/Atmospheric Redesign (Phases 4-5) — SHIPPED 2026-07-21</summary>

Full detail archived at `.planning/milestones/v1.1-ROADMAP.md`.

- [x] Phase 4: Tailwind Foundation Migration (4/4 plans) — completed 2026-07-16
- [x] Phase 5: Glass / Atmospheric Redesign (3/3 plans) — completed 2026-07-21

</details>

### 🚧 v1.2 UI Layout Redesign & Explanatory Legend (In Progress)

**Milestone Goal:** Make every part of the anomaly view self-explanatory — restructure the resolved view into clearly-headlined panels, add methodology and inline explainers, and replace the trend row with a per-day split-violin visualization. (Desktop-focused reflow; mobile-responsive layout stays deferred.)

- [ ] **Phase 6: Panel Restructure & Hierarchy** - Split the hero into four headlined, self-explanatory panels with the Delta preserved as the focal point.
- [ ] **Phase 7: Methodology Section & Explainers** - Collapsible methodology disclosure plus a plain-language percentile framing of the z-score.
- [ ] **Phase 8: Split-Violin Trend View** - Replace dot-strip tiles with per-day recent-vs-prior split violins, gated for sparse samples, with an updated legend.

## Phase Details

### Phase 6: Panel Restructure & Hierarchy

**Goal**: Reorganize the resolved anomaly view into four clearly-headlined panels where each number explains itself in place, while the anomaly delta stays the unmistakable focal point.
**Depends on**: Phase 5 (v1.1 glass/atmospheric foundation shipped)
**Requirements**: LAYOUT-01, LAYOUT-02, LAYOUT-03, EXPLAIN-01, EXPLAIN-02
**Success Criteria** (what must be TRUE):

  1. User sees today's current temperature and the anomaly delta in two separate panels — the combined hero is split into a "Current conditions" panel and a "Delta" panel.
  2. User sees a distinct "Last 7 days"-style headline on every panel (Location, Current conditions, Delta, History), so it is immediately obvious what each panel shows.
  3. User's eye still lands on the Delta first — it remains the largest, color-driven, Δ-glyph-led element, visibly dominant (≈1.5-2× the Current-conditions scale), not visually equal to the other panels.
  4. User sees short inline micro-copy on each panel stating in plain language what its number means (current temperature, delta, z-score).
  5. User can reveal an in-place explanation of the delta, the z-score, and the current-temperature reading via an info affordance usable by both mouse and keyboard.

**Plans**: 3/3 plans executed
**Wave 1**

- [x] 06-01-PLAN.md — Shared primitives (PanelShell, PanelHeadline, InfoTooltip) + the isAnomalyReady gate predicate (Wave 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 06-02-PLAN.md — Migrate LocationDisplay + TrendRow onto the primitives; wire the History panel's four states (Wave 2)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 06-03-PLAN.md — Split the hero into Current Conditions + Delta panels, rewire App, retire AnomalyCard (Wave 3)

**UI hint**: yes
**Research flag**: Light design spike / UI-SPEC candidate — a low-fi layout mock confirming the eye lands on Delta first (acceptance: Delta scale ≥ ~1.5-2× the Current-conditions scale). Establishes the shared `PanelShell`/`PanelHeadline`/`InfoTooltip` primitives reused by Phases 7 and 8.

### Phase 7: Methodology Section & Explainers

**Goal**: Give users who want to understand or trust the anomaly a plain-language methodology explanation and a percentile framing of the score, without cluttering the at-a-glance view.
**Depends on**: Phase 6 (reuses the shared PanelShell / headline / InfoTooltip primitives)
**Requirements**: EXPLAIN-03, EXPLAIN-04
**Success Criteria** (what must be TRUE):

  1. User sees a methodology section collapsed by default and can expand it to read how the anomaly is computed (30-year baseline, day-of-year window, z-score, delta) and what the tool is for.
  2. User can expand and collapse the methodology section using both mouse and keyboard, with disclosure state and focus behaving accessibly (single-level, flat disclosure).
  3. User sees a plain-language percentile framing (e.g. "warmer than 98% of years for this date") presented alongside the z-score.

**Plans**: TBD
**UI hint**: yes
**Research flag**: None — native `<details>`/`<summary>` disclosure is a well-established pattern (skip research-phase). Verify the expand animation respects `prefers-reduced-motion` by toggling the OS setting, not just reading the CSS.

### Phase 8: Split-Violin Trend View

**Goal**: Replace the per-day dot-strip tiles with per-day split violins comparing each day's recent-5-year distribution against its prior-25-year distribution, surfacing climate-shift signal without overstating confidence on thin samples.
**Depends on**: Phase 6 (lands on the settled panel/layout foundation); sequenced last, after Phase 7
**Requirements**: TREND-01, TREND-02, TREND-03
**Success Criteria** (what must be TRUE):

  1. User sees, for each of the last ~7 days, a split-violin tile comparing that day's recent-5-year temperature distribution against its prior-25-year distribution, on the shared Y-axis, replacing the dot-strip tiles.
  2. User sees a graceful fallback for any violin half with too few samples — the sparse half degrades to a rug/dot strip (or is omitted) rather than drawing a misleadingly confident curve.
  3. User sees the actual-value marker and the shared Y-axis scale preserved, so tiles stay visually comparable across days.
  4. User sees an updated, legible trend legend that correctly explains the new split-violin marks (recent vs prior halves plus any retained mean/actual-value marks), finalized via a reviewer copy round-trip.

**Plans**: TBD
**UI hint**: yes
**Research flag**: Highest-risk phase — dedicated statistics/design spike before implementation. Validate Silverman bandwidth on this app's per-half sample sizes, pin the per-half `n_min` curve-vs-rug threshold (~15-20), decide width-normalization (equal-width vs n-scaled), settle the one-half-passes fallback (render available half vs drop tile), and get reviewer sign-off on which reviewer-locked legend marks survive as a violin overlay. Build bottom-up: `kde.ts` math → `buildViolinPaths()` geometry → `violinShape()` render → legend. `computeTrendDay()` changes to a two-sample (`recentSamples`/`priorSamples`) return shape; the fetch layer and 30-year archive call are unchanged.

## Progress

**Execution Order:** Phases execute in numeric order: 6 → 7 → 8

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Location Picker & Shareable Shell | v1.0 | 4/4 | Complete | 2026-07-14 |
| 2. Current Conditions & Anomaly Engine | v1.0 | 3/3 | Complete | 2026-07-14 |
| 3. Historical Trend Charts & Edge Cases | v1.0 | 6/6 | Complete | 2026-07-15 |
| 4. Tailwind Foundation Migration | v1.1 | 4/4 | Complete | 2026-07-16 |
| 5. Glass / Atmospheric Redesign | v1.1 | 3/3 | Complete | 2026-07-21 |
| 6. Panel Restructure & Hierarchy | v1.2 | 3/3 | In Progress|  |
| 7. Methodology Section & Explainers | v1.2 | 0/TBD | Not started | - |
| 8. Split-Violin Trend View | v1.2 | 0/TBD | Not started | - |

## Backlog

### Phase 999.1: split-violin-plot-for-trend-day-distributions (BACKLOG → PROMOTED)

**Status:** Promoted into v1.2 as **Phase 8: Split-Violin Trend View** (TREND-01..03). Kept here for provenance; no longer awaiting promotion.

Idea: replace (or offer as an alternative to) the trend row's current per-day dot-cloud + mean-line encoding with a split violin plot. Each day would show two distributions side by side: (1) the distribution of temperatures on that calendar day 5-30 years ago, and (2) the distribution of temperatures on that calendar day over the last 5 years. Purpose: surface not just "today vs. 30-year average" but whether the recent 5 years' distribution has shifted relative to the older 25 years — a climate-shift/recency signal.

**Plans:** 0 plans (see Phase 8 above)
