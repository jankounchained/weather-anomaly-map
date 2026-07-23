import { describe, it, expect } from 'vitest'
import {
  quantile,
  iqr,
  silvermanBandwidth,
  kdeAt,
  kdeCurve,
  halfDrawsCurve,
} from './kde'

describe('quantile', () => {
  it('linearly interpolates between the two nearest sorted ranks', () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBeCloseTo(2.5, 5)
  })

  it('returns NaN for an empty sample (guard)', () => {
    expect(quantile([], 0.5)).toBeNaN()
  })
})

describe('iqr', () => {
  it('computes Q3 - Q1', () => {
    // sorted [10,11,12,13]: Q1=quantile(.25)=10.75, Q3=quantile(.75)=12.25
    expect(iqr([13, 10, 12, 11])).toBeCloseTo(1.5, 5)
  })
})

describe('silvermanBandwidth', () => {
  it('matches the textbook formula h = 0.9 * min(sd, iqr/1.349) * n^(-1/5) with factor=1', () => {
    const xs = [2, 4, 4, 4, 5, 5, 7, 9]
    // sd = sampleStdDev(xs) (n-1) ~= 2.13809, iqr(xs) = quantile(.75) - quantile(.25)
    const q1 = quantile(xs, 0.25)
    const q3 = quantile(xs, 0.75)
    const expectedIqr = q3 - q1
    const sd = 2.1380899352993947
    const A = Math.min(sd, expectedIqr / 1.349)
    const expectedH = 0.9 * A * Math.pow(xs.length, -1 / 5)
    expect(silvermanBandwidth(xs)).toBeCloseTo(expectedH, 6)
  })

  it('applies the factor multiplier', () => {
    const xs = [2, 4, 4, 4, 5, 5, 7, 9]
    expect(silvermanBandwidth(xs, 2)).toBeCloseTo(silvermanBandwidth(xs) * 2, 6)
  })

  it('returns a tiny positive h (never 0/NaN) for a single-sample input (n<2 guard)', () => {
    const h = silvermanBandwidth([5])
    expect(h).toBeGreaterThan(0)
    expect(Number.isFinite(h)).toBe(true)
  })

  it('returns a tiny positive h for an empty sample (n<2 guard)', () => {
    const h = silvermanBandwidth([])
    expect(h).toBeGreaterThan(0)
    expect(Number.isFinite(h)).toBe(true)
  })

  it('returns a tiny positive h for an all-equal sample (zero spread, never 0/NaN)', () => {
    const h = silvermanBandwidth([5, 5, 5, 5])
    expect(h).toBeGreaterThan(0)
    expect(Number.isFinite(h)).toBe(true)
  })
})

describe('kdeAt', () => {
  it('returns 0 for an empty sample (guard, never divides by zero)', () => {
    expect(kdeAt(0, [], 1)).toBe(0)
  })

  it('returns 0 when h<=0 (guard, never divides by zero)', () => {
    expect(kdeAt(0, [1, 2, 3], 0)).toBe(0)
    expect(kdeAt(0, [1, 2, 3], -1)).toBe(0)
  })

  it('evaluates higher density at a sample-dense x than at a far-tail x', () => {
    const samples = [10, 10.2, 9.8, 10.1, 9.9, 10.3, 9.7]
    const h = silvermanBandwidth(samples)
    const dense = kdeAt(10, samples, h)
    const tail = kdeAt(100, samples, h)
    expect(dense).toBeGreaterThan(tail)
  })
})

describe('kdeCurve', () => {
  it('returns exactly `steps` finite, non-negative points spanning [min, max] inclusive', () => {
    const samples = [10, 11, 12, 13, 14]
    const h = silvermanBandwidth(samples)
    const curve = kdeCurve(samples, h, 5, 20, 10)
    expect(curve).toHaveLength(10)
    expect(curve[0]!.x).toBeCloseTo(5, 5)
    expect(curve[curve.length - 1]!.x).toBeCloseTo(20, 5)
    for (const point of curve) {
      expect(Number.isFinite(point.x)).toBe(true)
      expect(Number.isFinite(point.density)).toBe(true)
      expect(point.density).toBeGreaterThanOrEqual(0)
    }
  })

  it('defaults to 96 steps when omitted', () => {
    const curve = kdeCurve([1, 2, 3], 1, 0, 10)
    expect(curve).toHaveLength(96)
  })
})

describe('halfDrawsCurve', () => {
  it('is false at n=19, just below the N_MIN=20 floor', () => {
    expect(halfDrawsCurve(19)).toBe(false)
  })

  it('is true at n=20, the inclusive N_MIN floor', () => {
    expect(halfDrawsCurve(20)).toBe(true)
  })

  it('is true well above the floor', () => {
    expect(halfDrawsCurve(55)).toBe(true)
  })

  it('is false for a zero-sample half', () => {
    expect(halfDrawsCurve(0)).toBe(false)
  })
})
