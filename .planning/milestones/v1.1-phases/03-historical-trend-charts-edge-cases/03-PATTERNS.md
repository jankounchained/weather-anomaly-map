# Phase 3: Historical Trend Charts & Edge Cases - Pattern Map

**Mapped:** 2026-07-15
**Files analyzed:** 8 (2 modified core, 1 modified type, 1 modified hook, 3 new components, 1 modified test)
**Analogs found:** 8 / 8 (all have a same-codebase analog; recharts composition itself has no in-repo analog, RESEARCH.md Pattern 2/3 fills that gap)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/weather/client.ts` (`getCurrentWeather`, modified) | service | request-response | itself (existing function, extend in place) | exact |
| `src/weather/types.ts` (`CurrentWeatherResponse`, modified) | model | transform | itself / `ArchiveDailyResponse` in same file | exact |
| `src/weather/useCurrentWeather.ts` (modified) | hook | request-response | itself / `useHistoricalBaseline.ts` | exact |
| `src/anomaly/anomaly.ts` (`hasUsableSampleCount` + retrofit, modified) | utility | transform | itself (`filterDayOfYearWindow`, `computeAnomalyForToday`) | exact |
| `src/anomaly/anomaly.test.ts` (modified) | test | transform | itself (existing describe blocks) | exact |
| `src/app/AnomalyCard.tsx` (D-10 touch only, no UI change) | component | request-response | itself (no structural change needed) | exact |
| `src/app/TrendRow.tsx` (new) | component | transform | `src/app/LocationPanel.tsx` (composition/layout shell) + `src/app/App.tsx` (data-derivation-then-compose pattern) | role-match |
| `src/app/TrendDayChart.tsx` (new) | component | request-response (render-only, no fetch) | `src/app/AnomalyCard.tsx` (sequential early-return states) | role-match |

## Pattern Assignments

### `src/weather/client.ts` — `getCurrentWeather` (service, request-response)

**Analog:** itself, lines 18-54, plus `getHistoricalBaseline`'s defensive-parsing style (lines 75-115)

**Core pattern to extend** (add params, extend validation) — current shape, lines 23-54:
```typescript
export async function getCurrentWeather(
  lat: number,
  lng: number,
): Promise<CurrentWeatherResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), CURRENT_TIMEOUT_MS)
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.searchParams.set('latitude', String(lat))
    url.searchParams.set('longitude', String(lng))
    url.searchParams.set('current', 'temperature_2m')
    url.searchParams.set('timezone', 'auto')
    // ADD per D-13/RESEARCH Pattern 1:
    // url.searchParams.set('daily', 'temperature_2m_mean')
    // url.searchParams.set('past_days', '6')
    // url.searchParams.set('forecast_days', '1')

    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) {
      throw new Error(`forecast fetch failed: ${res.status}`)
    }

    const data = (await res.json()) as CurrentWeatherResponse
    if (
      !data.current ||
      typeof data.current.temperature_2m !== 'number' ||
      !Number.isFinite(data.current.temperature_2m)
    ) {
      throw new Error('forecast fetch failed: missing temperature_2m')
    }
    // ADD analogous V5 guard for data.daily (mirror getHistoricalBaseline's
    // array-length + non-empty checks at lines 100-109): reject on missing
    // daily.time/daily.temperature_2m_mean or on mismatched array lengths.

    return data
  } finally {
    clearTimeout(timeoutId)
  }
}
```

**Defensive-parsing pattern to mirror for the new `daily` field** (from `getHistoricalBaseline`, lines 99-110):
```typescript
const data = (await res.json()) as ArchiveDailyResponse
const series = data.daily?.[variable]
if (
  !data.daily ||
  !Array.isArray(data.daily.time) ||
  data.daily.time.length === 0 ||
  !Array.isArray(series) ||
  series.length === 0
) {
  throw new Error('archive fetch failed: empty or missing daily series')
}
```
Apply the same shape check to the new `daily.time`/`daily.temperature_2m_mean` fields in `getCurrentWeather`, plus a length-match check between the two arrays (RESEARCH.md Security Domain V5 threat pattern).

**Error handling pattern:** throw (never return null/undefined/NaN) on malformed data — consistent across both existing functions in this file; keep for the new `daily` field.

---

### `src/weather/types.ts` — `CurrentWeatherResponse` extension (model, transform)

**Analog:** itself, lines 6-22 (`CurrentWeatherResponse`) and `ArchiveDailyResponse`, lines 42-49 (optional/dynamic daily shape)

**Pattern — add an optional `daily` field mirroring `ArchiveDailyResponse`'s shape** (lines 42-49):
```typescript
export interface ArchiveDailyResponse {
  utc_offset_seconds?: number
  timezone?: string
  daily: {
    time: string[]
    [variable: string]: string[] | (number | null)[]
  }
}
```
`CurrentWeatherResponse` should gain a structurally similar optional `daily: { time: string[]; temperature_2m_mean: (number | null)[] }` field (RESEARCH.md Recommended Project Structure). Also extend `UseCurrentWeatherResult` (lines 30-35) with a `recentDaily: { time: string[]; values: (number | null)[] } | null` field, mirroring `DailySeries` (lines 51-57) exactly — reuse the `DailySeries` type rather than inventing a new one.

---

### `src/weather/useCurrentWeather.ts` (hook, request-response)

**Analog:** itself (lines 1-80) — same file, extend the existing `.then` continuation; also mirror `useHistoricalBaseline.ts`'s `DailySeries`-shaped resolved field (lines 49-57).

**Core pattern — `.then` continuation to extend** (lines 44-53):
```typescript
getCurrentWeather(lat, lng)
  .then((response) => {
    if (cancelled || requestIdRef.current !== requestId) return
    setResolved({
      lat,
      lng,
      tempC: response.current.temperature_2m,
      localDate: localDateFrom(response.current.time),
      units: response.current_units.temperature_2m,
      // ADD: recentDaily: response.daily
      //   ? { time: response.daily.time, values: response.daily.temperature_2m_mean }
      //   : null,
    })
  })
  .catch(() => {
    if (cancelled || requestIdRef.current !== requestId) return
    setResolved({ lat, lng, tempC: null, localDate: null, units: null /* , recentDaily: null */ })
  })
