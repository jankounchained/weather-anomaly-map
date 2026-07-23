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

/** Per-day trend-chart input (VIZ-01, TREND-01). The `usable` discriminant
 * is what buildViolinPaths/TrendDayChart branches on to render either the
 * split-violin tile or the "not enough history" placeholder - one shape,
 * one code path, whether the cause is a genuine data desert or a
 * fetch-timing gap (D-11, D-12, D-14). The `usable: true` member is the
 * two-half (recent-5yr / prior-25yr) model (TREND-01, PD-04): recentSamples
 * and priorSamples are both windowed off the SAME baseline.daily series, so
 * this is the ONLY `usable: true` shape - there is no single-sample
 * fallback to keep in sync. `priorStart`/`priorEnd` (08-04, PD-10 reviewer
 * round-trip) expose the prior-25yr half's actual calendar-year bounds so
 * TrendLegend can render a real dynamic year range ("1997-2021") instead of
 * a static "Prior 25 years" literal - every usable day shares the same
 * endYear, so any one usable day's bounds are valid for the whole row. */
export type TrendDayResult =
  | {
      dateStr: string
      usable: true
      recentSamples: number[]
      priorSamples: number[]
      recentMean: number
      priorMean: number
      actual: number
      priorStart: number
      priorEnd: number
    }
  | { dateStr: string; usable: false }
