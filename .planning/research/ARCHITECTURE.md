# Architecture Research

**Domain:** Client-facing weather-anomaly dashboard (static frontend + free public weather API)
**Researched:** 2026-07-13
**Confidence:** MEDIUM (Open-Meteo endpoint/param details cross-verified across official docs pages + independent third-party sources; no single HIGH-tier curated doc provider was available this run)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER (client)                             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌────────────────┐  ┌─────────────────────┐     │
│  │  Map + Pin     │  │  Current       │  │  Anomaly Engine      │     │
│  │  Picker        │→ │  Conditions    │→ │  (z-score, delta,    │     │
│  │  (lat/lng)     │  │  Card          │  │   trend chart)        │     │
│  └───────┬───────┘  └────────┬───────┘  └──────────┬───────────┘     │
│          │                   │                      │                 │
│          ▼                   ▼                      ▼                 │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              Open-Meteo API Client (fetch wrapper)            │    │
│  │  - forecast endpoint (current + past_days)                    │    │
│  │  - archive endpoint  (30-yr daily baseline)                   │    │
│  └───────────────────────────┬────────────────────────────────┘    │
│                               │                                       │
│  ┌────────────────────────────▼───────────────────────────────┐    │
│  │  Local Cache (localStorage / IndexedDB)                     │    │
│  │  key: lat_rounded,lng_rounded,dayOfYear → {mean, stddev, n} │    │
│  └───────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬────────────────────────────────────┘
                                │ HTTPS (CORS-enabled, no key)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          OPEN-METEO API                               │
