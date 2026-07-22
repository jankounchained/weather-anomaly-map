# Statistics & KDE (Phase 8 Split-Violin)

The proven math layer for the split-violin trend view: how the recent/prior halves are sampled,
how the density curve is estimated, and where a half degrades to a rug. Ports to `src/anomaly/kde.ts`
plus a change to `computeTrendDay`. Verified against real Open-Meteo ERA5 data across 7 latitude
bands.

## Requirements (non-negotiable)

- **Hand-rolled, no stats dependency** — Gaussian KDE + Silverman written by hand, matching the
  `anomaly.ts` discipline (CLAUDE.md "hand-roll, don't add a dependency"). No `simple-statistics`,
  no `d3`.
- **KDE bandwidth = textbook Silverman ×1.0.** Parameter-free, robust, no tuning knob.
- **Per-half `n_min` = 20** for the curve-vs-rug gate (PD-04 gate 2). Lives in its **own named
  helper**, structurally distinct from the whole-tile `hasUsableSampleCount` gate (PD-04 gate 1).
- **No new fetch.** The same single `baseline.daily` 30-yr series is re-windowed client-side into
  recent/prior halves.
- **One shared (pooled) bandwidth per day** for both halves (recommended — see What to Avoid).

## Key facts from real data (don't re-spike these)

- With the app's **±5-day day-of-year window**, per-half sample sizes are fixed:
  **recent-5yr ≈ 55, prior-25yr ≈ 275** samples.
- **ERA5 has no data deserts.** Every real coordinate (equatorial, high Arctic, open ocean,
  Antarctica) returns 100% coverage → the recent half is *never* realistically sparse. The rug
  fallback is a **defensive guard, not a common path**. Build it (cheap, honest) but weight design
  effort toward the curve path.
- **Recent half (n=55) is reliable-but-adequate: ~15% error** vs the true distribution (normalized
  L1 vs the full-pool KDE). Prior (n=275) is ~4%. ⇒ do **not** over-read small recent-vs-prior
  differences — this is why the explicit climate-shift callout (**TREND-04**) stays deferred.
- **`n_min` sweep** (consistent across Berlin/Singapore/Reykjavík): error ~17% @ n=55, ~22% @ n=30,
  **~27% @ n=20 (the floor, ≈1.7× the recent-half baseline)**, ~31% @ n=15, 56–64% @ n=5.

## How to Build It

**1. `computeTrendDay` → two-sample return.** Split the existing window by year range using two
`filterDayOfYearWindow` calls off the SAME `daily` series:
- recent = last 5 complete years (`RECENT_START = lastCompleteYear − 4 … lastCompleteYear`)
- prior = the 25 years before (`PRIOR_START = RECENT_START − 25 … RECENT_START − 1`)

Return `{ usable: true, recentSamples, priorSamples, actual, dateStr }`. The whole-tile
`hasUsableSampleCount` gate (over the combined window) still governs the `usable:false` placeholder.

**2. `kde.ts` — Gaussian KDE + Silverman.** (Verified impl in `sources/002-.../kde.mjs`.)

```ts
// Silverman: h = 0.9 · min(σ, IQR/1.34) · n^(-1/5)
// Guards: IQR collapse → σ; all-equal → tiny positive h (never 0 → no div-by-zero).
export function silvermanBandwidth(xs: number[], factor = 1): number { /* ... */ }

// f(x) = (1/(n·h)) · Σ φ((x − xᵢ)/h),  φ = standard normal pdf
export function kdeAt(x: number, samples: number[], h: number): number { /* ... */ }

// Evaluate on a shared temperature grid → [{ x, density }]
export function kdeCurve(samples: number[], h: number, min: number, max: number, steps = 96) { /* ... */ }
```

**3. Per-half gate helper** (its own name, distinct from `hasUsableSampleCount`):

```ts
const N_MIN = 20
export function halfDrawsCurve(sampleCount: number): boolean {
  return sampleCount >= N_MIN
}
```

**4. Bandwidth = one shared pooled `h` per day.** Compute `h = silvermanBandwidth([...prior, ...recent])`
once and use it for BOTH halves' `kdeCurve` calls.

## What to Avoid

- **Per-half Silverman bandwidth.** It gives the recent half (n=55) a **~25% wider** `h` than the
  prior half (n=275), so the recent half reads systematically flatter/wider even when the true
  spread is equal — an artifact of sample size, not signal. Use one shared pooled `h` instead so
  shape differences reflect the data. (Density normalization stays per-day shared-peak — see the
  geometry reference.)
- **Expecting lumpiness at low n.** The failure mode is the opposite: Silverman *widens* `h` as `n`
  shrinks, so a thin half never goes jagged — it goes **smooth-but-wrong** (30–60% off). The rug
  fallback exists to avoid presenting a *confident smooth curve that's inaccurate*, not to hide
  spikes. Frame the legend copy accordingly.
- **A mode-count / "is it unimodal" reliability metric.** Tried and discarded — it flags normal
  shouldered temperature distributions as "lumpy" even at n=55. Use L1-distance-from-truth if you
  ever need to re-measure.
- **Re-deriving the `ceil(totalYears/2)` desert threshold inline.** Keep the D-10 "one shared
  definition" discipline — the whole-tile gate stays in `hasUsableSampleCount`.

## Constraints

- Open-Meteo archive: keyless, CORS-enabled, `daily=temperature_2m_mean`, ERA5 back to 1940 (30-yr
  window trivially covered). Fixed per-half sizes 55/275 are a direct consequence of the ±5-day
  window × 5/25-year split — if the window half-width ever changes, these counts change with it.
- `n_min = 20` is a safety net given real halves are always 55/275; it only ever fires on synthetic
  or pathological input.

## Origin

Synthesized from spikes: 001, 002 (+ 003's bandwidth-mode finding).
Source files: `sources/001-per-half-sample-sizes/`, `sources/002-kde-silverman-quality/`.
