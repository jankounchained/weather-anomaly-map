// Shared glass-card wrapper (LAYOUT-02, PD-06) - extracts the tokenized
// glass class string duplicated across LocationDisplay.tsx, TrendRow.tsx,
// and AnomalyCard.tsx (the latter's non-tokenized `bg-[rgba(...)]` variant
// is drift this primitive resolves toward the canonical `bg-glass-surface`
// form, per 06-PATTERNS.md). Every panel (Location, Current Conditions,
// Delta, History) and the InfoTooltip popover share this identical shell -
// no elevated shadow/tint/glow anywhere (PD-06: dominance comes from
// content, not card treatment).
import type { ReactNode } from 'react'

export interface PanelShellProps {
  children: ReactNode
  /** Semantic element to render (PD-08/UI-SPEC Component Inventory). Defaults to 'div'. */
  as?: 'div' | 'section' | 'aside'
  /** Appended after the base glass classes (e.g. InfoTooltip's `max-w-[240px]`). */
  className?: string
  /** Forwarded to the root element - lets InfoTooltip's popover carry
   * id/role/aria-label on the SAME element that has the glass classes,
   * without restyling or duplicating the shell (Task 3, EXPLAIN-02). */
  id?: string
  role?: string
  'aria-label'?: string
}

const BASE_CLASSES =
  'flex flex-col gap-sm bg-glass-surface border border-glass-border rounded-glass-lg shadow-glass backdrop-blur-lg px-md py-md'

export function PanelShell({
  children,
  as = 'div',
  className,
  id,
  role,
  'aria-label': ariaLabel,
}: PanelShellProps) {
  const Element = as
  const classes = className ? `${BASE_CLASSES} ${className}` : BASE_CLASSES

  return (
    <Element className={classes} id={id} role={role} aria-label={ariaLabel}>
      {children}
    </Element>
  )
}
