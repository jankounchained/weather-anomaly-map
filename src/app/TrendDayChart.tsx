// Renders exactly one of two states for a single day (D-12, D-14): a
// split-violin tile (populated) or a bordered "Not enough data" placeholder
// - one visual path whether the cause is a genuine data desert or a
// fetch-timing gap. Mirrors AnomalyCard's sequential early-return branching
// pattern. All dynamic text (weekday label, placeholder copy, mean-tick/
// curve/rug tooltips, the actual-marker tooltip) renders as ordinary JSX
// text nodes or a native SVG <title>/aria-label - never through a raw-HTML
// sink (T-03-07).
//
// No auto-sizing container is used (explicit width/height props instead) -
// jsdom has no ResizeObserver (03-RESEARCH.md Pitfall 3).
//
// 08-03: the per-day tile is now a split violin (prior-25yr LEFT, recent-5yr
// RIGHT, PD-11) instead of a single dot strip + mean ReferenceLine. Every
// mark this file draws - both violin halves (curve or rug fallback, PD-01),
// both per-half mean ticks (PD-07), and the actual-value diamond (PD-08) -
// is positioned via the SAME yFromValue() pixel mapping, built from an
// EXPLICIT ComposedChart margin (PLOT_MARGIN) rather than relying on
// Recharts' implicit default, so buildViolinPaths' precomputed curve/rug
// pixel coordinates can never drift from the diamond's Recharts-scale-driven
// position (must-have: "all marks share ONE y-scale"). TrendYAxisColumn
// (below) is untouched (PD-09) - it already uses this exact same default
// margin, so the shared axis stays aligned with every tile.
//
// Cites: D-01, D-02, D-03, D-04, D-06, D-08, D-12, D-14, VIZ-02, TREND-01,
// TREND-02, TREND-03, PD-01, PD-02, PD-05, PD-06, PD-07, PD-08, PD-09,
// PD-11, PD-12, T-03-07, T-08-05.
import { useMemo } from 'react'
import { ComposedChart, Scatter, XAxis, YAxis } from 'recharts'
import type { ScatterShapeProps } from 'recharts'
import { formatDelta, mean } from '../anomaly/anomaly'
import type { TrendDayResult } from '../anomaly/types'
import { buildViolinPaths, formatSlotLabel, jitterX } from './trend'
import type { ViolinHalf } from './trend'

export interface TrendDayChartProps {
  day: TrendDayResult
  yDomain: [number, number]
  units: string | null
  isToday: boolean
  showYAxis: boolean
}

const CHART_WIDTH = 88
const CHART_HEIGHT = 120
// Explicit narrow width for any visible Y-axis (03-05 Gap 1 fix) - never
// rely on Recharts' ~60px default reservation, which is what squeezed the
// leftmost tile's plot area before this fix. Wide enough for a 2-3 digit
// Celsius tick with a minus sign (e.g. "-12") at 14px font.
const AXIS_WIDTH = 40

// Split-violin geometry constants (08-UI-SPEC.md "Spacing Scale"
// exceptions table) - pixel values tied to the fixed 88x120 tile, not the
// 8pt token scale, same treatment CHART_WIDTH/AXIS_WIDTH already get.
const CX = 44 // CHART_WIDTH / 2 - where both halves meet and the diamond sits.
const MAX_HALF_WIDTH = 36 // cx - 8px (spacing-sm) gutter each edge (PD-05, equal-width both halves).
const MEAN_TICK_LEN = 29 // maxHalfWidth * 0.8 - long enough to read as a mark, short of the frame.

// Explicit ComposedChart margin (matches Recharts' own CartesianChart
// default of {top:5,right:5,bottom:5,left:5} verbatim, confirmed against
// node_modules/recharts/lib/chart/CartesianChart.js) - declared here rather
// than left implicit so PLOT_TOP/PLOT_HEIGHT below can never silently drift
// from what Recharts actually renders the diamond's cy at.
const PLOT_MARGIN = 5
const PLOT_TOP = PLOT_MARGIN
const PLOT_HEIGHT = CHART_HEIGHT - PLOT_MARGIN * 2