│  /v1/forecast   → current conditions + recent past_days (model-based) │
│  /v1/archive    → ERA5/ERA5-Land reanalysis, daily aggregates,        │
│                    1940/1950–present (5–7 day lag from "today")       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│           OPTIONAL (v2+, only if usage/cost demands it):              │
│           Edge Function + Edge KV as a shared baseline cache          │
│           (Cloudflare Worker + Workers KV, or Vercel Edge + KV)       │
└─────────────────────────────────────────────────────────────────────┘
```

**Core architectural call for v1: no backend at all.** Open-Meteo is CORS-enabled and keyless (confirmed across multiple independent integration guides — browser `fetch()` calls succeed directly, no proxy needed), and both endpoints this project needs (`/v1/forecast`, `/v1/archive`) return data shaped for direct client consumption. Combined with the "no accounts, no server-side persistence" constraint, this points to a **static single-page app** deployable to any free static host (Vercel/Netlify/Cloudflare Pages/GitHub Pages) with zero server code for v1.

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Map + Pin Picker | Lets user click/drag to choose lat/lng; owns "selected location" state; syncs to URL for shareability | Leaflet or MapLibre GL + a lightweight state store (React state/Zustand/Svelte store) |
| Open-Meteo API Client | Single module owning all fetch calls, param construction, and response parsing; the only thing that knows Open-Meteo's URL shapes | Thin `fetch()` wrapper, one function per endpoint (`getCurrent`, `getRecentDaily`, `getHistoricalRange`) |
| Anomaly Engine | Pure functions: given a 30-yr daily series + today's/recent value(s), compute mean, stddev, z-score, delta | Plain TS/JS module, no framework dependency — easily unit-testable |
| Current Conditions Card | Renders today's live reading + anomaly (z-score, delta) | Presentational component, reads from a single "location weather" view-model |
| Trend Chart | Renders last N days of anomaly (delta or z-score per day) | Chart library (e.g. Recharts/uPlot/Chart.js) fed by array of `{date, value, baselineMean, baselineStddev}` |
| Local Cache | Avoids re-fetching the 30-yr baseline for a location/day the user (or the app) already computed recently | `localStorage`/`IndexedDB`, keyed by rounded lat/lng + day-of-year, with a long TTL (baseline changes ~yearly) |
| (Optional v2) Edge Cache Proxy | Sits between all users of the deployed app and Open-Meteo; caches *computed baseline stats* (not raw series) so N users hitting the same city don't each pull a fresh 30-year archive response | Cloudflare Worker (or Vercel/Netlify Edge Function) + KV store, `stale-while-revalidate` style |

## Recommended Project Structure

```
src/
├── map/                    # Map + pin picker component, URL sync for lat/lng
│   ├── MapView.tsx
│   └── useLocationParam.ts # reads/writes ?lat=&lng= in URL for shareable links
├── weather/                 # All Open-Meteo integration lives here — one boundary
│   ├── client.ts            # fetch wrappers: getCurrent(), getRecentDaily(), getHistoricalRange()
│   ├── anomaly.ts            # pure stats functions: mean, stddev, zScore, delta
│   ├── cache.ts               # localStorage/IndexedDB read-through cache
│   └── types.ts                # shared shapes: DailyPoint, BaselineStats, AnomalyResult
├── dashboard/                 # UI composition
│   ├── CurrentConditionsCard.tsx
│   ├── AnomalySummary.tsx      # z-score + delta display
│   ├── TrendChart.tsx
│   └── HistoricalRangeChart.tsx # today vs distribution
├── app/                        # routing/shell, loading & error states
└── lib/                         # date/day-of-year helpers, formatting
```

### Structure Rationale

- **`weather/` is the single integration boundary.** Every other module talks to Open-Meteo *through* `weather/client.ts` — this is what makes the "optional edge cache later" migration cheap: swap the internals of `client.ts` to call your own edge function instead of Open-Meteo directly, and nothing else in the app changes.
- **`anomaly.ts` is deliberately pure and dependency-free.** Z-score/delta/mean/stddev math has no business touching `fetch` or DOM — keeping it pure makes it trivially unit-testable and reusable if a backend is added later (same math can run server-side without a rewrite).
- **`cache.ts` wraps, doesn't replace, `client.ts`.** Cache-then-fetch is a decorator around the raw API calls, not baked into component code — components ask for data and don't know/care whether it came from cache or network.

## Architectural Patterns

### Pattern 1: One wide historical call, filter client-side (not 30 yearly calls)

**What:** For the 30-year baseline, issue **one** `/v1/archive` request spanning `start_date = today − 30y` to `end_date = today (or a few days back)`, requesting only `daily=temperature_2m_mean,temperature_2m_max,temperature_2m_min` (not hourly). Then filter the returned daily array client-side to the target calendar day (optionally ± a few days window across all years, e.g. day-of-year ± 3, to get a larger, smoother sample — meteorological normals commonly use a window like this) and compute mean/stddev over that filtered set.

**When to use:** Always, for the baseline. This is the efficient call pattern the question specifically asked about.

**Trade-offs:** One archive call returns ~30 years × 365 days of daily records (~11,000 rows) as compact parallel arrays (`time: [...]`, `temperature_2m_mean: [...]`, etc.) — roughly a few hundred KB uncompressed, well under 100KB gzipped (fetch/browsers negotiate gzip automatically). This is far cheaper than 30 separate one-year requests (30 round-trips, 30× the request overhead, harder to reason about rate limits) and *dramatically* cheaper than requesting hourly data for the range (24× the row count for no benefit, since `temperature_2m_mean` is already a supported daily aggregate).

**Example:**
```typescript
// weather/client.ts
async function getHistoricalRange(lat: number, lng: number, endDate: string) {
  const start = subtractYears(endDate, 30);
  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set('start_date', start);
  url.searchParams.set('end_date', endDate);
  url.searchParams.set('daily', 'temperature_2m_mean,temperature_2m_max,temperature_2m_min');
  url.searchParams.set('timezone', 'auto'); // location-local calendar days matter for "today"
  const res = await fetch(url);
  return res.json(); // { daily: { time: [...], temperature_2m_mean: [...], ... } }
}
```

### Pattern 2: Two endpoints, not one — forecast for "now," archive for "normal"

**What:** Use `/v1/forecast` (with `current=temperature_2m,...`) for today's live reading, and `/v1/forecast?past_days=N&daily=...` for the recent-days trend series. Use `/v1/archive` *only* for the 30-year baseline. Do not try to get "today" from the archive endpoint.

**When to use:** Always — this is a correctness requirement, not just an optimization.

**Trade-offs:** The archive/reanalysis dataset (ERA5) has a ~5–7 day processing lag, so it cannot answer "what's the weather right now." The forecast endpoint's `past_days` data is itself blended from past model runs (not raw station observations), so it's a reasonable proxy for "recent actual conditions" but isn't perfectly identical to what the eventual reanalysis will say — acceptable for a "is today unusual" consumer app, not for scientific-grade backfill.

**Example:**
```typescript
async function getCurrentAndRecent(lat: number, lng: number) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lng));
  url.searchParams.set('current', 'temperature_2m');
  url.searchParams.set('daily', 'temperature_2m_mean,temperature_2m_max,temperature_2m_min');
  url.searchParams.set('past_days', '10'); // covers the "recent trend" window
  url.searchParams.set('timezone', 'auto');
  return (await fetch(url)).json();
}
```

### Pattern 3: Read-through client cache keyed on (rounded location, day-of-year)

**What:** Before calling `/v1/archive`, check a local cache keyed by `{latRounded},{lngRounded},{dayOfYear}` (round lat/lng to ~2 decimal places, which roughly matches Open-Meteo's own model grid resolution of ~9–25km, so extra precision buys no accuracy anyway). Cache the *computed* `{mean, stddev, n}` — not the raw 30-year series — with a long TTL (e.g. 7–30 days; the baseline realistically only shifts once a year when a new year's data rolls in).

**When to use:** Always for the baseline; skip for current conditions and recent trend (those must stay fresh, short/no cache).

**Trade-offs:** `localStorage`/`IndexedDB` are per-browser, so this only helps *repeat visits from the same user/device* (fits the stated "recurring check of one go-to location" usage pattern well). It does nothing to reduce redundant Open-Meteo calls *across different users* hitting the same location — that's what the optional edge-cache pattern below is for.

## Data Flow

### Request Flow (pin drop → full dashboard)

```
User drops pin (lat, lng)
    ↓
