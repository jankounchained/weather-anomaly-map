// Composes the "Last 7 Days" eyebrow heading, a single shared Y-axis
// column, and 7x TrendDayChart - computing the shared padded y-domain once
// (D-06) and passing it identically to the axis column and every chart.
// Renders nothing (not 7 placeholders, not a second error) if `days` is
// null/empty - App only passes a valid array once both current+baseline
// hooks resolve with a usable recentDaily series; a total outage is
// already surfaced once by AnomalyCard above (03-UI-SPEC.md gating). Today
// is always the rightmost slot (D-08); all 7 charts share the identical
// domain (D-06).
//
// 03-05 gap closure (Task 1): the Y-axis is now rendered exactly once, via
// TrendYAxisColumn, in its own column to the left of the 7-tile row -
// every TrendDayChart tile passes showYAxis={false}, so all 7 tiles
// present an identical plot-area width (VIZ-02 Gap 1).
//
// Cites: D-05, D-06, D-07, D-08, VIZ-01, VIZ-02.
import type { TrendDayResult } from '../anomaly/types'
import { computeSharedYDomain } from './trend'
import { TrendDayChart, TrendYAxisColumn } from './TrendDayChart'

export interface TrendRowProps {
  days: TrendDayResult[] | null
  units: string | null
}

export function TrendRow({ days, units }: TrendRowProps) {
  if (days === null || days.length === 0) {
    return null
  }

  const yDomain = computeSharedYDomain(days)

  return (
    <section className="trend-row">
      <p className="trend-row__heading">Last 7 Days</p>
      <div className="trend-row__body">
        <div className="trend-row__axis">
          <span className="trend-row__axis-spacer" aria-hidden="true" />
          <TrendYAxisColumn yDomain={yDomain} />
        </div>
        <div className="trend-row__charts">
          {days.map((day, index) => (
            <TrendDayChart
              key={day.dateStr}
              day={day}
              yDomain={yDomain}
              units={units}
              isToday={index === days.length - 1}
              showYAxis={false}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
