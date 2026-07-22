---
spike: 003
name: split-violin-tile
type: standard
validates: "Given both halves' KDEs + marks + fallback on a shared Y-axis, when rendered as a 7-tile row from real data, then the recent-vs-prior shift reads legibly and the sparse-half rug degrades honestly"
verdict: VALIDATED
related: [001, 002]
tags: [viz, svg, geometry, violin, ux, phase-8]
---

# Spike 003: Split-Violin Tile Row

## What This Validates

**Given** both halves' KDEs (spike 002) plus the retained marks and the per-half rug fallback,
**when** they are composed into a 7-tile per-day row on one shared temperature axis from real
Open-Meteo data, **then** the recent-vs-prior climate-shift signal reads legibly at a glance and
a thin half degrades honestly to a rug rather than a false curve. This is the experiential proof
that the whole visualization premise holds.

## Research

- **Geometry (`violin.mjs`, ports to `buildViolinPaths()`/`violinShape()`):** vertical axis =
  temperature; each half is a closed SVG path from the center baseline out to `density(t)`.
  Prior draws LEFT, recent draws RIGHT (PD-11). Equal max half-width (PD-05). Both halves of a day
  scale by ONE shared max density (PD-06). A half with n < `N_MIN` (20, spike 002) renders as a
  rug of dots instead (PD-01).
- **Marks:** two per-half mean ticks (PD-07 — the gap between them is the shift signal), the
  actual-value diamond on the center line (PD-08), one shared padded Y-axis column (PD-09,
  `sharedYDomain`).
- **Color tokens (PD-12):** muted grey prior vs warm orange recent, so the recent half is the one
  the eye is drawn to.

## How to Run

```bash
# Interactive: 7 live tiles, bandwidth-mode toggle, and a thinning slider that
# forces the rug fallback:
python3 -m http.server 8003    # open http://localhost:8003/

# Static SVG snapshots from real Berlin data (the geometry, not a mockup):
node snapshot.mjs              # normal (recent n=55)  → snapshot.svg
node snapshot.mjs --thin       # recent thinned to 12  → rug fallback
node snapshot.mjs --shared     # shared pooled bandwidth
# PNG previews (macOS): qlmanage -t -s 1600 -o . snapshot.svg
```

## What to Expect

- Seven split-violin tiles on a shared °C axis. The orange (recent) mean tick sits visibly above
  the grey (prior) mean tick — that offset is the ~+0.3…+1.5°C Berlin summer warming, readable at
  a glance without reading any number.
- Drag the thinning slider below 20 → every recent half flips to raw dots while the prior curve
  persists; the tile stays symmetric and stops asserting a confident shape over thin data.

## Investigation Trail

1. **Built `violin.mjs`** — `buildViolinDay` (per-half curve/rug branch on `N_MIN`), `sharedYDomain`,
   `makeYScale`. Pure + portable.
2. **Rendered a static SVG from real Berlin data and inspected it** (snapshot.svg → PNG). First
   pass confirmed the shift reads: the orange recent mean tick is clearly above the grey prior tick
   across all 7 days; shapes are smooth and believable (no lumps — consistent with spike 002).
3. **Forced the rug fallback** (`--thin`, recent → 12). Confirmed PD-01: the right half becomes a
   dot strip, the left prior curve still draws, the mean tick survives, the tile stays honest.
4. **Probed the bandwidth-asymmetry concern** raised by spike 002 (recent n=55 gets ~25% wider
   Silverman h than prior n=275). Rendered per-half vs shared (pooled) bandwidth side by side.

## Results

**VALIDATED — the split-violin surfaces climate-shift signal legibly, and the fallback is honest.**

- **The shift reads.** On real Berlin data the recent-5yr distribution and mean tick sit visibly
  warmer than the prior-25yr baseline across all 7 tiles (+0.95°C avg gap). The reader gets
  "recent is warmer than the old normal" instantly from the mark offset — no number required. The
  phase's core purpose is achieved.
- **Curves are believable, not lumpy** — confirms spike 002 visually at composed scale. Silverman
  never produced a jagged half at n=55.
- **The rug fallback degrades honestly** (see `snapshot-rug`). A sub-`n_min` half becomes raw dots,
  keeping the tile symmetric and truthful; the prior curve and mean tick remain.
- **Shared Y-axis holds** — one padded domain across all 7 tiles keeps them comparable (PD-09).

**New finding — bandwidth mode is a real UI-SPEC decision (leaning "shared"):**
Per spike 002, the recent half's per-half Silverman bandwidth is ~25% wider than the prior half's
(n=55 vs 275), which systematically makes the recent half read slightly flatter/wider even where
the true spread is equal — an n-artifact, not signal. The `--shared` snapshot (one pooled
bandwidth for both halves) neutralizes this: any remaining width/shape difference then reflects the
DATA. At real n the visual difference is subtle, but **shared-pooled bandwidth is the marginally
more honest default** for a shift-detection chart, since it isolates location/mean differences from
sampling-size differences. Recommendation for `08-UI-SPEC.md`: **use one shared (pooled) bandwidth
per day**, keeping per-half density normalization (PD-06). Final call belongs to the UI-SPEC
(Claude's-discretion item), but the spike surfaces it as a decision, not an accident.

**Minor polish notes for the build (not blockers):**
- The KDE tail can reach the padded domain edge; a slightly larger top/bottom pad (or clamping the
  violin to the sample min/max rather than the padded domain) avoids the curve touching the frame.
- Rug jitter is currently deterministic (`i % 3`); the real build can reuse the existing
  `jitterX`/`historicalDotShape` treatment from `TrendDayChart` for visual consistency.

**Impact:** the full bottom-up chain (`kde.ts` → `buildViolinDay`/`buildViolinPaths` → `violinShape`
→ marks → legend) is proven end-to-end on real data. Phase 8 is feasible as specified; the only
newly-surfaced decision is bandwidth mode (shared vs per-half), handed to the UI-SPEC.
