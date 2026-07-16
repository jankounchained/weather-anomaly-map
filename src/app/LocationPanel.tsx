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
    <aside className="flex-[0_0_760px] w-[760px] h-full bg-secondary flex flex-col py-lg px-md box-border overflow-y-auto">
      <div className="flex flex-col gap-md">
        <LocationDisplay {...props} />
        {children}
      </div>
    </aside>
  )
}
