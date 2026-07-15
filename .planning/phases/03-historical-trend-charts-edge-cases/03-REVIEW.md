---
phase: 03-historical-trend-charts-edge-cases
reviewed: 2026-07-15T12:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - src/anomaly/anomaly.test.ts
  - src/anomaly/anomaly.ts
  - src/anomaly/types.ts
  - src/app/App.css
  - src/app/App.tsx
  - src/app/TrendDayChart.test.tsx
  - src/app/TrendDayChart.tsx
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
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-07-15T12:00:00Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Reviewed the anomaly-statistics module, trend-chart composition (App.tsx/TrendRow/TrendDayChart/trend.ts), and the weather fetch client/hooks layer against the stated design intent in the files' own doc comments (D-01..D-14, ANOM-01..04, V5 defensive parsing). `npx tsc --noEmit`, `npx eslint`, and the full Vitest suite (50 tests, 4 files) all pass cleanly, and edge-case coverage (leap-year windowing, year-boundary wraparound, degenerate/zero-variance baselines, sparse-baseline D-10 gating, null/NaN actual temps) is genuinely thorough — this is a well-tested slice.

No crash-risk, injection, or data-loss bugs were found. Two Warning-level issues were found: one is a real contract gap in `client.ts` where the archive fetch's own defensive-parsing claim ("an empty/malformed series must never reach anomaly.ts") is not fully honored — it validates emptiness but not length-parity between `time` and the value series, unlike its sibling `getCurrentWeather`, which does validate this exact case. The other is duplicated day-of-year window-derivation logic between `computeAnomalyForToday` and `computeTrendDay` that undercuts the module's own stated single-source-of-truth goal for keeping "today" and "trend day" calculations from drifting apart.

## Warnings

### WR-01: `getHistoricalBaseline` doesn't validate time/value length-parity, unlike its sibling `getCurrentWeather`

**File:** `src/weather/client.ts:119-129`
**Issue:** `getCurrentWeather` explicitly guards against a malformed forecast response by checking `data.daily.time.length !== data.daily.temperature_2m_mean.length` (line 65) and throwing. `getHistoricalBaseline`'s validation block only checks that `series` is a non-empty array — it never checks `data.daily.time.length === series.length`:

```ts
// src/weather/client.ts:119-129
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

This directly contradicts the function's own doc comment two lines above ("an empty/malformed series must never reach anomaly.ts") and the file's stated "V5 defensive parsing" contract. `useHistoricalBaseline.ts` then does `values: response.daily[variable] as (number | null)[]` with a bare type assertion and no further check, so a truncated/misaligned archive response silently reaches `filterDayOfYearWindow`, which iterates by `time.length` and reads `values[i]` — any length mismatch silently under- or over-runs one of the two parallel arrays rather than raising the loud, distinct error state the module's comments promise. Because the anomaly score's accuracy is this app's stated core value, silently dropping/misaligning baseline samples instead of surfacing a fetch-error state is a real (if low-probability, API-dependent) correctness gap.
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

### WR-02: Day-of-year window derivation is duplicated between `computeAnomalyForToday` and `computeTrendDay`

**File:** `src/anomaly/anomaly.ts:144-174` and `src/anomaly/anomaly.ts:186-227`
**Issue:** The module's own comment on `hasUsableSampleCount` states: "This is the ONLY place the `Math.ceil(totalYears/2)` threshold expression appears... both `computeAnomalyForToday` and `computeTrendDay` call through here so today's anomaly and every trend day can never drift apart." In practice only the threshold *formula* is shared — the window-derivation logic that feeds it (parsing `month`/`day` from the date string, computing `years`/`startYear`/`endYear` from `daily.time`, calling `filterDayOfYearWindow`) is copy-pasted almost verbatim in both functions:

```ts
// repeated in both computeAnomalyForToday (154-168) and computeTrendDay (192-210)
const parts = dateStr.split('-')
const targetMonth = Number(parts[1])
const targetDay = Number(parts[2])
const years = daily.time.map((t) => Number(t.slice(0, 4))).filter((y) => Number.isFinite(y))
if (years.length === 0) return ...
const startYear = Math.min(...years)
const endYear = Math.max(...years)
const samples = filterDayOfYearWindow(daily, targetMonth, targetDay, startYear, endYear, halfWidthDays)
```

Any future change to this derivation (e.g. a different years-detection strategy, a different date-parsing approach) has to be applied in both places by hand, which is exactly the drift risk the surrounding comments call out as unacceptable for this pair of functions.
**Fix:** Extract the shared block into a helper, e.g.:
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

## Info

### IN-01: Unguarded `Date` construction from `dateStr` can throw uncaught in the render path

**File:** `src/app/TrendDayChart.tsx:48` and `src/app/trend.ts:53`
**Issue:** `formatActualTooltip` and `formatSlotLabel` both build `new Date(`${dateStr}T00:00:00Z`)` and immediately call `.toLocaleDateString(...)` with no validation of `dateStr`'s shape. If `dateStr` is ever malformed (an internal invariant violation upstream, not currently reachable from user input), `Date` silently produces an `Invalid Date`, and `toLocaleDateString` throws a `RangeError` synchronously during render with no error boundary in these files to catch it, crashing the trend row.
**Fix:** Not urgent given current callers always pass validated ISO date strings, but worth a defensive check or an app-level error boundary around `TrendRow` given a single malformed day would otherwise take down the whole panel:
```ts
const date = new Date(`${dateStr}T00:00:00Z`)
if (Number.isNaN(date.getTime())) return dateStr // or a safe fallback label
```

### IN-02: `.location-panel` has a fixed 720px width with no responsive fallback

**File:** `src/app/App.css:21-24`
**Issue:** `.location-panel { flex: 0 0 720px; width: 720px; }` combined with `.map-region { flex: 1 1 auto; min-width: 0; }` means on any viewport narrower than roughly 720px + a usable map width, the map region is squeezed toward zero width while the panel stays fixed. There's no media query or `max-width: 100%` fallback anywhere in the file for narrow viewports.
**Fix:** Add a breakpoint, e.g. `@media (max-width: 900px) { .location-panel { flex-basis: 100%; width: 100%; } .app-shell { flex-direction: column; } }`, if narrow-viewport support is in scope for this milestone.

### IN-03: `formatActualTooltip` silently drops the unit suffix when `units` is null

**File:** `src/app/TrendDayChart.tsx:56`
**Issue:** `` `${monthDay} — ${roundedActual}°${units ?? ''} (${delta}° vs. 30-yr avg)` `` falls back to an empty string when `units` is null, producing a tooltip like "Jul 14 — 21° (+3° vs. 30-yr avg)" with a dangling degree symbol and no unit letter, rather than omitting the unit cleanly or falling back to a sensible default (e.g. `'C'`).
**Fix:** Either guard the call site so `TrendDayChart` isn't rendered with usable days before `units` resolves, or fall back explicitly: `units ?? 'C'`.

---

_Reviewed: 2026-07-15T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
