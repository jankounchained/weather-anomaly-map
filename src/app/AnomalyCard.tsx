// Renders exactly one of Empty / Loading / Error / Current-temperature,
// mirroring LocationDisplay's sequential-early-return branching pattern.
// All dynamic text (temperature, units) renders as ordinary JSX text nodes
// only - never through a raw-HTML sink (T-02-03).
//
// NOTE: Plan 02 extends this component with the anomaly (delta/verdict/
// z-score) and the D-09 combined loading gate (currentStatus AND
// baselineStatus both resolved) - do not build those here.
import type { WeatherStatus } from '../weather/types'

export interface AnomalyCardProps {
  /** Whether a pin has been placed (independent of hook status, see App.tsx). */
  hasSelection: boolean
  currentStatus: WeatherStatus
  tempC: number | null
  units: string | null
}

export function AnomalyCard({
  hasSelection,
  currentStatus,
  tempC,
  units,
}: AnomalyCardProps) {
  if (!hasSelection) {
    return (
      <div className="anomaly-card anomaly-card--empty">
        <p className="anomaly-card__body">
          Drop a pin to see today&apos;s current conditions.
        </p>
      </div>
    )
  }

  if (currentStatus !== 'resolved') {
    return (
      <div className="anomaly-card anomaly-card--loading" role="status">
        <span className="anomaly-card__spinner" aria-hidden="true" />
        <p className="anomaly-card__body">Loading current conditions…</p>
      </div>
    )
  }

  if (tempC === null) {
    return (
      <div className="anomaly-card anomaly-card--error">
        <p className="anomaly-card__body">
          Couldn&apos;t load current conditions.
        </p>
      </div>
    )
  }

  return (
    <div className="anomaly-card anomaly-card--current">
      <p className="anomaly-card__temp">
        {Math.round(tempC)}
        {units}
      </p>
    </div>
  )
}