```
Extend `ResolvedWeather` (lines 14-20) and both return branches (idle at lines 65-67, resolved at lines 68-75) with the new field, exactly as `useHistoricalBaseline.ts` shapes its `daily: DailySeries | null` field (lines 16-21, 52-57).

---

### `src/anomaly/anomaly.ts` — `hasUsableSampleCount` (utility, transform)

**Analog:** itself — `sampleStdDev`'s guard-then-compute shape (lines 14-20) and `computeAnomalyForToday`'s call-site gate (line 149) are the direct patterns to extend.

**Pattern — new shared helper, matching this file's existing doc-comment + pure-function style** (lines 7-20 style):
```typescript
/** Sample standard deviation (n-1 denominator, matches spreadsheet STDEV.S)
 * - ANOM-04, Pitfall 3. Returns 0 for fewer than 2 samples (guard). */
export function sampleStdDev(values: number[]): number {
  if (values.length < 2) return 0
  const m = mean(values)
  const variance =
    values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}
```
New helper (D-09/D-10, RESEARCH.md "Don't Hand-Roll" table): `hasUsableSampleCount(samples: number[], totalYears: number): boolean` — returns `samples.length >= Math.ceil(totalYears / 2)` (or equivalent explicit rounding choice, pin with a boundary test per RESEARCH Assumption A3). Add right after `filterDayOfYearWindow` (before line 119), since it consumes that function's output shape.

**Retrofit call site** (`computeAnomalyForToday`, line 149):
```typescript
if (samples.length < 2) return null
```
becomes:
```typescript
if (!hasUsableSampleCount(samples, endYear - startYear + 1)) return null
```
`startYear`/`endYear` are already computed above (lines 134-139) — reuse them, do not recompute.

**New trend-day function** (same file, new export) should follow `computeAnomalyForToday`'s exact structure (lines 124-154: derive month/day from a date string → derive year range from `daily.time` → call `filterDayOfYearWindow` → gate on `hasUsableSampleCount` → return a result object or `null`), but return the fuller shape needed for charting (`samples`, `mean`, `actual`, plus the existing `delta`/`zScore`/`verdictTier` if reused) rather than just delta/verdict.

---

### `src/anomaly/anomaly.test.ts` (test, transform)

**Analog:** itself — existing `describe('computeAnomalyForToday', …)` block (lines 127-165) is the template for new `describe('hasUsableSampleCount', …)` and any new trend-day-function test block.

**Pattern to mirror** (boundary-case test style, lines 51-58 `classifyVerdict` boundary tests + lines 146-155 degenerate-baseline test):
```typescript
it('classifies the D-05 boundary cases correctly', () => {
  expect(classifyVerdict(0.49)).toBe('typical')
  expect(classifyVerdict(0.5)).toBe('slightly-warmer')
  ...
})
```
Apply the same "exact boundary ± 1" style to `hasUsableSampleCount` per RESEARCH Assumption A3 (test `totalYears/2` exactly and `totalYears/2 - 1`). Also add a regression test asserting `computeAnomalyForToday` now rejects a 2-sample baseline out of e.g. 30 years (previously accepted under the old `< 2` gate, per D-10) — extend the existing `describe('computeAnomalyForToday', …)` block rather than creating a new one.

---

### `src/app/AnomalyCard.tsx` (component, request-response — D-10 touch only)

**Analog:** itself — no structural/UI change required. The only change flowing into this file is that `anomaly` (passed as a prop from `App.tsx`) will now be `null` in more cases (stricter threshold) — the existing error branch (lines 55-63) already handles `anomaly === null` correctly. **No edit to AnomalyCard.tsx's own code is expected**; verify this assumption during planning (RESEARCH.md/CONTEXT.md's "touched only for the D-10 threshold retrofit" language refers to the retrofit happening in `anomaly.ts`, consumed transitively).

---

### `src/app/TrendRow.tsx` (new component, transform)

**Analog:** `src/app/LocationPanel.tsx` (composition-shell pattern, lines 1-20) for how a parent composes children with minimal logic; `src/app/App.tsx` (lines 40-47) for the "derive data before render, pass down as props" pattern.

**Composition-shell pattern to mirror** (`LocationPanel.tsx`, full file):
```typescript
import type { ReactNode } from 'react'
import { LocationDisplay, type LocationDisplayProps } from './LocationDisplay'

