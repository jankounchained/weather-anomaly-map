import { describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { DeltaPanel } from './DeltaPanel'

// This project has no global RTL cleanup config (see 06-01-SUMMARY.md) -
// scope afterEach(cleanup) locally so this file's multiple renders don't
// leave stale DOM across `it` blocks.
afterEach(cleanup)

describe('DeltaPanel', () => {
  it('empty state: renders the headline and exact empty copy when no selection', () => {
    const { getByText } = render(
      <DeltaPanel
        hasSelection={false}
        currentStatus="idle"
        baselineStatus="idle"
        anomaly={null}
      />,
    )

    expect(getByText('Delta')).toBeTruthy()
    expect(
      getByText('Drop a pin to see how today compares to the 30-year average.'),
    ).toBeTruthy()
  })

  it('loading state: renders role="status" and exact loading copy while the combined gate is open', () => {
    const { getByText, getByRole } = render(
      <DeltaPanel
        hasSelection={true}
        currentStatus="loading"
        baselineStatus="resolved"
        anomaly={null}
      />,
    )

    expect(getByText('Delta')).toBeTruthy()
    expect(getByText("Calculating today's anomaly…")).toBeTruthy()
    expect(getByRole('status')).toBeTruthy()
  })

  it('error state: renders exact error copy when resolved but anomaly is null', () => {
    const { getByText } = render(
      <DeltaPanel
        hasSelection={true}
        currentStatus="resolved"
        baselineStatus="resolved"
        anomaly={null}
      />,
    )

    const errorText = getByText("Couldn't compute an anomaly here.")
    expect(errorText).toBeTruthy()
    expect(errorText.className).toContain('text-destructive')
  })

  it('populated state: renders the dominant Δ number in var(--anomaly-color), with micro-copy before the verdict (PD-07 order)', () => {
    const { getByText, container } = render(
      <DeltaPanel
        hasSelection={true}
        currentStatus="resolved"
        baselineStatus="resolved"
        anomaly={{ delta: 3.2, zScore: 1.8, verdictTier: 'slightly-warmer' }}
      />,
    )

    const deltaNumber = getByText((_, node) => node?.textContent === 'Δ+3°C')
    expect(deltaNumber.className).toContain('text-[calc(var(--text-display)*1.7)]')
    expect(deltaNumber.style.color).toBe('var(--anomaly-color)')

    const microCopy = getByText(
      'How today compares to the 30-year average for this date.',
    )
    const verdict = getByText('Slightly warmer than usual')
    const zScoreChip = getByText('z 1.8')

    const html = container.innerHTML
    expect(html.indexOf(microCopy.outerHTML)).toBeLessThan(
      html.indexOf(verdict.outerHTML),
    )
    expect(html.indexOf(verdict.outerHTML)).toBeLessThan(
      html.indexOf(zScoreChip.outerHTML),
    )
  })

  it('IN-05: z-score chip renders "z 0.0" (not "z -0.0") for a small negative z-score that rounds to zero', () => {
    const { getByText } = render(
      <DeltaPanel
        hasSelection={true}
        currentStatus="resolved"
        baselineStatus="resolved"
        anomaly={{ delta: 0, zScore: -0.04, verdictTier: 'typical' }}
      />,
    )

    expect(getByText('z 0.0')).toBeTruthy()
  })

  it('z-score chip shows the exact no-variance fallback string when zScore is null', () => {
    const { getByText } = render(
      <DeltaPanel
        hasSelection={true}
        currentStatus="resolved"
        baselineStatus="resolved"
        anomaly={{ delta: 0, zScore: null, verdictTier: 'typical' }}
      />,
    )

    expect(getByText('z — (too little variance to compute)')).toBeTruthy()
  })

  it('opens the InfoTooltip to reveal the exact delta/z-score body', () => {
    const { getByRole, getByText } = render(
      <DeltaPanel
        hasSelection={true}
        currentStatus="resolved"
        baselineStatus="resolved"
        anomaly={{ delta: 3.2, zScore: 1.8, verdictTier: 'slightly-warmer' }}
      />,
    )

    fireEvent.click(getByRole('button'))
    expect(
      getByText(
        "Δ is today's temperature minus the 30-year historical average for this exact calendar day. The z-score below expresses the same gap in standard deviations, so it stays comparable across locations with different day-to-day variability.",
      ),
    ).toBeTruthy()
  })
})