URL updated (?lat=..&lng=..) — makes the view shareable, no state needed elsewhere
    ↓
┌─────────────────────────┬─────────────────────────────┬───────────────────────────┐
│ getCurrent(lat,lng)      │ getRecentDaily(lat,lng)      │ getHistoricalRange(lat,lng)│
│ → /v1/forecast?current=  │ → /v1/forecast?past_days=N   │ → cache check first,       │
│                           │   &daily=temp_mean,max,min   │   else /v1/archive         │
│                           │                               │   (30y daily range)        │
└──────────┬───────────────┴───────────────┬───────────────┴─────────────┬─────────────┘
           ▼                               ▼                             ▼
   today's live temp              array of last N days'          filter to target day(s)
                                    daily mean/max/min             of year across 30 years
                                            │                             │
                                            ▼                             ▼
                                   for each recent day,           compute mean, stddev
                                   look up (or interpolate)        per calendar day
                                   that day-of-year's baseline
                                            │                             │
                                            └──────────────┬──────────────┘
                                                            ▼
                                                    Anomaly Engine
                                            z = (today − mean) / stddev
                                            delta = today − mean
                                                            ▼
                                     Current Conditions Card / Anomaly Summary
                                     Trend Chart (anomaly per recent day)
                                     Historical Range Chart (today vs distribution)
```

### State Management

```
Selected location (lat, lng)   ←→   URL query params (source of truth, shareable)
        │
        ▼ (triggers re-fetch on change)
Weather data (current / recent / baseline)   — local component/query-cache state
        │
        ▼ (derived, not stored)
Anomaly results (z-score, delta, trend series) — computed on the fly from the above,
                                                   never persisted
