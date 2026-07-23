# Phase 8: Split-Violin Trend View - Pattern Map

**Mapped:** 2026-07-23
**Files analyzed:** 8 (2 new, 6 modified)
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/anomaly/kde.ts` (NEW) | utility (pure math) | transform | `src/anomaly/anomaly.ts` | exact (same file/module discipline) |
| `src/anomaly/kde.test.ts` (NEW) | test | transform | `src/anomaly/anomaly.test.ts` | exact |
| `src/anomaly/anomaly.ts` `computeTrendDay` (MODIFIED) | utility (pure math) | transform | itself (`computeAnomalyForToday` in same file) | exact |
| `src/anomaly/types.ts` `TrendDayResult` (MODIFIED) | model (types) | transform | itself (existing discriminated union) | exact |
| `src/app/trend.ts` (MODIFIED: `buildViolinPaths`/geometry additions) | utility (pure geometry) | transform | `src/app/trend.ts` `computeSharedYDomain`/`buildHistoricalPoints`/`jitterX` (same file, extend in place) | exact |
| `src/app/TrendDayChart.tsx` (MODIFIED: `violinShape()` render) | component | request-response (render) | `src/app/TrendDayChart.tsx` itself (`historicalDotShape`, `makeActualShape`, `TrendYAxisColumn`) | exact |
| `src/app/TrendLegend.tsx` (MODIFIED) | component | request-response (render) | `src/app/TrendLegend.tsx` itself (`TrendLegendItem`) | exact |
| `src/app/TrendRow.tsx` (MODIFIED: wiring only) | component | request-response | `src/app/TrendRow.tsx` itself | exact |
| `src/app/App.tsx` (MODIFIED: `trendDays` wiring, lines ~64-75) | component (composition) | request-response | itself (unchanged shape, just consumes new `computeTrendDay` return) | exact |
| `src/index.css` (MODIFIED: new `--color-chart-*` tokens) | config | — | itself (existing `--color-chart-historical/mean/actual` block, lines 16-21) | exact |

## Pattern Assignments

### `src/anomaly/kde.ts` (NEW — utility, transform)

**Analog:** `src/anomaly/anomaly.ts` (module header/doc-comment discipline, `mean`/`sampleStdDev` style) + validated spike source `.claude/skills/spike-findings-gsd-test/sources/003-split-violin-tile/kde.mjs` (drop-in, already TS-portable).

**Module header pattern** (mirror `anomaly.ts` lines 1-4):
```typescript
// Pure anomaly-statistics math: ... Hand-rolled per CLAUDE.md
// ("hand-roll, don't add a dependency") and STACK.md - no simple-statistics
// or other math dependency, in the same spirit as src/lib/coords.ts.
```
Adapt to: "Pure Gaussian KDE + Silverman bandwidth math for the split-violin trend view. Hand-rolled per CLAUDE.md ('hand-roll, don't add a dependency') — no simple-statistics, no d3, same discipline as anomaly.ts."

**Core math to port verbatim** (from spike `kde.mjs`, already proven against real ERA5 data — TS-ify types only, `xs: number[]` etc.):
```typescript
export function silvermanBandwidth(xs: number[], factor = 1): number {
  const n = xs.length
  if (n < 2) return 1e-6
  const sd = stdDev(xs)
  const iq = iqr(xs)
  const spreadCandidates = [sd, iq / 1.349].filter((v) => v > 0)
  const A = spreadCandidates.length ? Math.min(...spreadCandidates) : 0
  const h = 0.9 * A * Math.pow(n, -1 / 5) * factor
  return h > 0 ? h : 1e-6
}

const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI)
function gaussian(u: number): number {
  return INV_SQRT_2PI * Math.exp(-0.5 * u * u)
}

export function kdeAt(x: number, samples: number[], h: number): number {
  const n = samples.length
  if (n === 0 || h <= 0) return 0
  let sum = 0
  for (let i = 0; i < n; i++) sum += gaussian((x - samples[i]!) / h)
  return sum / (n * h)
}

