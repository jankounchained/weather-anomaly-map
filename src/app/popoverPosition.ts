export interface PopoverRect {
  top: number
  bottom: number
  left: number
  right: number
  width: number
  height: number
}

export interface ComputePopoverPositionInput {
  triggerRect: PopoverRect
  popoverWidth: number
  popoverHeight: number
  viewportWidth: number
  viewportHeight: number
  gap: number
  margin: number
}

export interface ComputePopoverPositionResult {
  top: number
  left: number
}

export function computePopoverPosition({
  triggerRect,
  popoverWidth,
  popoverHeight,
  viewportWidth,
  viewportHeight,
  gap,
  margin,
}: ComputePopoverPositionInput): ComputePopoverPositionResult {
  // Default vertical: below the trigger.
  let top = triggerRect.bottom + gap
  // Bottom-edge flip: not enough room below -> flip above the trigger.
  if (top + popoverHeight > viewportHeight - margin) {
    top = triggerRect.top - gap - popoverHeight
  }
  // Top clamp: never render off the top edge.
  if (top < margin) top = margin

  // Default horizontal: left-align to the trigger.
  let left = triggerRect.left
  // Right-edge shift: not enough room to the right -> shift left so the
  // popover's right edge sits at viewportWidth - margin.
  if (triggerRect.left + popoverWidth > viewportWidth - margin) {
    left = viewportWidth - margin - popoverWidth
  }
  // Left clamp: never render off the left edge.
  if (left < margin) left = margin

  return { top, left }
}
