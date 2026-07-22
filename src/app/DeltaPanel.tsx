// Split from AnomalyCard (06-03, LAYOUT-01/LAYOUT-03/PD-01/PD-09): renders
// the Δ number, verdict, and z-score chip as their own self-explanatory
// panel and the dominant focal point of the view. Mirrors AnomalyCard's
// sequential Empty/Loading/Error/Populated early-return branching, each
// wrapped in the shared PanelShell + PanelHeadline primitives (06-01). The
// loading branch routes through the ONE shared isAnomalyReady predicate
// (PD-10) - never re-derives the `=== 'resolved'` comparison inline - so
// this panel and CurrentConditionsPanel can never drift apart on the
// combined gate (no partial reveal, T-06-07). Populated-branch internal
// order is locked by PD-07: headline -> Δ number (47.6px,
// var(--anomaly-color), Δ-glyph-led, dominance rule preserved verbatim
// from AnomalyCard) -> micro-copy -> verdict (demoted/secondary) ->
// z-score chip. All dynamic text (delta, verdict, z-score) renders as
// ordinary JSX text nodes only - never through a raw-HTML sink
// (T-01-02/T-02-07/T-06-05).
import {
  formatDelta,
  isAnomalyReady,
  verdictLabel,
  type AnomalyForToday,
} from '../anomaly/anomaly'
import type { WeatherStatus } from '../weather/types'
import { InfoTooltip } from './InfoTooltip'
import { PanelHeadline } from './PanelHeadline'
import { PanelShell } from './PanelShell'

export interface DeltaPanelProps {
  /** Whether a pin has been placed (independent of hook status, see App.tsx). */
  hasSelection: boolean
  currentStatus: WeatherStatus
  baselineStatus: WeatherStatus
  anomaly: AnomalyForToday | null
}

export function DeltaPanel({
  hasSelection,
  currentStatus,
  baselineStatus,
  anomaly,
}: DeltaPanelProps) {
  if (!hasSelection) {
    return (
      <PanelShell>
        <PanelHeadline>Delta</PanelHeadline>
        <p className="m-0 text-body font-body">
          Drop a pin to see how today compares to the 30-year average.
        </p>
      </PanelShell>
    )
  }

  // PD-10: same combined gate as CurrentConditionsPanel/TrendRow, routed
  // through the one shared predicate so this panel can never drift apart
  // and reveal delta/z-score before the anomaly resolves.
  if (!isAnomalyReady(currentStatus, baselineStatus)) {
    return (
      <PanelShell>
        <PanelHeadline>Delta</PanelHeadline>
        <div className="flex flex-row items-center gap-sm" role="status">
          <span
            className="size-4 shrink-0 rounded-full border-2 border-accent border-t-transparent animate-location-spin"
            aria-hidden="true"
          />
          <p className="m-0 text-body font-body">
            Calculating today&apos;s anomaly…
          </p>
        </div>
      </PanelShell>
    )
  }

  if (anomaly === null) {
    return (
      <PanelShell>
        <PanelHeadline>Delta</PanelHeadline>
        <p className="m-0 text-body font-body text-destructive">
          Couldn&apos;t compute an anomaly here.
        </p>
      </PanelShell>
    )
  }

  return (
    <PanelShell>
      <PanelHeadline>Delta</PanelHeadline>
      <div className="flex flex-row items-start justify-between gap-sm">
        <p
          style={{ color: 'var(--anomaly-color)' }}
          className="m-0 text-[calc(var(--text-display)*1.7)] font-bold leading-[1.1] motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-out"
          aria-label={`Anomaly delta versus 30-year average: ${formatDelta(anomaly.delta)} degrees Celsius`}
        >
          <span className="opacity-70">Δ</span>
          {formatDelta(anomaly.delta)}°C
        </p>
        <InfoTooltip label="About the delta and z-score">
          Δ is today&apos;s temperature minus the 30-year historical average
          for this exact calendar day. The z-score below expresses the same
          gap in standard deviations, so it stays comparable across
          locations with different day-to-day variability.
        </InfoTooltip>
      </div>
      <p className="m-0 text-body font-body">
        How today compares to the 30-year average for this date.
      </p>
      <p className="m-0 text-heading font-heading">{verdictLabel(anomaly.verdictTier)}</p>
      <p className="mt-xs inline-block w-fit text-label font-label text-muted bg-secondary rounded-full py-[2px] px-sm">
        {anomaly.zScore === null
          ? 'z — (too little variance to compute)'
          : `z ${anomaly.zScore.toFixed(1).replace('-0.0', '0.0')}`}
      </p>
    </PanelShell>
  )
}
