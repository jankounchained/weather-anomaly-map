# Requirements: Weather Anomaly Dashboard

**Defined:** 2026-07-13
**Core Value:** For any location, the user can immediately tell how unusual today's temperature is compared to historical norms — the anomaly score must be accurate and easy to interpret at a glance.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Location

- [x] **LOC-01**: User can pick a location by clicking or dragging a pin on an interactive map
- [x] **LOC-02**: User sees the selected location's place name (reverse-geocoded), falling back to coordinates if lookup fails
- [x] **LOC-03**: Selected location is encoded in the URL so a specific view can be shared with others

### Current Conditions

- [x] **CURR-01**: User can see the current temperature for the selected location

### Anomaly

- [ ] **ANOM-01**: User can see today's temperature anomaly as a delta (°C) vs the 30-year historical average for that calendar day at that location, shown as the primary, most prominent number
- [ ] **ANOM-02**: User can see today's temperature anomaly as a z-score vs the 30-year historical average, shown as a secondary/supporting stat
- [ ] **ANOM-03**: User can see a plain-language verdict (e.g. "slightly warmer than usual") translating the anomaly into an intuitive read
- [ ] **ANOM-04**: Anomaly baseline is computed from a day-of-year window (not a single sample per year) across 30 years of historical data, using sample standard deviation

### Visualization

- [ ] **VIZ-01**: User can see, for each of the last ~7 days, that day's actual temperature plotted against its own historical range/distribution for that calendar day (a "day vs. range" view repeated across the week)
- [ ] **VIZ-02**: Historical range visualizations show the underlying historical data points/distribution, not just a single average line — the average is visually emphasized (e.g. brighter color, higher opacity) without hiding the spread

### Robustness

- [ ] **ROBU-01**: User sees a graceful message when a clicked location has no usable historical data (e.g. ocean, remote areas)

### Platform

- [x] **PLAT-01**: Dashboard is usable by anyone via a shared URL — no accounts, no login required
- [x] **PLAT-02**: App runs entirely on free hosting tiers (frontend and any backend/API layer)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Location

- **LOC-04**: Current-location button with explicit user-initiated geolocation request (never auto-prompted on load)

### Platform

- **PLAT-03**: Mobile-responsive layout — map, charts, and anomaly display usable on touch/small screens

### Anomaly

- **ANOM-05**: "Since when" record context (e.g. "warmest for this date since 2019") — requires a full historical-series scan, not just the 30-year day-of-year baseline

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| User accounts / saved favorite locations | No persistence needed — user confirmed they'll re-pick a location each visit; keeps the app stateless and free to host |
| Weather variables beyond temperature (precipitation, wind, etc.) | v1 is temperature-only; validate the anomaly-framing concept before multiplying scope |
| Forecast anomaly for future days | Materially different, less defensible problem than observed-data anomaly; v1 covers today + recent past only |
| Native mobile app | A web app covers mobile browsers; no separate app needed |
| Multi-location comparison view | Dilutes the single-pin "at a glance" core value |
| Ads / tracking / newsletter signup | Conflicts with the quick, practical, no-accounts positioning of the tool |
| Push notifications / alert thresholds | Requires accounts and a backend scheduler — conflicts with the stateless, no-accounts constraint |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LOC-01 | Phase 1 | Complete |
| LOC-02 | Phase 1 | Complete |
| LOC-03 | Phase 1 | Complete |
| CURR-01 | Phase 2 | Complete |
| ANOM-01 | Phase 2 | Pending |
| ANOM-02 | Phase 2 | Pending |
| ANOM-03 | Phase 2 | Pending |
| ANOM-04 | Phase 2 | Pending |
| VIZ-01 | Phase 3 | Pending |
| VIZ-02 | Phase 3 | Pending |
| ROBU-01 | Phase 3 | Pending |
| PLAT-01 | Phase 1 | Complete |
| PLAT-02 | Phase 1 | Complete |

**Coverage:**

- v1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0

---
*Requirements defined: 2026-07-13*
*Last updated: 2026-07-13 after roadmap creation*
