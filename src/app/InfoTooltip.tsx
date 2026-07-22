// Accessible info disclosure (EXPLAIN-02) replacing AnomalyCard's ad-hoc
// `title`-attribute "i" button. No existing disclosure/popover analog in
// the codebase (06-PATTERNS.md "No Analog Found") - built from the
// 06-UI-SPEC.md WCAG 1.4.13 (hoverable/dismissible/persistent) interaction
// contract, which is the source of truth for this file's logic. Uses plain
// React state (useState/useRef/useId) per CLAUDE.md ("no state manager").
// Popover body renders `children` as plain JSX text nodes only - never a
// raw-HTML-injecting sink - preserving the T-01-02/T-02-07 no-raw-HTML-sink
// invariant (T-06-01).
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { PanelShell } from './PanelShell'

export interface InfoTooltipProps {
  /** Names the panel this tooltip explains, e.g. "About the delta and z-score" (EXPLAIN-02). */
  label: string
  /** Static authored body prose - plain JSX text nodes only. */
  children: ReactNode
}

export function InfoTooltip({ label, children }: InfoTooltipProps) {
  const [open, setOpen] = useState(false)
  const popoverId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  // Tracks whether the popover was opened via hover/focus (progressive
  // enhancement) vs. click (persists until explicitly dismissed) - a
  // hover-opened popover stays open while the pointer is over the trigger
  // OR the popover itself, and closes on blur only when NOT hover-pinned.
  const hoverPinnedRef = useRef(false)
  // Suppresses the single synchronous focus event fired by the
  // returnFocus `.focus()` call below - without this, Escape-close would
  // immediately reopen the popover via handleFocus.
  const suppressFocusOpenRef = useRef(false)

  const openPopover = (hoverPinned: boolean) => {
    hoverPinnedRef.current = hoverPinned
    setOpen(true)
  }

  const closePopover = (returnFocus: boolean) => {
    setOpen(false)
    hoverPinnedRef.current = false
    if (returnFocus) {
      suppressFocusOpenRef.current = true
      triggerRef.current?.focus()
    }
  }

  // Close on outside click (mousedown, per UI-SPEC "closes on ... click
  // outside") while open. Listener is only attached while open and removed
  // on close/unmount (T-06-02 - accepted DoS surface, low severity).
  useEffect(() => {
    if (!open) return

    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        closePopover(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleTriggerClick = () => {
    if (open && !hoverPinnedRef.current) {
      // Already persistent (opened by an explicit click) -> toggle closed.
      closePopover(false)
    } else {
      // Closed, or currently hover/focus-pinned -> make it persistent.
      hoverPinnedRef.current = false
      setOpen(true)
    }
  }

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape' && open) {
      closePopover(true)
    }
  }

  const handleMouseEnter = () => {
    if (!open) openPopover(true)
  }

  const handleMouseLeave = () => {
    // The container wraps both the trigger and the popover, so leaving the
    // container means the pointer left both - satisfies "hover-opened
    // content stays open while the pointer moves onto the popover itself".
    if (hoverPinnedRef.current) {
      closePopover(false)
    }
  }

  const handleFocus = () => {
    if (suppressFocusOpenRef.current) {
      suppressFocusOpenRef.current = false
      return
    }
    openPopover(true)
  }

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    // Only close on blur when not hover-pinned (UI-SPEC "closes on ...
    // blur when not hover-pinned") and focus is genuinely leaving the
    // trigger+popover container (not moving between them).
    if (hoverPinnedRef.current) return
    if (!containerRef.current?.contains(event.relatedTarget as Node)) {
      closePopover(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onBlur={handleBlur}
    >
      <button
        ref={triggerRef}
        type="button"
        className="h-5 w-5 shrink-0 rounded-full border border-accent bg-transparent p-0 text-accent text-label font-heading leading-none [font-family:initial] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        onFocus={handleFocus}
      >
        i
      </button>
      {open && (
        <div className="absolute z-10 mt-xs">
          <PanelShell
            id={popoverId}
            role="dialog"
            aria-label={label}
            className="max-w-[240px]"
          >
            {children}
          </PanelShell>
        </div>
      )}
    </div>
  )
}