export function kdeCurve(
  samples: number[], h: number, domainMin: number, domainMax: number, steps = 96,
): { x: number; density: number }[] {
  const out: { x: number; density: number }[] = []
  const span = domainMax - domainMin
  for (let i = 0; i < steps; i++) {
    const x = domainMin + (span * i) / (steps - 1)
    out.push({ x, density: kdeAt(x, samples, h) })
  }
  return out
}
```
Note: reuse `anomaly.ts`'s own `mean`/`sampleStdDev` (import, don't re-declare) — `kde.ts` needs its own `iqr`/`quantile` (not in `anomaly.ts` today) but should import `mean` from `./anomaly` rather than duplicating it, matching the project's "one shared definition" discipline (see `hasUsableSampleCount` doc-comment precedent below).

**Per-half gate helper** (own name, distinct from `hasUsableSampleCount` — PD-04 gate 2), doc-comment style mirrors `anomaly.ts` lines 232-248 (`hasUsableSampleCount`'s "ONE shared definition" comment):
```typescript
const N_MIN = 20

/** Per-half curve-vs-rug gate (PD-04 gate 2), spike-pinned n_min=20 —
 * structurally distinct from hasUsableSampleCount's whole-tile desert gate
 * (PD-04 gate 1). Do NOT conflate the two. */
export function halfDrawsCurve(sampleCount: number): boolean {
  return sampleCount >= N_MIN
}
```

**Error/guard handling pattern to copy:** `anomaly.ts`'s `sampleStdDev` (lines 15-21) guards `values.length < 2 → return 0`; `kde.ts`'s `silvermanBandwidth`/`kdeAt` guards mirror this exactly (`n < 2 → 1e-6`, `h <= 0 → 0`) — never divide by zero, never return `NaN`/`Infinity` (same "Pitfall 2" discipline `computeAnomaly`'s `zScore` null-guard follows in `anomaly.ts` lines 26-35).

---

### `src/anomaly/anomaly.ts` `computeTrendDay` (MODIFIED — two-sample return)

**Analog:** itself — `computeAnomalyForToday` (lines 282-297) and the existing `computeTrendDay` (lines 309-334) in the same file; `computeWindowSamples` (lines 204-230) is the shared helper to call TWICE.

**Current one-sample core pattern** (lines 309-334, to be replaced):
```typescript
export function computeTrendDay(
  daily: { time: string[]; values: (number | null)[] },
  dateStr: string,
  actualTemp: number | null,
  halfWidthDays = 5,
): TrendDayResult {
  const window = computeWindowSamples(daily, dateStr, halfWidthDays)
  if (window === null) return { dateStr, usable: false }
  const { samples, totalYears } = window

  if (
    actualTemp === null ||
    !Number.isFinite(actualTemp) ||
    !hasUsableSampleCount(samples, totalYears)
  ) {
    return { dateStr, usable: false }
  }

  return { dateStr, usable: true, samples, mean: mean(samples), actual: actualTemp }
}
```

**New two-sample shape** — call `filterDayOfYearWindow` (lines 173-194) directly TWICE with explicit `startYear`/`endYear` per PD-11's spike guidance (recent = last 5 complete years, prior = the 25 before), but keep `computeWindowSamples`'s whole-window `hasUsableSampleCount` gate (lines 232-248, D-09/D-10 "ONE shared definition") for the whole-tile placeholder — do NOT re-derive that threshold inline (explicit "What to Avoid" in the statistics reference). Return `{ dateStr, usable: true, recentSamples, priorSamples, recentMean, priorMean, actual }` on success, `{ dateStr, usable: false }` otherwise — same discriminated-shape discipline as today (one code path regardless of cause, per the existing doc-comment at lines 299-308).

**Doc-comment convention to preserve** (see lines 299-308 as template — cites requirement IDs and decision IDs, explains the "one code path" invariant):
```typescript
/** Computes one day's trend-chart input against the +/-5-day day-of-year
 * baseline window derived from `daily` (VIZ-01, D-11, D-13, TREND-01). ...
 * Returns `{ usable: false, dateStr }` when ... the shared hasUsableSampleCount
 * gate over the COMBINED window fails (one unusable code path regardless of
 * cause). Returns `{ usable: true, dateStr, recentSamples, priorSamples,
 * recentMean, priorMean, actual }` for a healthy day (TREND-01 two-sample
 * split). */
```

---

### `src/anomaly/types.ts` `TrendDayResult` (MODIFIED — discriminated union)

**Analog:** itself, lines 27-41 (existing shape/discriminant convention).

**Current shape:**
```typescript
export type TrendDayResult =
  | { dateStr: string; usable: true; samples: number[]; mean: number; actual: number }
  | { dateStr: string; usable: false }
