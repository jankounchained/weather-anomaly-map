// Pure anomaly-statistics math: day-of-year windowing, mean/sample stddev,
// delta/z-score, and verdict classification. Hand-rolled per CLAUDE.md
// ("hand-roll, don't add a dependency") and STACK.md - no simple-statistics
// or other math dependency, in the same spirit as src/lib/coords.ts.
import type { AnomalyResult, TrendDayResult, VerdictTier } from './types'

/** Arithmetic mean of a sample (feeds delta/z-score - ANOM-01, ANOM-02). */
export function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/** Sample standard deviation (n-1 denominator, matches spreadsheet STDEV.S)
 * - ANOM-04, Pitfall 3. Returns 0 for fewer than 2 samples (guard). */
export function sampleStdDev(values: number[]): number {
  if (values.length < 2) return 0
  const m = mean(values)
  const variance =
    values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

/** delta/z-score of `today` against a baseline sample (ANOM-01, ANOM-02).
 * zScore is null (never Infinity/NaN) when the baseline has zero variance
 * or fewer than two samples - Pitfall 2. */
export function computeAnomaly(
  today: number,
  baseline: number[],
): AnomalyResult {
  const m = mean(baseline)
  const sd = sampleStdDev(baseline)
  const delta = today - m
  const zScore = sd === 0 || baseline.length < 2 ? null : delta / sd
  return { delta, zScore }
}

/** Neutral-tone verdict copy per tier (D-03, D-04 - practical daily-check
 * tone, not a climate report or a playful app). `typical`'s copy frames the
 * zero/near-normal case explicitly (D-06, D-07) so the hero delta never
 * reads as a bare, ambiguous "0" - see formatDelta. */
export const VERDICT_LABEL: Record<VerdictTier, string> = {
  'much-colder': 'Much colder than usual',
  'slightly-colder': 'Slightly colder than usual',
  typical: 'Right on the 30-year average',
  'slightly-warmer': 'Slightly warmer than usual',
  'much-warmer': 'Much warmer than usual',
}

/** D-05 tier cutoffs, symmetric around 0: |z| < 0.5 -> typical;
 * 0.5 <= |z| < 1.5 -> slight; |z| >= 1.5 -> much (sign picks
 * warmer/colder). */
export function classifyVerdict(zScore: number): VerdictTier {
  const abs = Math.abs(zScore)
  const sign = zScore >= 0 ? 'warmer' : 'colder'
  if (abs < 0.5) return 'typical'
  if (abs < 1.5) return `slightly-${sign}` as VerdictTier
  return `much-${sign}` as VerdictTier
}

/** Looks up the D-04 neutral-tone copy for a verdict tier (ANOM-03). */
export function verdictLabel(tier: VerdictTier): string {
  return VERDICT_LABEL[tier]
}

/** Whole-number °C delta with an explicit sign (D-06) - avoids implying
 * station-level decimal precision from what is actually modeled/reanalysis
 * data (Pitfall 4). */
export function formatDelta(delta: number): string {
  const rounded = Math.round(delta)
  if (rounded === 0) return '0'
  return rounded > 0 ? `+${rounded}` : `−${Math.abs(rounded)}`
}

// RGB anchors for the continuous anomaly->color mapping (D-02). Module-
// private - only anomalyColor below exposes them, mirroring how
// windowBounds/filterDayOfYearWindow feed computeAnomalyForToday.
const ANOMALY_COLD = { r: 30, g: 58, b: 138 } // #1e3a8a, z <= -3
const ANOMALY_NORMAL = { r: 87, g: 83, b: 78 } // #57534e, z = 0
const ANOMALY_HOT = { r: 154, g: 52, b: 18 } // #9a3412, z >= +3

function lerpChannel(c1: number, c2: number, t: number): number {
  return Math.round(c1 + (c2 - c1) * t)
}

function toHex(rgb: { r: number; g: number; b: number }): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, n))
  const hex = (n: number) => clamp(n).toString(16).padStart(2, '0')
  return `#${hex(rgb.r)}${hex(rgb.g)}${hex(rgb.b)}`
}

