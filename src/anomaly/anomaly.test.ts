import { describe, it, expect } from 'vitest'
import {
  mean,
  sampleStdDev,
  computeAnomaly,
  classifyVerdict,
  verdictLabel,
  formatDelta,
  windowBounds,
  filterDayOfYearWindow,
  hasUsableSampleCount,
  computeAnomalyForToday,
  computeTrendDay,
} from './anomaly'

describe('mean', () => {
  it('computes the arithmetic mean', () => {
    expect(mean([2, 4, 4, 4, 5, 5, 7, 9])).toBe(5)
  })
})

describe('sampleStdDev', () => {
  it('matches a hand-computed sample stddev (n-1), e.g. spreadsheet STDEV.S (ANOM-04)', () => {
    // [2, 4, 4, 4, 5, 5, 7, 9]: mean=5, sample variance=32/7≈4.571, stdDev≈2.138
    expect(sampleStdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 2)
  })

  it('returns 0 for fewer than 2 samples (guard, Pitfall 2)', () => {
    expect(sampleStdDev([5])).toBe(0)
    expect(sampleStdDev([])).toBe(0)
  })
})

describe('computeAnomaly', () => {
  it('returns delta = today - mean and zScore = delta / sampleStdDev (ANOM-01, ANOM-02)', () => {
    const result = computeAnomaly(9, [2, 4, 4, 4, 5, 5, 7, 9])
    expect(result.delta).toBe(4)
    expect(result.zScore).toBeCloseTo(4 / 2.138, 2)
  })

  it('returns null zScore (not Infinity/NaN) when stdDev is 0 (Pitfall 2)', () => {
    const result = computeAnomaly(10, [5, 5, 5])
    expect(result.zScore).toBeNull()
    expect(result.delta).toBe(5)
  })

  it('returns null zScore when the baseline has fewer than 2 samples', () => {
    const result = computeAnomaly(10, [5])
    expect(result.zScore).toBeNull()
  })
})

describe('classifyVerdict', () => {
  it('classifies the D-05 boundary cases correctly', () => {
    expect(classifyVerdict(0.49)).toBe('typical')
    expect(classifyVerdict(0.5)).toBe('slightly-warmer')
    expect(classifyVerdict(1.49)).toBe('slightly-warmer')
    expect(classifyVerdict(1.5)).toBe('much-warmer')
    expect(classifyVerdict(-1.5)).toBe('much-colder')
  })

  it('classifies negative slight/typical cases symmetrically', () => {
    expect(classifyVerdict(-0.49)).toBe('typical')
    expect(classifyVerdict(-0.5)).toBe('slightly-colder')
  })
})

describe('verdictLabel', () => {
  it('returns the neutral-tone D-04 copy for each tier (ANOM-03)', () => {
    expect(verdictLabel('much-colder')).toBe('Much colder than usual')
    expect(verdictLabel('slightly-colder')).toBe('Slightly colder than usual')
    expect(verdictLabel('typical')).toBe('Typical for today')
    expect(verdictLabel('slightly-warmer')).toBe('Slightly warmer than usual')
    expect(verdictLabel('much-warmer')).toBe('Much warmer than usual')
  })
})

describe('formatDelta', () => {
  it('rounds to a whole number with an explicit "+" sign for positive deltas (D-06)', () => {
    expect(formatDelta(2.6)).toBe('+3')
  })

  it('rounds to a whole number with an explicit minus sign for negative deltas (D-06)', () => {
    expect(formatDelta(-2.4)).toBe('−2')
  })

  it('renders exactly "0" for a zero delta, no sign', () => {
    expect(formatDelta(0)).toBe('0')
  })
})

describe('windowBounds', () => {
  it('folds Feb 29 into the Feb-28-centered window (D-02, leap year)', () => {
    const { start, end } = windowBounds(2020, 2, 29, 5)
    expect(start).toBe('2020-02-23')
    expect(end).toBe('2020-03-04')
  })

  it('spans into the prior calendar year near Jan 1 (year-boundary wraparound)', () => {
    const { start, end } = windowBounds(2020, 1, 2, 5)
    expect(start).toBe('2019-12-28')
    expect(end).toBe('2020-01-07')
  })

  it('spans into the next calendar year near Dec 31 (year-boundary wraparound)', () => {
    const { start, end } = windowBounds(2020, 12, 30, 5)
    expect(start).toBe('2020-12-25')
    expect(end).toBe('2021-01-04')
  })
})

describe('filterDayOfYearWindow', () => {
  it('returns only in-window non-null values across a small synthetic multi-year series', () => {
    const daily = {
      time: [
        '2018-07-10', // outside window (too early, wrong year)
        '2019-07-12', // in window for 2019
        '2019-07-20', // outside window (too late)
        '2020-07-13', // in window for 2020, but null
        '2020-07-14', // in window for 2020
      ],
      values: [100, 10, 100, null, 12],
    }
    const result = filterDayOfYearWindow(daily, 7, 14, 2019, 2020, 5)
    expect(result).toEqual([10, 12])
  })
})

