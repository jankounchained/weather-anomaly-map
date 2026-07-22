# Split-Violin Geometry & Render (Phase 8)

The proven geometry/render layer: turning two per-half KDE curves into a split-violin tile with
marks, fallback, and a shared axis. Ports to `buildViolinPaths()` (geometry) + `violinShape()`
(render) in the Recharts custom-shape rewrite of `TrendDayChart`. Verified by rendering real Berlin
data to static SVG (`sources/003-.../snapshot.mjs`) and inspecting it.

## Requirements (non-negotiable)

- **Prior-25yr draws LEFT, recent-5yr draws RIGHT** (PD-11) — reading left→right traces time toward
  "now," agreeing with the tile row's oldest→Today order (D-08).
- **Equal max width per half** (PD-05) — both halves draw to the same maximum tile half-width; the
  reader compares shape/position, not sample counts.
- **One shared max density per day** (PD-06) — both halves scale by a single shared peak density, so
  a taller/narrower peak genuinely means that side is more concentrated. (This is the density
  normalization; it is separate from the *bandwidth* choice in the statistics reference.)
- **Retained marks:** two per-half **mean ticks** (PD-07 — the gap between them IS the shift signal),
  the **actual-value diamond** on the center line with its native SVG `<title>` (PD-08), and the
  **shared padded Y-axis column** rendered once (PD-09, `TrendYAxisColumn`/D-06).
- **Sparse half → rug** (PD-01): a half with n < `N_MIN` renders as a dot/rug strip, not a curve.
  Both thin → dual rug (PD-02). Whole-tile "Not enough data" placeholder stays for true zero-sample
  days only (PD-03).
- **New recent/prior color-token pair** (PD-12): muted prior vs brighter/warmer recent.
- **Security invariant (T-03-07):** all labels are ordinary JSX text nodes / native SVG `<title>` —
  never a raw-HTML sink.

## How to Build It

Reference geometry: `sources/003-split-violin-tile/violin.mjs`.

**1. Shared vertical (temperature) scale** across all 7 tiles:
```ts
// higher temp = higher on screen
const y = (t) => plotTop + (yMax - t) / (yMax - yMin) * plotHeight
// domain considers both halves' samples AND each day's actual, padded ~8%, so no mark clips
```

**2. `buildViolinPaths(recent, prior, opts)`** per day:
- Compute both `kdeCurve`s over the shared `[yMin, yMax]` grid using the **one shared pooled
  bandwidth** (see statistics reference).
- `sharedMax = max(peak(recentCurve), peak(priorCurve))` — the PD-06 shared density peak.
- Half path (side = −1 left / +1 right): for each grid point, `x = cx + side · (density/sharedMax) ·
  maxHalfWidth`; close the path from the center baseline (`cx`) top→edge→bottom→`Z`.
- Return per half either `{ kind:'curve', path, mean, n }` (n ≥ N_MIN) or
  `{ kind:'rug', points:[{y}], mean, n }`.

**3. `violinShape()` render** (Recharts custom shape):
- Curve half → filled `<path>` (recent-fill/prior-fill) with a 1.5px stroke in the half's token.
- Rug half → sample dots along that side with slight jitter — reuse the existing
  `historicalDotShape` + `jitterX` from `TrendDayChart` for visual consistency.
- Mean tick → short horizontal `<line>` at `y(mean)` extending `side · (maxHalfWidth·0.8)`, in the
  half's mean-tick token, wrapping `<title>` "{n}-sample mean {temp}°C".
- Actual diamond → `<polygon>` at `y(actual)` on `cx`, `<title>` tooltip. Reuse the existing
  `makeActualShape`.

**4. Colors** (echo the app's chart tokens; final hues locked in `08-UI-SPEC.md`):
- prior: muted grey — stroke `#7c8698`, fill `rgba(124,134,152,0.28)`, mean tick `#cbd5e1`
- recent: warm orange — stroke `#f97316`, fill `rgba(249,115,22,0.32)`, mean tick `#fed7aa`
- actual diamond: `--color-chart-actual` `#ea580c`, 1px white stroke (unchanged from today)

**5. Legend** — draft naming recent-5yr / prior-25yr halves, the per-half mean tick, the actual
diamond, and "a thin side shows as raw dots." **Copy is NOT locked here** — finalize via the
reviewer round-trip (PD-10), same process as the Phase 3 legend.

## What to Avoid

- **Letting the KDE tail touch the frame.** Curves narrow to points at the padded domain edges; add
  a slightly larger top/bottom pad (or clamp the violin to sample min/max rather than the padded
  domain) so a tail doesn't kiss the tile border.
- **Per-tile Y-axis.** Render the shared axis exactly once in its own narrow column (`AXIS_WIDTH`),
  every tile keeps an identical plot-area width (the 03-05 fix — don't regress it).
- **Normalizing each half to its own peak.** That makes the two sides' concentration
  non-comparable; use the shared-per-day peak (PD-06).
- **Writing the legend copy yourself.** It must go through the reviewer round-trip (PD-10).

## Constraints

- On real data the recent-vs-prior mean-tick gap is the whole message and it reads at a glance
  (~+0.3…+1.5°C summer warming at Berlin, +0.95°C avg). Keep the two mean ticks visually distinct.
- The rug branch essentially never fires in production (real halves are 55/275) — verify it works,
  but don't let it drive the tile's visual language.
- 7-tile small-multiples structure is unchanged; only each tile's internals change. `computeTrendDay`
  becomes two-sample; the fetch layer and 30-yr archive call are untouched.

## Origin

Synthesized from spike: 003 (geometry, marks, fallback, shared axis, bandwidth-mode comparison).
Source files: `sources/003-split-violin-tile/` (`violin.mjs`, `snapshot.mjs`, `index.html`).