const PRIOR_TOKENS = {
  fill: 'var(--color-chart-prior-fill)',
  stroke: 'var(--color-chart-prior-stroke)',
}
const RECENT_TOKENS = {
  fill: 'var(--color-chart-recent-fill)',
  stroke: 'var(--color-chart-recent-stroke)',
}

/** Maps a temperature value to its tile-local pixel y, using the SAME
 * linear mapping Recharts' own (hidden) YAxis computes for `yDomain` given
 * the explicit PLOT_MARGIN above - keeps the mean ticks/violin marks in
 * lockstep with the diamond's Recharts-scale-driven position (must-have:
 * "all marks share ONE y-scale"). */
function yFromValue(value: number, yDomain: [number, number]): number {
  const [yMin, yMax] = yDomain
  return PLOT_TOP + ((yMax - value) / (yMax - yMin)) * PLOT_HEIGHT
}

/** Formats a temperature for a native SVG <title> (T-08-05): rounds to a
 * whole degree and guards non-finite input (NaN/Infinity) with a plain
 * placeholder glyph rather than ever letting "NaN"/"undefined" reach the
 * DOM. A null `units` falls back to a sensible default rather than leaving
 * a dangling degree symbol (mirrors formatActualTooltip's IN-03 guard). */
function formatTemp(value: number, units: string | null): string {
  const resolvedUnits = units ?? 'C'
  if (!Number.isFinite(value)) return `—°${resolvedUnits}`
  return `${Math.round(value)}°${resolvedUnits}`
}

/** Formats the actual-marker tooltip copy per 08-UI-SPEC.md's Copywriting
 * Contract: "{Mon D} — {rounded temp}°{units} ({+/-N}° vs. 30-yr avg)". The
 * `meanValue` baseline is the caller-supplied combined recent+prior mean
 * (see TrendDayChart below) - this function's own contract is unchanged
 * from the single-sample era. */
function formatActualTooltip(
  dateStr: string,
  actual: number,
  meanValue: number,
  units: string | null,
): string {
  const date = new Date(`${dateStr}T00:00:00Z`)
  // IN-01: a malformed dateStr produces an Invalid Date, and
  // toLocaleDateString throws a RangeError on it - fall back to the raw
  // string rather than letting that throw crash the render path.
  const monthDay = Number.isNaN(date.getTime())
    ? dateStr
    : date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      })
  const roundedActual = Math.round(actual)
  const delta = formatDelta(actual - meanValue)
  // IN-03: fall back to a sensible default unit rather than leaving a
  // dangling degree symbol ("21°") when units hasn't resolved yet.
  const resolvedUnits = units ?? 'C'
  return `${monthDay} — ${roundedActual}°${resolvedUnits} (${delta}° vs. 30-yr avg)`
}

/** Per-half curve/rug accessible title (08-UI-SPEC.md Copywriting
 * Contract): "{Prior 25-yr|Recent 5-yr} distribution ({n} samples)". */
function formatCurveTitle(periodLabel: string, n: number): string {
  return `${periodLabel} distribution (${n} samples)`
}

/** Per-half rug-fallback accessible title (08-UI-SPEC.md Copywriting
 * Contract) - explains the curve/rug visual contrast to screen-reader
 * users the same way the curve/rug contrast explains it to sighted ones. */
function formatRugTitle(periodLabel: string): string {
  return `${periodLabel}: too few samples for a smooth curve — showing individual years instead`
}

/** Per-half mean-tick tooltip (08-UI-SPEC.md Copywriting Contract):
 * "{Prior 25-yr|Recent 5-yr} mean ({n} samples): {rounded}°{units}". */
