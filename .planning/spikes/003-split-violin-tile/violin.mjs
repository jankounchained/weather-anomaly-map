// Spike 003 — split-violin geometry. Portable + pure; ports to
// `buildViolinPaths()` / `violinShape()` in the real build. Vertical axis =
// temperature (shared across all 7 tiles). Prior half draws LEFT, recent half
// draws RIGHT (PD-11). Equal max width per half (PD-05). Both halves of a day
// share ONE max density (PD-06). A half below n_min degrades to a rug (PD-01).

import { silvermanBandwidth, kdeCurve, mean } from './kde.mjs'

export const N_MIN = 20 // spike 002

/** temp → svg y (higher temp = higher on screen). */
export function makeYScale(yMin, yMax, plotTop, plotHeight) {
  return (t) => plotTop + (yMax - t) / (yMax - yMin) * plotHeight
}

/**
 * Build one day's split-violin geometry.
 *
 * @param recent  recent-5yr samples (right half)
 * @param prior   prior-25yr samples (left half)
 * @param opts    { yMin, yMax, plotTop, plotHeight, cx, maxHalfWidth,
 *                  bandwidthMode: 'perHalf'|'shared', steps }
 * @returns { recent, prior } each = { kind:'curve', path, mean, n } or
 *          { kind:'rug', points:[{y}], mean, n }
 */
export function buildViolinDay(recent, prior, opts) {
  const { yMin, yMax, plotTop, plotHeight, cx, maxHalfWidth, bandwidthMode = 'perHalf', steps = 96 } = opts
  const y = makeYScale(yMin, yMax, plotTop, plotHeight)

  // Bandwidth: per-half Silverman, OR one shared bandwidth from the pooled
  // samples so shape differences reflect the DATA, not the n-driven bandwidth
  // gap (spike 003 finding — recent n=55 gets a ~25% wider h than prior n=275).
  const pooled = [...prior, ...recent]
  const hShared = silvermanBandwidth(pooled)
  const hRecent = bandwidthMode === 'shared' ? hShared : silvermanBandwidth(recent)
  const hPrior = bandwidthMode === 'shared' ? hShared : silvermanBandwidth(prior)

  const recentCurve = kdeCurve(recent, hRecent, yMin, yMax, steps)
  const priorCurve = kdeCurve(prior, hPrior, yMin, yMax, steps)

  // PD-06: ONE shared max density per day → both halves scale by the same
  // factor, so a taller/narrower peak genuinely means more concentrated.
  const sharedMax = Math.max(
    ...recentCurve.map((p) => p.density),
    ...priorCurve.map((p) => p.density),
  ) || 1

  const halfPath = (curve, side /* -1 left, +1 right */) => {
    // Down one edge (baseline at cx), up the density edge. Closed shape.
    const pts = curve.map((p) => {
      const w = (p.density / sharedMax) * maxHalfWidth
      return { x: cx + side * w, y: y(p.x) }
    })
    const top = `${cx.toFixed(1)},${y(yMax).toFixed(1)}`
    const bottom = `${cx.toFixed(1)},${y(yMin).toFixed(1)}`
    const edge = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L')
    return `M${top} L${edge} L${bottom} Z`
  }

  const rugPoints = (samples) => samples.map((s) => ({ y: y(s) }))

  const half = (samples, curve, side) =>
    samples.length >= N_MIN
      ? { kind: 'curve', path: halfPath(curve, side), mean: mean(samples), n: samples.length }
      : { kind: 'rug', points: rugPoints(samples), mean: samples.length ? mean(samples) : null, n: samples.length }

  return {
    prior: half(prior, priorCurve, -1),
    recent: half(recent, recentCurve, +1),
  }
}

/** Shared padded temperature domain across all days (D-06 / PD-09). Considers
 * both halves' samples and each day's actual value so no mark clips. */
export function sharedYDomain(days, pad = 0.08) {
  const all = []
  for (const d of days) {
    all.push(...d.recent, ...d.prior)
    if (d.actual != null) all.push(d.actual)
  }
  const lo = Math.min(...all), hi = Math.max(...all)
  const p = (hi - lo) * pad
  return [lo - p, hi + p]
}
