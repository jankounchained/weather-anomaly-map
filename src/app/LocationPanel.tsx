// Docked info panel shell (UI-SPEC "Layout & Interaction Notes").
// Houses LocationDisplay in its top section and renders optional children
// (the Phase 2/3 anomaly/chart content) stacked below it.
import type { CSSProperties, ReactNode } from 'react'
import { LocationDisplay, type LocationDisplayProps } from './LocationDisplay'

export interface LocationPanelProps extends LocationDisplayProps {
  children?: ReactNode
  /** Computed anomaly-hue color (#rrggbb), bridged into the CSS custom
   * property that drives the panel's gradient backdrop (App.tsx). */
  anomalyColorValue: string
  /** Whether the pin's local time is night, applying the atmospheric wash
   * over the gradient backdrop (App.tsx). */
  isNight: boolean
}

export function LocationPanel({
  children,
  anomalyColorValue,
  isNight,
  ...props
}: LocationPanelProps) {
  const { hasSelection } = props
  return (
    <aside
      className={
        hasSelection
          ? `relative panel-backdrop${isNight ? ' is-night' : ''} motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-out flex-[0_0_760px] w-[760px] h-full flex flex-col py-lg px-md box-border overflow-y-auto`
          : 'flex-[0_0_760px] w-[760px] h-full bg-secondary flex flex-col py-lg px-md box-border overflow-y-auto'
      }
      style={
        hasSelection
          ? ({ '--anomaly-color': anomalyColorValue } as CSSProperties)
          : undefined
      }
    >
      <div className="flex flex-col gap-md">
        <LocationDisplay {...props} />
        {children}
      </div>
    </aside>
  )
}