function formatMeanTickTooltip(
  periodLabel: string,
  n: number,
  meanValue: number,
  units: string | null,
): string {
  return `${periodLabel} mean (${n} samples): ${formatTemp(meanValue, units)}`
}

/** Custom shape for one split-violin half (PD-01, PD-05, PD-11, PD-12): a
 * filled KDE curve `<path>` when the half draws a curve, or a jittered rug
 * of raw sample dots - bounded to `[cx, cx + side*maxHalfWidth]`, never
 * crossing the center line - when the half is too thin (`halfDrawsCurve`'s
 * n_min gate). Both branches wrap a native SVG <title> (T-03-07, never a
 * raw-HTML sink) so the curve/rug visual contrast has an accessible
 * equivalent. Zero-arg shape function - ignores whatever cx/cy Recharts
 * would compute for its single dummy data point, since every coordinate
 * here is precomputed by buildViolinPaths/yFromValue instead (same
 * zero-arg-shape precedent as `emptyShape` below). */
function makeViolinShape(
  half: ViolinHalf,
  side: -1 | 1,
  tokens: { fill: string; stroke: string },
  periodLabel: string,
) {
  return function violinShape() {
    if (half.kind === 'rug') {
      return (
        <g>
          <title>{formatRugTitle(periodLabel)}</title>
          {half.points.map((point, index) => (
            <circle
              key={index}
              cx={CX + side * jitterX(index) * MAX_HALF_WIDTH}
              cy={point.y}
              r={3}
              fill="var(--color-chart-historical)"
            />
          ))}
        </g>
      )
    }
    return (
      <path
        d={half.path}
        fill={tokens.fill}
        stroke={tokens.stroke}
        strokeWidth={1.5}
      >
        <title>{formatCurveTitle(periodLabel, half.n)}</title>
      </path>
    )
  }
}

/** Custom shape for one per-half mean tick (PD-07): a short horizontal
 * `<line>` extending `side * MEAN_TICK_LEN` from `cx`, wrapping a native
 * <title>. The vertical gap between the recent and prior ticks IS the
 * climate-shift read (no additional annotation this phase, TREND-04 stays
 * deferred). Zero-arg shape function, same precedent as makeViolinShape
 * above. */
function makeMeanTickShape(y: number, side: -1 | 1, tooltipText: string) {
  return function meanTickShape() {
    return (
      <line
        x1={CX}
        x2={CX + side * MEAN_TICK_LEN}
        y1={y}
        y2={y}
        stroke="var(--color-chart-mean)"
        strokeWidth={2}
      >
        <title>{tooltipText}</title>
      </line>
    )
  }
}

/** Custom shape for the actual-value marker (D-02): a diamond filled
 * --color-chart-actual with a 1px white stroke, wrapping a native SVG
 * <title> for the hover tooltip - never a raw-HTML sink. Unchanged from
 * the single-sample era; still rendered at x=cx via the same {x:0.5}
 * domain-point trick (see actualPoint below). */
function makeActualShape(tooltipText: string) {
  return function actualShape(props: ScatterShapeProps) {
    const { cx, cy } = props
    if (cx === undefined || cy === undefined) return <g />
    const size = 5
    const points = [
      `${cx},${cy - size}`,
      `${cx + size},${cy}`,
      `${cx},${cy + size}`,
      `${cx - size},${cy}`,
    ].join(' ')
    return (
      <polygon
        points={points}
        fill="var(--color-chart-actual)"
        stroke="#ffffff"
        strokeWidth={1}
      >
        <title>{tooltipText}</title>
      </polygon>
    )
  }
}

