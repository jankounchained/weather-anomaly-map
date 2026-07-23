import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrendDayChart } from './TrendDayChart'
import type { TrendDayResult } from '../anomaly/types'

// No ResizeObserver mock is added anywhere in this file - the fixed-size
// ComposedChart (no ResponsiveContainer) must render under jsdom without
// one, proving 03-RESEARCH.md Pitfall 3 is avoided.

/** Builds a usable two-sample TrendDayResult fixture with configurable
 * per-half sample counts (08-01 promoted TrendDayResult shape). Values are
 * spread across a small range so mean/stddev stay well-defined. */
function buildDay(
  recentCount: number,
  priorCount: number,
  overrides: Partial<TrendDayResult & { usable: true }> = {},
): TrendDayResult {
  const recentSamples = Array.from(
    { length: recentCount },
    (_, i) => 15 + (i % 5),
  )
  const priorSamples = Array.from(
    { length: priorCount },
    (_, i) => 13 + (i % 5),
  )
  return {
    dateStr: '2026-07-15',
    usable: true,
    recentSamples,
    priorSamples,
    recentMean:
      recentSamples.reduce((s, v) => s + v, 0) / (recentSamples.length || 1),
    priorMean:
      priorSamples.reduce((s, v) => s + v, 0) / (priorSamples.length || 1),
    actual: 21,
    priorStart: 1997,
    priorEnd: 2021,
    ...overrides,
  }
}

/** Collects the text content of every native <title> element rendered in
 * `container` - used to assert no malformed "NaN"/"undefined" string ever
 * reaches an accessible tooltip (T-08-05). */
function titleTexts(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('title')).map(
    (el) => el.textContent ?? '',
  )
}

describe('TrendDayChart', () => {
  it('renders two filled curve paths (prior + recent), no rug dots, for a day with both halves n>=20', () => {
    const day = buildDay(55, 275)

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
    // Two curve paths (prior + recent) plus their fill/stroke tokens.
    const paths = Array.from(container.querySelectorAll('path')).filter(
      (p) =>
        p.getAttribute('fill') === 'var(--color-chart-prior-fill)' ||
        p.getAttribute('fill') === 'var(--color-chart-recent-fill)',
    )
    expect(paths).toHaveLength(2)
    // No rug dots when both halves draw a curve.
    expect(
      container.querySelectorAll('circle[fill="var(--color-chart-historical)"]'),
    ).toHaveLength(0)
    expect(titleTexts(container).some((t) => t.includes('NaN'))).toBe(false)
    expect(titleTexts(container).some((t) => t.includes('undefined'))).toBe(
      false,
    )
  })

  it('renders one curve + a jittered rug (bounded to its own half) when exactly one half is n<20', () => {
    const day = buildDay(5, 275) // recent thin, prior healthy

    const { container } = render(
      <TrendDayChart
        day={day}
        yDomain={[10, 25]}
        units="°C"
        isToday={false}
        showYAxis={false}
      />,
    )

    const curvePaths = Array.from(container.querySelectorAll('path')).filter(
      (p) =>
        p.getAttribute('fill') === 'var(--color-chart-prior-fill)' ||
        p.getAttribute('fill') === 'var(--color-chart-recent-fill)',
    )
    expect(curvePaths).toHaveLength(1) // only the healthy (prior) half
    expect(curvePaths[0]!.getAttribute('fill')).toBe(
      'var(--color-chart-prior-fill)',
    )

    const rugDots = Array.from(
      container.querySelectorAll('circle[fill="var(--color-chart-historical)"]'),
    )
    expect(rugDots).toHaveLength(5) // the thin recent half, one dot per sample

    // Rug dots for the recent (right, side=+1) half must never cross the
    // center line (cx=44) - every dot's cx must be >= 44.
    for (const dot of rugDots) {
      const cx = Number(dot.getAttribute('cx'))
      expect(cx).toBeGreaterThanOrEqual(44)
      expect(cx).toBeLessThanOrEqual(44 + 36)
    }

    expect(titleTexts(container).some((t) => t.includes('NaN'))).toBe(false)
    expect(titleTexts(container).some((t) => t.includes('undefined'))).toBe(
      false,
    )
  })

  it('renders dual rug strips (zero curve paths) when both halves are n<20', () => {
    const day = buildDay(5, 8)

    const { container } = render(
      <TrendDayChart
        day={day}
        yDomain={[10, 25]}
        units="°C"
        isToday={false}
        showYAxis={false}
      />,
    )

    const curvePaths = Array.from(container.querySelectorAll('path')).filter(
      (p) =>
        p.getAttribute('fill') === 'var(--color-chart-prior-fill)' ||
        p.getAttribute('fill') === 'var(--color-chart-recent-fill)',
    )
    expect(curvePaths).toHaveLength(0)

    const rugDots = Array.from(
      container.querySelectorAll('circle[fill="var(--color-chart-historical)"]'),
    )
    expect(rugDots).toHaveLength(13) // 5 recent + 8 prior

    expect(titleTexts(container).some((t) => t.includes('NaN'))).toBe(false)
    expect(titleTexts(container).some((t) => t.includes('undefined'))).toBe(
      false,
    )
  })

  it('renders two per-half mean-tick lines and the actual diamond, with exact Copywriting Contract tooltips', () => {
    const day = buildDay(55, 275)

    const { container } = render(
      <TrendDayChart
        day={day}
        yDomain={[10, 25]}
        units="°C"
        isToday={true}
        showYAxis={true}
      />,
    )

    const meanTicks = Array.from(
      container.querySelectorAll('line[stroke="var(--color-chart-mean)"]'),
    )
    expect(meanTicks).toHaveLength(2)

    // PD-07: each tick's horizontal extent is meanWidth-driven - positive,
    // bounded by MAX_HALF_WIDTH (36), and no longer the old fixed 29px.
    // x1 always stays anchored at CX (44).
    for (const tick of meanTicks) {
      const x1 = Number(tick.getAttribute('x1'))
      const x2 = Number(tick.getAttribute('x2'))
      const extent = Math.abs(x2 - x1)
      expect(x1).toBe(44)
      expect(extent).toBeGreaterThan(0)
      expect(extent).toBeLessThanOrEqual(36)
      expect(extent).not.toBe(29)
    }

    const titles = titleTexts(container)
    expect(
      titles.some((t) => t.startsWith('Recent 5-yr mean (55 samples):')),
    ).toBe(true)
    expect(
      titles.some((t) => t.startsWith('Prior 25-yr mean (275 samples):')),
    ).toBe(true)
    expect(
      titles.some((t) => t === 'Recent 5-yr distribution (55 samples)'),
    ).toBe(true)
    expect(
      titles.some((t) => t === 'Prior 25-yr distribution (275 samples)'),
    ).toBe(true)

    // The actual diamond is a <polygon> wrapping its own native <title>.
    const diamond = container.querySelector('polygon')
    expect(diamond).not.toBeNull()
    expect(diamond?.querySelector('title')).not.toBeNull()
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
