import { describe, it, expect } from 'vitest'
import { computePopoverPosition } from './popoverPosition'

describe('computePopoverPosition', () => {
  it('places the popover below and left-aligned to a normal, left-side trigger', () => {
    const result = computePopoverPosition({
      triggerRect: { top: 100, bottom: 120, left: 100, right: 140, width: 40, height: 20 },
      popoverWidth: 240,
      popoverHeight: 100,
      viewportWidth: 1000,
      viewportHeight: 800,
      gap: 8,
      margin: 8,
    })

    expect(result).toEqual({ top: 128, left: 100 })
  })

  it('shifts the popover left so its right edge stays within the viewport for a right-edge trigger (Delta panel)', () => {
    const result = computePopoverPosition({
      triggerRect: { top: 100, bottom: 120, left: 900, right: 940, width: 40, height: 20 },
      popoverWidth: 240,
      popoverHeight: 100,
      viewportWidth: 1000,
      viewportHeight: 800,
      gap: 8,
      margin: 8,
    })

    // right edge lands at 992 = viewportWidth(1000) - margin(8)
    expect(result).toEqual({ top: 128, left: 752 })
  })

  it('flips the popover above the trigger when it would overflow the bottom of the viewport', () => {
    const result = computePopoverPosition({
      triggerRect: { top: 760, bottom: 780, left: 100, right: 140, width: 40, height: 20 },
      popoverWidth: 240,
      popoverHeight: 100,
      viewportWidth: 1000,
      viewportHeight: 800,
      gap: 8,
      margin: 8,
    })

    // top = 760 - 8 - 100 = 652
    expect(result).toEqual({ top: 652, left: 100 })
  })

  it('clamps left to margin when the trigger sits far enough left that the default left underflows', () => {
    const result = computePopoverPosition({
      triggerRect: { top: 100, bottom: 120, left: -20, right: 20, width: 40, height: 20 },
      popoverWidth: 240,
      popoverHeight: 100,
      viewportWidth: 1000,
      viewportHeight: 800,
      gap: 8,
      margin: 8,
    })

    expect(result.left).toBe(8)
  })
})
