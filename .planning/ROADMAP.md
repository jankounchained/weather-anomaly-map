# Roadmap: Weather Anomaly Dashboard

## Overview

A static, client-only SPA taking users from "drop a pin" to "know if today is unusual" in three phases. Phase 1 builds the shareable foundation: an interactive map picker, reverse-geocoded place names, URL-encoded location state, and a deployed shell running on free hosting with no login. Phase 2 layers in the core value proposition — current temperature plus the anomaly engine (delta, z-score, plain-language verdict) computed from a statistically sound 30-year day-of-year baseline. Phase 3 completes the picture with the last-7-days historical range visualization (showing real distribution, not just an average line) and graceful handling of locations with no usable historical data.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Location Picker & Shareable Shell** - Users can drop a pin, see its place name, share the exact view via URL, and reach the app with no login on free hosting (completed 2026-07-14)
- [x] **Phase 2: Current Conditions & Anomaly Engine** - Users can see today's temperature and a statistically sound, easy-to-interpret anomaly (delta, z-score, verdict) vs. the 30-year norm (completed 2026-07-14)
- [ ] **Phase 3: Historical Trend Charts & Edge Cases** - Users can see each of the last ~7 days plotted against its own historical range, and get a graceful message when historical data isn't available

## Phase Details

### Phase 1: Location Picker & Shareable Shell

**Goal**: Users can pick any location on an interactive map, see it identified by place name, and share that exact view via URL — with the app publicly reachable, free to host, and requiring no login.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: LOC-01, LOC-02, LOC-03, PLAT-01, PLAT-02
**Success Criteria** (what must be TRUE):

  1. User can select a location by clicking or dragging a pin on an interactive map
  2. User sees the selected location's place name (reverse-geocoded), falling back to coordinates if lookup fails
  3. The selected location is encoded in the URL, so sharing that URL loads the same location for anyone else
  4. The app is live on a public URL, requires no account or login, and runs entirely on free-tier hosting

**Plans**: 4/4 plans complete
**Wave 1**

- [x] 01-01-PLAN.md — Scaffold (Vite+React+TS 6.0.3) + CARTO map + click/drag pin + URL state (LOC-01, LOC-03)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — BigDataCloud reverse geocoding + location panel states with coordinate fallback (LOC-02)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — Deploy to Cloudflare Pages + verify public shareable URL (PLAT-01, PLAT-02)

**Wave 4** *(gap closure — closes the CR-01 shareable-URL round-trip BLOCKER from 01-VERIFICATION.md)*

- [x] 01-04-PLAN.md — Clamp/wrap the location write path + validate hasUrlSelection + renderHook coverage (LOC-03, PLAT-01)

**UI hint**: yes

### Phase 2: Current Conditions & Anomaly Engine

**Goal**: For the selected location, users can see today's actual temperature and an accurate, easy-to-interpret comparison against the 30-year historical norm for that calendar day.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: CURR-01, ANOM-01, ANOM-02, ANOM-03, ANOM-04
**Success Criteria** (what must be TRUE):

  1. User sees the current temperature for the selected location
  2. User sees today's temperature anomaly as a °C delta vs. the 30-year historical average, shown as the primary, most prominent number
  3. User sees the anomaly as a z-score, shown as a secondary/supporting stat
  4. User sees a plain-language verdict (e.g. "slightly warmer than usual") translating the anomaly
  5. The anomaly is computed from a stable day-of-year window baseline across 30 years (not a single-day sample) using sample standard deviation, so the same location and date consistently produce a trustworthy reading

**Plans**: 3/3 plans complete

**Wave 1**

- [x] 02-01-PLAN.md — Current-temperature vertical slice: src/weather/ client + useCurrentWeather hook + AnomalyCard shell (CURR-01)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md — Anomaly engine vertical slice: pure anomaly math + 30-year archive baseline + AnomalyCard delta/verdict/z-score/tooltip (ANOM-01, ANOM-02, ANOM-03, ANOM-04)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-03-PLAN.md — Human-verify checkpoint: full anomaly card end-to-end against live data (CURR-01, ANOM-01..04)

**UI hint**: yes

### Phase 3: Historical Trend Charts & Edge Cases

**Goal**: Users can see how each of the last ~7 days compares to its own historical range, with the full historical distribution visible (not just an average line), and get a graceful experience when historical data isn't available for a location.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: VIZ-01, VIZ-02, ROBU-01
**Success Criteria** (what must be TRUE):

  1. User can see, for each of the last ~7 days, that day's actual temperature plotted against that day's historical range/distribution
  2. Each day's chart shows the underlying historical data points/distribution (not just a single average line), with the average visually emphasized (e.g. brighter/higher-opacity) without hiding the spread
  3. User sees a graceful, understandable message when the selected location has no usable historical data (e.g. ocean, remote areas)

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Location Picker & Shareable Shell | 4/4 | Complete    | 2026-07-14 |
| 2. Current Conditions & Anomaly Engine | 3/3 | Complete    | 2026-07-14 |
| 3. Historical Trend Charts & Edge Cases | 0/TBD | Not started | - |
