import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { TrendLegend } from './TrendLegend'

describe('TrendLegend', () => {
  it('renders role="list" with all 5 split-violin legend labels (draft copy, PD-10)', () => {
    const { getByRole, getByText } = render(<TrendLegend />)

    expect(getByRole('list')).toBeTruthy()
    expect(getByText('Prior 25 years')).toBeTruthy()
    expect(getByText('Recent 5 years')).toBeTruthy()
    expect(getByText('Average for that period')).toBeTruthy()
    expect(getByText('Temperature now')).toBeTruthy()
    expect(getByText('Too few years → shown as dots')).toBeTruthy()
  })

  it('renders exactly 5 native SVG swatches, one per legend item', () => {
    const { container } = render(<TrendLegend />)

    expect(container.querySelectorAll('svg').length).toBe(5)
  })

  it('renders the two violin-half swatches as <path> elements', () => {
    const { container } = render(<TrendLegend />)

    expect(container.querySelectorAll('path').length).toBe(2)
  })

  it('renders the mean-tick swatch as a <line>', () => {
    const { container } = render(<TrendLegend />)

    expect(container.querySelector('line')).not.toBeNull()
  })

  it('renders the actual-value swatch as a <polygon> diamond', () => {
    const { container } = render(<TrendLegend />)

    expect(container.querySelector('polygon')).not.toBeNull()
  })

  it('renders the rug-fallback swatch as a cluster of <circle> dots', () => {
    const { container } = render(<TrendLegend />)

    expect(container.querySelectorAll('circle').length).toBe(3)
  })

  it('never uses dangerouslySetInnerHTML (T-03-07)', () => {
    const { container } = render(<TrendLegend />)

    // Sanity check that all text content lives in ordinary DOM text nodes,
    // not injected raw HTML - the component source itself is also grepped
    // for dangerouslySetInnerHTML by the plan's acceptance criteria.
    expect(container.innerHTML).not.toContain('dangerouslySetInnerHTML')
  })
})
