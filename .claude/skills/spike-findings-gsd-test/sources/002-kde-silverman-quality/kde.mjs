// Spike 002 — portable hand-rolled Gaussian KDE. Written dependency-free and
// pure so it ports straight to `src/anomaly/kde.ts` (same discipline as
// anomaly.ts: no simple-statistics, no d3). Exported for both the Node
// experiment and the browser page (via a tiny re-export shim in the HTML).

/** Arithmetic mean. */
export function mean(xs) {
  return xs.reduce((s, v) => s + v, 0) / xs.length
}

/** Sample standard deviation (n-1). 0 for <2 samples. */
export function stdDev(xs) {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1))
}

/** Linear-interpolated quantile (q in [0,1]) over a copy-sorted sample. */
export function quantile(xs, q) {
  if (xs.length === 0) return NaN
  const s = [...xs].sort((a, b) => a - b)
  const pos = (s.length - 1) * q
  const lo = Math.floor(pos), hi = Math.ceil(pos)
  if (lo === hi) return s[lo]
  return s[lo] + (s[hi] - s[lo]) * (pos - lo)
}

/** Interquartile range (Q3 − Q1). */
export function iqr(xs) {
  return quantile(xs, 0.75) - quantile(xs, 0.25)
}

/**
 * Silverman's rule-of-thumb bandwidth:
 *   h = 0.9 · min(σ, IQR/1.34) · n^(-1/5)
 * `factor` multiplies h (1 = textbook Silverman; >1 = extra smoothing).
 * Robust guards: if IQR collapses (many ties) fall back to σ; if both
 * collapse (all-equal sample) return a tiny positive h so the kernel is a
 * narrow spike rather than 0 (which would divide-by-zero the density).
 */
export function silvermanBandwidth(xs, factor = 1) {
  const n = xs.length
  if (n < 2) return 1e-6
  const sd = stdDev(xs)
  const iq = iqr(xs)
  const spreadCandidates = [sd, iq / 1.349].filter((v) => v > 0)
  const A = spreadCandidates.length ? Math.min(...spreadCandidates) : 0
  const h = 0.9 * A * Math.pow(n, -1 / 5) * factor
  return h > 0 ? h : 1e-6
}

const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI)
function gaussian(u) {
  return INV_SQRT_2PI * Math.exp(-0.5 * u * u)
}

/**
 * Gaussian KDE evaluated at scalar `x`:
 *   f(x) = (1/(n·h)) · Σ K((x − x_i)/h)
 */
export function kdeAt(x, samples, h) {
  const n = samples.length
  if (n === 0 || h <= 0) return 0
  let sum = 0
  for (let i = 0; i < n; i++) sum += gaussian((x - samples[i]) / h)
  return sum / (n * h)
}

/**
 * Evaluate the KDE on `steps` points across [domainMin, domainMax].
 * Returns [{ x, density }] — the raw density curve (NOT yet width-normalized;
 * violin width-normalization is spike 003's geometry step).
 */
export function kdeCurve(samples, h, domainMin, domainMax, steps = 128) {
  const out = []
  const span = domainMax - domainMin
  for (let i = 0; i < steps; i++) {
    const x = domainMin + (span * i) / (steps - 1)
    out.push({ x, density: kdeAt(x, samples, h) })
  }
  return out
}

/**
 * Count "significant" local maxima (modes) in a density curve. A unimodal-ish
 * day-of-year temperature window should read as ~1 dominant mode; spurious
 * extra modes are the visible signature of under-smoothing (too little data
 * for the bandwidth). `relThreshold` ignores ripples below that fraction of
 * the global peak so genuine tiny wiggles don't inflate the count.
 */
export function countModes(curve, relThreshold = 0.05) {
  const peak = Math.max(...curve.map((p) => p.density))
  if (peak <= 0) return 0
  const floor = peak * relThreshold
  let modes = 0
  for (let i = 1; i < curve.length - 1; i++) {
    const d = curve[i].density
    if (d >= floor && d > curve[i - 1].density && d >= curve[i + 1].density) modes++
  }
  return modes
}
