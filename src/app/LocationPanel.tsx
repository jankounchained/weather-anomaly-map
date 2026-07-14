// Docked info panel shell (UI-SPEC "Layout & Interaction Notes").
// Houses LocationDisplay in its top section and renders optional children
// (the Phase 2/3 anomaly/chart content) stacked below it.
import type { ReactNode } from 'react'
import { LocationDisplay, type LocationDisplayProps } from './LocationDisplay'

export interface LocationPanelProps extends LocationDisplayProps {
  children?: ReactNode
}

export function LocationPanel({ children, ...props }: LocationPanelProps) {
  return (
    <aside className="location-panel">
      <div className="location-panel__content">
        <LocationDisplay {...props} />
        {children}
      </div>
    </aside>
  )
}
