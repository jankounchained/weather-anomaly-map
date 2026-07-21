# Stack Research

**Domain:** Client-rendered, map-based weather data dashboard (single-page, no accounts, free-tier hosted)
**Researched:** 2026-07-21 (v1.2 additions below); original research 2026-07-13
**Confidence:** HIGH (v1.2 additions grounded directly in this repo's shipped code + npm registry ground truth); MEDIUM-HIGH overall (original core package versions verified directly against npm registry = HIGH; ecosystem/comparison claims from web search, cross-corroborated across multiple independent sources = MEDIUM)

---

## v1.2 Additions — Split-Violin Trend Viz + Explanatory/Disclosure UI

*Researched 2026-07-21. Scope: only the two NEW v1.2 capabilities below. The rest of this document (React/Vite/TypeScript/react-leaflet/Recharts/hosting/no-backend/no-state-manager) is the validated v1.0/v1.1 stack and is unchanged — see the "v1.0/v1.1 (Original)" section further down.*

### Recommendation Summary

**Add zero new runtime npm dependencies for either v1.2 feature.** Both the split-violin plot and the methodology/info-affordance UI are solvable with hand-rolled code (~25–40 lines each) sitting directly on top of what's already installed: `recharts@3.9.2` (already a dependency) for the violin's rendering surface, plain math for the KDE, and native HTML + Tailwind v4 for the disclosure/tooltip UI. This directly continues this project's established "hand-roll, don't add a dependency" pattern (the z-score/mean/stddev decision below) — the violin and the tooltip are the same shape of problem: small, well-understood, unit-testable code that a library would cost more (bundle weight, new API surface, upgrade churn) to bring in than to write.

### Core Technologies (all hand-rolled — no new packages)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Hand-rolled Gaussian KDE | n/a (new internal module, e.g. `src/anomaly/kde.ts`) | Turns the recent-5yr and prior-25yr temperature samples for a calendar day into two smooth density curves | ~20–25 lines: Silverman's rule-of-thumb bandwidth `h = 1.06·σ·n^(-1/5)` (σ = sample stddev, n = sample count — both already computed by the existing hand-rolled stats utility) plus a sum-of-Gaussian-kernels evaluator over a fixed grid of temperature points. This is textbook, well-specified math (not a "vibes-based" visual choice) — a good unit-test candidate, exactly like the existing z-score utility. |
| Recharts `Scatter` + custom `shape` prop (existing dependency, already used this way) | 3.9.2 (unchanged) | Rendering surface for each violin tile | This codebase **already has the exact idiom needed**: `TrendDayChart.tsx`'s `makeActualShape()` renders a hand-built SVG `<polygon>` via a single-point `<Scatter shape={...}>` inside a `ComposedChart`. The violin body is the same trick — a single-point `Scatter` whose `shape` function ignores the point's own `cx`/`cy` and instead draws a pre-computed `<path>` built from the KDE output. This keeps the new visual inside the same `ComposedChart`/shared-`yDomain` structure `TrendRow`/`TrendYAxisColumn` already established (Phase 3), with zero new library surface. |
| Hand-rolled linear temp→pixel mapping | n/a (a 3-line helper) | Converts each KDE grid point's temperature into a Y pixel inside the fixed-size tile | `TrendDayChart` already receives `yDomain: [number, number]` and uses a fixed `CHART_HEIGHT = 120` — the exact two numbers needed to replicate Recharts' internal linear scale by hand: `pixelY = CHART_HEIGHT - ((temp - yDomain[0]) / (yDomain[1] - yDomain[0])) * CHART_HEIGHT`. Doing this by hand means the violin path never needs to reach into Recharts' internal scale machinery (see "What NOT to Add" — that internal API is unstable in Recharts 3.x). |
| Hand-rolled SVG path builder | n/a (~15–20 lines) | Turns an array of `{densityPx, pixelY}` points into a filled `<path d="...">` for one violin half | Piecewise-linear (`M x0,y0 L x1,y1 ... Z`) through ~30–40 KDE grid points is visually smooth at this app's existing small-multiple tile size (88×120px, per `CHART_WIDTH`/`CHART_HEIGHT` in `TrendDayChart.tsx`) — no curve-interpolation library needed. Two halves (recent-5yr density pointing right from a center X, prior-25yr density pointing left) render as two `<path>` elements, optionally with a thin center divider line. |
| Native `<details>`/`<summary>` | n/a (HTML, always available) | Collapsible methodology section, collapsed by default | Zero JS, semantically correct (screen readers announce expand/collapse state for free), and Tailwind v4 has first-class support for styling it: `list-none` on `<summary>` to remove the default marker, `group`/`group-open:` variants for a rotating disclosure chevron, and the `::details-content` pseudo-element combined with `calc-size()`/`transition-behavior: allow-discrete` for an animated (not just instant-snap) open/close if desired later. |
| Hand-rolled `<InfoTooltip>` component | n/a (~30–40 lines) | Per-panel info icon → short explanatory text on hover/focus | A single reusable component: a `relative`-positioned wrapper, an info icon (inline SVG or glyph), `useState` for open/closed, `onMouseEnter`/`onMouseLeave` **and** `onFocus`/`onBlur` (keyboard/touch accessibility — hover-only tooltips fail keyboard users), and an `absolute`-positioned Tailwind-styled bubble. This is the same order of complexity as `simple-statistics` was for z-score in the original stack decision — a dependency here buys convenience the project doesn't need at this scale. |
| `createPortal` (from `react-dom`, already a dependency) | matches installed `react-dom@19.2.7` | Escape-hatch only if a tooltip bubble gets visually clipped | The glass panels use `overflow`/`rounded-glass-*` treatments (v1.1 design). If an absolutely-positioned tooltip near a panel edge gets clipped, portal it to `document.body` instead of reaching for a positioning library — `createPortal` ships in `react-dom`, already installed, so this stays a zero-new-dependency fix. Only reach for this if clipping is actually observed; don't pre-emptively wrap every tooltip in a portal. |

### Supporting Libraries (v1.2)

None to add. See "What NOT to Add (v1.2)" below for everything considered and rejected.

### Installation (v1.2)

```bash
# No new packages required for v1.2. Everything below is internal code:
#   src/anomaly/kde.ts              — Gaussian KDE + Silverman bandwidth
#   src/app/ViolinDayChart.tsx       — per-day split-violin tile (parallels TrendDayChart.tsx)
#   src/app/InfoTooltip.tsx          — reusable hover/focus info bubble
#   src/app/MethodologySection.tsx   — <details>/<summary> disclosure
```

### Alternatives Considered (v1.2)

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Hand-rolled Gaussian KDE (~25 lines) | `d3-array` (3.2.4) `bin()` + a density/curve helper, or a dedicated KDE package (`fast-kde@0.2.2`, `science@1.9.3`) | If the app later needs multiple kernel types (Epanechnikov, etc.), adaptive/variable bandwidth, or 2D density estimation — none of which this feature needs. `fast-kde` has low adoption and `science` is a legacy, effectively unmaintained grab-bag library; neither earns its weight for one 1D Gaussian KDE call per day-tile. |
| Hand-rolled SVG path (piecewise-linear through KDE grid points) | `d3-shape@3.2.0` `area()` + a `curveBasis`/`curveCatmullRom` interpolator for a smoother silhouette | If the violin shape looks visibly faceted/jagged at the existing 88×120px tile size once implemented and raising the KDE grid resolution (e.g., 40→80 points) doesn't fix it. `d3-shape` is small and dependency-free — a reasonable one-line upgrade later — but don't add it pre-emptively. The standard reference implementation for violin plots (react-graph-gallery's approach) does use `d3-shape`, but that's for a full drill-down chart, not a small-multiple thumbnail — at thumbnail scale, straight-line segments through a well-resolved density grid are visually indistinguishable from a curve-smoothed one. |
| Rendering the violin via a single-point `Scatter` + custom `shape` (mirrors `makeActualShape` already in this codebase) | Recharts' `<Customized>` component, or `layout="vertical"` `<Area>` pairs | `Customized` was explicitly slimmed down in the Recharts 3.0 migration (it no longer receives the internal chart state previous versions passed it, and the maintainers state additional scale-access hooks are added only "on request" — i.e., not guaranteed present in 3.9.2/3.10.0). Building the violin path from data this codebase's components already hold (`yDomain`, `CHART_HEIGHT`) sidesteps that immature internal API entirely. A `layout="vertical"` `<Area>` pair is a viable *alternative* worth trying first if a future contributor prefers staying fully inside Recharts' declarative API — it's built-in (no new dependency) and Recharts' bundled d3-shape (via `victory-vendor`) would supply free curve smoothing — but it's less proven in this codebase than the `Scatter`+custom-`shape` idiom, which is already shipped and tested here (`TrendDayChart.test.tsx`). |
| Native `<details>`/`<summary>` for the methodology disclosure | Radix UI (`@radix-ui/react-accordion`), Headless UI (`@headlessui/react@2.2.10`) | If the app grows a second/third disclosure with cross-panel behavior (e.g., an accordion group where opening one auto-closes another) or needs enter/exit animation timing more precise than CSS can express. A single, standalone, collapsed-by-default section doesn't need that. |
| Hand-rolled `<InfoTooltip>` (hover + focus, `position: absolute`) | Native HTML `popover` attribute + CSS anchor positioning (`anchor()`/`position-anchor`) | The Popover API itself reached Baseline widely-available status in 2025 and is solid. CSS anchor positioning is newer and, per multiple 2026 sources, still has meaningfully different per-browser landing dates (roughly Chrome/Edge 125+, Firefox 132+, Safari's support reported inconsistently across sources — treat any specific Safari version number here as unverified/MEDIUM-LOW confidence). For a handful of simple, panel-scoped info bubbles, betting on a still-settling positioning API is unnecessary risk; a `relative`/`absolute` pair has worked identically in every browser for decades. Revisit if the app later needs popovers that must escape viewport edges/clip contexts in complex ways across many components — at that point native anchor positioning (or, failing solid cross-browser support, Radix's `Popover`/`Tooltip`, 1.1.20/1.2.13) is the right upgrade, not before. |
| Hand-rolled `<InfoTooltip>` | `@radix-ui/react-tooltip@1.2.13` | If the tooltips need to be modal-safe, need automatic collision/flip repositioning near viewport edges, or need to support rich interactive content inside the bubble (links, buttons) rather than short static text — none of which the v1.2 scope ("per-panel micro-copy... self-explanatory") calls for. |

### What NOT to Add (v1.2)

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| `d3-shape` / `d3-scale` (as new direct dependencies) | Recharts 3.x no longer exposes d3-shape/d3-scale as its own direct dependencies (it now depends on `victory-vendor`, `es-toolkit`, `decimal.js-light`, etc.) — so there is no "already in the tree, just import it" shortcut; adding either would be a genuinely new dependency for a curve-smoothing nicety this app's tile size doesn't need. | Hand-rolled piecewise-linear path through the KDE grid (see above); revisit only if visual quality demands it after implementation. |
| A dedicated KDE package (`fast-kde`, `science`, or similar) | The math is ~25 lines of well-specified, testable arithmetic (Silverman bandwidth + Gaussian kernel sum) — exactly the bar this project already set for "don't add a dependency" with `simple-statistics`. | Hand-rolled `kde.ts`, unit-tested with Vitest like the existing z-score utility. |
| Recharts' `<Customized>` component for the violin shape | Recharts' own 3.0 migration notes say `Customized` no longer receives the old internal chart state and that further internal-scale hooks are added "on request" — i.e., not a stable, documented way to pull the chart's live x/y scale in 3.9.2. Depending on it risks silent breakage on a future Recharts patch/minor bump. | The single-point `Scatter` + custom `shape` idiom already used by `makeActualShape()` in `TrendDayChart.tsx`, combined with the hand-rolled temp→pixel mapping this codebase already has the inputs for (`yDomain`, `CHART_HEIGHT`). |
| Radix UI / Headless UI for the disclosure or tooltips | Both are well-built, but built for composable, accessible *primitives at scale* (comboboxes, dialogs with focus traps, menu systems) — this milestone needs one static disclosure section and a handful of static-text info bubbles. Pulling in either adds a new dependency family and API to learn (several small packages for Radix specifically) for a problem native HTML + ~40 lines of React solves fully. | Native `<details>`/`<summary>` + Tailwind v4 `group-open:`/`::details-content`; a single hand-rolled `<InfoTooltip>`. |
| Betting on CSS anchor positioning for tooltip placement today | Cross-browser landing dates are still inconsistent across sources checked in this research (Safari support in particular is reported with conflicting version numbers across otherwise-plausible 2026 sources) — MEDIUM-LOW confidence claim, don't build load-bearing UI on it yet. | Classic `relative` wrapper + `absolute` bubble; escalate to `createPortal` (already available via `react-dom`) only if clipping is actually observed. |
| A global state manager, a data-fetching library, or any other "just in case" addition for this milestone | Out of scope for v1.2 — this milestone touches layout/visualization/disclosure only, not data-fetching or app-wide state shape; nothing here changes those prior "hand-roll" verdicts from the original stack research. | (Unchanged — see v1.0/v1.1 stack rationale below.) |

### Stack Patterns by Variant (v1.2)

**If the piecewise-linear violin path looks visibly faceted once built:**
- First try raising the KDE grid resolution (e.g., 40 → 80 evaluation points) — free, no new code shape.
- Only if that's insufficient, add `d3-shape@3.2.0` for a `curveBasis`/`curveCatmullRom`-smoothed `area()` path. Confirmed compatible with React 19 / Vite 8 — `d3-shape` has zero React/Vite-specific dependencies; it's pure JS producing SVG path strings, so it drops into any renderer without a compatibility question.

**If a future milestone needs many simultaneous popovers with collision/flip behavior (e.g., a multi-location comparison view — currently Out of Scope per `PROJECT.md`):**
- Revisit `@radix-ui/react-tooltip@1.2.13` / `@radix-ui/react-popover@1.1.20` then — that's the point where hand-rolled positioning math stops being the cheaper option.

**If a second/third collapsible section is added and they need "only one open at a time" accordion behavior:**
- Plain `<details>` elements don't coordinate with each other by default (each is independent); at that point either hand-roll shared open-state via `useState` in a small parent (still zero new dependency — one boolean-per-section lifted up) or, only if the interaction grows genuinely complex, reach for `@radix-ui/react-accordion`.

### Version Compatibility (v1.2)

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| `recharts@3.9.2` (existing, unchanged) | `react@19.2.7`, `react-dom@19.2.7` | No version bump needed or recommended for this milestone; current registry has `recharts@3.10.0` available, but upgrading is out of scope here — not required by anything in v1.2. |
| `d3-shape@3.2.0` (only if adopted per the escalation path above) | Any React version, Vite 8 | Confirmed zero-dependency, pure-JS SVG path string generation — no framework coupling, so no compatibility risk if it's added later. |
| `@radix-ui/react-tooltip@1.2.13` / `@radix-ui/react-popover@1.1.20` (only if adopted later) | React 19 | Both are current, actively maintained Radix packages; verify peer-dependency ranges at adoption time since this research doesn't currently need them installed. |
| Native `<details>`/`<summary>`, Popover API | All evergreen browsers (Chrome/Edge/Firefox/Safari) as of 2026 | No polyfill needed for `<details>` (universal, decades old). Popover API is Baseline widely-available since 2025 per web.dev's official blog. |
| CSS anchor positioning (`anchor()`, `position-anchor`) | Inconsistent across sources for exact per-browser version — flagged MEDIUM-LOW confidence | Do not depend on this for v1.2; re-verify against caniuse.com/css-anchor-positioning directly before ever making it load-bearing. |

### Sources (v1.2)

- This repository's own source — `src/app/TrendDayChart.tsx`, `src/app/TrendRow.tsx` — HIGH confidence, ground truth for the existing Recharts integration idiom (single-point `Scatter` + custom `shape` rendering raw SVG; shared `yDomain`/`CHART_HEIGHT` already passed as plain props, not read from Recharts internals)
- npm registry (`registry.npmjs.org`) direct queries — HIGH confidence — exact current versions of `recharts` (3.10.0 latest / 3.9.2 pinned in this project), `d3-shape` (3.2.0), `d3-scale` (4.0.2), `d3-array` (3.2.4), `@radix-ui/react-tooltip` (1.2.13), `@radix-ui/react-popover` (1.1.20), `@headlessui/react` (2.2.10), `fast-kde` (0.2.2), `science` (1.9.3); also confirmed `recharts@3.10.0`'s own dependency list no longer includes `d3-shape`/`d3-scale` directly (uses `victory-vendor`, `es-toolkit`, `decimal.js-light`, etc. instead)
- `recharts.github.io/en-US/guide/customize/` and the Recharts 3.0 migration guide (`github.com/recharts/recharts/wiki/3.0-migration-guide`) — MEDIUM confidence — for the claim that `Customized` no longer passes full internal chart state in 3.x and that additional scale-access hooks are added only on request
- `react-graph-gallery.com/violin-plot` — MEDIUM confidence — for the standard reference implementation pattern (D3 `bin()` + `area()` + `curveBumpY`, `scaleLinear`/`scaleBand`), used here to confirm violin plots are conventionally built as standalone D3+SVG rather than shoehorned into an existing chart library's native mark types
- Web search cross-corroborated across multiple sources (web.dev official blog for Popover API Baseline status; several independent 2026 posts for CSS anchor positioning support, which disagreed on exact Safari version — flagged accordingly) — MEDIUM confidence for Popover API, MEDIUM-LOW confidence for CSS anchor positioning specifics
- Web search for Silverman's Rule of Thumb bandwidth formula (`h = 1.06·σ·n^(-1/5)`) — MEDIUM confidence, standard/textbook statistics result, cross-checked against multiple independent sources
- Tailwind CSS v4 community posts on `<details>`/`<summary>` styling (`group-open:`, `::details-content`, `calc-size()`) — MEDIUM confidence — for the specific Tailwind v4 utility names to use for the methodology disclosure's open/close styling

---

## v1.0/v1.1 (Original) — Unchanged

*Original research from 2026-07-13, validated and shipped in v1.0/v1.1. Reproduced below for continuity; do not re-research these choices.*

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

### Installation

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

### Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| react-leaflet + Leaflet | MapLibre GL JS (`react-map-gl/maplibre`) | If a future milestone needs vector-tile styling, smooth 3D/rotation, or rendering thousands of markers/points (e.g. a "compare many locations" heatmap view) |
| Recharts | Chart.js / `react-chartjs-2` | If the trend view ever needs very high-frequency live updates or plots with 1000+ points — neither applies to a 30-90-day daily trend |
| Recharts | visx | If a future design needs a fully custom, non-standard chart shape that Recharts' composable-but-templated API can't express |
| Hand-rolled z-score | `simple-statistics` | If the app later adds more statistical operations (regression, percentiles, distribution fitting) — at that point a real stats library earns its bundle cost |
| No backend | Cloudflare Pages Functions (serverless) | If real usage shows the client-side `localStorage` cache is insufficient (e.g., need cross-user shared caching, or need to hide/aggregate Open-Meteo calls for cost/rate-limit reasons) |
| Cloudflare Pages | Netlify | If the team already has Netlify infra/habits elsewhere — functionally equivalent free tier for this app shape |
| Vite SPA | Next.js / other meta-framework with SSR | Only if SEO or server-rendering of anomaly data becomes a requirement — this app has no public content to index and no reason for SSR (confirmed: shareable via URL is a client-side routing concern, not an SSR one) |

### What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| Create React App | Officially deprecated by the React team (Feb 2025); no longer maintained, slow dev server, incompatible with modern tooling expectations | Vite |
| Vercel Hobby plan for hosting | Free tier ToS restricts to non-commercial/personal use; no functional advantage over Cloudflare Pages or Netlify for this app shape | Cloudflare Pages (or Netlify) |
| A backend/serverless layer "just in case" | Adds hosting complexity, cold-start latency, and a second deploy target for a problem (repeat historical-data fetches) that a client-side cache solves for free | `localStorage` caching of historical archive responses, keyed by rounded lat/lon |
| MapLibre GL JS for a single-pin picker | Solves problems (vector tiles, WebGL, 3D) this app doesn't have; steeper API, extra dependency weight, often needs a third-party vector style provider with its own limits | react-leaflet + free raster tiles (OSM/CARTO) |
| A global state manager (Redux/Zustand) for v1 | Unjustified complexity for a single-view app with ~2 data sources | `useState` + small custom hooks |
| TypeScript 7.0 at time of writing | GA'd 5 days before this research; ships without a stable programmatic API until 7.1 (~Oct 2026), so some tooling (typescript-eslint, plugins) may lag | TypeScript 6.x or 5.9.x until 7.1 lands and ecosystem catches up |
| `simple-statistics` (or similar) for just z-score/delta | The needed math is ~6 lines; a dependency for it is unjustified bundle weight | Hand-rolled `mean`/`stdDev`/`zScore` utility, unit-tested with Vitest |

### Stack Patterns by Variant

**If the app later needs multi-variable anomaly (precipitation, wind, etc.) — deferred per PROJECT.md but worth flagging now:**
- The current hook shape (`useHistoricalBaseline(lat, lon, variable)`) should be designed to take a `variable` parameter from day one, even though v1 hard-codes `temperature_2m_mean` — this avoids a rewrite when precipitation/wind are added in v2.
- Because Open-Meteo's `archive-api` returns multiple daily variables in a single call at no extra cost, requesting `temperature_2m_mean` alongside 1-2 future-planned variables now (and ignoring the extras in v1's UI) costs nothing and de-risks the v2 add.

**If the app later needs to compare multiple locations side-by-side:**
- This is when a state manager and possibly MapLibre GL (many markers) start to earn their cost — not before.

### Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| `react@19.2.7` | `react-leaflet@5.0.0`, `recharts@3.9.2` | Both confirmed via npm registry peerDependencies to support `^19.0.0` |
| `react-leaflet@5.0.0` | `leaflet@^1.9.0` | Peer requirement — install `leaflet@1.9.4` explicitly alongside |
| `vite@8.1.4` | Node `^20.19.0 \|\| >=22.12.0` | Confirmed via npm registry `engines` field — ensure CI/deploy runtime matches (Cloudflare Pages and Netlify both default to recent Node LTS, but pin explicitly in project config to avoid drift) |
| `typescript@7.0.x` | ecosystem tooling | Do not adopt yet — stable programmatic API lands in 7.1 (~Oct 2026); revisit this pin then |

### Sources

- npm registry (`registry.npmjs.org`) direct queries — HIGH confidence, ground truth for exact current versions of `react`, `react-dom`, `vite`, `leaflet`, `react-leaflet`, `recharts`, `typescript`, `@types/leaflet`, including peerDependencies and engines fields
- Web search, cross-corroborated across multiple independent sources (PkgPulse, LogRocket, npm trends, jawg.io, official Vite/React docs) — MEDIUM confidence — for: React/Vite 2026 stack conventions, MapLibre vs Leaflet tradeoffs, Recharts vs Chart.js vs visx tradeoffs, Cloudflare Pages vs Vercel vs Netlify free-tier terms
- `open-meteo.com` official docs (historical-weather-api, archive-api pages) and GitHub (`open-meteo/open-meteo`) — MEDIUM confidence — for CORS/keyless support and 30-year historical data coverage (ERA5 reanalysis back to 1940, easily covers any 30-year normal window)
- Microsoft TypeScript devblog (`devblogs.microsoft.com/typescript`) via web search — MEDIUM confidence — for TypeScript 7.0 GA date and programmatic-API stability timeline

---
*Stack research for: Weather anomaly dashboard (map-based, free-tier hosted, client-only) — v1.0/v1.1 original + v1.2 additions*
*Researched: 2026-07-13 (original); 2026-07-21 (v1.2 additions)*
