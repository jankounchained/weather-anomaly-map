// Pure trend-row helpers: deterministic dot jitter, per-day historical
// scatter points, the shared padded y-domain across all 7 mini-charts
// (D-06), the split-violin geometry (buildViolinPaths, TREND-01/TREND-02),
// and weekday/"Today" slot labels. Hand-rolled per CLAUDE.md ("hand-roll,
// don't add a dependency") - no React imports, same dependency-free spirit
// as src/anomaly/anomaly.ts.
import type { TrendDayResult } from '../anomaly/types'
import { silvermanBandwidth, kdeCurve, halfDrawsCurve } from '../anomaly/kde'
import { mean } from '../anomaly/anomaly'

/** Deterministic pseudo-random x-offset for the historical dot at `index`
 * within a day's strip (D-04). Always yields the same value for the same
 * index across renders - never a non-deterministic random source, which
 * would make dots visibly jump on unrelated re-renders (03-RESEARCH.md
 * Anti-Pattern). Maps a fractional sine-based value into a bounded
 * [0.2, 0.8] band so dots cluster away from the strip's edges. */
export function jitterX(index: number): number {
  const raw = Math.sin(index * 12.9898) * 43758.5453
  const fractional = raw - Math.floor(raw)
  return 0.2 + fractional * 0.6
}

/** Maps a day's historical samples to jittered {x, y} points for the
 * Recharts Scatter (D-01, D-04). x carries no semantic meaning; only y
 * (temperature) matters. Preserves sample order/count. */
export function buildHistoricalPoints(
  samples: number[],
): { x: number; y: number }[] {
  return samples.map((sample, index) => ({ x: jitterX(index), y: sample }))
}

/** Computes one padded [min, max] y-domain shared by ALL 7 mini-charts
 * (D-06), so absolute temperature stays comparable across days at a
 * glance - never independently auto-scaled per day. Flattens every usable
 * day's recentSamples + priorSamples + actual + recentMean + priorMean
 * (two-sample TrendDayResult, TREND-01), pads by 10% of the range
 * (floor/ceil), and guards the empty case (no usable days) with a sane
 * fallback rather than throwing on Math.min/Math.max of an empty array
 * (03-RESEARCH.md Pattern 3). */
export function computeSharedYDomain(days: TrendDayResult[]): [number, number] {
  const allValues = days.flatMap((day) =>
    day.usable
      ? [
          ...day.recentSamples,
          ...day.priorSamples,
          day.actual,
          day.recentMean,
          day.priorMean,
        ]
      : [],
  )
  if (allValues.length === 0) return [0, 1]

  const min = Math.min(...allValues)
  const max = Math.max(...allValues)
  const pad = (max - min) * 0.1 || 1
  return [Math.floor(min - pad), Math.ceil(max + pad)]
}

/** Per-half split-violin geometry output (TREND-02, PD-01/PD-02): a half
 * with n >= N_MIN (halfDrawsCurve) renders as a closed KDE curve path; a
 * thinner half degrades to a rug of raw sample points instead (mean is
 * null only for a truly empty half, n===0). */
export type ViolinHalf =
  | { kind: 'curve'; path: string; mean: number; n: number }
  | { kind: 'rug'; points: { y: number }[]; mean: number | null; n: number }

/** Options for buildViolinPaths' SVG geometry (UI-SPEC Violin Geometry &
 * Marks Contract). `yMin`/`yMax` are the shared padded y-domain
 * (computeSharedYDomain's output) feeding the y-scale; `cx`/`maxHalfWidth`
 * are the fixed per-tile geometry constants (44px / 36px, UI-SPEC). */
export interface ViolinPathOptions {
  yMin: number
  yMax: number
  plotTop: number
  plotHeight: number
  cx: number
  maxHalfWidth: number
  steps?: number
}

