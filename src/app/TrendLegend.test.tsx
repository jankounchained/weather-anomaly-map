import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { TrendLegend } from './TrendLegend'

describe('TrendLegend', () => {
  it('renders all three legend labels', () => {
    const { getByText } = render(<TrendLegend />)

    expect(getByText('Temperatures on this day in the last 30 years')).toBeTruthy()
    expect(getByText('30-year average')).toBeTruthy()
    expect(getByText('Temperature now')).toBeTruthy()
  })

  it('renders native SVG swatches matching the chart marks (circle, line, diamond)', () => {
    const { container } = render(<TrendLegend />)

    expect(container.querySelectorAll('svg').length).toBe(3)
    expect(container.querySelector('circle')).not.toBeNull()
    expect(container.querySelector('rect')).not.toBeNull()
    expect(container.querySelector('polygon')).not.toBeNull()
  })
})
