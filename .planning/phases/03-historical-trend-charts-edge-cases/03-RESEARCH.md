# Phase 3: Historical Trend Charts & Edge Cases - Research

**Researched:** 2026-07-15
**Domain:** Recharts chart composition (Scatter/ReferenceLine strip plots, small multiples) + Open-Meteo forecast-API `past_days` mechanics + robustness/empty-state design
**Confidence:** MEDIUM

## Summary

This is the project's first use of a chart library. CONTEXT.md (D-01 through D-14) already locked the product/architecture decisions — dot/strip plot via Recharts `Scatter` + `ReferenceLine`, jittered x-position, 7 fixed-y-scale mini-charts in a row, a stricter "≥half of 30 years" usable-data threshold shared with Phase 2's `computeAnomalyForToday`, and sourcing the 7 actual daily values from the forecast API rather than the archive API. This research fills the *implementation* gap: concrete Recharts API patterns, a verified Open-Meteo request shape that gets all 7 actual values in one call, and several non-obvious pitfalls specific to this exact composition.

Three findings materially change how the planner should scope tasks. First, a single forecast-API request with `daily=temperature_2m_mean&past_days=6&forecast_days=1` (combinable with the existing `current=temperature_2m` param) returns all 7 dates AND all 7 actual values in one call, already correctly ordered oldest→today — no client-side date arithmetic needed and no second round trip (verified live against the API). Second, Open-Meteo's archive/ERA5 data is a spatially-complete global reanalysis grid — a live test against open ocean (0°, −140°) and near the south pole both returned full 30-year non-null series, and Open-Meteo's own docs confirm ERA5 is "spatially complete with no missing values." This means ROBU-01's "ocean/remote area" empty state is very unlikely to be genuinely reproducible through real coordinates; the stricter D-09/D-10 threshold is a correctness safeguard, not something manual QA will easily trigger, and the planner should account for this in verification strategy. Third, the existing `location-panel` sidebar is a **fixed 360px-wide column** — a 7-chart horizontal row at that width gives ~40-45px per mini-chart, too narrow for a readable strip plot; this needs an explicit layout decision (see Architecture Patterns).

**Primary recommendation:** Extend `getCurrentWeather`'s existing forecast-API call (don't add a second fetch) to also request `daily=temperature_2m_mean&past_days=6&forecast_days=1`; add a single shared `hasUsableSampleCount(samples, totalYears)` helper in `anomaly.ts` that both `computeAnomalyForToday` (retrofit per D-10) and the new per-day trend computation call, so there is exactly one definition of "usable" in the codebase; render each mini-chart as a fixed-size (not `ResponsiveContainer`-wrapped) `ComposedChart` with two `Scatter` series (historical dots + single actual-value diamond) and one `ReferenceLine` (mean), sharing one y-`domain` array computed across all 7 days with padding before any child renders.

## User Constraints

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Distribution chart style (VIZ-02)**
- D-01: Each day's historical spread renders as a dot/strip plot — every one of the ~30 years' values for that calendar day plotted as its own point (pale/translucent), not a box plot or shaded band alone.
- D-02: Today's/that-day's actual temperature is overlaid on the same strip as a visually distinct marker (different shape/color, e.g. diamond) at its value's position — directly comparable to the historical dots, not a separate text readout.
- D-03: The mean is emphasized as a bright, solid horizontal line/tick at its y-position, with the historical dots rendered pale/translucent behind it.
- D-04: Dot x-position within a day's strip is jittered (randomly offset) purely for de-clutter/readability — x carries no semantic meaning, only y (temperature) matters.
- Recharts has no native box-plot primitive; this dot/strip approach composes from Recharts' `Scatter` + `ReferenceLine`/`Line` — no box-plot composition needed.

**Small-multiples layout**
- D-05: The 7 day-charts are arranged as a horizontal row, side by side. Desktop-first (mobile responsiveness deferred), so a fixed-width row is acceptable.
- D-06: All 7 mini-charts share one fixed y-axis (temperature) scale — not independently auto-scaled per day.
- D-07: The trend row sits below the existing AnomalyCard — today's headline anomaly stays the primary focus at the top; the trend row is supporting detail underneath.
- D-08: The row shows today + 6 prior days (7 total), today included as the rightmost/most recent slot.

