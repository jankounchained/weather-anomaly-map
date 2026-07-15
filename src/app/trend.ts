// Pure trend-row helpers: deterministic dot jitter, per-day historical
// scatter points, the shared padded y-domain across all 7 mini-charts
// (D-06), and weekday/"Today" slot labels. Hand-rolled per CLAUDE.md
// ("hand-roll, don't add a dependency") - no React imports, same
// dependency-free spirit as src/anomaly/anomaly.ts.
import type { TrendDayResult } from '../anomaly/types'

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
 * day's samples + actual + mean, pads by 10% of the range (floor/ceil), and
 * guards the empty case (no usable days) with a sane fallback rather than
 * throwing on Math.min/Math.max of an empty array (03-RESEARCH.md
 * Pattern 3). */
export function computeSharedYDomain(days: TrendDayResult[]): [number, number] {
  const allValues = days.flatMap((day) =>
    day.usable ? [...day.samples, day.actual, day.mean] : [],
  )
  if (allValues.length === 0) return [0, 1]

  const min = Math.min(...allValues)
  const max = Math.max(...allValues)
  const pad = (max - min) * 0.1 || 1
  return [Math.floor(min - pad), Math.ceil(max + pad)]
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