/** Continuous z-score -> anomaly-palette color (D-02). Null is treated as
 * z=0, the same fallback precedent as classifyVerdict's `zScore ?? 0`
 * (Pitfall 2) - resolves to the exact --color-anomaly-normal anchor. Clamps
 * to [-3, 3] then does a two-segment piecewise-linear RGB interpolation
 * through the NORMAL anchor (not a single COLD->HOT lerp, which would mud
 * through a gray/brown midpoint and miss the exact z=0 anchor). */
export function anomalyColor(zScore: number | null): string {
  const z = Math.max(-3, Math.min(3, zScore ?? 0))
  if (z <= 0) {
    const t = (z + 3) / 3
    return toHex({
      r: lerpChannel(ANOMALY_COLD.r, ANOMALY_NORMAL.r, t),
      g: lerpChannel(ANOMALY_COLD.g, ANOMALY_NORMAL.g, t),
      b: lerpChannel(ANOMALY_COLD.b, ANOMALY_NORMAL.b, t),
    })
  }
  const t = z / 3
  return toHex({
    r: lerpChannel(ANOMALY_NORMAL.r, ANOMALY_HOT.r, t),
    g: lerpChannel(ANOMALY_NORMAL.g, ANOMALY_HOT.g, t),
    b: lerpChannel(ANOMALY_NORMAL.b, ANOMALY_HOT.b, t),
  })
}

/** Day/night as an independent axis from anomaly color (D-03) - the
 * pin-local hour, half-open range [6, 20) counts as daytime. Only modulates
 * the backdrop gradient's night wash; never the hero text color. */
export function isDaytime(localHour: number): boolean {
  return localHour >= 6 && localHour < 20
}

/** Day-of-year window bounds for one target year (D-01, D-02). Folds
 * Feb 29 -> Feb 28 before constructing the anchor, so a leap year's window
 * naturally includes Feb 29 as one more sample and a non-leap year's window
 * simply has no Feb 29 to include - no special-case branch needed. Uses
 * real Date arithmetic so a window anchored near Jan 1/Dec 31 correctly
 * spans into the adjacent calendar year. */
