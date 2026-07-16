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
      <div className="flex flex-col gap-sm bg-[rgba(255,255,255,0.72)] border border-glass-border rounded-glass-lg shadow-glass backdrop-blur-lg p-lg">
        <p className="m-0 text-body font-body">
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
      <div
        className="flex flex-row items-center gap-sm bg-[rgba(255,255,255,0.72)] border border-glass-border rounded-glass-lg shadow-glass backdrop-blur-lg p-lg"
        role="status"
      >
        <span
          className="size-4 shrink-0 rounded-full border-2 border-accent border-t-transparent animate-location-spin"
          aria-hidden="true"
        />
        <p className="m-0 text-body font-body">
          Calculating today&apos;s anomaly…
        </p>
      </div>
    )
  }

  if (tempC === null || anomaly === null) {
    return (
      <div className="flex flex-col gap-sm bg-[rgba(255,255,255,0.72)] border border-glass-border rounded-glass-lg shadow-glass backdrop-blur-lg p-lg">
        <p className="m-0 text-body font-body text-destructive">
          Couldn&apos;t compute an anomaly here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-xs bg-[rgba(255,255,255,0.72)] border border-glass-border rounded-glass-lg shadow-glass backdrop-blur-lg p-lg">
      <div className="flex flex-row items-center justify-between gap-sm">
        <p className="m-0 text-display font-display">
          {Math.round(tempC)}
          {units}
        </p>
        <button
          type="button"
          className="h-5 w-5 shrink-0 rounded-full border border-accent bg-transparent p-0 text-accent text-label font-heading leading-none cursor-help [font-family:initial]"
          aria-label="Data quality info"
          title="Based on modeled climate data for this area (~9-25km resolution)"
        >
          i
        </button>
      </div>
      <p
        style={{ color: 'var(--anomaly-color)' }}
        className="m-0 text-[calc(var(--text-display)*1.7)] font-bold leading-[1.1] motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-out"
      >
        {formatDelta(anomaly.delta)}°C
      </p>
      <p className="m-0 text-heading font-heading">{verdictLabel(anomaly.verdictTier)}</p>
      <p className="mt-xs inline-block w-fit text-label font-label text-muted bg-secondary rounded-full py-[2px] px-sm">
        {anomaly.zScore === null
          ? 'z — (too little variance to compute)'
          : `z ${anomaly.zScore.toFixed(1)}`}
      </p>
    </div>
  )
}
