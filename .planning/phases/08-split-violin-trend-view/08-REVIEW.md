---
phase: 08-split-violin-trend-view
reviewed: 2026-07-23T11:46:48Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - src/anomaly/anomaly.ts
  - src/anomaly/anomaly.test.ts
  - src/anomaly/kde.ts
  - src/anomaly/kde.test.ts
  - src/anomaly/types.ts
  - src/app/trend.ts
  - src/app/trend.test.ts
  - src/app/TrendDayChart.tsx
  - src/app/TrendDayChart.test.tsx
  - src/app/TrendRow.tsx
  - src/app/TrendRow.test.tsx
  - src/app/TrendLegend.tsx
  - src/app/TrendLegend.test.tsx
  - src/index.css
findings:
  critical: 0
  warning: 6
  info: 2
  total: 8
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-07-23T11:46:48Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Reviewed the hand-rolled Gaussian KDE + Silverman bandwidth module (`kde.ts`), the split-violin SVG
path geometry (`trend.ts`'s `buildViolinPaths`), the Recharts custom-shape tile render
(`TrendDayChart.tsx`), and the rebuilt legend (`TrendLegend.tsx`), plus their tests and `index.css`.

The three areas the task called out for special attention checked out clean:

- **The previously-fixed "bowtie" path-anchor bug is genuinely fixed.** `halfPath` in `trend.ts`
  opens at `bottom → edge → top → Z`, matching `kdeCurve`'s ascending-domain point order (`edge[0]`
  sits at `y(min)`, `edge[last]` at `y(max)`); the in-code comment correctly documents why the
  reversed order was a bug. The `trend.test.ts` mirror-image test also verifies this geometrically.
- **The Recharts y-scale alignment is correct.** Verified against `node_modules/recharts` source:
  `ComposedChart` → `CartesianChart` really does default to `{top:5,right:5,bottom:5,left:5}`
  (`CartesianChart.js`), and `selectYAxisRange` for `layout:'horizontal'` really does map
  `domain[0]` (yMin) → bottom pixel and `domain[1]` (yMax) → top pixel — exactly what
  `TrendDayChart.tsx`'s `yFromValue` and `trend.ts`'s internal `y()` closure both assume. The
  diamond (Recharts-scale-driven) and the violin/mean-tick marks (precomputed) will land on the
  same pixel row.
- **No raw-HTML sink anywhere in `TrendLegend.tsx`** (or the other reviewed files) — every label is
  a JSX text node or a native SVG element; no `dangerouslySetInnerHTML`/`innerHTML`/`eval`. T-03-07
  holds.

No BLOCKER-severity issues were found. The findings below are all robustness/maintainability gaps:
mostly places where the code's own stated discipline (guard every non-finite value before it can
reach a template string; keep exactly one definition of a shared formula/threshold) isn't fully
applied to a couple of spots that were added or touched in this phase.

## Warnings

### WR-01: Unguarded `mean()` call can produce a "−NaN" string in the actual-value tooltip

**File:** `src/app/TrendDayChart.tsx:308`
**Issue:** `combinedMean = mean([...day.recentSamples, ...day.priorSamples])` is called without
checking that the concatenation is non-empty. `computeTrendDay`'s `usable:true` gate
(`hasUsableSampleCount`, `anomaly.ts:243-248`) is evaluated over the *full* `startYear..endYear`
window derived from `daily.time`, not specifically over the 30-year rolling
`recentStart-25..endYear` window that `recentSamples`/`priorSamples` actually use
(`anomaly.ts:339-358`). For a `daily` series whose in-window samples are unevenly distributed across
years (e.g. concentrated outside the last-30-years subset), it is possible for the whole-tile gate
to pass while `recentSamples.length + priorSamples.length === 0`. `mean([])` returns `NaN`
(`anomaly.ts:9-11`, `0/0`), which then flows into `formatActualTooltip` → `formatDelta(actual -
NaN)` → `Math.round(NaN)` → the `rounded === 0` / `rounded > 0` checks both evaluate `false` →
`` `−${Math.abs(NaN)}` `` → the literal string `"−NaN"` rendered into the diamond's accessible
`<title>` (visible to screen readers and on hover). This is exactly the "NaN/undefined must never
reach the DOM" invariant the T-08-05 comments elsewhere in this file are careful to uphold (see the
`priorMeanY`/`recentMeanY` null-guards a few lines below at 327-334) — this one call site is the
exception.