```

**New shape (mirror the exact same discriminant style, only the `usable: true` member's fields change):**
```typescript
export type TrendDayResult =
  | {
      dateStr: string
      usable: true
      recentSamples: number[]
      priorSamples: number[]
      recentMean: number
      priorMean: number
      actual: number
    }
  | { dateStr: string; usable: false }
```
Preserve the file's doc-comment convention (lines 27-31) explaining WHY this shape exists and what it drives (now: `buildViolinPaths` branches on `usable`, same as `TrendDayChart` did before).

---

### `src/app/trend.ts` (MODIFIED — extend with violin geometry)

**Analog:** itself — `jitterX` (lines 14-18), `buildHistoricalPoints` (lines 23-27), `computeSharedYDomain` (lines 36-46) are the exact pure-geometry patterns `buildViolinPaths` must mirror; spike source `.claude/skills/spike-findings-gsd-test/sources/003-split-violin-tile/violin.mjs` has the proven geometry to port.

**File header convention to extend** (lines 1-5, keep "no React imports, dependency-free" framing):
```typescript
// Pure trend-row helpers: deterministic dot jitter, per-day historical
// scatter points, the shared padded y-domain across all 7 mini-charts
// (D-06), and weekday/"Today" slot labels. Hand-rolled per CLAUDE.md
// ("hand-roll, don't add a dependency") - no React imports, same
// dependency-free spirit as src/anomaly/anomaly.ts.
```

**`computeSharedYDomain` — extend input set (lines 36-46), same guard pattern:**
```typescript
export function computeSharedYDomain(days: TrendDayResult[]): [number, number] {
  const allValues = days.flatMap((day) =>
    day.usable
      ? [...day.recentSamples, ...day.priorSamples, day.actual, day.recentMean, day.priorMean]
      : [],
  )
  if (allValues.length === 0) return [0, 1]
  const min = Math.min(...allValues)
  const max = Math.max(...allValues)
  const pad = (max - min) * 0.1 || 1
  return [Math.floor(min - pad), Math.ceil(max + pad)]
}
```
Keep the empty-array guard verbatim (03-RESEARCH.md Pattern 3 precedent cited in the existing doc-comment) — `Math.min(...[])` throws otherwise.

**New `buildViolinPaths` — port from spike `violin.mjs` `buildViolinDay` (lines 26-71), adapted to this file's TS/no-React style and to use ONE shared pooled bandwidth (not the spike's default `perHalf` mode — statistics reference explicitly says use `bandwidthMode: 'shared'` always, no mode parameter needed in the real build):**
```typescript
export function buildViolinPaths(
  recentSamples: number[],
  priorSamples: number[],
  opts: { yMin: number; yMax: number; plotTop: number; plotHeight: number; cx: number; maxHalfWidth: number; steps?: number },
): { recent: ViolinHalf; prior: ViolinHalf } {
  const { yMin, yMax, plotTop, plotHeight, cx, maxHalfWidth, steps = 96 } = opts
  const y = (t: number) => plotTop + ((yMax - t) / (yMax - yMin)) * plotHeight

  // One shared pooled bandwidth (statistics reference: per-half Silverman
  // biases the n=55 recent half ~25% wider — an n-artifact, not signal).
  const hShared = silvermanBandwidth([...priorSamples, ...recentSamples])
  const recentCurve = kdeCurve(recentSamples, hShared, yMin, yMax, steps)
  const priorCurve = kdeCurve(priorSamples, hShared, yMin, yMax, steps)

  // PD-06: ONE shared max density per day.
  const sharedMax = Math.max(
    ...recentCurve.map((p) => p.density),
    ...priorCurve.map((p) => p.density),
  ) || 1

  const halfPath = (curve: { x: number; density: number }[], side: -1 | 1) => {
    const pts = curve.map((p) => ({ x: cx + side * (p.density / sharedMax) * maxHalfWidth, y: y(p.x) }))
    const top = `${cx.toFixed(1)},${y(yMax).toFixed(1)}`
    const bottom = `${cx.toFixed(1)},${y(yMin).toFixed(1)}`
    const edge = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L')
    return `M${top} L${edge} L${bottom} Z`
  }

  const half = (samples: number[], curve: typeof recentCurve, side: -1 | 1): ViolinHalf =>
    halfDrawsCurve(samples.length)
      ? { kind: 'curve', path: halfPath(curve, side), mean: mean(samples), n: samples.length }
      : { kind: 'rug', points: samples.map((s) => ({ y: y(s) })), mean: samples.length ? mean(samples) : null, n: samples.length }

  return { prior: half(priorSamples, priorCurve, -1), recent: half(recentSamples, recentCurve, +1) }
}
```
UI-SPEC pins the concrete constants: `cx=44`, `maxHalfWidth=36`, mean-tick half-length `29px` (`maxHalfWidth * 0.8`) — feed these from `TrendDayChart.tsx`'s `CHART_WIDTH`/new constants, same way `CHART_WIDTH`/`AXIS_WIDTH` are module-level consts there today (lines 48-54).

**Clamping note (spike "What to Avoid"):** clamp each half's curve grid to that half's own `[Math.min(...samples), Math.max(...samples)]`, NOT the full padded `yDomain` — prevents tail-touches-frame (see UI-SPEC "Curve grid is clamped to each half's own sampleMin/sampleMax").

---

### `src/app/TrendDayChart.tsx` (MODIFIED — `violinShape()` render, custom-shape rewrite)

**Analog:** itself — `historicalDotShape` (lines 86-90), `makeActualShape` (lines 95-117), `TrendYAxisColumn` (lines 213-227) are the EXACT render conventions to reuse/extend.

**Imports pattern to extend** (lines 27-38, keep the same relative-import style):
```typescript
import { useMemo } from 'react'
import { ComposedChart, Scatter, ReferenceLine, XAxis, YAxis } from 'recharts'
import type { ScatterShapeProps } from 'recharts'
import { formatDelta } from '../anomaly/anomaly'
import type { TrendDayResult } from '../anomaly/types'
import { buildHistoricalPoints, formatSlotLabel, buildViolinPaths } from './trend'
```

**Rug fallback — reuse `historicalDotShape` verbatim (lines 86-90), do not rewrite:**
```typescript
function historicalDotShape(props: ScatterShapeProps) {
  const { cx, cy } = props
  if (cx === undefined || cy === undefined) return <g />
  return <circle cx={cx} cy={cy} r={3} fill="var(--color-chart-historical)" />
}
```
For the rug half, jitter within `[cx, cx ± maxHalfWidth]` using the existing `jitterX` helper from `trend.ts` (import alongside `buildHistoricalPoints`), bounded per-half per the UI-SPEC.

**Actual-value diamond — reuse `makeActualShape` verbatim (lines 95-117), unchanged, still rendered at `x = cx` (center line):**
```typescript
function makeActualShape(tooltipText: string) {
  return function actualShape(props: ScatterShapeProps) {
    const { cx, cy } = props
    if (cx === undefined || cy === undefined) return <g />
    const size = 5
    const points = [`${cx},${cy - size}`, `${cx + size},${cy}`, `${cx},${cy + size}`, `${cx - size},${cy}`].join(' ')
    return (
      <polygon points={points} fill="var(--color-chart-actual)" stroke="#ffffff" strokeWidth={1}>
        <title>{tooltipText}</title>
      </polygon>
    )
  }
}
```

**New `violinShape()` render helper — same "wrap native `<title>`, never raw-HTML sink" pattern as `makeActualShape`, and same custom-Recharts-shape signature `(props: ScatterShapeProps) => JSX`:**
```typescript
function makeViolinShape(half: ViolinHalf, side: -1 | 1, tokens: { fill: string; stroke: string }) {
  return function violinShape() {
    if (half.kind === 'rug') {
      return (
        <g>
          {half.points.map((p, i) => (
            <circle key={i} cx={/* cx + side*jitterX(i)*maxHalfWidth bounded to half */} cy={p.y} r={3} fill="var(--color-chart-historical)" />
          ))}
        </g>
      )
    }
    return (
      <path d={half.path} fill={tokens.fill} stroke={tokens.stroke} strokeWidth={1.5}>
        <title>{/* "{Prior 25-yr|Recent 5-yr} distribution ({n} samples)" per UI-SPEC Copywriting Contract */}</title>
      </path>
    )
  }
}
```

**Mean-tick render — same `<line>` + `<title>` pattern as `makeActualShape`'s polygon+title, extends the existing `ReferenceLine` usage (lines 177-182) into two explicit ticks** (a raw `ReferenceLine` spans full width; the UI-SPEC calls for a short `side * 29px` tick, so this becomes a custom shape, not a `ReferenceLine` — same token `var(--color-chart-mean)` both sides, per PD-07/UI-SPEC "same token, distinguished by position"):
```typescript
<line x1={cx} x2={cx + side * 29} y1={yMean} y2={yMean} stroke="var(--color-chart-mean)" strokeWidth={2}>
  <title>{/* "Recent 5-yr mean (N samples): T°C" / "Prior 25-yr mean (...)" per Copywriting Contract */}</title>
