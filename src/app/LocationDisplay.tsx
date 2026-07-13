// Renders exactly one of Empty / Loading / Resolved / coordinate-Fallback,
// per UI-SPEC's Component Inventory and Copywriting Contract. All dynamic
// text (place name, coordinates) renders as ordinary JSX text nodes only -
// never through a raw-HTML sink - so a tampered geocode response cannot
// inject markup (T-01-02).
import { formatCoords } from '../lib/coords'
import type { ReverseGeocodeStatus } from '../geocoding/types'

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
      <div className="location-display location-display--empty">
        <h2 className="location-display__heading">No location selected</h2>
        <p className="location-display__body">
          Click anywhere on the map to drop a pin and see its place name
          here.
        </p>
      </div>
    )
  }

  if (status !== 'resolved') {
    return (
      <div
        className="location-display location-display--loading"
        role="status"
      >
        <span className="location-display__spinner" aria-hidden="true" />
        <p className="location-display__body">Looking up place name…</p>
      </div>
    )
  }

  if (name) {
    return (
      <div className="location-display location-display--resolved">
        <h2 className="location-display__heading">{name}</h2>
      </div>
    )
  }

  // Resolved but no usable name (failure/timeout/no-name-fields) - silent
  // fallback to coordinates, no error banner (D-02).
  return (
    <div className="location-display location-display--fallback">
      <p className="location-display__label">{formatCoords(lat, lng)}</p>
    </div>
  )
}
