# Pitfalls Research

**Domain:** Weather anomaly dashboard (client-side map + z-score/delta vs 30-year baseline, Open-Meteo API, free hosting, no backend persistence)
**Researched:** 2026-07-13
**Confidence:** MEDIUM (Open-Meteo specifics cross-checked against official docs, GitHub issues, and creator statements on HN; statistical/climatology conventions cross-checked against NOAA/NCEI and academic climatology sources; map licensing cross-checked against OSM Foundation policy)

## Critical Pitfalls

### Pitfall 1: Computing the 30-year baseline from single-day-of-year samples (n=30, or worse for Feb 29)

**What goes wrong:**
Using exactly 30 data points (one per year, for that exact calendar day) to compute mean and standard deviation produces a noisy, unstable baseline. Daily weather is inherently high-variance, so a mean/stddev from 30 samples has wide sampling error — the z-score can swing significantly depending on which 30 years happen to be included, and outlier years (heat waves, cold snaps) disproportionately distort a 30-point stddev. For February 29 specifically, a leap day only occurs every 4 years, so a strict "same calendar day, last 30 years" query yields only ~7-8 samples — an unusably small baseline that will produce wildly unstable z-scores for anyone who checks the dashboard on Feb 29.

**Why it happens:**
"30-year historical average for that calendar day" sounds like it literally means one query per year for one exact date, which is the naive first implementation. Developers don't realize climatology conventions exist specifically to avoid this problem.

**How to avoid:**
Use a day-of-year window, not a single day: pull a window of ±3 to ±7 days around the target calendar day for each of the last 30 years (e.g. ±5 days × 30 years ≈ 330 samples instead of 30). This is standard climatological practice (NOAA/ETCCDI use windows from 5 to 61 days wide depending on application). Document the chosen window size as a deliberate methodology decision, and keep it symmetric so the mean isn't seasonally biased. For Feb 29, do not treat it as its own isolated day — either fold it into the window centered on Feb 28/Mar 1 (NOAA's approach: daily normals for Feb 29 are derived by averaging the Feb 28 and Mar 1 normals rather than computed independently), or use the day-of-year window approach so Feb 29 naturally inherits nearby days' data.

**Warning signs:**
- Z-score for the same location swings by >1σ between adjacent days with similar actual weather.
- Feb 29 baseline card shows "insufficient data" or a stddev near zero/wildly large.
- Manual spot-check: baseline mean for day N differs a lot from day N-1 or N+1 baseline mean (should be smooth, not jagged).

**Phase to address:**
Anomaly calculation / baseline computation phase (core methodology phase, before any UI work depends on it).

---

### Pitfall 2: Population vs. sample standard deviation inconsistency

**What goes wrong:**
Using the population stddev formula (divide by n) instead of the sample stddev formula (divide by n-1, Bessel's correction) — or mixing the two inconsistently between the baseline computation and the z-score formula — produces a systematically biased z-score. The effect is small for large n but non-trivial for the ~30-330 sample sizes this project will use, and it's the kind of subtle bug that never throws an error, just quietly produces slightly-wrong numbers forever.

**Why it happens:**
The historical 30 years of data is a *sample* of the true long-run climate distribution (not the full population), so sample stddev (n-1) is statistically correct — but many code examples and libraries default to population stddev (n), and this distinction is easy to overlook when the standard deviation is a one-line `Math.sqrt(...)` implementation.

**How to avoid:**
Explicitly use sample standard deviation (n-1 denominator) for the baseline stddev used in the z-score calculation, since the historical years are a sample. Write a unit test with a known dataset and expected sample-stddev output to lock this in. Document the choice inline in code (not just in a README) since this is the single most likely "looks right but is subtly wrong" bug in the project.

**Warning signs:**
- Z-scores are consistently slightly higher (population stddev is always ≤ sample stddev) than what a reference calculator (e.g. spreadsheet STDEV.S) produces for the same data.
- No unit test exists that pins down the exact stddev formula against a hand-computed expected value.

**Phase to address:**
Anomaly calculation / baseline computation phase — write the stddev test before/alongside the implementation.

---

### Pitfall 3: Archive API data lag breaks "today's anomaly" and the recent-trend chart

**What goes wrong:**
Open-Meteo's `/v1/archive` (historical) endpoint has a real, documented lag before "actual" data for a given day becomes available — roughly a 2-day delay for most data, and up to 5-7 days for ERA5-sourced daily updates specifically (confirmed both in Open-Meteo's own docs and in an open GitHub issue where a user hit exactly this problem trying to get "yesterday's" data). This means: (1) you cannot compute today's anomaly using the archive endpoint alone, because today's actual observation isn't in the archive yet, and (2) the "recent days trend" chart, if built naively against the archive endpoint, will show missing or stale data for the last several days — precisely the days users care about most.

