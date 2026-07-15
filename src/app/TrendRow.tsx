// Composes the "Last 7 Days" eyebrow heading + 7x TrendDayChart, computing
// the shared padded y-domain once (D-06) and passing it identically to
// every child. Renders nothing (not 7 placeholders, not a second error) if
// `days` is null/empty - App only passes a valid array once both
// current+baseline hooks resolve with a usable recentDaily series; a total
// outage is already surfaced once by AnomalyCard above (03-UI-SPEC.md
// gating). Today is always the rightmost slot (D-08); only the leftmost
// chart shows y-axis ticks, all charts share the identical domain (D-06).
//
// Cites: D-05, D-06, D-07, D-08, VIZ-01, VIZ-02.
import type { TrendDayResult } from '../anomaly/types'
import { computeSharedYDomain } from './trend'
import { TrendDayChart } from './TrendDayChart'

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
      <div className="trend-row__charts">
        {days.map((day, index) => (
          <TrendDayChart
            key={day.dateStr}
            day={day}
            yDomain={yDomain}
            units={units}
            isToday={index === days.length - 1}
            showYAxis={index === 0}
          />
        ))}
      </div>
    </section>
  )
}
