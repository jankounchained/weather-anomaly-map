import { describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { CurrentConditionsPanel } from './CurrentConditionsPanel'

// This project has no global RTL cleanup config (see 06-01-SUMMARY.md) -
// scope afterEach(cleanup) locally so this file's multiple renders don't
// leave stale DOM across `it` blocks.
afterEach(cleanup)

describe('CurrentConditionsPanel', () => {
  it('empty state: renders the headline and exact empty copy when no selection', () => {
    const { getByText } = render(
      <CurrentConditionsPanel
        hasSelection={false}
        currentStatus="idle"
        baselineStatus="idle"
        tempC={null}
        units={null}
      />,
    )

    expect(getByText('Current Conditions')).toBeTruthy()
    expect(
      getByText("Drop a pin to see today's current temperature here."),
    ).toBeTruthy()
  })

  it('loading state: renders role="status" and exact loading copy while the combined gate is open', () => {
    const { getByText, getByRole } = render(
      <CurrentConditionsPanel
        hasSelection={true}
        currentStatus="loading"
        baselineStatus="resolved"
        tempC={null}
        units={null}
      />,
    )

    expect(getByText('Current Conditions')).toBeTruthy()
    expect(getByText("Calculating today's conditions…")).toBeTruthy()
    expect(getByRole('status')).toBeTruthy()
  })

  it('error state: renders exact error copy when resolved but tempC is null', () => {
    const { getByText } = render(
      <CurrentConditionsPanel
        hasSelection={true}
        currentStatus="resolved"
        baselineStatus="resolved"
        tempC={null}
        units={null}
      />,
    )

    const errorText = getByText('Temperature unavailable for this location.')
    expect(errorText).toBeTruthy()
    expect(errorText.className).toContain('text-destructive')
  })

  it('populated state: renders the Display-size temperature, adjacent micro-copy, and an accessible InfoTooltip', () => {
    const { getByText, getByRole } = render(
      <CurrentConditionsPanel
        hasSelection={true}
        currentStatus="resolved"
        baselineStatus="resolved"
        tempC={21.4}
        units="°C"
      />,
    )

    const temp = getByText('21°C')
    expect(temp).toBeTruthy()
    expect(temp.className).toContain('text-display')
    expect(getByText("Today's measured temperature.")).toBeTruthy()

    fireEvent.click(getByRole('button'))
    expect(
      getByText(
        'Based on modeled climate data for this area (~9–25km resolution), not a physical station exactly at this point.',
      ),
    ).toBeTruthy()
  })
})
