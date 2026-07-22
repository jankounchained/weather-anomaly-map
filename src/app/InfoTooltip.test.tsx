import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { InfoTooltip } from './InfoTooltip'

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
