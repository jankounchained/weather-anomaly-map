// Pure Gaussian KDE + Silverman bandwidth math for the split-violin trend
// view. Hand-rolled per CLAUDE.md ("hand-roll, don't add a dependency") - no
// simple-statistics, no d3, same discipline as anomaly.ts.
import { sampleStdDev } from './anomaly'

/** Linear-interpolated quantile (q in [0,1]) over a copy-sorted sample.
 * NaN for an empty sample (guard - no meaningful quantile of nothing). */
export function quantile(xs: number[], q: number): number {
  if (xs.length === 0) return NaN
  const s = [...xs].sort((a, b) => a - b)
  const pos = (s.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  if (lo === hi) return s[lo]!
  return s[lo]! + (s[hi]! - s[lo]!) * (pos - lo)
}

/** Interquartile range (Q3 - Q1) - one of Silverman's two spread candidates
 * (statistics-and-kde.md). */
export function iqr(xs: number[]): number {
  return quantile(xs, 0.75) - quantile(xs, 0.25)
}

/** Silverman's rule-of-thumb bandwidth: h = 0.9 * min(sd, IQR/1.349) *
 * n^(-1/5) (textbook Silverman x1.0, spike 002/statistics-and-kde.md -
 * parameter-free, no tuning knob; `factor` defaults to 1 and is never
 * overridden per-half in this app - see buildViolinPaths' shared pooled `h`).
 * Reuses anomaly.ts's `sampleStdDev` (one shared n-1 stddev definition,
 * matching hasUsableSampleCount's "ONE definition" precedent) rather than
 * re-declaring a local stdDev/mean pair. Guards (Pitfall 2 discipline): n<2
 * returns a tiny positive h (1e-6, never 0); if both spread candidates
 * collapse to 0 (an all-equal sample), `h` also falls back to 1e-6 - the
 * kernel becomes a narrow spike instead of dividing by zero. */
export function silvermanBandwidth(xs: number[], factor = 1): number {
  const n = xs.length
  if (n < 2) return 1e-6
  const sd = sampleStdDev(xs)
  const iq = iqr(xs)
  const spreadCandidates = [sd, iq / 1.349].filter((v) => v > 0)
  const A = spreadCandidates.length ? Math.min(...spreadCandidates) : 0
  const h = 0.9 * A * Math.pow(n, -1 / 5) * factor
  return h > 0 ? h : 1e-6
}

const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI)
function gaussian(u: number): number {
  return INV_SQRT_2PI * Math.exp(-0.5 * u * u)
}

/** Gaussian KDE evaluated at scalar `x`: f(x) = (1/(n*h)) * sum K((x-xi)/h).
 * Guards (Pitfall 2): n===0 or h<=0 return 0 rather than dividing by zero. */
export function kdeAt(x: number, samples: number[], h: number): number {
  const n = samples.length
  if (n === 0 || h <= 0) return 0
  let sum = 0
  for (let i = 0; i < n; i++) sum += gaussian((x - samples[i]!) / h)
  return sum / (n * h)
}

/** Evaluates the KDE on `steps` points spanning [domainMin, domainMax]
 * inclusive. Returns the raw density curve - NOT yet width-normalized;
 * violin width/shared-peak normalization is trend.ts's buildViolinPaths
 * (Plan 2, PD-06). */
export function kdeCurve(
  samples: number[],
  h: number,
  domainMin: number,
  domainMax: number,
  steps = 96,
): { x: number; density: number }[] {
  const out: { x: number; density: number }[] = []
  const span = domainMax - domainMin
  for (let i = 0; i < steps; i++) {
    const x = domainMin + (span * i) / (steps - 1)
    out.push({ x, density: kdeAt(x, samples, h) })
  }
  return out
}

const N_MIN = 20

/** Per-half curve-vs-rug gate (PD-04 gate 2), spike-pinned n_min=20
 * (statistics-and-kde.md n_min sweep) - structurally distinct from
 * anomaly.ts's whole-tile `hasUsableSampleCount` desert gate (PD-04 gate 1).
 * Do NOT conflate or re-derive the ceil(totalYears/2) desert threshold here.
 * This is the ONLY place N_MIN appears - one shared definition, no
 * duplicated inline checks, mirroring hasUsableSampleCount's own precedent.
 * Inclusive at the floor: n=20 draws a curve, n=19 degrades to a rug. */
export function halfDrawsCurve(sampleCount: number): boolean {
  return sampleCount >= N_MIN
}
