// Composes the "Last 7 Days" eyebrow heading, a single shared Y-axis
// column, 7x TrendDayChart, and the persistent TrendLegend - computing the
// shared padded y-domain once (D-06) and passing it identically to the
// axis column and every chart. Renders nothing (not 7 placeholders, not a
// second error) if `days` is null/empty - App only passes a valid array
// once both current+baseline hooks resolve with a usable recentDaily
// series; a total outage is already surfaced once by AnomalyCard above
// (03-UI-SPEC.md gating). Today is always the rightmost slot (D-08); all 7
// charts share the identical domain (D-06).
//
// 03-05 gap closure: the Y-axis is now rendered exactly once, via
// TrendYAxisColumn, in its own column to the left of the 7-tile row -
// every TrendDayChart tile passes showYAxis={false}, so all 7 tiles
// present an identical plot-area width (VIZ-02 Gap 1). A persistent
// TrendLegend renders below the row explaining the dot/line/diamond marks
// without requiring a hover (VIZ-02 Gap 2).
//
// 06-02 (LAYOUT-02): the outer glass card + inline eyebrow are now
// PanelShell + PanelHeadline (verbatim-styled, same primitives every panel
// uses), and the row gained UI-SPEC-authored empty/loading/error branches
// so History is self-explanatory in every state, not only when populated.
// The chart-internals block below (TrendYAxisColumn + 7x TrendDayChart +
// TrendLegend) is untouched - Phase 8 rebuilds on this stable wrapper.
//
// Cites: D-05, D-06, D-07, D-08, VIZ-01, VIZ-02, LAYOUT-02.
import { isAnomalyReady } from '../anomaly/anomaly'
import type { TrendDayResult } from '../anomaly/types'
import type { WeatherStatus } from '../weather/types'
import { PanelHeadline } from './PanelHeadline'
import { PanelLoadingState } from './PanelLoadingState'
import { PanelShell } from './PanelShell'
import { computeSharedYDomain } from './trend'
import { TrendDayChart, TrendYAxisColumn } from './TrendDayChart'
import { TrendLegend } from './TrendLegend'

export interface TrendRowProps {
  /** Whether a pin has been placed (independent of hook status, see App.tsx). */
  hasSelection: boolean
  currentStatus: WeatherStatus
  baselineStatus: WeatherStatus
  days: TrendDayResult[] | null
  units: string | null
}

export function TrendRow({
  hasSelection,
  currentStatus,
  baselineStatus,
  days,
  units,
}: TrendRowProps) {
  if (!hasSelection) {
    return (
      <PanelShell as="section">
        <PanelHeadline>Last 7 Days</PanelHeadline>
        <p className="m-0 text-body font-body">
          Drop a pin to see the last 7 days of temperatures here.
        </p>
      </PanelShell>
    )
  }

  // Same combined D-09/PD-10 gate as Current Conditions/Delta - routed
  // through the one shared predicate so this row can never drift out of
  // sync with the anomaly panels' loading state.
  if (!isAnomalyReady(currentStatus, baselineStatus)) {
    return (
      <PanelShell as="section">
        <PanelHeadline>Last 7 Days</PanelHeadline>
        <PanelLoadingState label="Loading the last 7 days…" />
      </PanelShell>
    )
  }

  if (days === null || days.length === 0) {
    return (
      <PanelShell as="section">
        <PanelHeadline>Last 7 Days</PanelHeadline>
        <p className="m-0 text-body font-body text-destructive">
          Recent history unavailable for this location.
        </p>
      </PanelShell>
    )
  }

  const yDomain = computeSharedYDomain(days)

  return (
    <PanelShell as="section">
      <PanelHeadline>Last 7 Days</PanelHeadline>
      <div className="flex flex-row items-start gap-sm">
        <div className="flex flex-col flex-none gap-xs">
          <span className="block h-4" aria-hidden="true" />
          <TrendYAxisColumn yDomain={yDomain} />
        </div>
        <div className="flex flex-row items-start gap-sm">
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
      <TrendLegend />
    </PanelShell>
  )
}