**No-historical-data experience (ROBU-01)**
- D-09: "No usable historical data" for a given day uses a stricter threshold than Phase 2's anomaly math: at least half of the ~30 years must have real (non-null) values in that day's window, not just Phase 2's looser "≥2 samples" floor.
- D-10: **This stricter threshold applies everywhere, including AnomalyCard's existing "today" anomaly** — Phase 2's `computeAnomalyForToday`/`filterDayOfYearWindow` gate (`samples.length < 2` in `src/anomaly/anomaly.ts`) must be tightened to the new "≥half of 30 years" rule so today's anomaly and all 7 trend days use one consistent usable-data rule. In-scope tightening, not scope creep.
- D-11: The no-data check is evaluated **per-day** — each of the 7 mini-charts independently shows either its chart or its own empty-state placeholder. Not a whole-location all-or-nothing gate.
- D-12: A day lacking usable historical data renders a placeholder card with a short message (e.g. "Not enough history for this day") in that day's slot — the row stays visually intact at 7 slots; days are never silently collapsed/omitted.

**Recent-day data gaps (data-freshness edge case)**
- D-13: Actual temperatures for the 7 days should be sourced from Open-Meteo's **forecast API** (`getCurrentWeather` in `src/weather/client.ts`), which can return recent past days' observed values alongside "current" — avoids the archive/reanalysis endpoint's few-day lag. The archive API (`getHistoricalBaseline`) remains reserved for the 30-year baseline side only.
- D-14: A day whose historical baseline is missing/insufficient due to a fetch-timing edge case (rather than a genuine data desert) is **not** visually distinguished from D-12's placeholder — one code path, one visual state, regardless of cause.

### Claude's Discretion
- Exact pixel/spacing/visual polish of the placement (D-07: "below AnomalyCard") — user confirmed the general position, fine details are Claude's call once laid out against the existing map + panel structure.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

## Phase Requirements

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VIZ-01 | User can see, for each of the last ~7 days, that day's actual temperature plotted against its own historical range/distribution for that calendar day | Verified single-request Open-Meteo pattern (`past_days=6&forecast_days=1&daily=temperature_2m_mean`) supplies all 7 dates+values; `filterDayOfYearWindow` (existing, Phase 2) reused per day against the already-fetched 30-year archive series — see Code Examples |
| VIZ-02 | Historical range visualizations show underlying historical data points/distribution, not just an average — average visually emphasized without hiding spread | Recharts `Scatter` (translucent dots) + `ReferenceLine` (bright mean) composition pattern, dataviz-skill opacity/emphasis formula — see Architecture Patterns, Code Examples |
| ROBU-01 | User sees a graceful message when a clicked location has no usable historical data | D-09/D-10 shared threshold helper design; per-day empty-state placeholder pattern; important caveat that ERA5 rarely returns genuinely null data — see Common Pitfalls, Open Questions |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 7-day actual-temperature retrieval (forecast API, `past_days`) | Browser/Client | External API (Open-Meteo forecast) | Direct `fetch()` from the browser per PLAT-02/CLAUDE.md — no backend proxy exists or is planned |
| 30-year historical baseline retrieval & day-of-year windowing | Browser/Client | External API (Open-Meteo archive) | Reuses Phase 2's `getHistoricalBaseline`/`useHistoricalBaseline` fetch — one archive call already covers all 7 days |
| Stricter usable-data threshold (D-09/D-10) | Browser/Client | — | Pure function in `anomaly.ts`, no server involved |
| Dot/strip distribution chart rendering | Browser/Client | — | Recharts renders client-side SVG; no SSR in this Vite SPA |
| Small-multiples layout & shared y-domain computation | Browser/Client | — | Computed once in the composing component from already-fetched data, no new fetch |
| Per-day empty-state UX | Browser/Client | — | Pure conditional rendering, mirrors existing `AnomalyCard`/`LocationDisplay` pattern |

No capability in this phase touches a backend tier — the project has none (PLAT-02, CLAUDE.md "Backend: None required").

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `recharts` | 3.9.2 | Composed dot/strip chart (`ComposedChart`, `Scatter`, `ReferenceLine`) | Already the project's locked chart library per STACK.md; peer-dependency support for React 19 confirmed live via `npm view recharts@3.9.2 peerDependencies` — `react`/`react-dom`/`react-is` all accept `^19.0.0` [VERIFIED: npm registry] |

No other new runtime dependency is needed — recharts ships its own TypeScript types (`types/index.d.ts`), so no `@types/recharts` package exists or is required [VERIFIED: npm registry].