**Why it happens:**
It's natural to assume "historical/archive API = has all data up to now." The two-endpoint split (forecast API for now, archive API for the past) isn't obvious until you hit a gap where neither endpoint cleanly gives you "yesterday's actual measured temperature."

**How to avoid:**
Use a hybrid data strategy: use the **forecast API** (`/v1/forecast`) with its `current=` parameter and `past_days=` parameter for today and the last several days (this is the freshest available data, effectively an actuals-quality forecast model output for near-term days), and use the **archive API** (`/v1/archive`) only for the 30-year historical baseline (which by definition only needs data far enough in the past that the lag is irrelevant). Do not attempt to source "today" from the archive endpoint. Be explicit in the UI/data layer about which endpoint fed which number, and if the trend chart's most recent 1-2 days come from the forecast model rather than confirmed archive data, treat that distinction as a data-quality note rather than hiding it.

**Warning signs:**
- Requesting the archive endpoint for "yesterday" or "today" returns null/missing values or a 400-range error for the most recent 2-7 days.
- Trend chart has a visible gap or flatline for the most recent days when built purely off `/v1/archive`.

**Phase to address:**
Data-fetching/integration phase — this must be decided before the trend-chart and today's-anomaly features are built, since it determines which endpoint each feature calls.

---

### Pitfall 4: Reanalysis grid data does not represent hyperlocal conditions (misleading precision at a pin-dropped location)

**What goes wrong:**
Open-Meteo's historical archive data comes from ERA5/ERA5-Land/ECMWF IFS **reanalysis models** (gridded, 9km-25km resolution), not from actual weather stations. This means: dropping a pin on a specific street, mountain slope, valley, or small island gives you the value from a coarse grid cell that may average over quite different microclimates (elevation changes, urban heat island, coastline effects). The z-score/delta will look exact and authoritative ("+2.3σ", "6.1°C hotter") but is really an estimate for a several-kilometer area, which can be meaningfully wrong for locations with sharp local climate gradients.

**Why it happens:**
The API returns a single precise-looking number for exact lat/lng coordinates, which invites false confidence. There is no per-request quality/coverage flag from Open-Meteo to signal "this pin is in a data-sparse or high-variance-terrain grid cell."

**How to avoid:**
Do not present the z-score/delta as ground-truth precision. Use rounded, appropriately-hedged framing ("about 2° warmer than usual" rather than "2.347° warmer"), and consider a lightweight disclosure (e.g. a small info tooltip: "based on modeled climate data for this area, ~9-25km resolution") rather than pretending station-level accuracy. This is a copy/UX decision more than an engineering one, but it should be planned intentionally rather than left implicit.

**Warning signs:**
- UI displays z-score/delta with more than 1 decimal place of apparent precision.
- No UI affordance anywhere explains that data is model-based, not from a station at that exact point.

**Phase to address:**
UI/results-display phase — decide precision/rounding and disclosure copy alongside the visual design of the anomaly card.

---

### Pitfall 5: Timezone mismatch between "today" as the user means it and "today" as the API returns it