export interface LocationPanelProps extends LocationDisplayProps {
  children?: ReactNode
}

export function LocationPanel({ children, ...props }: LocationPanelProps) {
  return (
    <aside className="location-panel">
      <div className="location-panel__content">
        <LocationDisplay {...props} />
        {children}
      </div>
    </aside>
  )
}
```
`TrendRow` should take a props shape analogous to `AnomalyCardProps` (hasSelection/status/data — `AnomalyCard.tsx` lines 13-21), compute the 7 per-day results + `computeSharedYDomain` (RESEARCH.md Pattern 3) internally or receive them pre-computed from `App.tsx` (mirroring how `App.tsx` currently pre-computes `anomaly` at lines 40-47 before passing it down as a prop, rather than letting `AnomalyCard` compute it) — **prefer computing in `App.tsx` and passing down**, consistent with existing project convention that presentational components (`AnomalyCard`) receive already-derived data, not raw hook results.

**Data-derivation-before-render pattern to mirror** (`App.tsx`, lines 40-47):
```typescript
const anomaly =
  current.status === 'resolved' &&
  baseline.status === 'resolved' &&
  baseline.daily &&
  current.localDate != null &&
  current.tempC != null
    ? computeAnomalyForToday(baseline.daily, current.localDate, current.tempC)
    : null
```
`App.tsx` should similarly derive an array of 7 per-day trend results (loop over `current.recentDaily.time`, calling the new `anomaly.ts` trend function against `baseline.daily`) before rendering `<TrendRow>`.

---

### `src/app/TrendDayChart.tsx` (new component, request-response/render-only)

**Analog:** `src/app/AnomalyCard.tsx`'s sequential early-return branching (lines 30-89) — same idle/loading/error/resolved shape applies per-day, but simplified since data is already resolved by the time `TrendRow` renders (no per-chart async state — `TrendDayChart` just branches on `usable: boolean`).

**Sequential early-return pattern to mirror** (`AnomalyCard.tsx`, lines 31-63 structure, adapted):
```typescript
if (!hasSelection) {
  return (/* empty state markup */)
}
if (currentStatus !== 'resolved' || baselineStatus !== 'resolved') {
  return (/* loading state markup, role="status" */)
}
if (tempC === null || anomaly === null) {
  return (/* error state markup */)
}
return (/* resolved markup */)
```
`TrendDayChart` should follow the same two-branch minimum: `!usable` (D-12/D-14 placeholder — "Not enough history for this day", one code path per D-14) vs. the resolved `ComposedChart` (RESEARCH.md Pattern 2). No loading/error branches needed inside `TrendDayChart` itself (parent `TrendRow`/`App.tsx` already gates on both hooks being `'resolved'` before rendering the row at all, mirroring the combined-gate comment at `AnomalyCard.tsx` lines 41-44).

**No raw-HTML sink discipline** (`AnomalyCard.tsx` file header comment, lines 6-8): "All dynamic text ... renders as ordinary JSX text nodes only - never through a raw-HTML sink" — apply identically to any tooltip/label text in `TrendDayChart`.

**Recharts composition (no in-repo analog — first chart in codebase)**, use RESEARCH.md Pattern 2 verbatim as the starting point, verify prop names against the installed 3.9.2 build (RESEARCH.md Assumption A1 — recommend an early spike):
```typescript
<ComposedChart width={W} height={H}>
  <XAxis type="number" dataKey="x" domain={[0, 1]} hide />
  <YAxis type="number" dataKey="y" domain={sharedYDomain} />
  <Scatter data={jitteredHistoricalPoints} fill="rgba(37, 99, 235, 0.25)" shape="circle" />
  <Scatter data={[actualPoint]} fill="#dc2626" shape="diamond" />
  <ReferenceLine y={meanValue} stroke="#2563eb" strokeWidth={2} ifOverflow="visible" />