This requires a pathological/irregular archive series to trigger (Open-Meteo's archive fetch is
always a contiguous 30-year window in practice), so it's not reachable via normal usage today, but
nothing in the type system or a runtime guard prevents it.

**Fix:**
```ts
const combinedSamples = [...day.recentSamples, ...day.priorSamples]
const combinedMean = combinedSamples.length ? mean(combinedSamples) : day.actual
```
(falling back to `actual` yields a `formatDelta` of `0` rather than `NaN` — or better, guard
`formatDelta` itself, see WR-02.)

### WR-02: `formatDelta` has no non-finite guard, unlike its sibling `formatTemp`

**File:** `src/anomaly/anomaly.ts:94-98`
**Issue:**
```ts
export function formatDelta(delta: number): string {
  const rounded = Math.round(delta)
  if (rounded === 0) return '0'
  return rounded > 0 ? `+${rounded}` : `−${Math.abs(rounded)}`
}
```
`Math.round(NaN)` is `NaN`; `NaN === 0` is `false` and `NaN > 0` is `false`, so the function falls
through to the negative branch and returns the literal string `"−NaN"`. `formatTemp` in
`TrendDayChart.tsx:92-96` explicitly guards this exact class of input (`if (!Number.isFinite(value))
return '—°...'`), but `formatDelta` — used both here (via WR-01) and in `DeltaPanel.tsx` for the
top-level anomaly delta — has no equivalent guard.

**Fix:**
```ts
export function formatDelta(delta: number): string {
  if (!Number.isFinite(delta)) return '—'
  const rounded = Math.round(delta)
  if (rounded === 0) return '0'
  return rounded > 0 ? `+${rounded}` : `−${Math.abs(rounded)}`
}
```

### WR-03: The y-scale formula is duplicated instead of shared, risking drift between marks

**File:** `src/app/TrendDayChart.tsx:82-85`, `src/app/trend.ts:104-105`
**Issue:** `trend.ts`'s `buildViolinPaths` computes its local pixel-mapping closure:
```ts
const y = (t: number) => plotTop + ((yMax - t) / (yMax - yMin)) * plotHeight
```
and `TrendDayChart.tsx` independently re-implements the identical formula as `yFromValue`:
```ts
function yFromValue(value: number, yDomain: [number, number]): number {
  const [yMin, yMax] = yDomain
  return PLOT_TOP + ((yMax - value) / (yMax - yMin)) * PLOT_HEIGHT
}
```
Both are documented in comments as needing to stay "in lockstep," but nothing enforces that beyond
prose — this is exactly the class of duplication the codebase's own "ONE shared definition" pattern
(e.g. `hasUsableSampleCount`, `computeWindowSamples`) explicitly guards against elsewhere. If either
copy is edited (e.g. to add axis inversion, a different clamp, or a padding tweak) without the
other, the violin curves/mean-ticks and the Recharts-driven diamond will silently misalign.

**Fix:** Export the linear-scale helper once from `trend.ts` (e.g. `export function yScale(yDomain:
[number, number], plotTop: number, plotHeight: number): (t: number) => number`) and have both
`buildViolinPaths` and `TrendDayChart.tsx`'s `yFromValue` call through it.

### WR-04: `computeWindowSamples` has no validation on `dateStr`, so a malformed date throws

