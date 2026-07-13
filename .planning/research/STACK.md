# Stack Research

**Domain:** Client-rendered, map-based weather data dashboard (single-page, no accounts, free-tier hosted)
**Researched:** 2026-07-13
**Confidence:** MEDIUM-HIGH (core package versions verified directly against npm registry = HIGH; ecosystem/comparison claims from web search, cross-corroborated across multiple independent sources = MEDIUM)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | 19.2.7 | UI framework | Industry-standard for interactive SPAs; React Compiler (stable since Oct 2025) removes most manual `useMemo`/`useCallback` need, which matters here because the map + chart + anomaly panel all re-render on pin move. |
| Vite | 8.1.4 | Build tool / dev server | Vite is the React team's official recommendation since Create React App was deprecated (Feb 2025). Vite 8 ships with Rolldown (Rust-based bundler replacing Rollup) for fast builds. Produces a pure static build (`dist/`) — exactly what free static hosts want. |
| TypeScript | **5.9.x or 6.x (not 7.0 yet)** | Type safety | TypeScript 7.0 (Go-native compiler) reached GA on 2026-07-08 — five days before this research — and explicitly ships **without a stable programmatic API** until 7.1 (~Oct 2026 per Microsoft's own announcement). Tooling that hooks the compiler API (typescript-eslint, some Vite plugins) is still catching up. For a project this size the speed win from 7.0 isn't worth the ecosystem lag risk; pin to the last pre-7.0 stable line and revisit after 7.1 ships. Vite itself doesn't depend on this — it transpiles TS via esbuild/oxc and only calls `tsc` for standalone type-checking, so this is a low-stakes, easily-revisited choice. |
| react-leaflet | 5.0.0 (wraps Leaflet 1.9.4) | Interactive map (click/drag pin) | See map library decision below. Peer deps confirmed compatible with React 19 (`react ^19.0.0`, `react-dom ^19.0.0`, `leaflet ^1.9.0`). |
| Recharts | 3.9.2 | Trend / range chart | See charting decision below. Peer deps confirmed compatible with React 19 (`^16.8 – ^19.0`). |

### Map Library Decision: Leaflet over MapLibre GL JS

**Use `react-leaflet` + `leaflet`, not MapLibre GL JS / `react-map-gl`.**

Rationale: this app needs exactly one interaction — click or drag a single pin on a basemap — with no vector-tile styling, no 3D/rotation, and no need to render thousands of features. MapLibre GL's advantages (WebGL rendering, vector tiles, data-driven styling, handling 10K+ markers) solve problems this project doesn't have, at the cost of a steeper API and heavier setup (`react-map-gl/maplibre` + `maplibre-gl` + its CSS + a vector style source, typically from a third party like MapTiler which has its own free-tier limits). Leaflet is the simpler, more plugin-rich, smaller-footprint choice for a single-marker picker and is the standard recommendation for this exact use case in 2026 comparisons. Pair it with free raster tiles (OpenStreetMap's standard tile server, or CARTO's free "light"/"voyager" basemap tiles) — both work under Leaflet's default `TileLayer` with no key required, satisfying the free-hosting constraint.

**If the project later grows** to need heatmaps/choropleths over many locations or smooth 3D/rotation, MapLibre GL JS (via `react-map-gl/maplibre`) is the correct escalation path — but don't start there.

### Charting Library Decision: Recharts over Chart.js / visx

**Use Recharts, not Chart.js or visx.**

Rationale: Recharts is the dominant 2026 default for React dashboards (~49M weekly npm downloads, by far the highest of the three), with a declarative JSX API that composes naturally with a React component tree, solid TypeScript types, and built-in `LineChart`/`AreaChart`/`ComposedChart` components that directly fit "today's temperature vs. historical range" and "recent-days anomaly trend" visualizations. The dataset here is small (single location, ~30-90 data points for a trend view), well inside Recharts' comfortable range — Chart.js's Canvas-rendering advantage only matters at high-frequency updates or 1000+ point datasets, neither of which applies. visx offers more control via raw D3 primitives but costs 2-3x longer to build a first chart and is overkill for standard line/range charts.

### Statistics: Hand-roll, don't add a dependency

**Do not add `simple-statistics` (or any stats library).** Confirmed via npm/GitHub that `simple-statistics` provides `mean()`, `standardDeviation()`, and `zScore(x, mean, sd)` — but the entire computation needed here is:

```typescript
const mean = values.reduce((a, b) => a + b, 0) / values.length;
const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length; // population variance (see note)
const stdDev = Math.sqrt(variance);
const zScore = (today - mean) / stdDev;
const delta = today - mean;
```

This is ~6 lines, has zero edge cases beyond guarding `stdDev === 0`, and pulling in a dependency (even a zero-dep one) for it adds bundle weight and an update-tracking burden with no real benefit for a client-only app. **Note for the phase that implements this:** decide population vs. sample standard deviation explicitly (divide by `n` vs `n-1`) — for a full 30-year climatological baseline this is a minor difference, but it should be a deliberate choice, documented in code, not an accident of copy-pasted formula.

### Backend: None required — pure static SPA

**This should ship as a 100%-static, client-side app with no backend, no serverless functions, and no database.** Reasoning:

- Open-Meteo's hosted API (`api.open-meteo.com` for current/forecast conditions, `archive-api.open-meteo.com` for the 30-year historical baseline) is keyless and **CORS-enabled**, confirmed to support direct browser `fetch()` calls with no proxy needed.
- There is no user data to persist server-side (confirmed by PROJECT.md: no accounts, no server-side persistence — "last location" if kept, belongs in `localStorage`).
- A single historical-archive request per pin-drop, spanning the full 30-year date range with `daily` aggregation, returns a modest JSON payload (~30 years × 1 value/day ≈ small enough for direct browser fetch — no pagination or backend aggregation needed). Filter/aggregate the day-of-year window client-side in JS.
- **If repeat historical fetches for the same location become a real cost/latency concern later** (e.g. many users hitting the same popular location repeatedly), the correct fix is a `localStorage`/`sessionStorage` cache keyed by rounded lat/lon — since a location's 30-year-back historical data never changes day-to-day, a client cache with a long TTL eliminates repeat archive calls without needing any server at all. Only reach for a backend if that's insufficient.

**A thin serverless caching layer is NOT warranted for v1.** It would exist only to shave latency/rate-limit risk off the historical-archive call — a problem better solved client-side first (see above). Don't add server infrastructure to a stateless, keyless-API app until a real, measured need appears.

### Hosting

| Platform | Free Tier | Fit |
|----------|-----------|-----|
| **Cloudflare Pages** (recommended) | Unlimited bandwidth, 500 builds/month, 100 sites, Pages Functions on Workers runtime (100K req/day free) if a backend is ever added later | Best default: most generous free tier, **explicitly allows commercial use**, fastest global edge, and if a serverless function is ever needed (see above) it's a one-line addition in the same project — no new platform. |
| **Netlify** (solid alternative) | 100GB bandwidth/month, 300 build minutes, 125K serverless function invocations/month, commercial use allowed | Equally viable; slightly less generous than Cloudflare on bandwidth/functions but excellent DX and equally free-friendly. |
| **Vercel** (avoid for this project) | 100GB bandwidth, functions capped at 1M invocations, 10s max duration — **but the Hobby (free) plan's terms restrict it to non-commercial/personal use** | Skip. Even though this app is free/non-commercial today, there's no reason to pick the platform with the most restrictive ToS when Cloudflare Pages and Netlify offer equal or better free tiers with no such restriction. |

Recommendation: **deploy to Cloudflare Pages**, built with `vite build`, output directory `dist/`. Connect the git repo for auto-deploy on push — zero-config for a pure static Vite app.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `leaflet` | 1.9.4 | Core map engine, driven by `react-leaflet` | Always — required peer of react-leaflet |
| `@types/leaflet` | 1.9.21 | TypeScript types for Leaflet | Always, as a dev dependency (Leaflet itself ships without types) |
| (none — no state manager) | — | — | A single-view dashboard (map + one panel + one chart) does not need Redux/Zustand/Jotai. `useState` + a couple of custom hooks (`useCurrentWeather(lat,lon)`, `useHistoricalBaseline(lat,lon)`) is sufficient. Only reconsider if the app's state surface grows materially (e.g., multi-location comparison in a future milestone). |
| (none — no data-fetching library) | — | — | `fetch()` + a small custom hook wrapping loading/error/data state covers two API calls. TanStack Query is genuinely useful once caching/retry/dedupe logic gets non-trivial (e.g., if the localStorage caching layer above grows complex) — worth revisiting then, not needed for v1. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vite dev server | Local dev with HMR | Default `vite` command; no extra config needed for this app shape |
| ESLint + `typescript-eslint` | Linting | Verify `typescript-eslint` compatibility with whatever TS version is pinned (see TypeScript note above) before upgrading TS |
| Vitest | Unit tests (esp. for the z-score/delta math) | Ships naturally alongside Vite, same config/transform pipeline — the anomaly computation is exactly the kind of pure-function logic worth unit testing directly |

## Installation

```bash
# Scaffold
npm create vite@latest weather-anomaly-dashboard -- --template react-ts
cd weather-anomaly-dashboard

# Core
npm install react-leaflet leaflet recharts

# Dev dependencies
npm install -D @types/leaflet vitest
```

Then in `tsconfig.json` / `package.json`, pin `typescript` to the last pre-7.0 stable release available at scaffold time (check `npm view typescript versions` and select the newest `6.x` or `5.x` release) rather than accepting whatever `create vite` defaults to, until TypeScript 7.1 (stable programmatic API) ships and the ecosystem (typescript-eslint etc.) confirms support.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| react-leaflet + Leaflet | MapLibre GL JS (`react-map-gl/maplibre`) | If a future milestone needs vector-tile styling, smooth 3D/rotation, or rendering thousands of markers/points (e.g. a "compare many locations" heatmap view) |
| Recharts | Chart.js / `react-chartjs-2` | If the trend view ever needs very high-frequency live updates or plots with 1000+ points — neither applies to a 30-90-day daily trend |
| Recharts | visx | If a future design needs a fully custom, non-standard chart shape that Recharts' composable-but-templated API can't express |
| Hand-rolled z-score | `simple-statistics` | If the app later adds more statistical operations (regression, percentiles, distribution fitting) — at that point a real stats library earns its bundle cost |
| No backend | Cloudflare Pages Functions (serverless) | If real usage shows the client-side `localStorage` cache is insufficient (e.g., need cross-user shared caching, or need to hide/aggregate Open-Meteo calls for cost/rate-limit reasons) |
| Cloudflare Pages | Netlify | If the team already has Netlify infra/habits elsewhere — functionally equivalent free tier for this app shape |
| Vite SPA | Next.js / other meta-framework with SSR | Only if SEO or server-rendering of anomaly data becomes a requirement — this app has no public content to index and no reason for SSR (confirmed: shareable via URL is a client-side routing concern, not an SSR one) |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| Create React App | Officially deprecated by the React team (Feb 2025); no longer maintained, slow dev server, incompatible with modern tooling expectations | Vite |
| Vercel Hobby plan for hosting | Free tier ToS restricts to non-commercial/personal use; no functional advantage over Cloudflare Pages or Netlify for this app shape | Cloudflare Pages (or Netlify) |
| A backend/serverless layer "just in case" | Adds hosting complexity, cold-start latency, and a second deploy target for a problem (repeat historical-data fetches) that a client-side cache solves for free | `localStorage` caching of historical archive responses, keyed by rounded lat/lon |
| MapLibre GL JS for a single-pin picker | Solves problems (vector tiles, WebGL, 3D) this app doesn't have; steeper API, extra dependency weight, often needs a third-party vector style provider with its own limits | react-leaflet + free raster tiles (OSM/CARTO) |
| A global state manager (Redux/Zustand) for v1 | Unjustified complexity for a single-view app with ~2 data sources | `useState` + small custom hooks |
| TypeScript 7.0 at time of writing | GA'd 5 days before this research; ships without a stable programmatic API until 7.1 (~Oct 2026), so some tooling (typescript-eslint, plugins) may lag | TypeScript 6.x or 5.9.x until 7.1 lands and ecosystem catches up |
| `simple-statistics` (or similar) for just z-score/delta | The needed math is ~6 lines; a dependency for it is unjustified bundle weight | Hand-rolled `mean`/`stdDev`/`zScore` utility, unit-tested with Vitest |

## Stack Patterns by Variant

**If the app later needs multi-variable anomaly (precipitation, wind, etc.) — deferred per PROJECT.md but worth flagging now:**
- The current hook shape (`useHistoricalBaseline(lat, lon, variable)`) should be designed to take a `variable` parameter from day one, even though v1 hard-codes `temperature_2m_mean` — this avoids a rewrite when precipitation/wind are added in v2.
- Because Open-Meteo's `archive-api` returns multiple daily variables in a single call at no extra cost, requesting `temperature_2m_mean` alongside 1-2 future-planned variables now (and ignoring the extras in v1's UI) costs nothing and de-risks the v2 add.