### Supporting
None — the phase reuses existing project primitives (`useState`/`useEffect`, `anomaly.ts`'s pure functions, the existing `WeatherStatus` idle/loading/resolved contract). Per CLAUDE.md, no data-fetching or state-management library is added.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts `Scatter`+`ReferenceLine` composition | A dedicated box-plot/violin library (e.g. `nivo`) | Rejected in CONTEXT.md discussion — Recharts already composes this shape; a second charting dependency for one visual type is unjustified |
| Manual jitter (precomputed numeric x-offset) | A jitter-plugin package | No maintained Recharts jitter plugin found; the transform is ~5 lines of code (per-point deterministic pseudo-random offset), well inside CLAUDE.md's "hand-roll, don't add a dependency" philosophy |

**Installation:**
```bash
npm install recharts
```

**Version verification:** `npm view recharts version` → `3.9.2`, last published 2026-07-04 (11 days before this research) [VERIFIED: npm registry]. `npm view recharts time.created` → `2015-08-07` (package itself is 10+ years old, 41.4M weekly downloads at time of check) — the recency is a *version* release, not a new/unproven package (see Package Legitimacy Audit below for how this affects the SUS verdict).

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `recharts` | npm | Package: 10+ yrs (first published 2015-08-07); latest version tag: 11 days old (2026-07-04) | 41,426,322/wk | `github.com/recharts/recharts` | `[SUS]` (seam reason: `too-new` — triggered by the latest version's publish date, not package age) | Approved — see note below |

**Packages removed due to `[SLOP]` verdict:** none.
**Packages flagged as suspicious `[SUS]`:** `recharts` — flagged solely because its most recent version (3.9.2) was tagged 11 days before this research ran. The underlying signals (10+ year package history, 41M weekly downloads, canonical GitHub org/repo, no `postinstall` script, ships its own types) are all strongly legitimate; this reads as a false-positive on the "too-new" heuristic rather than a genuine risk. Per protocol this is still `[SUS]` and the planner **must** add a `checkpoint:human-verify` task before the `npm install recharts` step, even though the audit signals are clean — this is the correct default given it's the seam's own verdict, not a research-agent override.

*No packages in this phase were discovered only via WebSearch/training data without registry+peer-dependency confirmation — the `recharts` version, peer deps, and types were all confirmed live via `npm view` [VERIFIED: npm registry].*

## Architecture Patterns

### System Architecture Diagram

```
Pin selected (lat/lng, from Phase 1's useSelectedLocation)
        │
        ├──► getCurrentWeather(lat, lng)              [MODIFIED this phase]
        │      forecast API: current=temperature_2m
        │                   + daily=temperature_2m_mean
        │                   + past_days=6&forecast_days=1
        │      ──► one HTTP response containing:
        │            • current.temperature_2m       (CURR-01, unchanged)
        │            • daily.time[7]                 (7 calendar dates, oldest→today)
        │            • daily.temperature_2m_mean[7]  (7 actual daily values)
        │
        ├──► getHistoricalBaseline(lat, lng)          [UNCHANGED, Phase 2]
        │      archive API: 30 complete past years, temperature_2m_mean
        │      ──► one HTTP response: 30-year daily series (reused for baseline AND all 7 trend days)
        │
        ▼
  App.tsx composes:
        │
        ├─► anomaly.ts: computeAnomalyForToday(...)      → AnomalyCard (today's headline, unchanged UI)
        │     [D-10: threshold retrofit — now uses hasUsableSampleCount, not `samples.length < 2`]
        │
        └─► anomaly.ts: filterDayOfYearWindow(...) × 7   → TrendRow (new)
              one call per actual-value date, against the SAME already-fetched 30-year series
              │
              ├─ day usable (≥half of 30 yrs, D-09)  → TrendDayChart: Scatter(historical dots)
              │                                                     + Scatter(actual diamond)
              │                                                     + ReferenceLine(mean)
              └─ day NOT usable (D-09/D-14, one path) → TrendDayChart: empty-state placeholder
        │
        ▼
  Shared y-domain: computed ONCE across all 7 days' (historical samples ∪ actual values),
  padded, passed as the same `domain` array prop to all 7 mini-charts (D-06)
```

### Recommended Project Structure
```
src/
├── weather/
│   ├── client.ts              # MODIFIED: getCurrentWeather requests daily=temperature_2m_mean&past_days=6&forecast_days=1 alongside current=temperature_2m
│   ├── types.ts                # MODIFIED: CurrentWeatherResponse gains an optional `daily` field; UseCurrentWeatherResult gains recentDaily {time, values}
│   └── useCurrentWeather.ts    # MODIFIED: exposes the 7-day recentDaily series alongside existing tempC/localDate/units
├── anomaly/
│   ├── anomaly.ts              # MODIFIED: shared hasUsableSampleCount(samples, totalYears) helper; computeAnomalyForToday uses it (D-10); reuses filterDayOfYearWindow per trend day (no new windowing logic needed)
│   └── anomaly.test.ts         # MODIFIED: add cases for the new threshold helper + boundary (exactly half, half-minus-one)
├── app/
│   ├── App.tsx                 # MODIFIED: derive 7 target dates from recentDaily.time, compute 7 per-day results, pass to TrendRow
│   ├── AnomalyCard.tsx         # touched only for the D-10 threshold retrofit (no UI change)
│   ├── TrendRow.tsx             # NEW: composes 7 TrendDayChart, computes the shared padded y-domain once
│   └── TrendDayChart.tsx        # NEW: one mini ComposedChart OR the D-12 empty-state placeholder
```
(File names are Claude's discretion per CONTEXT.md — this is the recommended shape, not a locked contract.)

### Pattern 1: Combined current + recent-daily fetch (single request, D-13)
**What:** One forecast-API call returns both today's live temperature and the 7 most recent daily means.
**When to use:** Always for this phase's actual-value data — avoids a second HTTP round trip and avoids any date-arithmetic bugs, since the API itself returns the correct 7 dates in order.
**Verified live** (2026-07-15, Prague coordinates):
```
GET https://api.open-meteo.com/v1/forecast
    ?latitude=50.08&longitude=14.43
    &current=temperature_2m
    &daily=temperature_2m_mean
    &past_days=6&forecast_days=1
    &timezone=auto

→ {
    "current": { "time": "2026-07-15T10:15", "temperature_2m": 21.5 },
    "daily": {
      "time": ["2026-07-09","2026-07-10","2026-07-11","2026-07-12","2026-07-13","2026-07-14","2026-07-15"],
      "temperature_2m_mean": [20.8, 21.5, 22.1, 23.2, 24.5, 23.0, 22.3]
    }
  }
```
`daily.time`'s last entry always matches `current.time`'s date (both `timezone=auto`-resolved to the pin's local calendar) — confirmed in this same response. No separate "today" date computation is needed for the trend row; `daily.time[6]` (or `.at(-1)`) IS today, matching `localDateFrom(current.time)` exactly. [VERIFIED: live API call against api.open-meteo.com]

### Pattern 2: Scatter + ReferenceLine composition (numeric axis, not categorical)
**What:** A `ComposedChart` (or `ScatterChart`) with two `Scatter` series and one `ReferenceLine`, using a numeric (not categorical) x-axis.
**When to use:** Every mini-chart in the trend row.
**Why numeric, not categorical x:** The official Recharts composed-chart example uses a shared top-level `data` array keyed by a categorical `dataKey` (e.g. `name`) — that pattern does NOT fit here, because the ~30 historical dots and the single actual-value dot are different-length arrays with no shared category key, only a jittered numeric x. Recharts' categorical/ordinal x-axis scatter rendering has documented bugs with repeating x values (GitHub issues #5710, #2563) — a numeric axis with a fixed `domain` sidesteps this entirely.
```typescript
// Pattern synthesized from recharts.github.io/en-US/api/{Scatter,ReferenceLine,ScatterChart}
// and the official composed-chart example [CITED: recharts.github.io] — verify exact prop
// names against the installed 3.9.2 API docs during implementation; this is MEDIUM confidence,
// not independently confirmed against a running 3.9.2 build in this research session.
<ComposedChart width={W} height={H}>
  <XAxis type="number" dataKey="x" domain={[0, 1]} hide />
  <YAxis type="number" dataKey="y" domain={sharedYDomain} />
  {/* pale/translucent historical dots (D-01, D-04) */}
  <Scatter data={jitteredHistoricalPoints} fill="rgba(37, 99, 235, 0.25)" shape="circle" />
  {/* single distinct actual-value marker (D-02) */}
  <Scatter data={[actualPoint]} fill="#dc2626" shape="diamond" />
  {/* bright mean line, drawn on top (D-03) */}
  <ReferenceLine y={meanValue} stroke="#2563eb" strokeWidth={2} ifOverflow="visible" />
</ComposedChart>
```
`jitteredHistoricalPoints` = `[{ x: jitter(i), y: value }, ...]` where `jitter(i)` is a small deterministic offset (e.g. `0.5 + (seededRandom(i) - 0.5) * 0.6`) computed once per dataset in a `useMemo`/data-transform step — **not** `Math.random()` called inline during render (see Common Pitfalls).

### Pattern 3: Shared fixed y-domain across small multiples (D-06)
**What:** Compute one `[min, max]` (padded) across ALL 7 days' combined data (historical samples ∪ actual values ∪ means) in the parent (`TrendRow`), before rendering any child chart; pass the identical `domain` array to every `TrendDayChart`.
**When to use:** Always — per-chart auto-scaling would violate D-06's "absolute temperature comparable at a glance" requirement.
```typescript
// Illustrative — exact shape is an implementation detail for the planner
function computeSharedYDomain(days: DayTrendResult[]): [number, number] {
  const allValues = days.flatMap((d) =>
    d.usable ? [...d.samples, d.actual, d.mean] : [],
  )
  const min = Math.min(...allValues)
  const max = Math.max(...allValues)
  const pad = (max - min) * 0.1 || 1 // avoid a zero-width domain
  return [Math.floor(min - pad), Math.ceil(max + pad)]
}
```
If every one of the 7 days is unusable (all placeholders), there's no data to compute a domain from — the `TrendRow` never needs to render a chart at all in that case, so this is a non-issue in practice, but the function should not throw on an empty `allValues` array (guard with a sane fallback range).

### Anti-Patterns to Avoid
- **`Math.random()` called inline in JSX/render for jitter:** re-triggers on every unrelated re-render, making dots visibly jump. Precompute jitter once per dataset (e.g. in a `useMemo` keyed on the day's data).
- **Wrapping each mini-chart in `ResponsiveContainer`:** pulls in a `ResizeObserver` dependency that jsdom (this project's test environment, `vitest.config.ts` → `environment: 'jsdom'`, no setup file) doesn't implement — component tests for the trend row would fail without adding a mock. D-05 already accepts a fixed-width desktop-only row, so give each `ComposedChart` explicit `width`/`height` props instead and skip `ResponsiveContainer` entirely.
- **Letting `ReferenceLine`'s default `ifOverflow="discard"` silently drop a mean line:** if a day's mean sits outside the shared fixed y-domain (D-06), the line vanishes with no error. Either pad the shared domain generously enough to include every day's mean/dots/actual, or set `ifOverflow="visible"` (renders clipped-but-visible at the domain edge) rather than the default.
- **Deriving the 7 trend dates from local date-arithmetic (`Date` subtraction):** unnecessary and risk-prone (timezone/DST edge cases already solved once in Phase 1/2). The forecast API's `daily.time` array (Pattern 1) already returns the correct 7 calendar dates for the pin's local timezone — read them directly.
- **A second archive-API fetch per trend day:** CONTEXT.md is explicit that one archive fetch (already made for the baseline) covers all 7 days — reuse `filterDayOfYearWindow` 7 times against the same fetched series, do not issue new network requests.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dot/strip distribution rendering, mean line overlay | A custom SVG/canvas chart | Recharts `Scatter` + `ReferenceLine` (already the project's chosen chart lib) | Recharts already handles axis scaling, tooltips, and SVG layout; hand-rolling this is exactly the kind of "deceptively complex" problem STACK.md already ruled out for this project |
| Jitter randomness | A jitter library/plugin | A ~5-line deterministic pseudo-random offset function (seeded by index, not `Math.random()` inline) | The transform is trivial; a dependency for it is unjustified per CLAUDE.md's hand-roll philosophy, same reasoning as `simple-statistics` being rejected for the z-score math |
| Usable-data threshold logic | Duplicated inline checks in `AnomalyCard`'s call site and a new trend-row call site | One shared `hasUsableSampleCount(samples, totalYears)` helper in `anomaly.ts`, called from both `computeAnomalyForToday` and the new per-day trend function | D-10 explicitly requires ONE consistent rule; duplicating the threshold logic risks the two call sites silently drifting apart in a future edit |

**Key insight:** every "don't hand-roll" item above is really the same principle already established in Phase 2 (`anomaly.ts` as the single source of truth for anomaly math) extended one phase further — this phase adds a chart-rendering concern on top of an unchanged statistics concern, and should not re-derive statistics logic inside a component.

## Common Pitfalls

### Pitfall 1: ERA5 archive data is (almost) never actually null — ROBU-01's "ocean/remote area" empty state may be hard to trigger with real coordinates
**What goes wrong:** A planner or verifier tries to manually reproduce the "no usable historical data" empty state by picking an ocean or polar coordinate, finds it renders a normal chart, and concludes the empty-state code path is broken.
**Why it happens:** Open-Meteo's archive API serves ERA5 reanalysis, which Open-Meteo's own docs describe as "spatially complete with no missing values" — it's a global model grid, not station data, so it has values even in the open ocean and near the poles. This was independently confirmed by live test calls in this research session: `(lat=0, lng=-140)` (mid-Pacific) and `(lat=-89.9, lng=0)` (near south pole) both returned full, non-null 30-year `temperature_2m_mean` series.
**How to avoid:** Treat D-09/D-10's stricter threshold as a defensive correctness rule (guards against genuine edge cases: partial-response fetch failures, an unexpectedly sparse response, or future Open-Meteo data changes) rather than something that will visibly fire against most real-world pins. For manual/UAT verification of ROBU-01, the reliable way to trigger the empty state is (a) simulating a fetch failure (network throttling/offline, or an invalid/unreachable request), or (b) directly unit-testing `hasUsableSampleCount`/the per-day trend function with a synthetic sparse sample array — not by hunting for a real-world "no data" coordinate.
**Warning signs:** A UAT checkpoint that asks a human to "find an ocean location with no data" and reports back "couldn't find one" — this is expected behavior given the finding above, not a bug.

### Pitfall 2: `ReferenceLine`'s default `ifOverflow="discard"` silently hides out-of-domain lines
**What goes wrong:** The bright mean line for one day is simply absent, with no console warning, no error — easy to miss in code review.
**Why it happens:** Recharts' `ReferenceLine` defaults `ifOverflow` to `"discard"` (confirmed via recharts.github.io/en-US/api/ReferenceLine and the recharts@3.7.0 type definitions) [CITED: recharts.github.io]. Combined with D-06's shared fixed y-domain (computed once across all 7 days), a day whose mean happens to sit right at or outside that shared domain's edge will silently lose its `ReferenceLine`.
**How to avoid:** Compute the shared y-domain (Pattern 3) across ALL 7 days' data with generous padding, and/or set `ifOverflow="visible"` on the `ReferenceLine` so an edge case degrades to "visible but clipped" rather than "invisible."
**Warning signs:** A mini-chart shows dots but no bright mean line for one specific day, while adjacent days look correct.

### Pitfall 3: `ResponsiveContainer` + jsdom + this project's test setup
**What goes wrong:** A `TrendDayChart.test.tsx` (or any component test that mounts a Recharts chart wrapped in `ResponsiveContainer`) throws or silently renders a 0×0 chart in `vitest run`.
**Why it happens:** `ResponsiveContainer` uses `ResizeObserver` to measure its parent; jsdom (this project's configured test environment — `vite.config.ts` → `test.environment: 'jsdom'`, no `setupFiles` entry) does not implement `ResizeObserver`, and there is currently no mock/polyfill anywhere in this codebase.
**How to avoid:** Skip `ResponsiveContainer` for this phase — give each `ComposedChart` explicit `width`/`height` props (D-05 already accepts a fixed-width, desktop-only row, so this is not a UX compromise). If a future phase later needs responsive charts, add a `ResizeObserver` mock in a new `vitest.config.ts` `setupFiles` entry at that time.
**Warning signs:** New chart component tests fail with a `ResizeObserver is not defined` error, or pass but assert against 0-dimension SVGs.

### Pitfall 4: The 360px `location-panel` sidebar is too narrow for 7 side-by-side mini-charts at a readable size
**What goes wrong:** Cramming 7 mini-charts into the existing fixed `flex: 0 0 360px` sidebar (`src/app/App.css`) leaves ~40-45px per chart including gaps — too narrow to show a readable dot/strip distribution.
**Why it happens:** `location-panel` was sized for a single-column stack of text/number content (Phase 1/2 UI-SPEC); this phase is the first to need a genuinely wide horizontal layout element inside it.
**How to avoid:** This is a layout decision within Claude's discretion (CONTEXT.md explicitly defers "exact pixel/spacing/visual polish" to Claude). Two viable directions: (a) widen `location-panel` specifically to accommodate the trend row (the panel already has `overflow-y: auto`, so vertical growth is already handled; horizontal width would need a one-time CSS change), or (b) keep the panel at 360px and make the trend row horizontally scrollable within it (`overflow-x: auto`, each mini-chart at a fixed comfortable width e.g. ~110-140px, users scroll to see all 7). Given D-05/D-06's explicit "compare at a glance" framing, widening the panel is the closer fit to the stated intent, but the planner should make this an explicit decision (with a concrete pixel width) rather than let it fall out implicitly from the existing CSS.
**Warning signs:** A UAT checkpoint where mini-charts are visually indistinguishable from each other, or dot data can't be resolved (too much overplotting at ~40px width).

## Code Examples

### Recent-daily fetch shape (extends `getCurrentWeather`)
```typescript
// src/weather/client.ts — illustrative extension, verified request/response shape
// against the live API 2026-07-15 [VERIFIED: live API call]
const url = new URL('https://api.open-meteo.com/v1/forecast')
url.searchParams.set('latitude', String(lat))
url.searchParams.set('longitude', String(lng))
url.searchParams.set('current', 'temperature_2m')
url.searchParams.set('daily', 'temperature_2m_mean')
url.searchParams.set('past_days', '6')
url.searchParams.set('forecast_days', '1')
url.searchParams.set('timezone', 'auto')
// response.daily.time -> 7 dates oldest-to-today; response.daily.temperature_2m_mean -> 7 values, same order
```

### Reusing `filterDayOfYearWindow` per trend day (no new windowing logic)
```typescript
// src/anomaly/anomaly.ts — illustrative; `daily` is the SAME 30-year archive
// series already fetched once via useHistoricalBaseline (CONTEXT.md's
// efficiency note — no new archive fetch per day)
for (const [dateStr, actualTemp] of recentDaily) {
  const [, month, day] = dateStr.split('-').map(Number)
  const samples = filterDayOfYearWindow(daily, month, day, startYear, endYear)
  const usable = hasUsableSampleCount(samples, endYear - startYear + 1) // D-09/D-10
  // usable ? compute mean/actual/samples for the chart : render D-12 placeholder
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Older web-search guidance recommending a `react-is` override when installing recharts with React 19 | Not needed for recharts 3.9.2 — `peerDependencies` explicitly list `react-is: ^16.8.0 \|\| ^17.0.0 \|\| ^18.0.0 \|\| ^19.0.0` | recharts added React 19 as a first-class peer somewhere before 3.9.2 (exact version not pinpointed in this session) | `npm install recharts` should work without `--legacy-peer-deps` or manual overrides; if it fails, that's a signal something else is wrong, not an expected recharts/React-19 friction point |

**Deprecated/outdated:** none identified specific to this phase's scope beyond the above.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Exact `ComposedChart`/`Scatter`/`ReferenceLine`/`XAxis` prop names and behavior shown in Pattern 2's code block, synthesized from WebFetch summaries of recharts.github.io rather than a live-rendered 3.9.2 build in this session | Architecture Patterns, Code Examples | Low-medium — prop names could have shifted slightly between the fetched docs' version and 3.9.2; recommend the planner's first task include a minimal working spike (render one mini-chart, confirm dots/line/jitter render) before building all 7 days + row layout, to catch any prop-name drift early and cheaply |
| A2 | Recommended deterministic-jitter formula (`0.5 + (seededRandom(i) - 0.5) * 0.6`) is illustrative, not verified against any specific library or prior art — a reasonable but unverified hand-rolled approach | Pattern 2 | Low — purely cosmetic; any monotonic bounded jitter function works equally well, easy to adjust visually during implementation |
| A3 | The recommended `hasUsableSampleCount` threshold rounding (exact half vs. `Math.floor`/`Math.ceil` of `totalYears/2`) is not specified beyond D-09's "at least half" wording | Architecture Patterns, Code Examples | Low — a one-line rounding choice; worth a single explicit test case at the boundary (`totalYears/2` exactly) so the behavior is pinned regardless of which rounding is chosen |

## Open Questions

1. **Where exactly does the trend row live, width-wise?**
   - What we know: D-07 confirms it sits below `AnomalyCard`; CONTEXT.md explicitly defers exact pixel/spacing decisions to Claude.
   - What's unclear: Whether to widen the existing 360px `location-panel` sidebar or make the trend row horizontally scrollable within it (Pitfall 4).
   - Recommendation: Widen the panel for this phase specifically (better matches D-06's "compare at a glance" intent); the planner should pick a concrete pixel width (e.g. panel grows from 360px to ~640-720px, or the trend row breaks out below the full app-shell) as part of task planning, not leave it implicit.

2. **Should `getCurrentWeather`'s response shape change, or should this be a new function?**
   - What we know: Combining `current` + `daily` params into one forecast-API request is verified to work and avoids a second fetch.
   - What's unclear: Whether extending `getCurrentWeather`'s return type (adding an optional `daily` field) is preferable to adding a separate `getRecentDailyTemperatures` function that makes its own (still single, combined-param) request — both achieve "one request," they differ only in code organization.
   - Recommendation: Extend `getCurrentWeather`/`useCurrentWeather` (Recommended Project Structure above) — CONTEXT.md's canonical-refs section explicitly names `getCurrentWeather` as D-13's actual-value source, suggesting the user/discuss-phase already anchored on extending it rather than adding a parallel function.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite build/dev server | ✓ | v24.18.0 | — (satisfies vite@8's `^20.19.0 \|\| >=22.12.0` engines requirement) |
| npm | Package install (`recharts`) | ✓ | 11.16.0 | — |
| Network access to `api.open-meteo.com` | D-13's combined current+daily forecast fetch | ✓ (confirmed via live curl in this research session) | — | — |
| Network access to `archive-api.open-meteo.com` | Baseline fetch (unchanged from Phase 2) | ✓ (confirmed via live curl in this research session) | — | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | No accounts/auth in this app (PLAT-01) |
| V3 Session Management | No | Stateless SPA, no sessions |
| V4 Access Control | No | No privileged operations |
| V5 Input Validation | Yes | All new numeric data (recent-daily temperatures, historical samples, computed jitter/domain values) originates from Open-Meteo API responses already routed through this codebase's existing defensive parsing (`getCurrentWeather`/`getHistoricalBaseline` throw on malformed/missing fields, per Phase 2's established pattern) — extend the same finite-number/array-shape guards to the new `daily` field on the forecast response before it reaches `anomaly.ts` or any chart component |
| V6 Cryptography | No | No secrets/crypto in this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Malformed/partial Open-Meteo `daily` response (e.g. mismatched-length `time`/`temperature_2m_mean` arrays) reaching the chart layer and producing `NaN`/`undefined` y-values, or a Recharts internal crash | Tampering (of a sort — untrusted upstream data) / Denial of Service (client-side crash) | Extend the existing V5 defensive-parsing pattern (`getCurrentWeather`'s current field-existence + `Number.isFinite` checks) to the new `daily.time`/`daily.temperature_2m_mean` fields — reject/throw on length mismatch or non-finite values, same as the archive response is already guarded in `getHistoricalBaseline` |
| Rendering any Open-Meteo-derived string value via a raw-HTML sink (e.g. a custom Recharts label/tooltip renderer using `dangerouslySetInnerHTML`) | Tampering / XSS | None of this phase's data is free-text (all values are numbers/ISO dates) — continue the codebase's existing discipline (`AnomalyCard`'s header comment: "all dynamic text renders as ordinary JSX text nodes only") for any new tooltip/label content in the trend-row components |

No new attack surface is introduced beyond what Phase 2 already established for Open-Meteo response handling — this phase adds a second consumer (the trend row) of the same two already-guarded fetch functions.

## Sources

### Primary (HIGH confidence)
- Live API calls against `api.open-meteo.com/v1/forecast` and `archive-api.open-meteo.com/v1/archive` (2026-07-15) — verified the combined `current`+`daily`+`past_days` request shape, verified ERA5 non-null coverage at ocean and polar test coordinates
- `npm view recharts@3.9.2 peerDependencies` / `dependencies` / `scripts.postinstall` / `time.created` (2026-07-15) — verified React 19 peer support, no postinstall script, package age vs. version-tag age

### Secondary (MEDIUM confidence)
- recharts.github.io official docs pages (`/api/Scatter/`, `/api/ReferenceLine/`, `/api/ScatterChart/`) via WebFetch — prop names, `ifOverflow` default
- recharts-recharts.mintlify.app official composed-chart example via WebFetch
- Open-Meteo historical-weather-api docs page via WebFetch — "ERA5 reanalysis... spatially complete with no missing values"

### Tertiary (LOW confidence)
- WebSearch results summarizing GitHub issues (#5710, #2563 categorical-axis scatter bugs; #2815, #554 shared-domain small-multiples discussion; #1156 ComposedChart+Scatter compatibility question) — community discussion, not official docs; treat the underlying claims as directional, verify exact behavior against the installed 3.9.2 build during implementation (see Assumption A1)
- WebSearch summary re: general empty-state UX pattern for per-item placeholders — generic UX guidance, not project- or library-specific

## Metadata

**Confidence breakdown:**
- Standard stack (recharts version/peer-deps): HIGH — verified live against npm registry
- Open-Meteo request/response shapes: HIGH — verified live against the production API
- Recharts composition patterns (exact JSX/props): MEDIUM — sourced from official docs pages via WebFetch summaries, not independently re-verified against a running 3.9.2 build in this session (see Assumption A1 — recommend an early spike task)
- ROBU-01 empty-state reproducibility finding: MEDIUM-HIGH — corroborated by both live API testing (3 coordinate samples) and Open-Meteo's own documented ERA5 design, but not an exhaustive search of all possible edge-case coordinates
- Pitfalls (ResponsiveContainer/jsdom, ifOverflow default): MEDIUM — cited from official docs/type defs plus direct inspection of this project's own `vite.config.ts`

**Research date:** 2026-07-15
**Valid until:** ~30 days (recharts is a stable, mature library; Open-Meteo API shape is stable; re-verify if `recharts` version pin changes materially before implementation)
