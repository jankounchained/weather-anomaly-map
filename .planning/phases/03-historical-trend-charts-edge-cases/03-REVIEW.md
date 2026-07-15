---
phase: 03-historical-trend-charts-edge-cases
reviewed: 2026-07-15T00:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - src/anomaly/anomaly.test.ts
  - src/anomaly/anomaly.ts
  - src/anomaly/types.ts
  - src/app/App.css
  - src/app/App.tsx
  - src/app/TrendDayChart.test.tsx
  - src/app/TrendDayChart.tsx
  - src/app/TrendLegend.test.tsx
  - src/app/TrendLegend.tsx
  - src/app/TrendRow.tsx
  - src/app/trend.test.ts
  - src/app/trend.ts
  - src/index.css
  - src/weather/client.test.ts
  - src/weather/client.ts
  - src/weather/types.ts
  - src/weather/useCurrentWeather.ts
findings:
  critical: 0
  warning: 5
  info: 3
  total: 8
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-07-15T00:00:00Z
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

This review supersedes the prior 03-REVIEW.md and reflects the current state of the tree after the 03-05 (leftmost-tile squish + legend) and 03-06 (re-verify checkpoint) gap-closure work: the new `TrendLegend.tsx`/`TrendLegend.test.tsx` and the `TrendYAxisColumn` export inside `TrendDayChart.tsx`. No crash-risk, injection, or data-loss bug was found on any code path reachable from real user input — `fetch` targets are always literal HTTPS hosts, lat/lng are always numeric, and no raw-HTML sink exists anywhere in the reviewed React tree.

