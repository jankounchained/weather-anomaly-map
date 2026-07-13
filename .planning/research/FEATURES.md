# Feature Research

**Domain:** Weather anomaly / climate-normal comparison dashboard (consumer, single-purpose, map-based)
**Researched:** 2026-07-13
**Confidence:** MEDIUM (web search only, no MCP doc/search providers available this run; claims cross-verified across 2+ independent sources where marked)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Click/drag pin on interactive map to pick a location | Standard pattern across weather and mapping apps — click triggers reverse geocoding, address fills a label, marker appears. Faster than typing lat/lng. (Cross-verified: css-tricks, dev.to/geoapify, uxmatters) | LOW–MEDIUM | Already a Key Decision in PROJECT.md. Use Leaflet/MapLibre + a free reverse-geocoding endpoint. |
| Reverse-geocoded place name shown, not raw coordinates | Users expect to see "Lisbon, Portugal" not "38.72, -9.14" — coordinates alone read as unfinished/technical. (uxmatters, dev.to/geoapify) | LOW | Requires a geocoding API call after pin drop; degrade gracefully to coordinates if lookup fails (ocean, remote areas). |
| Current temperature for the selected location | Baseline expectation for any weather tool — the anomaly score is meaningless without showing the raw reading it's derived from. | LOW | Already a PROJECT.md requirement (Open-Meteo current weather endpoint). |
| Anomaly expressed as a plain-language delta ("6°C warmer than usual"), not just a raw statistic | Weathercasters and NOAA framing treat "normal" as a *range*, not a single value — reporting only a bare z-score without a plain delta reads as overstated or confusing to lay users. Z-score-only displays are a documented misinterpretation risk (negative scores read as "bad", units not understood as σ). (Cross-verified: statology.org, ncbi/PMC12239870, illinois.edu extension) | LOW | Delta is already a PROJECT.md requirement. Treat it as the *primary* framing; z-score as secondary/supporting detail, not the headline number. |
| "Today vs. historical range" chart (not just a single average line) | NOAA/climate-normal convention presents the normal as a band, and standardized-anomaly convention treats ±1σ/±2σ/±3σ as meaningful thresholds (68/95/99.7%) — showing today's point against a range or distribution, not a single reference line, matches how meteorologists themselves frame "normal." (climatereanalyzer.org, wrcc.dri.edu, weather.gov normals/records page) | MEDIUM | Box-plot / range-band chart is the standard convention (Atlassian, Tableau box-plot guides; WeatherSpark's percentile-band charts use this pattern for exactly this comparison). Already a PROJECT.md requirement. |
| Recent-days trend view (anomaly over last N days, not just today) | Already a PROJECT.md requirement; also matches how consumer climate dashboards (Climate Reanalyzer daily summary) present a short time series alongside the single-day snapshot so a one-day spike vs. a sustained pattern is distinguishable. | MEDIUM | Requires historical archive calls for each of the last N days plus their day-of-year baselines — see Feature Dependencies. |
| Graceful handling of no-data / sparse-data locations | Historical archive coverage and reverse-geocoding both fail over oceans, poles, and some remote areas — a location-picker tool that lets users click anywhere on a map *will* hit these. | LOW–MEDIUM | Not explicitly in PROJECT.md yet — flag as an edge case requirement, not a nice-to-have, given "click anywhere on a map" is the core interaction. |
| Mobile-responsive layout | PROJECT.md explicitly defers native apps in favor of a responsive web app; map-based pin-drop and chart interactions must work on touch. | LOW–MEDIUM | Map libraries and most chart libraries support touch out of the box; the main risk is chart/tooltip density on small screens. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable — and should align with the Core Value ("instantly tell how unusual today is, accurate and easy to interpret at a glance").

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Plain-language "verdict" badge translating the z-score into a category (e.g. "slightly warmer than usual" / "much colder than usual") | Existing climate-anomaly tools (NOAA Climate at a Glance, Climate Reanalyzer) present raw numbers/ranks and expect the user to interpret them; this project's stated use case is a fast practical check, not research. A one-line plain-language read directly serves that use case and is the clearest differentiation opportunity given documented z-score misinterpretation risk. | LOW–MEDIUM | Map σ thresholds (e.g. <0.5σ "near normal", 0.5–1.5σ "unusual", >1.5σ "highly unusual") to short labels + a delta. Cheap to build, high perceived value. |
| Combining z-score *and* delta *and* a range chart together, calibrated against each other | Most tools researched lean on one framing only — NOAA/Climate-at-a-Glance leans on ranks/anomalies in numeric form; WeatherSpark leans on percentile bands without a headline verdict; Climate Reanalyzer leans on σ units. None of the researched tools combine all three (verdict phrase + delta + σ + visual range) in one glance for a single arbitrary point on Earth. | LOW (given the above are each already planned) | This is a synthesis differentiator, not a new data feature — the value is in information design, not new data. |
| Fast pin-drop-to-answer flow for unfamiliar/travel locations | NOAA and most government climate-normal tools require selecting a named station from a dropdown/search, which assumes the user already knows the place name. This project's "checking before traveling somewhere new" use case is better served by drop-a-pin-anywhere, which most scientific tools don't offer as the primary interaction. | MEDIUM | Already the core interaction per PROJECT.md; framing it explicitly as a differentiator vs. station-list tools is useful for the roadmap. |
| Shareable state via URL (lat/lon, and optionally date, encoded in the URL) | PROJECT.md already requires "usable via a shared URL." Doing this well (short/clean URL, preview-friendly) is what turns a personal utility into something people forward to a friend — "look how weird today is here." | LOW | No login needed; just encode state as query params. Complements the "no accounts" constraint rather than fighting it. |
| "Since when" record context (e.g. "warmest for this date since 2019") | Common journalistic/consumer framing for extreme days ("hottest since X", "warmest June since 1950" — cross-verified across multiple 2026 news examples) gives an intuitive, memorable anchor beyond a bare statistic. | MEDIUM–HIGH | Requires scanning the full historical series per location for the day-of-year record, not just the 30-year mean/stdev — more data/compute than the core anomaly calc. Good v1.x candidate, not MVP-critical. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for this specific product (free, stateless, single-purpose, quick-glance tool).

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| User accounts / saved favorite locations | Feels natural for a "recurring check of one go-to location" use case | PROJECT.md explicitly rules this out — adds backend/auth surface, breaks the free-tier/stateless hosting constraint, and the user already confirmed re-picking a location each visit is acceptable | `localStorage` for "last location" (already noted as acceptable in PROJECT.md) — zero-backend persistence |
| Requesting geolocation permission automatically on page load | Seems like it saves the user a step for "check my usual spot" | Users are demonstrably distrustful of auto-prompts on load, and a reflexive dismissal permanently forfeits the chance to opt in later without a manual UI to retry (Cross-verified: web.dev permissions-best-practices, Chrome DevRel geolocation-on-start Lighthouse audit, Yext geolocation UX post) | Only request geolocation after an explicit "Use my location" button click, with a clearly visible fallback to click-the-map |
| Dense scientific/statistical UI (distribution histograms, raw data tables, multi-decade browsing like WeatherSpark) | Feels "more rigorous" and mirrors what NOAA/climate-research tools show | PROJECT.md explicitly states this is not a climate-research tool — the primary use case is a fast practical check before going outside/traveling; heavy stats UI works against "at a glance" | Keep to: verdict phrase, delta, z-score (secondary), one range chart, one trend chart — resist adding more chart types before validating the core four |
| Additional weather variables in v1 (precipitation, wind, humidity, "feels like") | Users may ask "what about rain/wind" once they see a temperature-only tool | PROJECT.md explicitly scopes v1 to temperature only; each variable adds its own baseline/anomaly computation and UI, multiplying scope before the core concept is validated | Ship temperature-only, defer other variables to v1.x/v2 once anomaly framing is validated |
| Forecast-anomaly ("will tomorrow be unusual") | Natural extension once anomaly-for-today exists, and users planning travel might want it | PROJECT.md explicitly defers this — forecast anomaly requires reasoning about forecast uncertainty vs. observed-data anomaly, a materially different (harder, less defensible) problem | Ship today + recent-past anomaly first; revisit forecast anomaly as a distinct, separately-scoped v2 feature |
| Ads / tracking / newsletter signup prompts | Common monetization/retention pattern for free web tools | Directly conflicts with the "quick practical check" use case and the no-accounts, stateless, free-hosting-tier positioning; erodes trust in a tool whose value proposition is speed and simplicity | None needed — keep the tool ad-free and trackable-free; if hosting cost becomes a concern, revisit as a separate decision, not a default |
| Push notifications / alert thresholds ("notify me when it's unusual") | Natural feature once anomaly scoring exists, and is a common differentiator for weather apps generally | Requires accounts, saved locations, and a backend scheduler/notification service — directly conflicts with every "no accounts, no persistence, stateless, free-tier" constraint in PROJECT.md | None for v1; if ever pursued, it would require revisiting the no-accounts constraint as its own milestone decision |
| Multi-location comparison / dashboard of many pins at once | Feels like a natural pro-user extension of "drop a pin" | Adds a fundamentally different UI mode (list/grid of results) that dilutes the single-pin "at a glance" core value and multiplies API calls per page load | Keep to one location at a time for v1; shareable URLs per location already let users flip between places quickly |

