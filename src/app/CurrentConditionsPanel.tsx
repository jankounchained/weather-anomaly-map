// Split from AnomalyCard (06-03, LAYOUT-01/PD-01/PD-09): renders today's
// measured temperature as its own self-explanatory panel. Mirrors
// AnomalyCard's sequential Empty/Loading/Error/Populated early-return
// branching, each wrapped in the shared PanelShell + PanelHeadline
// primitives (06-01). The loading branch routes through the ONE shared
// isAnomalyReady predicate (PD-10) - never re-derives the
// `=== 'resolved'` comparison inline - so this panel and DeltaPanel can
// never drift apart on the combined gate (no partial reveal, T-06-07).
// All dynamic text (the temperature) renders as ordinary JSX text nodes
// only - never through a raw-HTML sink (T-01-02/T-02-07/T-06-05).
import { isAnomalyReady } from '../anomaly/anomaly'
import type { WeatherStatus } from '../weather/types'
import { InfoTooltip } from './InfoTooltip'
import { PanelHeadline } from './PanelHeadline'
import { PanelShell } from './PanelShell'

export interface CurrentConditionsPanelProps {
  /** Whether a pin has been placed (independent of hook status, see App.tsx). */
  hasSelection: boolean
  currentStatus: WeatherStatus
  baselineStatus: WeatherStatus
  tempC: number | null
  units: string | null
}

export function CurrentConditionsPanel({
  hasSelection,
  currentStatus,
  baselineStatus,
  tempC,
  units,
}: CurrentConditionsPanelProps) {
  if (!hasSelection) {
    return (
      <PanelShell>
        <PanelHeadline>Current Conditions</PanelHeadline>
        <p className="m-0 text-body font-body">
          Drop a pin to see today&apos;s current temperature here.
        </p>
      </PanelShell>
    )
  }

  // PD-10: same combined gate as DeltaPanel/TrendRow, routed through the
  // one shared predicate so the temperature can never appear before the
  // anomaly resolves.
  if (!isAnomalyReady(currentStatus, baselineStatus)) {
    return (
      <PanelShell>
        <PanelHeadline>Current Conditions</PanelHeadline>
        <div className="flex flex-row items-center gap-sm" role="status">
          <span
            className="size-4 shrink-0 rounded-full border-2 border-accent border-t-transparent animate-location-spin"
            aria-hidden="true"
          />
          <p className="m-0 text-body font-body">
            Calculating today&apos;s conditions…
          </p>
        </div>
      </PanelShell>
    )
  }

  if (tempC === null) {
    return (
      <PanelShell>
        <PanelHeadline>Current Conditions</PanelHeadline>
        <p className="m-0 text-body font-body text-destructive">
          Temperature unavailable for this location.
        </p>
      </PanelShell>
    )
  }

  return (
    <PanelShell>
      <PanelHeadline>Current Conditions</PanelHeadline>
      <div className="flex flex-row items-center justify-between gap-sm">
        <p className="m-0 text-display font-display">
          {Math.round(tempC)}
          {units}
        </p>
        <InfoTooltip label="About the current temperature reading">
          Based on modeled climate data for this area (~9–25km resolution),
          not a physical station exactly at this point.
        </InfoTooltip>
      </div>
      <p className="m-0 text-body font-body">Today&apos;s measured temperature.</p>
    </PanelShell>
  )
}
