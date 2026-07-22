// Always-visible methodology disclosure (EXPLAIN-03, PD-09/PD-10/PD-11).
// Unlike every other panel, this one takes no props and is not gated on
// hasSelection/anomaly resolution - it mounts unconditionally as the final
// LocationPanel child so a first-time visitor can read "what/how" before
// (or after) dropping a pin. Composed from the Phase 6 PanelShell primitive
// wrapping a native <details>/<summary> - the browser owns all open/close
// and keyboard behavior, so no React state is needed here (unlike
// InfoTooltip's floating/portaled popover). The <summary> carries
// PanelHeadline's exact class string directly (not the PanelHeadline
// component, which renders a <p> - invalid/confusing nested inside
// <summary>, RESEARCH Pitfall 2). All copy is static/authored, rendered as
// ordinary JSX text nodes only (PD-08, no raw-HTML sink).
import { PanelShell } from './PanelShell'

const SUMMARY_CLASSES =
  'text-label leading-[1.5] font-semibold text-muted uppercase tracking-[0.05em]' +
  ' flex items-center justify-between gap-sm cursor-pointer list-none' +
  ' [&::-webkit-details-marker]:hidden' +
  ' focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent'

export function MethodologyPanel() {
  return (
    <PanelShell>
      <details className="group">
        <summary className={SUMMARY_CLASSES}>
          How This Works
          <span
            aria-hidden="true"
            className="text-muted motion-safe:transition-transform motion-safe:duration-200 group-open:rotate-90"
          >
            ▸
          </span>
        </summary>
        <div className="flex flex-col gap-sm pt-sm">
          <div>
            <p className="m-0 text-label font-label">What This Shows</p>
            <p className="m-0 text-body font-body">
              This tool shows how unusual today&apos;s temperature is at any location,
              compared to what&apos;s typical for that exact calendar day over the past 30 years.
            </p>
          </div>
          <div>
            <p className="m-0 text-label font-label">How It&apos;s Computed</p>
            <p className="m-0 text-body font-body">
              We pull a 30-year historical baseline for this spot from Open-Meteo&apos;s
              archive — temperatures within 5 days of today&apos;s date, every year. We average
              those readings to get a &apos;typical&apos; value for this date. Today&apos;s reading minus
              that average gives the delta (Δ) in °C. The z-score expresses that same gap in
              standard deviations, so it stays comparable across places with different
              day-to-day variability. The percentile shows where today ranks among those
              historical years for this date.
            </p>
          </div>
          <p className="m-0 text-body font-body">
            Current and historical data comes from Open-Meteo, using ERA5 reanalysis for
            the 30-year baseline — modeled climate data, not a single weather station, which
            is why the delta is shown in whole degrees rather than decimals. Some remote
            locations (oceans, deserts) don&apos;t have enough historical coverage, so the
            anomaly and percentile may be unavailable there.
          </p>
        </div>
      </details>
    </PanelShell>
  )
}