## Feature Dependencies

```
Map pin-drop location picker
    └──requires──> Reverse geocoding (place name display)
    └──requires──> Open-Meteo current-weather call (current temperature)
    └──requires──> Open-Meteo historical-archive calls (baseline + trend)

Anomaly delta (°C vs. 30-yr average)
    └──requires──> Historical baseline computation (mean for that calendar day, that location, 30 yrs)

Anomaly z-score
    └──requires──> Historical baseline computation (mean AND stdev for that calendar day)
    └──requires──> Anomaly delta (z-score is the delta divided by stdev — same underlying baseline call)

"Today vs. historical range" chart
    └──requires──> Historical baseline computation (needs the distribution/range, not just mean+stdev)

Recent-days trend chart
    └──requires──> Anomaly delta AND z-score computed once per day, per day-of-year baseline, for each of the last N days
    └──requires──> N × Open-Meteo historical-archive baseline calls (one per recent day's calendar date)

Plain-language "verdict" badge (differentiator)
    └──enhances──> Anomaly z-score (badge is a presentation layer on top of the existing z-score, no new data)

Current-location button (table stakes)
    └──requires──> Map pin-drop location picker (shares the same marker/selection state)
    └──enhances──> Map pin-drop location picker (adds a faster path for the "usual spot" use case)

Shareable URL (table stakes, already in PROJECT.md)
    └──requires──> Map pin-drop location picker (URL just encodes the selected lat/lon)

"Since when" record context (differentiator)
    └──requires──> Full historical series scan per location (not just 30-yr mean/stdev — a materially larger data pull)
    └──conflicts──> MVP timeline if attempted in v1 (heavier compute/API load than the core anomaly features)

Additional weather variables (anti-feature for v1)
    └──conflicts──> Temperature-only v1 scope (PROJECT.md Out of Scope)

Forecast anomaly (anti-feature for v1)
    └──conflicts──> "Today + recent past only" v1 scope (PROJECT.md Out of Scope)
```

