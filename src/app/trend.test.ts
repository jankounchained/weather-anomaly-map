import { describe, it, expect } from 'vitest'
import {
  jitterX,
  buildHistoricalPoints,
  computeSharedYDomain,
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
  it('pads the min/max across all usable days by 10% (floor/ceil)', () => {
    const days: TrendDayResult[] = [
      { dateStr: '2026-07-14', usable: true, samples: [10, 20], mean: 15, actual: 12 },
      { dateStr: '2026-07-15', usable: true, samples: [18, 30], mean: 24, actual: 25 },
    ]
    // allValues = [10,20,15,12, 18,30,24,25]; min=10, max=30, pad=(30-10)*0.1=2
    const [min, max] = computeSharedYDomain(days)
    expect(min).toBe(8)
    expect(max).toBe(32)
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

describe('formatSlotLabel', () => {
  it("returns 'Today' when isToday is true, regardless of dateStr", () => {
    expect(formatSlotLabel('2026-07-15', true)).toBe('Today')
  })

  it('returns a stable UTC weekday abbreviation for a known date', () => {
    // 2026-07-15 is a Wednesday (UTC)
    expect(formatSlotLabel('2026-07-15', false)).toBe('Wed')
  })
})