**File:** `src/anomaly/anomaly.ts:204-230` (see `windowBounds`, lines 154-168)
**Issue:**
```ts
const parts = dateStr.split('-')
const targetMonth = Number(parts[1])
const targetDay = Number(parts[2])
```
If `dateStr` isn't a well-formed `"YYYY-MM-DD"` string (e.g. missing a segment), `targetDay`/`
targetMonth` become `NaN`. That flows into `windowBounds`'s `Date.UTC(year, month - 1, safeDay)` →
an `Invalid Date` internally → `start`/`end` are also `Invalid Date` → `.toISOString()` throws an
uncaught `RangeError: Invalid time value`. There is no guard here, unlike `formatActualTooltip` in
`TrendDayChart.tsx:113-114`, which explicitly catches the same failure mode ("a malformed dateStr
produces an Invalid Date, and toLocaleDateString throws a RangeError on it — fall back to the raw
string"). No test in `anomaly.test.ts` exercises a malformed `dateStr` here.

**Fix:** Either validate `dateStr` at the top of `computeWindowSamples` and return `null` for an
unparseable date (mirroring the existing `years.length === 0` early-return), or wrap
`windowBounds`'s date construction in a finite/`NaN` check before calling `.toISOString()`.

### WR-05: `MEAN_TICK_LEN` is a hand-copied magic number instead of a derived constant

**File:** `src/app/TrendDayChart.tsx:57`
**Issue:**
```ts
const MEAN_TICK_LEN = 29 // maxHalfWidth * 0.8 - long enough to read as a mark, short of the frame.
```
The comment documents the derivation but the value itself is a hardcoded literal, not computed from
`MAX_HALF_WIDTH`. If `MAX_HALF_WIDTH` (line 56) is ever changed, `MEAN_TICK_LEN` silently goes stale
— nothing re-derives or asserts the `0.8` relationship.

**Fix:**
```ts
const MEAN_TICK_LEN = Math.round(MAX_HALF_WIDTH * 0.8)
```

### WR-06: Anomaly-color RGB anchors duplicate the CSS custom properties they're meant to mirror

**File:** `src/anomaly/anomaly.ts:103-105`, `src/index.css:38-40`
**Issue:**
```ts
const ANOMALY_COLD = { r: 30, g: 58, b: 138 }   // #1e3a8a, z <= -3
const ANOMALY_NORMAL = { r: 87, g: 83, b: 78 }  // #57534e, z = 0
const ANOMALY_HOT = { r: 154, g: 52, b: 18 }    // #9a3412, z >= +3
```
These hand-transcribed RGB triples are the *same colors* already declared once as CSS custom
properties (`--color-anomaly-cold: #1e3a8a`, `--color-anomaly-normal: #57534e`,
`--color-anomaly-hot: #9a3412` in `index.css:38-40`). They currently match, but there are now two
independent sources of truth for the same three design tokens — a future palette tweak in
`index.css` (the file a designer would reach for first) would not propagate to the JS gradient
interpolation `anomalyColor()` builds, silently desyncing the backdrop gradient from the anomaly
color scale used elsewhere.

**Fix:** Not a v1 blocker (this predates Phase 8, but is in the reviewed file set) — worth a follow-up
to source the anchors from a single generated/shared table (e.g. a small JSON/TS constants module
imported by both the CSS-in-JS build step or a codegen step), or at minimum a code comment/test that
fails if the two drift.

## Info

### IN-01: Whole-tile usability gate spans a different year range than the samples it gates

**File:** `src/anomaly/anomaly.ts:317-371` (`computeTrendDay`)
**Issue:** `hasUsableSampleCount(samples, totalYears)` (line 330) is evaluated against `samples`
computed over the *full* `startYear..endYear` span of `daily.time` (via `computeWindowSamples`,
lines 213-229), while the actual `recentSamples`/`priorSamples` returned to callers are windowed
over only the last 30 years ending at `endYear` (`recentStart..endYear` / `priorStart..priorEnd`,
lines 339-358). These two ranges are only guaranteed identical when `daily.time` spans *exactly* 30
years. Today that's always true (the app always fetches exactly a 30-year archive per
`STACK.md`/`CLAUDE.md`), so this is currently latent, not a live bug — but if a future variable
addition (CLAUDE.md's documented v2 plan to request additional daily variables in the same archive
call) ever changes the fetched year span, the whole-tile gate and the two-sample split could
diverge, and `TrendLegend`'s dynamic `priorStart`–`priorEnd` label could reference years with no
real backing samples. See WR-01 for the concrete failure mode this can produce.
**Fix:** No action needed now; flagging for awareness. If the fetch's year span ever becomes
variable, compute `hasUsableSampleCount` over `recentSamples.length + priorSamples.length` and
`endYear - priorStart + 1` instead of the full-series `samples`/`totalYears`.

### IN-02: Type assertions (`as number`) instead of type-narrowing

**File:** `src/app/TrendDayChart.tsx:386, 402`
**Issue:**
```ts
violinPaths.prior.mean as number,
...
violinPaths.recent.mean as number,
```
Both call sites are already inside an `if (priorMeanY !== null)` / `if (recentMeanY !== null)`
guard, so the assertion is safe in practice, but it bypasses the compiler's own narrowing rather
than expressing the invariant in a way TypeScript can verify (e.g. destructuring `mean` from the
guarded variable itself).
**Fix:**
```ts
const priorMean = violinPaths.prior.mean
if (priorMean !== null) {
  const priorMeanY = yFromValue(priorMean, yDomain)
  // ... use priorMean directly instead of `as number`
}
```

---

_Reviewed: 2026-07-23T11:46:48Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