export function windowBounds(
  year: number,
  month: number, // 1-12
  day: number,
  halfWidthDays: number,
): { start: string; end: string } {
  const safeDay = month === 2 && day === 29 ? 28 : day
  const anchor = Date.UTC(year, month - 1, safeDay)
  const start = new Date(anchor - halfWidthDays * 86_400_000)
  const end = new Date(anchor + halfWidthDays * 86_400_000)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

/** Filters a daily series to the values whose date falls inside the target
 * day-of-year's +/-halfWidthDays window for any year in [startYear,
 * endYear], skipping null values (ANOM-04). */
export function filterDayOfYearWindow(
  daily: { time: string[]; values: (number | null)[] },
  targetMonth: number,
  targetDay: number,
  startYear: number,
  endYear: number,
  halfWidthDays = 5,
): number[] {
  const ranges: { start: string; end: string }[] = []
  for (let y = startYear; y <= endYear; y++) {
    ranges.push(windowBounds(y, targetMonth, targetDay, halfWidthDays))
  }
  const result: number[] = []
  for (let i = 0; i < daily.time.length; i++) {
    const t = daily.time[i]!
    const v = daily.values[i]
    if (v != null && ranges.some((r) => t >= r.start && t <= r.end)) {
      result.push(v)
    }
  }
  return result
}

/** Single "usable history" gate (D-09/D-10): operationalizes D-09's "at
 * least half of the ~30 years must have real values" as a sample-count
 * floor. ERA5 archive coverage is effectively all-or-nothing per location
 * (RESEARCH.md Pitfall 1 - a genuine data desert returns near-zero
 * samples, a real location returns hundreds), so a sample-count floor of
 * ceil(totalYears/2) cleanly separates the two while reusing
 * filterDayOfYearWindow's flattened output as-is. This is the ONLY place
 * the Math.ceil(totalYears/2) threshold expression appears (D-10: one
 * shared definition, no duplicated inline checks) - both
 * computeAnomalyForToday and computeTrendDay call through here so today's
 * anomaly and every trend day can never drift apart. */
export function hasUsableSampleCount(
  samples: number[],
  totalYears: number,
): boolean {
  return samples.length >= Math.ceil(totalYears / 2)
}

/** Computes today's anomaly against the +/-5-day day-of-year baseline
 * window derived from `daily` (ANOM-01/02/03/04). Returns null when the
 * window fails the shared hasUsableSampleCount gate - fewer than half of
 * the baseline's represented years have a real value for this day (D-09,
 * D-10: retrofit of the old "< 2 samples" floor to the stricter shared
 * rule). Degenerate variance (zScore null) falls back to a 'typical'
 * verdict rather than propagating NaN (Pitfall 2). */
export function computeAnomalyForToday(
  daily: { time: string[]; values: (number | null)[] },
  localDate: string,
  todayTemp: number,
  halfWidthDays = 5,
): { delta: number; zScore: number | null; verdictTier: VerdictTier } | null {
  const parts = localDate.split('-')
  const targetMonth = Number(parts[1])
  const targetDay = Number(parts[2])

  const years = daily.time
    .map((t) => Number(t.slice(0, 4)))
    .filter((y) => Number.isFinite(y))
  if (years.length === 0) return null
  const startYear = Math.min(...years)
  const endYear = Math.max(...years)

  const samples = filterDayOfYearWindow(
    daily,
    targetMonth,
    targetDay,
    startYear,
    endYear,
    halfWidthDays,
  )
  if (!hasUsableSampleCount(samples, endYear - startYear + 1)) return null

  const { delta, zScore } = computeAnomaly(todayTemp, samples)
  const verdictTier = classifyVerdict(zScore ?? 0)
  return { delta, zScore, verdictTier }
}

/** Computes one day's trend-chart input against the +/-5-day day-of-year
 * baseline window derived from `daily` (VIZ-01, D-11, D-13). `daily` is the
 * SAME 30-year archive series already fetched once via
 * useHistoricalBaseline - this reuses filterDayOfYearWindow per day
 * against that one series rather than issuing a new fetch (RESEARCH.md
 * Pattern 1/03-CONTEXT.md efficiency note). Returns `{ usable: false,
 * dateStr }` when `actualTemp` is null/non-finite OR the window fails the
 * shared hasUsableSampleCount gate - one unusable code path regardless of
 * cause (data desert vs. a fetch-timing gap, D-14). Returns `{ usable:
 * true, dateStr, samples, mean, actual }` for a healthy day. */
export function computeTrendDay(
  daily: { time: string[]; values: (number | null)[] },
  dateStr: string,
  actualTemp: number | null,
  halfWidthDays = 5,
): TrendDayResult {
  const parts = dateStr.split('-')
  const targetMonth = Number(parts[1])
  const targetDay = Number(parts[2])

  const years = daily.time
    .map((t) => Number(t.slice(0, 4)))
    .filter((y) => Number.isFinite(y))
  if (years.length === 0) return { dateStr, usable: false }
  const startYear = Math.min(...years)
  const endYear = Math.max(...years)

  const samples = filterDayOfYearWindow(
    daily,
    targetMonth,
    targetDay,
    startYear,
    endYear,
    halfWidthDays,
  )

  if (
    actualTemp === null ||
    !Number.isFinite(actualTemp) ||
    !hasUsableSampleCount(samples, endYear - startYear + 1)
  ) {
    return { dateStr, usable: false }
  }

  return {
    dateStr,
    usable: true,
    samples,
    mean: mean(samples),
    actual: actualTemp,
  }
}