</ComposedChart>
```
Do NOT wrap in `ResponsiveContainer` (Pitfall 3 — no `ResizeObserver` in jsdom test env); use explicit `width`/`height` props instead.

---

## Shared Patterns

### Status contract (`'idle' | 'loading' | 'resolved'`)
**Source:** `src/weather/types.ts` lines 24-25 (`WeatherStatus`), reused identically in `useCurrentWeather.ts` and `useHistoricalBaseline.ts`
**Apply to:** No new status type needed this phase — `TrendRow`/`TrendDayChart` consume already-resolved data (no new async hook), so they use plain booleans (`usable`), not a new status enum. Do not invent a fourth status value.

### requestIdRef + cancelled-flag stale-response guard
**Source:** `src/weather/useCurrentWeather.ts` lines 37, 41-42, 60-63 (and identical shape in `useHistoricalBaseline.ts` lines 39, 43-44, 64-66)
**Apply to:** Only relevant if `getCurrentWeather`'s extended request needs a new dedicated hook (RESEARCH.md Open Question 2 recommends extending `useCurrentWeather` in place instead — no new hook, so this pattern is inherited for free, not newly applied).

### Defensive parsing / throw-not-null on malformed API data
**Source:** `src/weather/client.ts` lines 42-48 (`getCurrentWeather`) and lines 100-109 (`getHistoricalBaseline`)
**Apply to:** The extended `getCurrentWeather`'s new `daily` field — same throw-on-malformed discipline, no silent null/NaN propagation into `anomaly.ts` or chart components (RESEARCH.md Security Domain V5).

### Sequential early-return component states
**Source:** `src/app/AnomalyCard.tsx` lines 30-89
**Apply to:** `TrendDayChart.tsx`'s usable/unusable branching (simplified — no loading/error branch needed at this level, see above).

### Doc-comment style (rationale + requirement IDs in JSDoc above each export)
**Source:** consistent across `src/anomaly/anomaly.ts`, `src/weather/client.ts`, `src/weather/useHistoricalBaseline.ts` — every exported function has a `/** ... */` block citing the relevant requirement ID (ANOM-XX, CURR-01, D-XX) and any relevant "Pitfall N" cross-reference.
**Apply to:** All new/modified exports this phase — `hasUsableSampleCount`, the new trend-day function, `TrendRow`, `TrendDayChart` should each get a doc comment citing D-09/D-10/D-11/D-12/D-13/D-14/VIZ-01/VIZ-02/ROBU-01 as applicable, matching this codebase's established documentation density.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Recharts `ComposedChart`/`Scatter`/`ReferenceLine` composition itself | component (rendering primitive usage) | transform | First chart library usage in this codebase — no prior Recharts code exists to copy from. RESEARCH.md Pattern 2/3 and Code Examples sections are the best available reference (MEDIUM confidence, verify against installed 3.9.2 build per Assumption A1). |
| `App.css` layout widening for the trend row (Pitfall 4 — 360px panel too narrow) | config (CSS) | — | No existing wide-row/horizontal-scroll pattern in `App.css` to copy; this is a net-new layout decision (RESEARCH.md Open Question 1 recommends widening `location-panel`, a concrete pixel width is Claude's discretion per CONTEXT.md). |

## Metadata

**Analog search scope:** `src/` (all 22 source files read/grepped; full directory listing enumerated via `find src -type f`)
**Files scanned:** 12 read in full (client.ts, types.ts, useCurrentWeather.ts, useHistoricalBaseline.ts, anomaly.ts, anomaly.test.ts, AnomalyCard.tsx, App.tsx, App.css, LocationPanel.tsx, client.test.ts) + CONTEXT.md/RESEARCH.md
**Pattern extraction date:** 2026-07-15