</line>
```

**No-auto-sizing-container discipline to preserve** (doc-comment lines 10-13): explicit `width`/`height` on `ComposedChart`, no ResizeObserver dependency — new violin render must still declare `CHART_WIDTH=88`/`CHART_HEIGHT=120` (unchanged per UI-SPEC) and `isAnimationActive={false}` (PERF-02, `prefers-reduced-motion`).

**`TrendYAxisColumn` — untouched, reuse verbatim** (lines 200-227) — PD-09.

---

### `src/app/TrendLegend.tsx` (MODIFIED — extend items)

**Analog:** itself — `TrendLegendItem` (lines 21-36) is the exact per-item wrapper to reuse for all 5 new items; existing 3 swatch patterns (circle/rect/polygon, lines 45-78) are the literal shapes to copy for the new prior/recent violin-shape swatches, mean-tick swatch, and rug-dot-cluster swatch.

**Item wrapper to reuse verbatim:**
```typescript
function TrendLegendItem({ label, swatch }: TrendLegendItemProps) {
  return (
    <div className="flex flex-row items-center gap-xs">
      <svg className="flex-none w-[14px] h-[14px]" width={SWATCH_SIZE} height={SWATCH_SIZE} viewBox={`0 0 ${SWATCH_SIZE} ${SWATCH_SIZE}`} aria-hidden="true">
        {swatch}
      </svg>
      <span className="text-label leading-[1.5] font-label text-muted">{label}</span>
    </div>
  )
}
```
New swatches use `--color-chart-prior-fill`/`--color-chart-prior-stroke`, `--color-chart-recent-fill`/`--color-chart-recent-stroke` (new tokens, UI-SPEC), `--color-chart-mean` (existing token, one swatch for both ticks per PD-07/UI-SPEC), `--color-chart-actual` (unchanged, item 4 verbatim), `--color-chart-historical` (unchanged, new item 5 "too few years → dots"). Container `flex flex-row flex-wrap gap-md`, `role="list"` (line 40-44) — unchanged layout, only items change. **Copy is DRAFT per PD-10** — see UI-SPEC Copywriting Contract table; do not treat wording as final without reviewer sign-off.

---

### `src/app/TrendRow.tsx` (MODIFIED — wiring only, STABLE wrapper)

**Analog:** itself. Per Phase 6 PD-08 and this phase's context, the 4 top-level branches (no-selection/loading/error/empty, lines 52-84) and `PanelShell`/`PanelHeadline` wrapper are UNCHANGED. Only the populated block (lines 86-111: `computeSharedYDomain`, `TrendYAxisColumn`, the `days.map(...)` loop, `TrendLegend`) needs no structural change either — `TrendDayChart` and `computeSharedYDomain` absorb the two-sample shape change internally; `TrendRow` itself likely needs ZERO edits beyond type-flow (its props/JSX don't reference `samples`/`mean` directly).

---

### `src/app/App.tsx` (MODIFIED — wiring, lines ~64-75)

**Analog:** itself, unchanged call site:
```typescript
const trendDays =
  isAnomalyReady(current.status, baseline.status) && baseline.daily && current.recentDaily
    ? current.recentDaily.time.map((dateStr, i) =>
        computeTrendDay(baseline.daily!, dateStr, current.recentDaily!.values[i] ?? null),
      )
    : null
