import { describe, it, expect } from 'vitest'
import {
  jitterX,
  buildHistoricalPoints,
  computeSharedYDomain,
  buildViolinPaths,
  formatSlotLabel,
} from './trend'
import type { TrendDayResult } from '../anomaly/types'

describe('jitterX', () => {
  it('is deterministic - the same index always yields the same value', () => {
    expect(jitterX(3)).toBe(jitterX(3))
    expect(jitterX(0)).toBe(jitterX(0))
    expect(jitterX(17)).toBe(jitterX(17))
  })

  it('stays within the declared [0.2, 0.8] band for a range of indices', () => {
    for (let i = 0; i < 50; i++) {
      const value = jitterX(i)
      expect(value).toBeGreaterThanOrEqual(0.2)
      expect(value).toBeLessThanOrEqual(0.8)
    }
  })
})

describe('buildHistoricalPoints', () => {
  it('preserves sample count and y-values in order', () => {
    const samples = [10, 20, 30]
    const points = buildHistoricalPoints(samples)
    expect(points).toHaveLength(3)
    expect(points.map((p) => p.y)).toEqual(samples)
  })

  it('assigns each point a jittered x from jitterX(index)', () => {
    const samples = [5, 6]
    const points = buildHistoricalPoints(samples)
    expect(points[0]!.x).toBe(jitterX(0))
    expect(points[1]!.x).toBe(jitterX(1))
  })
})

describe('computeSharedYDomain', () => {
  it('pads the min/max across all usable two-sample days by 10% (floor/ceil)', () => {
    const days: TrendDayResult[] = [
      {
        dateStr: '2026-07-14',
        usable: true,
        recentSamples: [10, 20],
        priorSamples: [15],
        recentMean: 15,
        priorMean: 15,
        actual: 12,
        priorStart: 1997,
        priorEnd: 2021,
      },
      {
        dateStr: '2026-07-15',
        usable: true,
        recentSamples: [18, 30],
        priorSamples: [24],
        recentMean: 24,
        priorMean: 24,
        actual: 25,
        priorStart: 1997,
        priorEnd: 2021,
      },
    ]
    // allValues = [10,20,15,12,15,15, 18,30,24,25,24,24]; min=10, max=30, pad=(30-10)*0.1=2
    const [min, max] = computeSharedYDomain(days)
    expect(min).toBe(8)
    expect(max).toBe(32)
  })

  it('flattens both halves plus both per-half means, not just one combined sample array', () => {
    const days: TrendDayResult[] = [
      {
        dateStr: '2026-07-14',
        usable: true,
        recentSamples: [5],
        priorSamples: [40],
        recentMean: 5,
        priorMean: 40,
        actual: 10,
        priorStart: 1997,
        priorEnd: 2021,
      },
    ]
    // priorSamples' 40 must be the max driving the domain, proving priorSamples
    // is flattened in, not dropped.
    const [, max] = computeSharedYDomain(days)
    expect(max).toBeGreaterThanOrEqual(40)
  })

  it('returns a sane fallback range for an all-unusable input, without throwing', () => {
    const days: TrendDayResult[] = [
      { dateStr: '2026-07-14', usable: false },
      { dateStr: '2026-07-15', usable: false },
    ]
    expect(() => computeSharedYDomain(days)).not.toThrow()
    expect(computeSharedYDomain(days)).toEqual([0, 1])
  })

  it('returns a sane fallback for an empty days array', () => {
    expect(computeSharedYDomain([])).toEqual([0, 1])
  })
})