export function TrendDayChart({
  day,
  yDomain,
  units,
  isToday,
  showYAxis,
}: TrendDayChartProps) {
  const label = formatSlotLabel(day.dateStr, isToday)
  const labelClassName = isToday
    ? 'm-0 h-4 text-label leading-[1.5] text-center font-semibold text-accent'
    : 'm-0 h-4 text-label leading-[1.5] text-center font-normal text-muted'

  // Always computed (even for an unusable day, with empty sample arrays) so
  // this hook call stays unconditional (rules of hooks) - buildViolinPaths
  // is guarded against empty/degenerate halves (T-08-06, Plan 08-02), and
  // the result is simply unused when the placeholder branch below fires.
  const violinPaths = useMemo(
    () =>
      buildViolinPaths(
        day.usable ? day.recentSamples : [],
        day.usable ? day.priorSamples : [],
        {
          yMin: yDomain[0],
          yMax: yDomain[1],
          plotTop: PLOT_TOP,
          plotHeight: PLOT_HEIGHT,
          cx: CX,
          maxHalfWidth: MAX_HALF_WIDTH,
          steps: 96,
        },
      ),
    [day, yDomain],
  )

  if (!day.usable) {
    return (
      <div className="flex flex-col w-[88px] gap-xs">
        <p className={labelClassName}>{label}</p>
        <div
          className="w-[88px] h-[120px] flex items-center justify-center text-center p-xs bg-glass-surface border border-glass-border rounded-glass-sm text-muted text-label leading-[1.5] box-border"
          title="Not enough history for this day"
          aria-label="Not enough history for this day"
        >
          Not enough data
        </div>
      </div>
    )
  }

  // The diamond tooltip's "vs. 30-yr avg" baseline is the sample-weighted
  // mean of the FULL combined window (08-UI-SPEC.md Copywriting Contract) -
  // concatenating recent+prior and taking one mean naturally weights by
  // each half's sample count (recentSamples/priorSamples are both non-empty
  // whenever usable:true, per computeTrendDay's combined hasUsableSampleCount
  // gate, so this can never divide by zero). Not drawn as its own visual
  // mark - PD-07 replaced the single mean line with two per-half ticks; this
  // combined figure exists purely so the diamond's tooltip wording stays
  // literal and accurate.
  const combinedMean = mean([...day.recentSamples, ...day.priorSamples])
  const actualPoint = [{ x: 0.5, y: day.actual }]
  const tooltipText = formatActualTooltip(
    day.dateStr,
    day.actual,
    combinedMean,
    units,
  )

  // A dummy data point purely to trigger each zero-arg shape callback once -
  // every mark's real pixel position is precomputed (buildViolinPaths /
  // yFromValue), so the value here is never read.
  const dummyPoint = [{ x: 0.5, y: yDomain[0] }]

  // T-08-05 defensive guard: a half's mean is null only when that half is
  // truly empty (n===0) - the spike's statistics finding says real per-half
  // sizes are always ~55/275, so this never fires in production, but a mean
  // tick is skipped rather than risking a NaN pixel position/tooltip if it
  // ever does.
  const priorMeanY =
    violinPaths.prior.mean !== null
      ? yFromValue(violinPaths.prior.mean, yDomain)
      : null
  const recentMeanY =
    violinPaths.recent.mean !== null
      ? yFromValue(violinPaths.recent.mean, yDomain)
      : null

  return (
    <div className="flex flex-col w-[88px] gap-xs">
      <p className={labelClassName}>{label}</p>
      <ComposedChart
        width={CHART_WIDTH}
        height={CHART_HEIGHT}
        margin={{
          top: PLOT_MARGIN,
          right: PLOT_MARGIN,
          bottom: PLOT_MARGIN,
          left: PLOT_MARGIN,
        }}
      >
        <XAxis type="number" dataKey="x" domain={[0, 1]} hide />
        <YAxis
          type="number"
          dataKey="y"
          domain={yDomain}
          hide={!showYAxis}
          width={showYAxis ? AXIS_WIDTH : 0}
          tick={{ fill: 'var(--color-muted)', fontSize: 14 }}
        />
        <Scatter
          data={dummyPoint}
          shape={makeViolinShape(
            violinPaths.prior,
            -1,
            PRIOR_TOKENS,
            'Prior 25-yr',
          )}
          isAnimationActive={false}
        />
        <Scatter
          data={dummyPoint}
          shape={makeViolinShape(
            violinPaths.recent,
            1,
            RECENT_TOKENS,
            'Recent 5-yr',
          )}
          isAnimationActive={false}
        />
        {priorMeanY !== null && (
          <Scatter
            data={dummyPoint}
            shape={makeMeanTickShape(
              priorMeanY,
              -1,
              formatMeanTickTooltip(
                'Prior 25-yr',
                violinPaths.prior.n,
                violinPaths.prior.mean as number,
                units,
              ),
            )}
            isAnimationActive={false}
          />
        )}
        {recentMeanY !== null && (
          <Scatter
            data={dummyPoint}
            shape={makeMeanTickShape(
              recentMeanY,
              1,
              formatMeanTickTooltip(
                'Recent 5-yr',
                violinPaths.recent.n,
                violinPaths.recent.mean as number,
                units,
              ),
            )}
            isAnimationActive={false}
          />
        )}
        <Scatter
          data={actualPoint}
          shape={makeActualShape(tooltipText)}
          isAnimationActive={false}
        />
      </ComposedChart>
    </div>
  )
}

