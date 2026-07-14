// Renders exactly one of Empty / Loading / Error / Anomaly, mirroring
// LocationDisplay's sequential-early-return branching pattern. The loading
// branch is a *combined* gate (D-09): both currentStatus AND
// baselineStatus must be 'resolved' before anything is revealed - no
// progressive reveal where the current temperature pops in before the
// anomaly finishes computing. All dynamic text (temperature, delta,
// verdict, z-score) renders as ordinary JSX text nodes only - never
// through a raw-HTML sink (T-02-07).
import { formatDelta, verdictLabel } from '../anomaly/anomaly'
import type { VerdictTier } from '../anomaly/types'
import type { WeatherStatus } from '../weather/types'

export interface AnomalyCardProps {
  /** Whether a pin has been placed (independent of hook status, see App.tsx). */
  hasSelection: boolean
  currentStatus: WeatherStatus
  baselineStatus: WeatherStatus
  tempC: number | null
  units: string | null
  anomaly: { delta: number; zScore: number | null; verdictTier: VerdictTier } | null
}

export function AnomalyCard({
  hasSelection,
  currentStatus,
  baselineStatus,
  tempC,
  units,
  anomaly,
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

  // D-09: single combined loading state for the whole card - wait for BOTH
  // the current-conditions call and the 30-year baseline call to resolve
  // before revealing delta + z-score + verdict together.
  if (currentStatus !== 'resolved' || baselineStatus !== 'resolved') {
    return (
      <div className="anomaly-card anomaly-card--loading" role="status">
        <span className="anomaly-card__spinner" aria-hidden="true" />
        <p className="anomaly-card__body">
          Calculating today&apos;s anomaly…
        </p>
      </div>
    )
  }

  if (tempC === null || anomaly === null) {
    return (
      <div className="anomaly-card anomaly-card--error">
        <p className="anomaly-card__body">
          Couldn&apos;t compute an anomaly here.
        </p>
      </div>
    )
  }

  return (
    <div className="anomaly-card anomaly-card--resolved">
      <div className="anomaly-card__header">
        <p className="anomaly-card__temp">
          {Math.round(tempC)}
          {units}
        </p>
        <button
          type="button"
          className="anomaly-card__info"
          aria-label="Data quality info"
          title="Based on modeled climate data for this area (~9-25km resolution)"
        >
          i
        </button>
      </div>
      <p className="anomaly-card__delta">{formatDelta(anomaly.delta)}°C</p>
      <p className="anomaly-card__verdict">{verdictLabel(anomaly.verdictTier)}</p>
      <p className="anomaly-card__zscore">
        {anomaly.zScore === null
          ? 'z — (too little variance to compute)'
          : `z ${anomaly.zScore.toFixed(1)}`}
      </p>
    </div>
  )
}
