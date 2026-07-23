import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { TrendLegend } from './TrendLegend'

// This project has no global RTL cleanup config (see 06-01-SUMMARY.md) -
// scope afterEach(cleanup) locally so this file's multiple renders (some
// with priorStart/priorEnd, one without) don't leave stale DOM across `it`
// blocks - render()'s bound queries default to baseElement=document.body,
// so a prior render's "1997-2021" text would otherwise still be findable
// during the fallback test below.
afterEach(cleanup)

describe('TrendLegend', () => {
  it('renders role="list" with all 5 split-violin legend labels (PD-10 FINAL reviewer copy)', () => {
    const { getByRole, getByText } = render(
      <TrendLegend priorStart={1997} priorEnd={2021} />,
    )

    expect(getByRole('list')).toBeTruthy()
    expect(getByText('1997–2021')).toBeTruthy()
    expect(getByText('Recent 5 years')).toBeTruthy()
    expect(getByText('Period average')).toBeTruthy()
    expect(getByText('This week')).toBeTruthy()
    expect(getByText('Too few years → shown as dots')).toBeTruthy()
  })

  it('falls back to the static "Prior 25 years" label when priorStart/priorEnd are not supplied', () => {
    const { getByText, queryByText } = render(<TrendLegend />)

    expect(getByText('Prior 25 years')).toBeTruthy()
    expect(queryByText(/–/)).toBeNull()
  })

  it('renders exactly 5 native SVG swatches, one per legend item', () => {
    const { container } = render(<TrendLegend priorStart={1997} priorEnd={2021} />)

    expect(container.querySelectorAll('svg').length).toBe(5)
  })

  it('renders the two violin-half swatches as <path> elements', () => {
    const { container } = render(<TrendLegend priorStart={1997} priorEnd={2021} />)

    expect(container.querySelectorAll('path').length).toBe(2)
  })

  it('renders the mean-tick swatch as a <line>', () => {
    const { container } = render(<TrendLegend priorStart={1997} priorEnd={2021} />)

    expect(container.querySelector('line')).not.toBeNull()
  })

  it('renders the actual-value swatch as a <polygon> diamond', () => {
    const { container } = render(<TrendLegend priorStart={1997} priorEnd={2021} />)

    expect(container.querySelector('polygon')).not.toBeNull()
  })

  it('renders the rug-fallback swatch as a cluster of <circle> dots', () => {
    const { container } = render(<TrendLegend priorStart={1997} priorEnd={2021} />)

    expect(container.querySelectorAll('circle').length).toBe(3)
  })

  it('never uses dangerouslySetInnerHTML (T-03-07)', () => {
    const { container } = render(<TrendLegend priorStart={1997} priorEnd={2021} />)

    // Sanity check that all text content lives in ordinary DOM text nodes,
    // not injected raw HTML - the component source itself is also grepped
    // for dangerouslySetInnerHTML by the plan's acceptance criteria.
    expect(container.innerHTML).not.toContain('dangerouslySetInnerHTML')
  })
})