/** No-op shape for the decorative empty Scatter in TrendYAxisColumn below -
 * renders nothing, exists only so the chart has a cartesian data series to
 * anchor its axis to. */
function emptyShape() {
  return <g />
}

export interface TrendYAxisColumnProps {
  yDomain: [number, number]
}

/** Renders the trend row's single shared Y-axis (D-06), in its own narrow
 * explicit-width column meant to sit to the LEFT of the 7-tile row
 * (03-05 gap closure, VIZ-02 Gap 1) - every TrendDayChart tile keeps its
 * own YAxis hidden, so this is the ONLY visible temperature axis rendered
 * for the whole row. Takes the identical yDomain TrendRow computes once and
 * passes to every tile (D-06), so the shared scale stays perfectly
 * aligned. No auto-sizing container - explicit width/height, the same
 * jsdom-safety rule TrendDayChart follows above (03-RESEARCH.md
 * Pitfall 3). Untouched this phase (PD-09) - still uses Recharts' implicit
 * default margin, which is numerically identical to TrendDayChart's now-
 * explicit PLOT_MARGIN above, so the two stay aligned. */
// Small positive plot area to the right of the reserved axis band. The chart
// must be WIDER than the YAxis width (plus horizontal margins) or Recharts
// computes a zero/negative cartesian plot area and renders no tick labels at
// all. Vertical geometry (top/bottom PLOT_MARGIN, CHART_HEIGHT, hidden XAxis)
// stays identical to every TrendDayChart tile so the axis ticks land at the
// exact same pixel y as the violin/diamond marks (shared-scale must-have).
const AXIS_COLUMN_PLOT = 8

export function TrendYAxisColumn({ yDomain }: TrendYAxisColumnProps) {
  return (
    <ComposedChart
      width={AXIS_WIDTH + AXIS_COLUMN_PLOT}
      height={CHART_HEIGHT}
      margin={{ top: PLOT_MARGIN, right: 0, bottom: PLOT_MARGIN, left: 0 }}
    >
      <XAxis type="number" dataKey="x" domain={[0, 1]} hide />
      <YAxis
        type="number"
        dataKey="y"
        domain={yDomain}
        width={AXIS_WIDTH}
        tick={{ fill: 'var(--color-muted)', fontSize: 14 }}
      />
      {/* A single dummy datum (matching the tiles' dummyPoint) so Recharts
          establishes the y-scale and emits ticks; emptyShape draws nothing. */}
      <Scatter
        data={[{ x: 0.5, y: yDomain[0] }]}
        shape={emptyShape}
        isAnimationActive={false}
      />
    </ComposedChart>
  )
}
