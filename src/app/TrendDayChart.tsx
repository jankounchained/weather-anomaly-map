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

/** Formats the actual-marker tooltip copy per 03-UI-SPEC.md's Copywriting
 * Contract: "{Mon D} — {rounded temp}°{units} ({+/-N}° vs. 30-yr avg)". */
function formatActualTooltip(
  dateStr: string,
  actual: number,
  meanValue: number,
  units: string | null,
): string {
  const date = new Date(`${dateStr}T00:00:00Z`)
  const monthDay = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
  const roundedActual = Math.round(actual)
  const delta = formatDelta(actual - meanValue)
  return `${monthDay} — ${roundedActual}°${units ?? ''} (${delta}° vs. 30-yr avg)`
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
    ? 'trend-day__label trend-day__label--today'
    : 'trend-day__label'

  const historicalPoints = useMemo(
    () => (day.usable ? buildHistoricalPoints(day.samples) : []),
    [day],
  )

  if (!day.usable) {
    return (
      <div className="trend-day">
        <p className={labelClassName}>{label}</p>
        <div
          className="trend-day__placeholder"
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
    <div className="trend-day">
      <p className={labelClassName}>{label}</p>
      <ComposedChart width={CHART_WIDTH} height={CHART_HEIGHT}>
        <XAxis type="number" dataKey="x" domain={[0, 1]} hide />
        <YAxis
          type="number"
          dataKey="y"
          domain={yDomain}
          hide={!showYAxis}
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
