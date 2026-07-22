import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { TrendRow } from './TrendRow'
import type { TrendDayResult } from '../anomaly/types'

// This project has no global RTL cleanup config (see 06-01-SUMMARY.md) -
// scope afterEach(cleanup) locally so this file's multiple renders don't
// leave stale DOM across `it` blocks.
afterEach(cleanup)

describe('TrendRow', () => {
  it('empty state: renders the "Last 7 Days" headline and exact empty copy when no selection', () => {
    const { getByText } = render(
      <TrendRow
        hasSelection={false}
        currentStatus="idle"
        baselineStatus="idle"
        days={null}
        units={null}
      />,
    )

    expect(getByText('Last 7 Days')).toBeTruthy()
    expect(
      getByText('Drop a pin to see the last 7 days of temperatures here.'),
    ).toBeTruthy()
  })

  it('loading state: renders the headline, role="status", and exact loading copy while resolving', () => {
    const { getByText, getByRole } = render(
      <TrendRow
        hasSelection={true}
        currentStatus="loading"
        baselineStatus="loading"
        days={null}
        units={null}
      />,
    )

    expect(getByText('Last 7 Days')).toBeTruthy()
    expect(getByText('Loading the last 7 days…')).toBeTruthy()
    expect(getByRole('status')).toBeTruthy()
  })

  it('error state: renders the headline and exact error copy when resolved but no usable days', () => {
    const { getByText } = render(
      <TrendRow
        hasSelection={true}
        currentStatus="resolved"
        baselineStatus="resolved"
        days={null}
        units={null}
      />,
    )

    expect(getByText('Last 7 Days')).toBeTruthy()
    const errorText = getByText(
      'Recent history unavailable for this location.',
    )
    expect(errorText).toBeTruthy()
    expect(errorText.className).toContain('text-destructive')
  })

  it('populated state: renders the headline and the unchanged chart (legend + svg) for a usable day', () => {
    const days: TrendDayResult[] = [
      {
        dateStr: '2026-07-15',
        usable: true,
        samples: [15, 16, 17, 18, 19],
        mean: 17,
        actual: 21,
      },
    ]

    const { getByText, container } = render(
      <TrendRow
        hasSelection={true}
        currentStatus="resolved"
        baselineStatus="resolved"
        days={days}
        units="°C"
      />,
    )

    expect(getByText('Last 7 Days')).toBeTruthy()
    expect(container.querySelector('svg')).not.toBeNull()
    expect(getByText('30-year average')).toBeTruthy()
  })
})