However, two Warning-level findings from the prior review were **not actually fixed** by the 03-05/03-06 work (`getHistoricalBaseline`'s missing length-parity check, and the duplicated day-of-year window-derivation logic between `computeAnomalyForToday`/`computeTrendDay`) and are carried forward below with their original evidence re-verified against the current file contents. In addition, the gap-closure pass itself introduced/left two new gaps: it patched only one of the two call sites the original IN-01 finding named (`formatActualTooltip` in `TrendDayChart.tsx`, but not `formatSlotLabel` in `trend.ts`), and it shipped the new `TrendRow`/`TrendYAxisColumn` composition with zero test coverage (no `TrendRow.test.tsx` exists anywhere in the tree).

## Warnings

### WR-01: `getHistoricalBaseline` still doesn't validate time/value length-parity (carried forward, unfixed)

**File:** `src/weather/client.ts:119-129`
**Issue:** `getCurrentWeather` explicitly guards against a malformed forecast response by checking `data.daily.time.length !== data.daily.temperature_2m_mean.length` (line 65) and throwing. `getHistoricalBaseline`'s validation block still only checks that `series` is a non-empty array — it never checks `data.daily.time.length === series.length`:

```ts
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

This still contradicts the function's own doc comment ("an empty/malformed series must never reach anomaly.ts") and the file's stated "V5 defensive parsing" contract. `useHistoricalBaseline.ts` does `values: response.daily[variable] as (number | null)[]` with a bare type assertion and no further check, so a truncated/misaligned archive response silently reaches `filterDayOfYearWindow`, which iterates by `time.length` and reads `values[i]` — any length mismatch silently misaligns the two parallel arrays instead of raising the loud, distinct error state the module's comments promise. This directly touches the anomaly score's accuracy, the app's stated core value.
**Fix:**
```ts
if (
  !data.daily ||
  !Array.isArray(data.daily.time) ||
  data.daily.time.length === 0 ||
  !Array.isArray(series) ||
  series.length === 0 ||
  series.length !== data.daily.time.length
) {
  throw new Error('archive fetch failed: empty or malformed daily series')
}
```
Also add a `client.test.ts` case mirroring the existing "mismatched lengths (7 vs 6)" test already present for `getCurrentWeather`.

### WR-02: Day-of-year window derivation is still duplicated between `computeAnomalyForToday` and `computeTrendDay` (carried forward, unfixed)

**File:** `src/anomaly/anomaly.ts:144-174` and `src/anomaly/anomaly.ts:186-227`
**Issue:** The module's own comment on `hasUsableSampleCount` states this is "the ONLY place the `Math.ceil(totalYears/2)` threshold expression appears... both `computeAnomalyForToday` and `computeTrendDay` call through here so today's anomaly and every trend day can never drift apart." In practice only the threshold *formula* is shared — the window-derivation logic that feeds it is still copy-pasted verbatim in both functions:

```ts
const parts = dateStr.split('-')
const targetMonth = Number(parts[1])
const targetDay = Number(parts[2])
const years = daily.time.map((t) => Number(t.slice(0, 4))).filter((y) => Number.isFinite(y))
if (years.length === 0) return ...
const startYear = Math.min(...years)
const endYear = Math.max(...years)
const samples = filterDayOfYearWindow(daily, targetMonth, targetDay, startYear, endYear, halfWidthDays)
```

Any future change to this derivation (different years-detection strategy, different date parsing) must be applied by hand in both places — exactly the drift risk the surrounding comments call out as unacceptable.
**Fix:** Extract a shared helper:
```ts
function deriveWindowSamples(
  daily: { time: string[]; values: (number | null)[] },
  dateStr: string,
  halfWidthDays: number,
): { samples: number[]; totalYears: number } | null {
  const parts = dateStr.split('-')
  const targetMonth = Number(parts[1])
  const targetDay = Number(parts[2])
  const years = daily.time.map((t) => Number(t.slice(0, 4))).filter((y) => Number.isFinite(y))
  if (years.length === 0) return null
  const startYear = Math.min(...years)
  const endYear = Math.max(...years)
  const samples = filterDayOfYearWindow(daily, targetMonth, targetDay, startYear, endYear, halfWidthDays)
  return { samples, totalYears: endYear - startYear + 1 }
}
```
and have both `computeAnomalyForToday` and `computeTrendDay` call it, then apply `hasUsableSampleCount(samples, totalYears)` on the result.

### WR-03: `formatSlotLabel` still lacks the malformed-`dateStr` guard the original IN-01 named it for — the gap-closure fix was incomplete

**File:** `src/app/trend.ts:51-58`
**Issue:** The prior review's IN-01 finding explicitly named **two** call sites needing a guard against `Invalid Date` crashing the render: `src/app/TrendDayChart.tsx:48` (`formatActualTooltip`) and `src/app/trend.ts:53` (`formatSlotLabel`). The gap-closure comment atop `TrendDayChart.tsx` claims: *"formatActualTooltip also gained two defensive guards (03-REVIEW.md IN-01/IN-03)"* — and indeed `formatActualTooltip` was fixed (line 68 now checks `Number.isNaN(date.getTime())`). But `formatSlotLabel` in `trend.ts` was left completely unguarded:
```ts
export function formatSlotLabel(dateStr: string, isToday: boolean): string {
  if (isToday) return 'Today'
  const date = new Date(`${dateStr}T00:00:00Z`)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  })
}
```
`dateStr` here comes from `current.recentDaily.time[i]`, which `client.ts` only validates as "an array of the right length" — it never validates that each element is a well-formed date string. If Open-Meteo (or any future data source) ever returns a malformed entry in that array, `toLocaleDateString` throws a `RangeError` synchronously during render, and there is no error boundary anywhere in the reviewed tree to catch it — the whole `TrendRow` (and everything below it in `LocationPanel`) would go down. `trend.test.ts`'s `formatSlotLabel` tests only exercise valid dates, so this gap has no regression test either.
**Fix:** Apply the identical guard already proven in `TrendDayChart.tsx`:
```ts
export function formatSlotLabel(dateStr: string, isToday: boolean): string {
  if (isToday) return 'Today'
  const date = new Date(`${dateStr}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
}
```

### WR-04: New `TrendRow`/`TrendYAxisColumn` composition — the exact subject of the 03-05 gap closure — has zero test coverage

**File:** `src/app/TrendRow.tsx` (whole file), `src/app/TrendDayChart.tsx:200-227` (`TrendYAxisColumn`)
**Issue:** There is no `TrendRow.test.tsx` anywhere in the repository (confirmed by directory search). `TrendRow.tsx` is the component that:
- computes the shared y-domain once (`computeSharedYDomain(days)`),
- decides which slot is "today" (`isToday={index === days.length - 1}`),
- renders the new `TrendYAxisColumn` (also untested directly — `TrendDayChart.test.tsx` only exercises `TrendDayChart`, never the `TrendYAxisColumn` export it sits beside),
- and renders `TrendLegend`.

This is precisely the composition the 03-05/03-06 gap-closure plans were about (VIZ-02 Gap 1: shared axis; VIZ-02 Gap 2: legend), yet none of the wiring — the `days === null || days.length === 0` early return, the `isToday` index math, the axis/tile domain-sharing, or the fact that `TrendYAxisColumn` renders a `ComposedChart` with an intentionally-empty `Scatter` data array — is verified by any automated test. A regression here (e.g. an off-by-one on `isToday`, or a future Recharts upgrade that stops tolerating an empty-data Scatter with an explicit domain) would not be caught by the existing suite.
**Fix:** Add `src/app/TrendRow.test.tsx` covering at minimum:
```ts
it('renders null when days is null or empty', () => { ... })
it('marks the last day isToday and every other day not-today', () => { ... })
it('renders TrendYAxisColumn once and 7 TrendDayChart tiles for a 7-day input', () => { ... })
```
and a direct render test for `TrendYAxisColumn` alone (mirrors the existing `TrendDayChart.test.tsx` pattern) asserting it renders an `<svg>` without throwing for a representative `yDomain`.

### WR-05: `TrendLegend`'s `role="list"` container has no `role="listitem"` children — invalid ARIA list structure

**File:** `src/app/TrendLegend.tsx:22-36, 40`
**Issue:** The outer container declares `role="list"` (`<div className="trend-legend" role="list" aria-label="Trend chart legend">`), but `TrendLegendItem` renders each entry as a plain `<div className="trend-legend__item">` with no `role="listitem"`. Per the ARIA-in-HTML spec, a `list` role's required owned elements are `listitem` (or nested `group`/`list`); without them, assistive technology may not announce the legend as a list at all, or may announce an inconsistent/empty list, undermining the a11y intent the surrounding code comments explicitly call out (native SVG marks, `aria-hidden` swatches, explicit `aria-label`).
**Fix:**
```tsx
function TrendLegendItem({ label, swatch }: TrendLegendItemProps) {
  return (
    <div className="trend-legend__item" role="listitem">
      ...
```

## Info

### IN-01: `computeAnomaly` returns a `NaN` delta for an empty baseline array — no defensive guard or test

**File:** `src/anomaly/anomaly.ts:25-34`
**Issue:** `computeAnomaly(today, [])` calls `mean([])`, which is `0/0 = NaN`; `delta = today - NaN` is `NaN`, while `zScore` correctly resolves to `null` (since `sampleStdDev([])` returns `0`). The result `{ delta: NaN, zScore: null }` is a silent NaN leak from an otherwise carefully NaN/Infinity-averse module (per its own "Pitfall 2" comments). Not currently reachable from either production caller — both `computeAnomalyForToday` and `computeTrendDay` gate on `hasUsableSampleCount` before calling `computeAnomaly`, which always requires at least 1 sample — but `computeAnomaly` is exported and unit-tested directly, and none of its tests exercise the empty-array case (`mean`'s own test suite doesn't cover `mean([])` either).
**Fix:** Either guard `computeAnomaly` explicitly for the empty-baseline case, or document the precondition and add a unit test asserting the current behavior so a future refactor can't silently change it unnoticed.

### IN-02: `.location-panel` still has a fixed pixel width with no responsive fallback (carried forward)

**File:** `src/app/App.css:21-34`
**Issue:** `.location-panel { flex: 0 0 760px; width: 760px; }` combined with `.map-region { flex: 1 1 auto; min-width: 0; }` means on any viewport narrower than roughly 760px + a usable map width, the map region is squeezed toward zero. There is still no media query or narrow-viewport fallback anywhere in the stylesheet (the 03-05 gap closure only changed the fixed width from 720px to 760px to fit the new axis column — it did not add responsiveness).
**Fix:** Add a breakpoint if narrow-viewport support is in scope, e.g. `@media (max-width: 900px) { .app-shell { flex-direction: column; } .location-panel { flex-basis: auto; width: 100%; } }`.

### IN-03: Y-axis tick styling and tile pixel dimensions are duplicated with no shared source

**File:** `src/app/TrendDayChart.tsx:164-171, 217-223`; `src/app/App.css:272, 294-295`
**Issue:** The `tick={{ fill: 'var(--color-muted)', fontSize: 14 }}` object passed to `YAxis` is written out twice — once in `TrendDayChart` and once in `TrendYAxisColumn` — with no shared constant, so the two axes (real per-tile axis vs. the new shared column) can silently drift in appearance if only one is edited. Separately, `CHART_WIDTH = 88` / `CHART_HEIGHT = 120` in `TrendDayChart.tsx` duplicate the `width: 88px` / `height: 120px` values hardcoded independently in `App.css`'s `.trend-day` and `.trend-day__placeholder` rules, with no single source of truth tying the JS chart dimensions to the CSS layout dimensions they must match pixel-for-pixel.
**Fix:** Hoist a shared `const AXIS_TICK_STYLE = { fill: 'var(--color-muted)', fontSize: 14 }` and reuse it in both `YAxis` elements. For the CSS/TS dimension duplication, consider driving the CSS via a CSS custom property set once (e.g. `--trend-tile-width: 88px`) that both the stylesheet and (if ever needed) inline styles reference, rather than two independently-maintained magic numbers.

---

_Reviewed: 2026-07-15T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