### Dependency Notes

- **Anomaly z-score and delta share one baseline call:** because both are derived from the same day-of-year mean/stdev computation, computing them is not two separate features from a data-engineering standpoint — this simplifies phase planning (baseline computation is one unit of work, not two).
- **Recent-days trend multiplies the baseline computation by N:** the trend chart isn't "the same feature over more days" for free — it requires N separate day-of-year baselines (day-of-year 194's baseline is different from day-of-year 193's), which has real complexity and API-call-volume implications for a free-tier-hosted app. This should be flagged for phase-specific research (caching/rate-limit strategy).
- **"Since when" record context conflicts with MVP scope, not with any other feature:** it's a genuinely valuable differentiator but pulls in full-series historical data (not just a 30-year day-of-year mean/stdev), which is a bigger and different kind of query than everything else in the table-stakes set. Treat as v1.x, not v1.
- **Current-location button enhances rather than replaces the map picker:** both must share the same underlying "selected location" state (marker + reverse-geocoded name) so the two entry points feel like one consistent flow, per the UX research on shared marker/input patterns.

## MVP Definition

### Launch With (v1)

Minimum viable product — matches PROJECT.md's Active requirements almost exactly; this is the validated table-stakes set.

- [ ] Map click/drag pin location picker — core interaction, everything else depends on a selected location
- [ ] Reverse-geocoded place name display (with graceful fallback to coordinates) — table stakes, low complexity, high perceived-completeness payoff
- [ ] Current temperature display for selected location — baseline expectation, already required
- [ ] Today's anomaly as a plain-language delta (°C) — primary framing per z-score-misinterpretation research; must not be the only number shown but must be the most prominent
- [ ] Today's anomaly as a z-score — secondary/supporting stat, already required
- [ ] "Today vs. historical range" chart (box-plot/range-band style) — table stakes, matches meteorological "normal is a range" convention
- [ ] Recent-days trend chart (last ~7–14 days of anomaly) — already required, distinguishes a one-day blip from a sustained pattern
- [ ] Graceful no-data handling for ocean/remote pin drops — edge case that WILL occur given the core interaction is "click anywhere"