describe('hasUsableSampleCount', () => {
  it('gates on ceil(totalYears/2) - a 30-year baseline needs >=15 samples (D-09, Assumption A3)', () => {
    expect(hasUsableSampleCount(new Array(15).fill(0), 30)).toBe(true)
    expect(hasUsableSampleCount(new Array(14).fill(0), 30)).toBe(false)
  })

  it('rounds the odd-totalYears boundary up - a 29-year baseline also needs >=15 samples', () => {
    expect(hasUsableSampleCount(new Array(15).fill(0), 29)).toBe(true)
    expect(hasUsableSampleCount(new Array(14).fill(0), 29)).toBe(false)
  })
})

describe('computeAnomalyForToday', () => {
  it('computes a delta/verdict from a synthetic multi-year day-of-year window', () => {
    const daily = {
      time: [
        '2019-07-10',
        '2019-07-11',
        '2019-07-12',
        '2020-07-10',
        '2020-07-11',
        '2020-07-12',
      ],
      values: [18, 19, 20, 19, 20, 21],
    }
    // 2 represented years -> threshold ceil(2/2)=1; all 6 in-window samples clear it.
    const result = computeAnomalyForToday(daily, '2021-07-11', 25)
    expect(result).not.toBeNull()
    expect(result!.delta).toBeCloseTo(25 - mean([18, 19, 20, 19, 20, 21]), 5)
    expect(result!.verdictTier).toBeDefined()
  })

  it('returns zScore null with verdictTier "typical" for a degenerate (all-equal) baseline (Pitfall 2)', () => {
    const daily = {
      time: ['2019-07-11', '2020-07-11'],
      values: [15, 15],
    }
    // 2 represented years -> threshold ceil(2/2)=1; both samples clear it.
    const result = computeAnomalyForToday(daily, '2021-07-11', 15)
    expect(result).not.toBeNull()
    expect(result!.zScore).toBeNull()
    expect(result!.verdictTier).toBe('typical')
  })

  it('returns null when the window yields fewer samples than half of the represented years', () => {
    // 3 represented years (2018-2020) -> threshold ceil(3/2)=2; only 1 sample falls in-window.
    const daily = {
      time: ['2018-01-01', '2019-01-01', '2020-07-11'],
      values: [-5, -6, 15],
    }
    const result = computeAnomalyForToday(daily, '2021-07-11', 15)
    expect(result).toBeNull()
  })

  it('returns null for a sparse 30-year baseline that clears the old ">=2 samples" floor but fails the D-10 stricter gate (regression)', () => {
    const time: string[] = []
    const values: (number | null)[] = []
    for (let y = 1991; y <= 2020; y++) {
      // Every year has a null day-of-year value except two, which fall in-window.
      time.push(`${y}-07-11`)
      values.push(y === 1995 || y === 2005 ? 20 : null)
    }
    const daily = { time, values }
    // 30 represented years -> threshold ceil(30/2)=15; only 2 non-null in-window samples.
    // Previously this returned a result under the old `samples.length < 2` gate would have
    // needed 0 or 1 samples to fail - here it demonstrates the D-10 regression: a
    // technically-"≥2-samples" baseline that is still far too sparse to be usable.
    const result = computeAnomalyForToday(daily, '2021-07-11', 25)
    expect(result).toBeNull()
  })
})

describe('computeTrendDay', () => {
  it('returns { usable: false, dateStr } when actualTemp is null', () => {
    const daily = {
      time: ['2019-07-11', '2020-07-11'],
      values: [15, 16],
    }
    const result = computeTrendDay(daily, '2021-07-11', null)
    expect(result).toEqual({ dateStr: '2021-07-11', usable: false })
  })

  it('returns { usable: false, dateStr } when actualTemp is non-finite', () => {
    const daily = {
      time: ['2019-07-11', '2020-07-11'],
      values: [15, 16],
    }
    const result = computeTrendDay(daily, '2021-07-11', NaN)
    expect(result).toEqual({ dateStr: '2021-07-11', usable: false })
  })

  it('returns { usable: false, dateStr } when the window fails the shared hasUsableSampleCount gate', () => {
    // 3 represented years (2018-2020) -> threshold ceil(3/2)=2; only 1 sample falls in-window.
    const daily = {
      time: ['2018-01-01', '2019-01-01', '2020-07-11'],
      values: [-5, -6, 15],
    }
    const result = computeTrendDay(daily, '2021-07-11', 25)
    expect(result).toEqual({ dateStr: '2021-07-11', usable: false })
  })

  it('returns { usable: true, dateStr, samples, mean, actual } for a healthy day', () => {
    const daily = {
      time: ['2019-07-11', '2020-07-11'],
      values: [15, 17],
    }
    const result = computeTrendDay(daily, '2021-07-11', 20)
    expect(result).toEqual({
      dateStr: '2021-07-11',
      usable: true,
      samples: [15, 17],
      mean: 16,
      actual: 20,
    })
  })
})
