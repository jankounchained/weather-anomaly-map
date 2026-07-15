// Anomaly domain types shared by the pure math module (anomaly.ts) and the
// AnomalyCard/App composition layer. Kept dependency-free per CLAUDE.md.

/** Summary statistics for a day-of-year baseline window (ANOM-04). */
export interface BaselineStats {
  mean: number
  sampleStdDev: number
  sampleCount: number
}

/** delta = today - baseline mean; zScore is null (never NaN/Infinity) when
 * the baseline's variance is degenerate - stddev 0 or fewer than 2 samples
 * (Pitfall 2). */
export interface AnomalyResult {
  delta: number
  zScore: number | null
}

/** Five-tier verdict classification driven by z-score (D-03, D-05). */
export type VerdictTier =
  | 'much-colder'
  | 'slightly-colder'
  | 'typical'
  | 'slightly-warmer'
  | 'much-warmer'

/** Per-day trend-chart input (VIZ-01). The `usable` discriminant is what
 * TrendDayChart (Plan 03) branches on to render either the dot/strip chart
 * or the "not enough history" placeholder - one shape, one code path,
 * whether the cause is a genuine data desert or a fetch-timing gap
 * (D-11, D-12, D-14). */
export type TrendDayResult =
  | {
      dateStr: string
      usable: true
      samples: number[]
      mean: number
      actual: number
    }
  | { dateStr: string; usable: false }