**If the app later needs to compare multiple locations side-by-side:**
- This is when a state manager and possibly MapLibre GL (many markers) start to earn their cost — not before.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| `react@19.2.7` | `react-leaflet@5.0.0`, `recharts@3.9.2` | Both confirmed via npm registry peerDependencies to support `^19.0.0` |
| `react-leaflet@5.0.0` | `leaflet@^1.9.0` | Peer requirement — install `leaflet@1.9.4` explicitly alongside |
| `vite@8.1.4` | Node `^20.19.0 \|\| >=22.12.0` | Confirmed via npm registry `engines` field — ensure CI/deploy runtime matches (Cloudflare Pages and Netlify both default to recent Node LTS, but pin explicitly in project config to avoid drift) |
| `typescript@7.0.x` | ecosystem tooling | Do not adopt yet — stable programmatic API lands in 7.1 (~Oct 2026); revisit this pin then |

## Sources

- npm registry (`registry.npmjs.org`) direct queries — HIGH confidence, ground truth for exact current versions of `react`, `react-dom`, `vite`, `leaflet`, `react-leaflet`, `recharts`, `typescript`, `@types/leaflet`, including peerDependencies and engines fields
- Web search, cross-corroborated across multiple independent sources (PkgPulse, LogRocket, npm trends, jawg.io, official Vite/React docs) — MEDIUM confidence — for: React/Vite 2026 stack conventions, MapLibre vs Leaflet tradeoffs, Recharts vs Chart.js vs visx tradeoffs, Cloudflare Pages vs Vercel vs Netlify free-tier terms
- `open-meteo.com` official docs (historical-weather-api, archive-api pages) and GitHub (`open-meteo/open-meteo`) — MEDIUM confidence — for CORS/keyless support and 30-year historical data coverage (ERA5 reanalysis back to 1940, easily covers any 30-year normal window)
- Microsoft TypeScript devblog (`devblogs.microsoft.com/typescript`) via web search — MEDIUM confidence — for TypeScript 7.0 GA date and programmatic-API stability timeline

---
*Stack research for: Weather anomaly dashboard (map-based, free-tier hosted, client-only)*
*Researched: 2026-07-13*
