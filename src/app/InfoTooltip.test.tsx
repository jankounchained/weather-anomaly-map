import { describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { InfoTooltip } from './InfoTooltip'

// No global vitest setupFiles configured in this project (out of this
// task's scope to add one) - each `it` below renders its own InfoTooltip,
// so without explicit cleanup the DOM accumulates buttons/dialogs across
// tests and getByRole('button')/getByRole('dialog') become ambiguous.
afterEach(cleanup)

describe('InfoTooltip', () => {
  it('renders a real <button type="button"> with aria-expanded=false and aria-controls set before opening', () => {
    const { getByRole } = render(
      <InfoTooltip label="About the delta and z-score">Body copy</InfoTooltip>,
    )

    const trigger = getByRole('button')
    expect(trigger.getAttribute('type')).toBe('button')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.getAttribute('aria-controls')).toBeTruthy()
  })

  it('opens the dialog on click, setting aria-expanded=true and matching the popover id to aria-controls', () => {
    const { getByRole } = render(
      <InfoTooltip label="About the delta and z-score">Body copy</InfoTooltip>,
    )

    const trigger = getByRole('button')
    fireEvent.click(trigger)

    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    const dialog = getByRole('dialog')
    expect(dialog.id).toBe(trigger.getAttribute('aria-controls'))
  })

  it('renders the dialog with a non-empty aria-label and className including max-w-[240px]', () => {
    const { getByRole } = render(
      <InfoTooltip label="About the delta and z-score">Body copy</InfoTooltip>,
    )

    fireEvent.click(getByRole('button'))

    const dialog = getByRole('dialog')
    expect(dialog.getAttribute('aria-label')).toBe('About the delta and z-score')
    expect(dialog.className).toContain('max-w-[240px]')
  })

  it('closes on Escape and returns focus to the trigger', () => {
    const { getByRole, queryByRole } = render(
      <InfoTooltip label="About the delta and z-score">Body copy</InfoTooltip>,
    )

    const trigger = getByRole('button')
    fireEvent.click(trigger)
    expect(getByRole('dialog')).toBeTruthy()

    fireEvent.keyDown(trigger, { key: 'Escape' })

    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('CR-01/WR-01: a real click (mouseenter, then the focus a click fires, then click) upgrades the hover-opened popover to persistent instead of closing it', () => {
    const { getByRole, queryByRole } = render(
      <InfoTooltip label="About the delta and z-score">Body copy</InfoTooltip>,
    )

    const trigger = getByRole('button')

    // Real browsers fire mouseenter (cursor must move onto the button
    // first), then a synchronous focus event as part of the click itself,
    // then the click event - in that order.
    fireEvent.mouseEnter(trigger)
    expect(queryByRole('dialog')).not.toBeNull()

    fireEvent.focus(trigger)
    fireEvent.click(trigger)

    expect(queryByRole('dialog')).not.toBeNull()
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
  })

  it('WR-01: pure keyboard Tab+Enter (focus with no preceding mouseenter, then click) still opens the popover', () => {
    const { getByRole, queryByRole } = render(
      <InfoTooltip label="About the delta and z-score">Body copy</InfoTooltip>,
    )

    const trigger = getByRole('button')

    // No mouseenter here - simulates Tab-focusing the button, then
    // activating it with Enter/Space (which the browser dispatches as a
    // click on a <button>).
    fireEvent.focus(trigger)
    fireEvent.click(trigger)

    expect(queryByRole('dialog')).not.toBeNull()
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
  })

  it('renders the static body prose as text inside the open dialog, with no raw-HTML sink', () => {
    const { getByRole, getByText } = render(
      <InfoTooltip label="About the delta and z-score">
        Δ is today&apos;s temperature minus the 30-year historical average.
      </InfoTooltip>,
    )

    fireEvent.click(getByRole('button'))

    expect(
      getByText("Δ is today's temperature minus the 30-year historical average."),
    ).toBeTruthy()
  })
})