/** Builds one day's split-violin geometry: two closed SVG half-paths (or a
 * rug fallback of raw points) sharing ONE pooled Silverman bandwidth and
 * ONE shared max density (TREND-01, TREND-02 - port of the spike-verified
 * buildViolinDay, sources/003-split-violin-tile/violin.mjs). Prior draws
 * LEFT (side -1), recent draws RIGHT (side +1) - PD-11. Both halves' KDE
 * curves are computed from `silvermanBandwidth([...priorSamples,
 * ...recentSamples])` - ONE shared pooled bandwidth, never two separate
 * per-half bandwidths (per-half Silverman would bias the smaller recent
 * half artificially flatter, spike statistics finding). Both halves scale
 * against ONE shared max density (PD-06) so relative peakiness stays
 * comparable within a day, and both draw to the same maxHalfWidth
 * regardless of sample count (PD-05, equal-width). Each half's curve grid
 * is clamped to that half's own [min(samples), max(samples)] - NOT the
 * full padded y-domain - so a tail never touches or crosses the tile frame
 * (UI-SPEC Violin Geometry & Marks Contract point 3). A half below
 * halfDrawsCurve's n_min=20 threshold degrades to a rug of raw sample
 * points instead of a curve (PD-01). */
export function buildViolinPaths(
  recentSamples: number[],
  priorSamples: number[],
  opts: ViolinPathOptions,
): { prior: ViolinHalf; recent: ViolinHalf } {
  const { yMin, yMax, plotTop, plotHeight, cx, maxHalfWidth, steps = 96 } = opts
  const y = (t: number) => plotTop + ((yMax - t) / (yMax - yMin)) * plotHeight

  // ONE shared pooled bandwidth for BOTH halves (statistics reference -
  // never derive two per-half bandwidths here).
  const h = silvermanBandwidth([...priorSamples, ...recentSamples])

  // Clamp each half's curve grid to its own sample range, falling back to
  // the shared domain only for a truly empty half (never used to draw a
  // curve - halfDrawsCurve(0) is always false, so that half renders as an
  // empty rug instead).
  const sampleRange = (samples: number[]): [number, number] =>
    samples.length ? [Math.min(...samples), Math.max(...samples)] : [yMin, yMax]

  const [priorMin, priorMax] = sampleRange(priorSamples)
  const [recentMin, recentMax] = sampleRange(recentSamples)

  const priorCurve = kdeCurve(priorSamples, h, priorMin, priorMax, steps)
  const recentCurve = kdeCurve(recentSamples, h, recentMin, recentMax, steps)

  // PD-06: ONE shared max density per day - both halves scale by the same
  // factor, so a taller/narrower peak genuinely means more concentrated;
  // never normalized independently per half.
  const sharedMax =
    Math.max(
      ...priorCurve.map((p) => p.density),
      ...recentCurve.map((p) => p.density),
    ) || 1

  const halfPath = (
    curve: { x: number; density: number }[],
    side: -1 | 1,
    min: number,
    max: number,
  ): string => {
    const edge = curve
      .map((p) => {
        const w = (p.density / sharedMax) * maxHalfWidth
        return `${(cx + side * w).toFixed(1)},${y(p.x).toFixed(1)}`
      })
      .join(' L')
    const top = `${cx.toFixed(1)},${y(max).toFixed(1)}`
    const bottom = `${cx.toFixed(1)},${y(min).toFixed(1)}`
    return `M${top} L${edge} L${bottom} Z`
  }

  const rugPoints = (samples: number[]): { y: number }[] =>
    samples.map((s) => ({ y: y(s) }))

  const half = (
    samples: number[],
    curve: { x: number; density: number }[],
    side: -1 | 1,
    min: number,
    max: number,
  ): ViolinHalf =>
    halfDrawsCurve(samples.length)
      ? {
          kind: 'curve',
          path: halfPath(curve, side, min, max),
          mean: mean(samples),
          n: samples.length,
        }
      : {
          kind: 'rug',
          points: rugPoints(samples),
          mean: samples.length ? mean(samples) : null,
          n: samples.length,
        }

  return {
    prior: half(priorSamples, priorCurve, -1, priorMin, priorMax),
    recent: half(recentSamples, recentCurve, +1, recentMin, recentMax),
  }
}

/** Renders a slot's weekday/"Today" label (D-08). Builds the date from
 * `dateStr + 'T00:00:00Z'` and formats in UTC so the label is stable
 * regardless of the test/runtime timezone. */
export function formatSlotLabel(dateStr: string, isToday: boolean): string {
  if (isToday) return 'Today'
  const date = new Date(`${dateStr}T00:00:00Z`)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  })
}
