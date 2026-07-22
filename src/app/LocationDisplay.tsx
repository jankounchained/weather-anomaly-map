// Renders exactly one of Empty / Loading / Resolved / coordinate-Fallback,
// per UI-SPEC's Component Inventory and Copywriting Contract. All dynamic
// text (place name, coordinates) renders as ordinary JSX text nodes only -
// never through a raw-HTML sink - so a tampered geocode response cannot
// inject markup (T-01-02).
import { formatCoords } from '../lib/coords'
import type { ReverseGeocodeStatus } from '../geocoding/types'
import { PanelHeadline } from './PanelHeadline'
import { PanelLoadingState } from './PanelLoadingState'
import { PanelShell } from './PanelShell'

export interface LocationDisplayProps {
  /** Whether a pin has been placed (independent of hook status, see App.tsx). */
  hasSelection: boolean
  status: ReverseGeocodeStatus
  name: string | null
  lat: number
  lng: number
}

export function LocationDisplay({
  hasSelection,
  status,
  name,
  lat,
  lng,
}: LocationDisplayProps) {
  if (!hasSelection) {
    return (
      <PanelShell>
        <PanelHeadline>Location</PanelHeadline>
        <h2 className="m-0 text-heading font-heading">No location selected</h2>
        <p className="m-0 text-body font-body">
          Click anywhere on the map to drop a pin and see its place name
          here.
        </p>
      </PanelShell>
    )
  }

  if (status !== 'resolved') {
    return (
      <PanelShell>
        <PanelHeadline>Location</PanelHeadline>
        <PanelLoadingState label="Looking up place name…" />
      </PanelShell>
    )
  }

  if (name) {
    return (
      <PanelShell>
        <PanelHeadline>Location</PanelHeadline>
        <h2 className="m-0 text-heading font-heading">{name}</h2>
      </PanelShell>
    )
  }

  // Resolved but no usable name (failure/timeout/no-name-fields) - silent
  // fallback to coordinates, no error banner (D-02).
  return (
    <PanelShell>
      <PanelHeadline>Location</PanelHeadline>
      <p className="m-0 text-label font-label">{formatCoords(lat, lng)}</p>
    </PanelShell>
  )
}
