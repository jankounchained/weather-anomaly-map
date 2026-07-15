import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrendDayChart } from './TrendDayChart'
import type { TrendDayResult } from '../anomaly/types'

// No ResizeObserver mock is added anywhere in this file - the fixed-size
// ComposedChart (no ResponsiveContainer) must render under jsdom without
// one, proving 03-RESEARCH.md Pitfall 3 is avoided.

describe('TrendDayChart', () => {
  it('renders a real chart (svg) for a usable day, not the placeholder', () => {
    const samples = Array.from({ length: 20 }, (_, i) => 15 + (i % 5))
    const day: TrendDayResult = {
      dateStr: '2026-07-15',
      usable: true,
      samples,
      mean: 17,
      actual: 21,
    }

    const { container } = render(
      <TrendDayChart
        day={day}
        yDomain={[10, 25]}
        units="°C"
        isToday={true}
        showYAxis={true}
      />,
    )

    expect(container.querySelector('svg')).not.toBeNull()
    expect(screen.queryByText('Not enough data')).toBeNull()
  })

  it('renders the "Not enough data" placeholder for an unusable day, no svg', () => {
    const day: TrendDayResult = { dateStr: '2026-07-10', usable: false }

    const { container } = render(
      <TrendDayChart
        day={day}
        yDomain={[10, 25]}
        units="°C"
        isToday={false}
        showYAxis={false}
      />,
    )

    expect(screen.getByText('Not enough data')).toBeTruthy()
    expect(
      screen.getByLabelText('Not enough history for this day'),
    ).toBeTruthy()
    expect(container.querySelector('svg')).toBeNull()
  })
})
