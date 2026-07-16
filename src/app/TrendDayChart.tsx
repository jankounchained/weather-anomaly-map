// Renders exactly one of two states for a single day (D-12, D-14): a
// Recharts dot/strip distribution chart (populated) or a bordered "Not
// enough data" placeholder - one visual path whether the cause is a
// genuine data desert or a fetch-timing gap. Mirrors AnomalyCard's
// sequential early-return branching pattern. All dynamic text (weekday
// label, placeholder copy, the actual-marker tooltip) renders as ordinary
// JSX text nodes or a native SVG <title>/aria-label - never through a
// raw-HTML sink (T-03-02).
//
// No auto-sizing container is used (explicit width/height props instead) -
// jsdom has no ResizeObserver (03-RESEARCH.md Pitfall 3). The mean
// ReferenceLine uses ifOverflow="visible" (never the recharts default
// "discard") so an edge-case mean never silently vanishes (Pitfall 2, D-03).
//
// 03-05 gap closure (VIZ-02 Gap 1): every TrendDayChart instance now keeps
// its own YAxis hidden - the Y-axis is rendered exactly once, via the
// exported TrendYAxisColumn below, in its own narrow explicit-width column
// to the LEFT of the 7-tile row (see TrendRow.tsx). This makes all 7 tiles
// present an identical plot-area width instead of the leftmost slot being
// squeezed by inline tick labels sharing its fixed chart width.
// formatActualTooltip also gained two defensive guards (03-REVIEW.md
// IN-01/IN-03): a malformed dateStr falls back to the raw string rather
// than throwing during render, and a null units falls back to a sensible
// default rather than leaving a dangling degree symbol.
//
// Cites: D-01, D-02, D-03, D-04, D-06, D-08, D-12, D-14, VIZ-02.
import { useMemo } from 'react'
import {
  ComposedChart,
  Scatter,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'
import type { ScatterShapeProps } from 'recharts'
import { formatDelta } from '../anomaly/anomaly'
import type { TrendDayResult } from '../anomaly/types'
import { buildHistoricalPoints, formatSlotLabel } from './trend'

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

/** Formats the actual-marker tooltip copy per 03-UI-SPEC.md's Copywriting
 * Contract: "{Mon D} — {rounded temp}°{units} ({+/-N}° vs. 30-yr avg)". */
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

/** Custom shape for the historical dots (D-01, D-04): a small translucent
 * circle, no per-point tooltip - the dots represent the distribution, not
 * individually-labeled data points. */
function historicalDotShape(props: ScatterShapeProps) {
  const { cx, cy } = props
  if (cx === undefined || cy === undefined) return <g />
  return <circle cx={cx} cy={cy} r={3} fill="var(--color-chart-historical)" />
}

/** Custom shape for the actual-value marker (D-02): a diamond filled
 * --color-chart-actual with a 1px white stroke, wrapping a native SVG
 * <title> for the hover tooltip - never a raw-HTML sink. */
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

  const historicalPoints = useMemo(
    () => (day.usable ? buildHistoricalPoints(day.samples) : []),
    [day],
  )

  if (!day.usable) {
    return (
      <div className="flex flex-col w-[88px] gap-xs">
        <p className={labelClassName}>{label}</p>
        <div
          className="w-[88px] h-[120px] flex items-center justify-center text-center p-xs bg-dominant border border-border-subtle rounded-[8px] text-muted text-label leading-[1.5] box-border"
          title="Not enough history for this day"
          aria-label="Not enough history for this day"
        >
          Not enough data
        </div>
      </div>
    )
  }

  const actualPoint = [{ x: 0.5, y: day.actual }]
  const tooltipText = formatActualTooltip(
    day.dateStr,
    day.actual,
    day.mean,
    units,
  )

  return (
    <div className="flex flex-col w-[88px] gap-xs">
      <p className={labelClassName}>{label}</p>
      <ComposedChart width={CHART_WIDTH} height={CHART_HEIGHT}>
        <XAxis type="number" dataKey="x" domain={[0, 1]} hide />
        <YAxis
          type="number"
          dataKey="y"
          domain={yDomain}
          hide={!showYAxis}
          width={AXIS_WIDTH}
          tick={{ fill: 'var(--color-muted)', fontSize: 14 }}
        />
        <Scatter
          data={historicalPoints}
          shape={historicalDotShape}
          isAnimationActive={false}
        />
        <ReferenceLine
          y={day.mean}
          stroke="var(--color-chart-mean)"
          strokeWidth={2}
          ifOverflow="visible"
        />
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
 * Pitfall 3). */
export function TrendYAxisColumn({ yDomain }: TrendYAxisColumnProps) {
  return (
    <ComposedChart width={AXIS_WIDTH} height={CHART_HEIGHT}>
      <XAxis type="number" dataKey="x" domain={[0, 1]} hide />
      <YAxis
        type="number"
        dataKey="y"
        domain={yDomain}
        width={AXIS_WIDTH}
        tick={{ fill: 'var(--color-muted)', fontSize: 14 }}
      />
      <Scatter data={[]} shape={emptyShape} isAnimationActive={false} />
    </ComposedChart>
  )
}