### Add After Validation (v1.x)

Features to add once the core anomaly-viewing flow is working and validated with real usage.

- [ ] Plain-language verdict badge ("slightly warmer than usual") — add once the core delta/z-score numbers are confirmed to be accurate and well-calibrated; this is a presentation layer on top, low risk to add later
- [ ] Current-location button with explicit user-initiated geolocation request — add once the map-based flow is solid; not blocking MVP since map click already covers location selection
- [ ] "Since when" record context ("warmest for this date since 2019") — add once full-series data access/caching strategy is worked out; bigger data pull than v1's day-of-year baseline

### Future Consideration (v2+)

Features to defer until the core temperature-anomaly concept is validated with users.

- [ ] Additional weather variables (precipitation, wind, humidity) — defer per PROJECT.md; validate the anomaly-framing concept on temperature before multiplying scope
- [ ] Forecast anomaly ("will tomorrow be unusual") — defer per PROJECT.md; materially different, less defensible problem than observed-data anomaly
- [ ] Multi-location comparison view — defer; dilutes the single-pin "at a glance" core value, revisit only if users explicitly request comparing places

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Map pin-drop location picker | HIGH | MEDIUM | P1 |
| Reverse-geocoded place name | MEDIUM | LOW | P1 |
| Current temperature display | HIGH | LOW | P1 |
| Anomaly delta (°C) | HIGH | LOW | P1 |
| Anomaly z-score | MEDIUM | LOW | P1 |
| Today-vs-range chart | HIGH | MEDIUM | P1 |
| Recent trend chart | HIGH | MEDIUM–HIGH | P1 |
| No-data edge-case handling | MEDIUM | LOW–MEDIUM | P1 |
| Plain-language verdict badge | HIGH | LOW | P2 |
| Current-location button | MEDIUM | LOW | P2 |
| Shareable URL state | MEDIUM | LOW | P2 |
| "Since when" record context | MEDIUM | HIGH | P2/P3 |
| Additional weather variables | MEDIUM | HIGH | P3 |
| Forecast anomaly | MEDIUM | HIGH | P3 |
| Multi-location comparison | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | NOAA Climate at a Glance / Climate Normals | WeatherSpark | Climate Reanalyzer | Our Approach |
|---------|---------------------------------------------|--------------|---------------------|--------------|
| Location selection | Named station/region dropdown or search — assumes user knows the place name | Named place search | Global map, but shows a single pre-set aggregate view, not arbitrary click-anywhere anomaly for a specific day | Click/drag pin anywhere — no need to know a station name, serves both "usual spot" and "somewhere new" use cases |
| Primary anomaly framing | Numeric rank/anomaly tables, values in raw units | Percentile-band charts against historical range, no single verdict number | Standardized anomaly in σ units, degrees-from-baseline framing | Delta (°C) as primary, z-score as secondary, plus a plain-language verdict — leads with the most intuitive number, not the raw statistic |
| "Today vs. range" visualization | Static rank tables, not a range chart | Percentile-band chart across the calendar year (strong precedent for our "today vs. range" chart) | Time-series chart of anomaly value, global map view | Adopt WeatherSpark's range/band chart convention but scoped to "today vs. this calendar day's 30-yr distribution" rather than a full-year band |
| Recency/trend context | Monthly/yearly rankings, not a short recent-day trend | Full historical time series, pannable/zoomable | Daily global anomaly time series (multi-decade) | Short recent-days trend (last 1–2 weeks) — scoped down from these tools' multi-decade browsing to match the "quick practical check" use case |
| Onboarding/complexity | Dropdown-heavy, dataset-selection UI aimed at researchers | Rich, dense, many chart types — aimed at trip planners wanting deep climate detail | Scientific framing, aimed at climate researchers/journalists | Single-purpose, one screen, one location at a time — deliberately less dense than all three researched precedents |