describe('buildViolinPaths', () => {
  const baseOpts = {
    yMin: 0,
    yMax: 40,
    plotTop: 0,
    plotHeight: 100,
    cx: 44,
    maxHalfWidth: 36,
  }

  /** Extracts every "x,y" pair out of a violin half path string (M/L
   * segments) as numeric tuples, for geometric assertions. */
  function parsePathPoints(path: string): { x: number; y: number }[] {
    const pairs = path.match(/-?\d+\.\d,-?\d+\.\d/g) ?? []
    return pairs.map((pair) => {
      const [x, y] = pair.split(',').map(Number)
      return { x: x!, y: y! }
    })
  }

  function makeSamples(n: number, center: number, spread: number): number[] {
    // Deterministic pseudo-normal-ish spread via jitterX so tests never
    // flake on Math.random.
    return Array.from({ length: n }, (_, i) => center + (jitterX(i) - 0.5) * spread)
  }

  it('gives a half with n >= 20 kind:"curve" with a path starting "M" and ending "Z"', () => {
    const samples = makeSamples(20, 15, 10)
    const { recent } = buildViolinPaths(samples, [], baseOpts)
    expect(recent.kind).toBe('curve')
    if (recent.kind === 'curve') {
      expect(recent.path.startsWith('M')).toBe(true)
      expect(recent.path.endsWith('Z')).toBe(true)
      expect(recent.n).toBe(20)
      // PD-07: meanWidth lands the tick end on the curve edge - a positive
      // value bounded by maxHalfWidth, never the old fixed length.
      expect(recent.meanWidth).toBeGreaterThan(0)
      expect(recent.meanWidth).toBeLessThanOrEqual(baseOpts.maxHalfWidth)
    }
  })

  it('gives identical curve halves (mirror recent/prior) equal meanWidth', () => {
    const samples = makeSamples(25, 15, 10)
    const { prior, recent } = buildViolinPaths(samples, samples, baseOpts)
    expect(prior.kind).toBe('curve')
    expect(recent.kind).toBe('curve')
    if (prior.kind === 'curve' && recent.kind === 'curve') {
      expect(prior.meanWidth).toBeCloseTo(recent.meanWidth, 5)
    }
  })

  it('gives a half with n = 19 (just under N_MIN) kind:"rug"', () => {
    const samples = makeSamples(19, 15, 10)
    const { recent } = buildViolinPaths(samples, [], baseOpts)
    expect(recent.kind).toBe('rug')
    if (recent.kind === 'rug') {
      expect(recent.points).toHaveLength(19)
      expect(recent.mean).not.toBeNull()
      // PD-07: a sparse (rug) half with a non-null mean still falls back to
      // the full maxHalfWidth so its tick reads.
      expect(recent.meanWidth).toBe(baseOpts.maxHalfWidth)
    }
  })

  it('returns mean:null for a truly empty half (n=0)', () => {
    const { prior } = buildViolinPaths([], [], baseOpts)
    expect(prior.kind).toBe('rug')
    if (prior.kind === 'rug') {
      expect(prior.points).toEqual([])
      expect(prior.mean).toBeNull()
      expect(prior.n).toBe(0)
      expect(prior.meanWidth).toBe(0)
    }
  })

  it('produces mirror-image half-paths about cx when recent and prior samples are identical', () => {
    const samples = makeSamples(25, 15, 10)
    const { prior, recent } = buildViolinPaths(samples, samples, baseOpts)
    expect(prior.kind).toBe('curve')
    expect(recent.kind).toBe('curve')
    if (prior.kind === 'curve' && recent.kind === 'curve') {
      const priorPts = parsePathPoints(prior.path)
      const recentPts = parsePathPoints(recent.path)
      expect(priorPts).toHaveLength(recentPts.length)
      // Every prior point's x should mirror the recent point's x about cx=44,
      // for the same y (since both curves are built from identical samples,
      // identical pooled bandwidth, and identical clamp range).
      for (let i = 0; i < priorPts.length; i++) {
        expect(priorPts[i]!.y).toBeCloseTo(recentPts[i]!.y, 5)
        expect(2 * baseOpts.cx - priorPts[i]!.x).toBeCloseTo(recentPts[i]!.x, 5)
      }
    }
  })

  it('uses ONE shared pooled bandwidth for both halves - identical samples on both sides yield identical peak density regardless of n', () => {
    // prior = recent's 55 values duplicated 5x (275 total) at the exact
    // same points - the KDE density SHAPE (and thus peak) is unaffected by
    // duplication (sum scales by 5x, n scales by 5x, they cancel), so if
    // the shared-pooled-bandwidth contract holds, both halves reach the
    // exact same maxHalfWidth at their peak despite n=55 vs n=275.
    const recentSamples = makeSamples(55, 15, 10)
    const priorSamples = [
      ...recentSamples,
      ...recentSamples,
      ...recentSamples,
      ...recentSamples,
      ...recentSamples,
    ]
    const { prior, recent } = buildViolinPaths(recentSamples, priorSamples, baseOpts)
    expect(prior.kind).toBe('curve')
    expect(recent.kind).toBe('curve')
    if (prior.kind === 'curve' && recent.kind === 'curve') {
      const priorMaxW = Math.max(
        ...parsePathPoints(prior.path).map((p) => Math.abs(p.x - baseOpts.cx)),
      )
      const recentMaxW = Math.max(
        ...parsePathPoints(recent.path).map((p) => Math.abs(p.x - baseOpts.cx)),
      )
      // Both reach maxHalfWidth (36) at their peak - equal-width, not
      // n-scaled (PD-05).
      expect(priorMaxW).toBeCloseTo(baseOpts.maxHalfWidth, 0)
      expect(recentMaxW).toBeCloseTo(baseOpts.maxHalfWidth, 0)
    }
  })

  it('clamps each half curve grid to its own [sampleMin, sampleMax], not the full padded domain', () => {
    // recentSamples span a narrow [18,22] band well inside [yMin,yMax]=[0,40];
    // the curve's y-range should reflect that narrow band, not the full
    // [0,40] domain.
    const recentSamples = makeSamples(25, 20, 4) // roughly clustered near 18-22
    const priorSamples = makeSamples(25, 20, 4)
    const { recent } = buildViolinPaths(recentSamples, priorSamples, baseOpts)
    expect(recent.kind).toBe('curve')
    if (recent.kind === 'curve') {
      const pts = parsePathPoints(recent.path)
      const ys = pts.map((p) => p.y)
      const yMinPixel = Math.min(...ys)
      const yMaxPixel = Math.max(...ys)
      // Full-domain y-scale would span pixel 0 (temp 40) to 100 (temp 0).
      // A clamped curve over ~[18,22] should occupy a much narrower pixel
      // band strictly inside that full range.
      expect(yMinPixel).toBeGreaterThan(0)
      expect(yMaxPixel).toBeLessThan(100)
      expect(yMaxPixel - yMinPixel).toBeLessThan(100)
    }
  })

  it('draws prior on the left (side -1, x <= cx) and recent on the right (side +1, x >= cx)', () => {
    const recentSamples = makeSamples(25, 15, 10)
    const priorSamples = makeSamples(25, 15, 10)
    const { prior, recent } = buildViolinPaths(recentSamples, priorSamples, baseOpts)
    expect(prior.kind).toBe('curve')
    expect(recent.kind).toBe('curve')
    if (prior.kind === 'curve' && recent.kind === 'curve') {
      const priorPts = parsePathPoints(prior.path)
      const recentPts = parsePathPoints(recent.path)
      for (const p of priorPts) expect(p.x).toBeLessThanOrEqual(baseOpts.cx + 0.1)
      for (const p of recentPts) expect(p.x).toBeGreaterThanOrEqual(baseOpts.cx - 0.1)
    }
  })
})

describe('formatSlotLabel', () => {
  it("returns 'Today' when isToday is true, regardless of dateStr", () => {
    expect(formatSlotLabel('2026-07-15', true)).toBe('Today')
  })

  it('returns a stable UTC weekday abbreviation for a known date', () => {
    // 2026-07-15 is a Wednesday (UTC)
    expect(formatSlotLabel('2026-07-15', false)).toBe('Wed')
  })
})