**What goes wrong:**
"Today's" weather anomaly is inherently location-relative — a pin in Tokyo and a pin in Los Angeles do not share the same "today" in UTC. If the app queries Open-Meteo without setting `timezone=auto` (or hardcodes UTC, or uses the *browser's* timezone regardless of pin location), the "today" displayed can be off by a day for locations far from the visiting user, or the day boundary used for the historical day-of-year lookup can silently mismatch the day boundary used for "today's" current reading — producing a baseline that's subtly comparing the wrong calendar day.

**Why it happens:**
It's easy to default to the browser's local timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone` or `new Date()`) since that's the ambient value available client-side, without realizing "today" needs to be relative to the *pin's* location, not the *viewer's* location.

**How to avoid:**
Always pass `timezone=auto` on Open-Meteo requests so the API resolves and returns data using the local timezone of the queried lat/lng (this is Open-Meteo's documented default-recommended behavior and returns timestamps starting at 00:00 local time for that location). Derive "today" (for both current-conditions and day-of-year baseline lookups) from the pin's local date, not the browser's local date. Keep this consistent across every request tied to the same pin so the current-conditions day and the baseline day-of-year always agree.

**Warning signs:**
- Checking a pin near the international date line or in a very different timezone from the developer's own shows "today" off by one day, or a delta that looks wrong.
- Any code path uses `new Date()` / browser locale to compute the target day-of-year instead of a value derived from the API's location-local response.

**Phase to address:**
Data-fetching/integration phase, verified again during location-picker/UI phase with test pins in far timezones (e.g. Pacific islands, Eastern Russia).

---

### Pitfall 6: Treating Open-Meteo's free tier as unlimited, and hitting shared-IP rate limiting from serverless/edge functions

**What goes wrong:**
Open-Meteo's free non-commercial tier is capped at roughly 10,000 calls/day, 5,000/hour, 600/minute, with rate limiting applied **per IP address** and no uptime SLA. If the architecture routes all requests through a shared backend/serverless function (e.g. a single Vercel or Cloudflare function endpoint that proxies every user's request), all users share that function's egress IP — meaning the app's *aggregate* traffic across all visitors counts against a single rate-limit bucket, and a traffic spike (or bulk automated preloading, e.g. prefetching 30 years × several days of data per pin-drop) can exhaust it for everyone. Additionally, a request spanning many variables or a long date range counts as multiple API calls under Open-Meteo's own accounting, so a "fetch 30 years in one big request" pattern can burn through the daily quota fast if done per-location on every visit without caching.

**Why it happens:**
Free-tier limits feel generous until you multiply per-visit request volume (current + ~30 years of daily archive data for one pin, potentially fetched fresh on every page load) across concurrent users. Developers often route third-party API calls through their own backend "to be safe" without realizing that concentrates rather than distributes the rate-limit exposure.

**How to avoid:**
Prefer calling Open-Meteo **directly from the browser** (it supports CORS and needs no API key, so this is both simpler and avoids the shared-IP problem — each visitor's request comes from their own IP). Cache the 30-year baseline aggressively client-side (e.g. `localStorage` keyed by rounded lat/lng + day-of-year) since the baseline for a given location/day barely changes day-to-day — recomputing it on every visit is wasteful. If a thin backend/edge proxy is later added (e.g. for response caching), add a shared cache layer (KV/CDN cache) in front of it rather than a pure pass-through, so repeated requests for the same location don't each count against the shared quota.

**Warning signs:**
- Open-Meteo returns HTTP 429 during testing with more than a couple of simultaneous browser tabs/sessions.
- Every pin-drop triggers ~30+ fresh network requests (one per historical year) with no caching, even for a location just viewed moments ago.

**Phase to address:**
Data-fetching/integration and architecture phase — decide client-direct-call architecture and caching strategy before building the fetch layer; revisit at hosting/deployment phase.

---

### Pitfall 7: Map tile provider used without required attribution or in violation of usage policy

**What goes wrong:**
Free map tile providers (most commonly OpenStreetMap tiles via Leaflet) require visible attribution ("© OpenStreetMap contributors") displayed on the map itself, not just in a footer or about page — hiding it behind a toggle or off-screen violates the license. Separately, OpenStreetMap's own tile server (`tile.openstreetmap.org`) has a usage policy that prohibits bulk/offline prefetching and can silently rate-limit or block an app that generates too much tile traffic without notice, which is a real risk for a public shareable-URL app that could see bursty traffic.

**Why it happens:**
Attribution feels like a formality developers add once and forget; the tile usage policy isn't visible until you've already integrated the "obvious" default tile URL used in every Leaflet tutorial.

**How to avoid:**
Keep the Leaflet default attribution control visible and unmodified (don't hide/collapse it). For production traffic beyond hobby-scale, use a tile provider with a clear free tier meant for production use (e.g. CARTO's free tier, Stadia Maps free tier, MapTiler free tier, or Mapbox's free tier which also requires their own attribution) rather than the bare OSM tile server, and confirm the chosen provider's attribution and rate-limit terms before shipping. Since this app is a public shareable-URL dashboard (not a private hobby prototype), assume it needs a tile provider whose free tier explicitly permits that usage pattern.

**Warning signs:**
- Attribution control is removed, hidden, or styled to be invisible.
- Map tiles intermittently fail to load with no visible cause during a traffic spike — classic sign of triggering a tile provider's rate limit.

**Phase to address:**
Map/location-picker UI phase — choose and configure the tile provider (with attribution) as part of initial map setup, not as an afterthought.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Single-day (n=30) baseline instead of day-of-year window | Simpler query/loop, ships faster | Noisy, unstable z-scores; Feb 29 nearly unusable | Never — this directly undermines the core value prop ("accurate anomaly score") |
| Fetching all 30 years fresh on every pin-drop, no caching | No cache invalidation logic to write | Burns Open-Meteo daily quota fast, slow UX per pin-drop | Only acceptable for the very first prototype/demo; must add caching before sharing the URL publicly |
| Hardcoding population stddev (n) because "it's close enough" | One less thing to decide | Systematically biased z-score that never surfaces as an obvious bug | Never — cheap to do correctly from the start |
| Routing Open-Meteo calls through a custom backend proxy "for cleanliness" | Feels more "proper" architecture | Concentrates rate-limit exposure onto one shared IP; adds cold-start/hosting complexity for zero benefit given Open-Meteo is keyless+CORS-enabled | Acceptable only if you need server-side response caching (KV) to reduce total call volume — otherwise skip it |
| Skipping timezone=auto and using browser locale for "today" | Slightly less API-response parsing | Wrong "today" for locations far from the viewer's own timezone | Never |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|-------------------|
| Open-Meteo archive API | Assuming it has data through "today" | Use forecast API's `current=`/`past_days=` for today/recent days; archive API only for the far-past 30-year baseline |
| Open-Meteo forecast/archive timezone | Defaulting to UTC or browser timezone | Pass `timezone=auto` on every request so "today" resolves to the pin's local calendar day |
| Open-Meteo rate limiting | Proxying all user traffic through one backend function/IP | Call directly from the browser (CORS-enabled, keyless) so each user's IP is rate-limited independently |
| Open-Meteo climate endpoint (`/v1/climate`) | Mistaking it for a "30-year normals" endpoint | It returns climate-model projections (1950-2050), not observed normals — build the baseline yourself from `/v1/archive` across ~30 years |
| Map tile provider (OSM/Leaflet) | Using bare `tile.openstreetmap.org` for a public production app without checking usage policy | Use a provider whose free tier explicitly supports production/public traffic, keep attribution visible |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Fetching 30 individual archive requests (one per year) per pin-drop, sequentially | Pin-drop feels slow (multi-second spinner) | Batch into as few requests as possible (Open-Meteo archive endpoint accepts a date range in one call, so a single ~30-year date-range request per location is usually possible rather than 30 separate calls); cache result client-side keyed by rounded location + day-of-year | Noticeable even at low traffic — this is a UX problem from day one, not a scale problem |
| Re-computing the full 30-year baseline on every page load for the same location | Wasted Open-Meteo quota, slower repeat visits | Cache baseline in `localStorage`/`sessionStorage` (or a lightweight edge KV if a backend is added) since a location's climatological baseline doesn't change meaningfully day to day | Breaks Open-Meteo's daily quota once traffic exceeds roughly a few hundred fresh pin-drops/day without caching |
| High-precision pin coordinates (many decimal places) used as cache key | Cache never hits because every pin is "unique" even for near-identical spots | Round lat/lng to ~2 decimal places (~1km) for cache-key purposes, matching the grid resolution of the underlying reanalysis data anyway | Becomes relevant as soon as caching is introduced |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| N/A — Open-Meteo is keyless, so there is no API key to leak in client-side code | — | Confirmed: no server-side secret handling is needed for the core weather data flow; if a map tile provider requiring an API key is chosen (e.g. Mapbox), that key would need standard client-key restriction (domain-restricted key) — not applicable to keyless OSM-tile setups |
| Treating `localStorage`-persisted "last location" as sensitive | Low risk, but worth noting | It's just lat/lng with no PII; no special handling needed beyond normal client-storage hygiene |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Showing z-score/delta with false precision (many decimals) without any data-quality context | User over-trusts a modeled estimate as if it were a precise station reading | Round sensibly, add a lightweight "modeled climate data, ~9-25km resolution" disclosure |
| Silently showing a degraded/incomplete trend chart when recent-day data isn't available yet (archive lag) | User sees a confusing gap or flat line near "today" with no explanation | Explicitly label the last 1-2 days of the trend as "recent (forecast-model based)" vs. earlier days as "recorded", or show a placeholder/loading state rather than a silent gap |
| No indication of which data source (station-quality vs. reanalysis-grid) underlies the number | User in a data-sparse region (ocean, remote mountains) gets no signal that accuracy may be lower there | Consider a simple visual/text cue when the pin is far from a populated area (optional/differentiator, not MVP-blocking) |
| Comparing z-score in one temperature unit while the delta uses another silently | User does mental math wrong, loses trust when numbers don't reconcile | Keep unit (°C, per the project's constraint) consistent everywhere on screen; if °F is ever added as a display toggle, convert both z-score inputs and delta from the same canonical unit, never mix |

## "Looks Done But Isn't" Checklist

- [ ] **Baseline computation:** Looks done once it returns *a* number — verify it uses a day-of-year window (not single-day n=30) and sample stddev (n-1), with a unit test against a hand-computed expected value.
- [ ] **Feb 29 handling:** Looks done if it doesn't crash — verify it doesn't silently show a near-meaningless stddev from ~7-8 samples; confirm the window/fallback approach was actually applied to this date.
- [ ] **"Today's" anomaly:** Looks done if any number renders — verify it's sourced from the forecast API's current conditions (not a stale/missing archive-API value for a day that isn't in the archive yet).
- [ ] **Recent trend chart:** Looks done if a line renders — verify the most recent 1-2 days aren't silently null/zero/duplicated-previous-value due to the archive lag, and that this data-source distinction is either handled gracefully or disclosed.
- [ ] **Location picker / map:** Looks done once a pin can be dropped — verify attribution is visible and correctly configured, and that timezone resolution (`timezone=auto`) is wired through to both current-conditions and baseline queries for that exact pin.
- [ ] **Caching:** Looks done once the app "works" in solo testing — verify repeat pin-drops of the same/nearby location don't refetch the full 30-year baseline every time, since this is invisible until multiple users or repeat visits happen.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|----------------|------------------|
| Discovering the population-vs-sample stddev bug after launch | LOW | Swap the formula, add the regression test, redeploy — no data migration needed since nothing is persisted server-side |
| Discovering single-day (n=30) baseline is too noisy after launch | MEDIUM | Change the baseline query to a day-of-year window, re-verify unit tests/spot-checks; no persisted data to migrate since baseline is recomputed/cached client-side |
| Hitting Open-Meteo rate limits in production due to backend-proxy architecture | MEDIUM | Switch fetch calls to client-direct (CORS-enabled, no key needed) and add client-side caching; may require reworking the data-fetching layer but no backend infrastructure to tear down since there's no persistence |
| Attribution/tile-policy violation flagged or tiles get blocked | LOW-MEDIUM | Swap tile provider (e.g. move from bare OSM to CARTO/Stadia/MapTiler free tier) and restore visible attribution; contained to the map component |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| Single-day baseline / Feb 29 small-sample issue | Anomaly calculation / baseline methodology phase | Unit test: baseline mean/stddev computed from a day-of-year window across 30 years; explicit test case for Feb 29 |
| Population vs. sample stddev | Anomaly calculation / baseline methodology phase | Unit test against a hand-computed sample-stddev reference value |
| Archive API lag breaking "today"/trend | Data-fetching/integration phase | Manual check: request archive API for yesterday's date and confirm expected missing/stale behavior is handled by falling back to forecast API `past_days` |
| Reanalysis grid precision vs. hyperlocal expectation | UI/results-display phase | Design review: confirm rounding + disclosure copy present before shipping the anomaly card |
| Timezone mismatch for "today" | Data-fetching/integration phase | Manual test: drop pins in at least two far-apart timezones (e.g. UTC+13 and UTC-10) and confirm "today" and baseline day-of-year agree with the pin's local date |
| Rate limiting via shared-IP backend proxy | Architecture / data-fetching phase | Architecture decision recorded: client-direct calls to Open-Meteo, no proxy-by-default; load-test with multiple concurrent simulated pin-drops if feasible |
| Map attribution / tile policy | Map/location-picker UI phase | Visual check: attribution visible and unmodified in default map view; tile provider's free-tier terms confirmed to cover public production traffic |
| No baseline caching (repeated fetch waste) | Architecture / data-fetching phase | Confirm `localStorage`/cache-key strategy implemented before considering the fetch layer done |

## Sources

- [Historical Weather API | Open-Meteo.com](https://open-meteo.com/en/docs/historical-weather-api) — archive endpoint structure, daily aggregation, data lag notes
- [Climate API | Open-Meteo.com](https://open-meteo.com/en/docs/climate-api) — confirms `/v1/climate` is projections (1950-2050), not observed normals
- [Weather Forecast API | Open-Meteo.com](https://open-meteo.com/en/docs) — `current=`, `past_days=`, `timezone=auto` behavior
- [Clarification on past_days Data and Accessing Recent Historical Weather · Issue #1480](https://github.com/open-meteo/open-meteo/issues/1480) — confirms `past_days` returns forecast-model data, not confirmed observations, and archive API lag is a real, hit-by-users problem
- [Normals and records · Issue #361](https://github.com/open-meteo/open-meteo/issues/361) — confirms no dedicated climate-normals endpoint exists
- [💰 Pricing | Open-Meteo.com](https://open-meteo.com/en/pricing) and [Hacker News — creator comment on rate limits](https://news.ycombinator.com/item?id=46591888) — 10,000/day, 5,000/hour, 600/minute rate limits, non-commercial terms
- [API use on shared server and daily limit · Discussion #853](https://github.com/open-meteo/open-meteo/discussions/853) — IP-based rate limiting problem for shared/serverless hosting
- [Hang On, What's Not Normal About February 29? | NOAA/NCEI](https://www.ncei.noaa.gov/news/hang-on-whats-not-normal-about-February-29) — official explanation of the Feb 29 small-sample problem and NOAA's daily-normals workaround
- [Daily Normals 1991-2020 documentation | NOAA/NCEI](https://www.ncei.noaa.gov/pub/data/cdo/documentation/normals-daily-1991-2020_documentation.pdf) — day-of-year window methodology for climatological normals
- [ERA-Interim Daily Climatology | ECMWF](https://confluence.ecmwf.int/download/attachments/24316422/daily_climatology_description.pdf) and [Climatological normal — Wikipedia](https://en.wikipedia.org/wiki/Climatological_normal) — window-width conventions (5-61 days) for climatological baselines
- [Tile usage policy - OpenStreetMap Wiki](https://wiki.openstreetmap.org/wiki/Tile_usage_policy) and [Tile Usage Policy | OSM Foundation](https://operations.osmfoundation.org/policies/tiles/) — attribution requirements, prefetch/bulk-download prohibition, blocking risk
- General cross-check on ERA5 reanalysis vs. station-data accuracy/resolution limitations (academic literature on ERA5 coastal/offshore performance)

---
*Pitfalls research for: Weather anomaly dashboard (Open-Meteo, client-side, free-tier hosting)*
*Researched: 2026-07-13*
