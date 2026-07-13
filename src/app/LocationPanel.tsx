// Docked info panel shell (UI-SPEC "Layout & Interaction Notes").
// Houses LocationDisplay in its top section and reserves the space below
// for the anomaly/chart content stacked in Phase 2/3.
import { LocationDisplay, type LocationDisplayProps } from './LocationDisplay'

export type LocationPanelProps = LocationDisplayProps

export function LocationPanel(props: LocationPanelProps) {
  return (
    <aside className="location-panel">
      <div className="location-panel__content">
        <LocationDisplay {...props} />
      </div>
    </aside>
  )
}
