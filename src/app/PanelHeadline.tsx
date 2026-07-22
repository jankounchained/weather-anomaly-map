// Shared eyebrow-headline primitive (LAYOUT-02) - the verbatim style source
// is TrendRow.tsx line 38's "Last 7 Days" eyebrow, the existing exemplar
// every other panel headline (Location, Current Conditions, Delta) must
// match. Do not restyle - see 06-UI-SPEC.md Component Inventory.
import type { ReactNode } from 'react'

export interface PanelHeadlineProps {
  children: ReactNode
}

export function PanelHeadline({ children }: PanelHeadlineProps) {
  return (
    <p className="m-0 text-label leading-[1.5] font-semibold text-muted uppercase tracking-[0.05em]">
      {children}
    </p>
  )
}