```
No wiring change needed — `computeTrendDay`'s new two-sample return flows through this map unchanged (same `isAnomalyReady` gate, same `.map` shape). Only the element TYPE of the array changes, absorbed entirely by `types.ts`.

---

### `src/index.css` (MODIFIED — new chart tokens)

**Analog:** itself, existing block (lines 16-21):
```css
--color-chart-historical: rgba(87, 83, 78, 0.22);
--color-chart-mean: var(--color-accent);
--color-chart-actual: #ea580c;
```
**New tokens to add alongside** (values locked in `08-UI-SPEC.md` Color section):
```css
--color-chart-prior-fill: rgba(87, 83, 78, 0.24);
--color-chart-prior-stroke: #57534e; /* = --color-anomaly-normal */
--color-chart-recent-fill: rgba(154, 52, 18, 0.26);
--color-chart-recent-stroke: #9a3412; /* = --color-anomaly-hot */
```

## Shared Patterns

### Hand-rolled pure math, no stats dependency
**Source:** `src/anomaly/anomaly.ts` (whole file), spike `kde.mjs`
**Apply to:** `kde.ts`, `trend.ts`'s `buildViolinPaths`
Every function is a small hand-rolled pure function with a doc-comment citing requirement/decision IDs (e.g. `ANOM-04`, `D-09`, `PD-04`). No `simple-statistics`, no `d3`. Guards against div-by-zero / NaN / Infinity explicitly rather than letting them propagate (see `sampleStdDev`'s `< 2 → 0` guard, `computeAnomaly`'s null-zScore guard).

### One shared definition (no duplicated gate logic)
**Source:** `src/anomaly/anomaly.ts` lines 232-248 (`hasUsableSampleCount` doc-comment: "This is the ONLY place ... one shared definition, no duplicated inline checks")
**Apply to:** the new `halfDrawsCurve` helper (PD-04 gate 2) — must be its OWN named helper, never inlined at each call site, exactly mirroring how `hasUsableSampleCount` is the ONE definition of the whole-tile gate.

### Native SVG `<title>`, never raw-HTML sink
**Source:** `src/app/TrendDayChart.tsx` `makeActualShape` (lines 95-117), `TrendLegend.tsx` (whole file)
**Apply to:** `violinShape()`'s curve/rug `<title>` tooltips, mean-tick `<title>`, all legend items — T-03-07 security invariant. Every dynamic string is a JSX text node or native SVG `<title>`, never `dangerouslySetInnerHTML` or similar.

### No auto-sizing chart container (explicit width/height)
**Source:** `src/app/TrendDayChart.tsx` doc-comment lines 10-13, `CHART_WIDTH`/`CHART_HEIGHT`/`AXIS_WIDTH` consts (lines 48-54)
**Apply to:** the violin tile render — jsdom has no ResizeObserver; keep explicit `width`/`height` props on `ComposedChart`, unchanged `88×120` tile size, `AXIS_WIDTH=40`.

### Shared-scale discipline (compute once, pass to every tile)
**Source:** `src/app/trend.ts` `computeSharedYDomain` (lines 36-46), `src/app/TrendRow.tsx` lines 86, 94, 98-106 (`yDomain` computed once, passed to `TrendYAxisColumn` and every `TrendDayChart`)
**Apply to:** the extended `computeSharedYDomain` (now flattening `recentSamples`/`priorSamples`/`actual`/both means) — ONE result feeds every tile AND the axis column (D-06); never per-tile auto-scaling.

### Static render, motion behind `prefers-reduced-motion`
**Source:** `src/app/TrendDayChart.tsx` `isAnimationActive={false}` on both existing `Scatter`s (lines 175, 187)
**Apply to:** the new violin `Scatter`/path renders — same static-by-default convention (PERF-02).

## No Analog Found

None — every new/modified file this phase has a strong existing analog (either the same file being extended in place, or the validated spike source that is designed to port directly).

## Metadata

**Analog search scope:** `src/anomaly/`, `src/app/`, `.claude/skills/spike-findings-gsd-test/` (SKILL.md + references + sources)
**Files scanned:** `src/anomaly/anomaly.ts`, `src/anomaly/types.ts`, `src/app/trend.ts`, `src/app/TrendDayChart.tsx`, `src/app/TrendLegend.tsx`, `src/app/TrendRow.tsx`, `src/app/App.tsx` (partial), `src/index.css` (partial), spike sources `kde.mjs`/`violin.mjs`
**Pattern extraction date:** 2026-07-23