```

No global app state library is required for v1 — this is a small, mostly-derived data pipeline. A data-fetching library (TanStack Query / SWR) is a good fit even without a backend: it gives request de-duplication, in-memory caching, and loading/error states for free, on top of the localStorage layer for the baseline.

### Key Data Flows

1. **Location → current conditions:** lat/lng → single `/v1/forecast` call with `current=` param → direct render, no computation needed. Simplest flow, good first vertical slice.
2. **Location → 30-year baseline:** lat/lng + target date → cache lookup (miss → one wide `/v1/archive` call spanning 30 years, filtered/aggregated client-side to the target calendar day ± window) → `{mean, stddev, n}` → combined with today's reading → z-score + delta. This is the core value flow and the one most worth getting right early.
3. **Location → recent trend:** lat/lng → `/v1/forecast?past_days=N` for actual recent daily values, **plus** the same baseline machinery from flow #2 applied per day-of-year in that window (either reuse one archive call covering a slightly wider window of calendar days, or reuse the cached per-day baseline from flow #2 if the trend window overlaps today) → array of per-day anomalies → trend chart. Depends on both flow #1's fetch pattern and flow #2's baseline math.

## Caching Strategy

| Layer | What's cached | Where | TTL | Solves |
|-------|---------------|-------|-----|--------|
| Browser cache (v1, ship this) | Computed baseline `{mean, stddev, n}` per (rounded lat/lng, day-of-year) | `localStorage`/`IndexedDB` | Long (days–weeks) — baseline is stable | Repeat visits by the same user to the same/nearby location don't re-fetch 30 years of data |
| In-memory request cache (v1, ship this) | All three fetches, deduped per render cycle | TanStack Query/SWR cache | Minutes for current/recent, longer for baseline | Avoids duplicate in-flight requests when multiple components need the same data |
| HTTP cache headers (free, no extra infra) | Raw Open-Meteo responses | Browser HTTP cache, respects Open-Meteo's own `Cache-Control`/CDN headers | Server-controlled | Free win with zero app code — Open-Meteo already runs its own CDN-cached read path |
| Edge KV cache (v2, only if needed) | Computed baseline stats, shared across *all* users of the deployed app | Cloudflare Workers KV (free tier: 100k reads/day, 1k writes/day, 1GB storage) or Vercel Edge Config/KV, fronted by a Worker/Edge Function | Weeks | Cross-user redundancy: if the app gets real traffic and many different users check the same handful of popular cities, an edge cache means only the *first* user per (location, day) pays the 30-year archive round-trip; also shrinks payload sent to the client from ~100s of KB (raw series) to a few hundred bytes (just the stats) |

**Recommendation:** Ship v1 with only the browser-side caching (rows 1–3 in the table) — it requires no backend, satisfies the free-hosting/no-persistence constraints trivially, and is more than sufficient for the stated usage pattern (a single user's recurring + ad-hoc lookups). Add the edge KV layer (row 4) only if/when real usage shows either (a) Open-Meteo's shared rate limit becoming a concern, or (b) enough shared/popular locations that server-side caching would meaningfully cut redundant large payloads. Because `weather/client.ts` is the sole integration boundary (see Recommended Project Structure), this upgrade is a localized change, not a rewrite.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single user / demo (this project's actual scale) | Fully static SPA, client-only fetch + localStorage cache. Zero backend. |
| Modest shared traffic (a few hundred users/day) | Still fine client-only; Open-Meteo's 10k/day, 5k/hour, 600/min free limits are shared across all your app's users collectively (no per-user key), so watch aggregate volume if traffic grows — each pin-drop costs 2–3 Open-Meteo calls. |
| Heavier shared traffic / many users hitting the same popular cities | Introduce the optional edge KV cache proxy described above so repeat lookups for the same location/day are served from your own edge cache instead of re-hitting Open-Meteo, keeping the app comfortably inside the free non-commercial rate limits. |

### Scaling Priorities

1. **First bottleneck:** Open-Meteo's *shared, keyless* rate limit (600 calls/minute across all your app's simultaneous users) — not a browser or hosting limit. The mitigation is the edge KV cache proxy, not "more servers."
2. **Second bottleneck (unlikely at this project's stated scale):** Archive response payload size if the baseline window or number of variables requested grows significantly — mitigated by only requesting `daily` aggregates (never `hourly`) and only the variables actually needed (temperature only, per v1 scope).

## Anti-Patterns

### Anti-Pattern 1: Fetching hourly data for the 30-year range

**What people do:** Request `hourly=temperature_2m` across a 30-year date range to "have all the raw data" for computing daily means themselves.
**Why it's wrong:** 30 years of hourly data is ~24× the row count of daily data for no benefit — Open-Meteo's archive API already exposes `temperature_2m_mean/max/min` as first-class daily aggregation parameters, computed server-side.
**Do this instead:** Request `daily=temperature_2m_mean,temperature_2m_max,temperature_2m_min` directly (Pattern 1 above).

### Anti-Pattern 2: Making 30 separate one-year (or one-day-per-year) API calls to build the baseline

**What people do:** Loop over each of the last 30 years, calling `/v1/archive` once per year (or once per exact calendar date) to "just get that one day."
**Why it's wrong:** 30 round-trips instead of 1, hits per-minute rate limits faster, harder error handling (partial failures across 30 requests), and no meaningful payload savings versus one wide range call.
**Do this instead:** One `/v1/archive` call spanning the full 30-year range, filtered/aggregated client-side (Pattern 1).

### Anti-Pattern 3: Using the archive/reanalysis endpoint for "today"

**What people do:** Try to get today's live reading from `/v1/archive` since "it's the historical data source."
**Why it's wrong:** ERA5 reanalysis data used by the archive endpoint has a ~5–7 day processing lag; "today" simply isn't in that dataset yet.
**Do this instead:** Use `/v1/forecast`'s `current` parameter for live conditions, and `past_days` for the recent-trend window (Pattern 2).

### Anti-Pattern 4: Building a backend/database before it's needed

**What people do:** Reach for a Node/Express server, a database to "store" locations or cached results, and a hosting platform that runs a persistent server, because "a real app needs a backend."
**Why it's wrong:** Violates the project's own constraints (no accounts, no server-side persistence, free-tier-friendly) and adds hosting cost/complexity for zero benefit at this project's scale — Open-Meteo is CORS-enabled and keyless specifically so client-only apps like this one don't need a proxy.
**Do this instead:** Static SPA for v1; add a *stateless* edge function + KV cache only later, and only as a caching optimization, not a data store.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Open-Meteo `/v1/forecast` | Direct browser `fetch()`, CORS-enabled, no key | Use for current conditions (`current=`) and recent-days trend (`past_days=` + `daily=`) |
| Open-Meteo `/v1/archive` | Direct browser `fetch()`, CORS-enabled, no key | Use for the 30-year baseline only; one wide-range call per location, filtered client-side |
| Open-Meteo `/v1/climate` (Climate API) | Not used | This is a climate-*projection* API (1950–2050 model output across 7 GCMs), not a normals/averages service — do not use it for the baseline despite the naming similarity |
| Map tiles (for the pin picker) | Standard slippy-map tile provider (e.g. OpenStreetMap via Leaflet/MapLibre) | Separate concern from weather data; pick any free tile source with usage terms compatible with a public app |
| Static hosting | Vercel/Netlify/Cloudflare Pages/GitHub Pages free tier | No backend needed for v1; all are equivalent for a pure static SPA |
| (v2, optional) Cloudflare Workers + Workers KV | Edge function fronting Open-Meteo, caching computed baseline stats | Free tier: 100k reads/day, 1k writes/day, 1GB storage — comfortably covers this project's scale even under real growth |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Map/Pin Picker ↔ Weather layer | Location state (lat/lng) flows one-way, via URL params as source of truth | Selecting a pin is the only trigger for new data fetches |
| Weather Client ↔ Anomaly Engine | Weather Client returns raw parsed API data; Anomaly Engine consumes it and returns pure computed results | Keep the boundary strict so anomaly math stays framework/network-free and unit-testable |
| Anomaly Engine ↔ UI components | One-way, read-only view-models | UI never talks to Open-Meteo directly — always goes through `weather/client.ts` |
| Local Cache ↔ Weather Client | Cache is a decorator/read-through layer in front of the archive call only | Current/recent calls stay uncached (or very short TTL) since freshness matters there |

## Sources

- [Historical Weather API — Open-Meteo](https://open-meteo.com/en/docs/historical-weather-api) — official docs, daily parameter list (`temperature_2m_mean/max/min`), `/v1/archive` required params, ERA5/ERA5-Land coverage dates
- [Climate API — Open-Meteo](https://open-meteo.com/en/docs/climate-api) — official docs, confirms this is a climate-*projection* API (1950–2050), not a normals/averages service
- [Docs — Open-Meteo](https://open-meteo.com/en/docs) — official docs, `/v1/forecast` `current` param list, API-key-only-for-commercial note
- [Pricing — Open-Meteo](https://open-meteo.com/en/pricing) — free-tier rate limits (10k/day, 5k/hour, 600/min)
- [GitHub — open-meteo/open-meteo](https://github.com/open-meteo/open-meteo) — non-commercial free-use framing
- [GitHub Issue #1480 — Clarification on past_days Data](https://github.com/open-meteo/open-meteo/issues/1480) — `past_days` returns past *forecast* runs, not raw observations; archive/reanalysis lag ~2–7 days depending on source
- [Cloudflare Workers KV docs](https://developers.cloudflare.com/kv/) — free-tier limits and edge-caching pattern for expensive upstream API responses
- Cross-verified via multiple independent third-party integration guides confirming Open-Meteo's CORS support for direct browser `fetch()` usage (no single canonical "CORS policy" page exists on Open-Meteo's own docs, so this is corroborated via community usage patterns rather than an explicit official statement)

---
*Architecture research for: Weather Anomaly Dashboard (Open-Meteo, client-heavy static app)*
*Researched: 2026-07-13*