## Sources

- [Climate Reanalyzer — Today's Weather / Daily Summary](https://climatereanalyzer.org/wx/todays-weather/) — standardized anomaly (σ) convention, day-of-year baseline framing — MEDIUM confidence (web search, cross-verified against wrcc.dri.edu)
- [NOAA Climate.gov — Global Temperature Anomalies Graphing Tool](https://www.climate.gov/maps-data/dataset/global-temperature-anomalies-graphing-tool) — anomaly map/chart conventions — MEDIUM confidence
- [NOAA NCEI — Climate at a Glance](https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/national/rankings) — rank/anomaly table presentation for lay+expert audiences — MEDIUM confidence
- [NOAA NCEI — U.S. Climate Normals](https://www.ncei.noaa.gov/access/us-climate-normals/) — 30-year normal as the standard climatological baseline convention — MEDIUM confidence (matches PROJECT.md's own stated methodology)
- [weather.gov — Normal and Record Temperatures](https://www.weather.gov/apx/records_normals_table) — record-high/low-as-context convention — MEDIUM confidence
- [Illinois Extension — "Are average temperatures 'normal'?"](https://extension.illinois.edu/blogs/all-about-weather/2021-02-02-are-average-temperatures-normal) — "normal is a range, not an exact value" framing — MEDIUM confidence, cross-verified against weather.gov framing
- [Statology — The Concise Guide to Z-Scores](https://www.statology.org/concise-guide-z-scores/) — common z-score misinterpretations (negative-is-bad, unit confusion) — MEDIUM confidence, cross-verified against PMC12239870
- [PMC — "Why and When You Should Avoid Using z-scores in Graphs Displaying Profile or Group Differences"](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12239870/) — technical pitfalls of z-score-only visualization — LOW–MEDIUM confidence (academic source found via web search, not verified via a documentation provider)
- [Atlassian — Complete Guide to Box Plots](https://www.atlassian.com/data/charts/box-plot-complete-guide) / [Tableau — Box and Whisker Plots](https://www.tableau.com/chart/what-is-box-and-whisker-plot) — standard chart convention for "value vs. distribution/range" — MEDIUM confidence, cross-verified across two independent chart-design references
- [WeatherSpark](https://weatherspark.com/) — percentile-band chart precedent for "today vs. typical range," multi-decade historical browsing as a contrast point (deliberately not replicated) — MEDIUM confidence
- [CSS-Tricks — "Let's make a form that puts current location to use in a map!"](https://css-tricks.com/lets-make-a-form-that-puts-current-location-to-use-in-a-map/) / [dev.to — Add Address Autocomplete with Click-to-Address Reverse Geocoding](https://dev.to/geoapify-maps-api/add-address-autocomplete-to-a-maplibre-gl-map-with-click-to-address-reverse-geocoding-3c14) — map click + reverse geocoding + shared marker/input pattern — MEDIUM confidence, cross-verified across two independent implementation guides
- [web.dev — Permissions Best Practices](https://web.dev/articles/permissions-best-practices) / [Chrome for Developers — "Requests the geolocation permission on page load" (Lighthouse audit)](https://developer.chrome.com/docs/lighthouse/best-practices/geolocation-on-start) / [Yext — 4 Tips to Improve Geolocation UX](https://www.yext.com/blog/2019/02/4-tips-to-improve-geolocation-ux/) — geolocation-on-user-action, not on-load; fallback UI requirement — MEDIUM confidence, cross-verified across three independent sources including a browser vendor's own audit criteria
- [nologin.tools](https://nologin.tools/) / [nosignuptools.com](https://nosignuptools.com/) — no-account, no-ad, single-purpose free-tool positioning as a recognized product category — LOW confidence (marketing-site framing rather than authoritative UX research, but directly corroborates PROJECT.md's own stated constraints)
- Cross-verified 2026 news examples (weather.com, Yale Climate Connections, KSL, Fox Weather, CNN) — "hottest/warmest since [date]" as a standard consumer-facing framing convention for extreme-anomaly context — MEDIUM confidence (consistent pattern across many independent outlets, though these are news examples not a design source)

---
*Feature research for: Weather anomaly / climate-normal comparison dashboard*
*Researched: 2026-07-13*
