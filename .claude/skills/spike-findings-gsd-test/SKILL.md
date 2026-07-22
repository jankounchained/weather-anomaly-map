---
name: spike-findings-gsd-test
description: Implementation blueprint from Phase 8 split-violin spike experiments. Requirements, proven KDE/statistics and split-violin geometry patterns, and verified knowledge for building the Weather Anomaly Dashboard's split-violin trend view. Auto-loaded during Phase 8 implementation work.
---

<context>
## Project: gsd-test (Weather Anomaly Dashboard)

Phase 8 replaces the per-day dot-strip trend tiles with per-day **split violins**: each of the last
~7 days becomes one tile comparing that calendar day's recent-5-year temperature distribution (right
half) against its prior-25-year distribution (left half), on a shared Y-axis, to surface climate-shift
signal without overstating confidence on thin samples. This is the milestone's highest-risk phase
(hand-rolled Gaussian KDE + a Recharts custom-shape rewrite + a `computeTrendDay` data-shape change);
these findings are the pre-validated statistics and geometry for it.

Spike session wrapped: 2026-07-23
</context>

<requirements>
## Requirements

Non-negotiable decisions that emerged from spiking (honor these in the Phase 8 build):

- **Hand-rolled Gaussian KDE, no stats dependency** — matches the `anomaly.ts` discipline.
- **KDE bandwidth = textbook Silverman ×1.0**, using **one shared (pooled) bandwidth per day** for
  both halves (per-half Silverman biases the recent half flatter — an n-artifact).
- **Per-half `n_min` = 20** curve-vs-rug gate, in its own named helper, distinct from the whole-tile
  `hasUsableSampleCount` desert gate.
- **Curve is the default render path; the rug fallback is a rare defensive guard** — real per-half
  sizes are always ~55 (recent) / ~275 (prior); ERA5 has no data deserts.
- **No new fetch** — re-window the same single `baseline.daily` 30-yr series into recent/prior halves.
- **Prior-25yr LEFT, recent-5yr RIGHT** (PD-11); equal max half-width (PD-05); one shared max
  density per day (PD-06); a new muted-prior / warm-recent color-token pair (PD-12).
- **Retained marks:** two per-half mean ticks (the gap = the shift signal), the actual-value diamond
  on the center line, the shared padded Y-axis column rendered once.
- **Don't over-read small shifts** — the recent half is reliable-but-adequate (~15% error); keep the
  explicit climate-shift callout (TREND-04) deferred.
- **Legend copy is finalized via the reviewer round-trip** (PD-10), not written unilaterally.
- **Security (T-03-07):** all labels are JSX text / native SVG `<title>`, never a raw-HTML sink.
</requirements>

<findings_index>
## Feature Areas

| Area | Reference | Key Finding |
|------|-----------|-------------|
| Statistics & KDE | `references/statistics-and-kde.md` | Real halves are always 55/275; Silverman ×1.0 + shared pooled bandwidth; n_min=20; failure mode is shape drift not lumpiness |
| Split-Violin Geometry | `references/split-violin-geometry.md` | `buildViolinPaths`/`violinShape` on a shared axis; prior-left/recent-right; shared-peak normalization; honest rug fallback; mean-tick gap = shift signal |

## Source Files

Original spike source (probes, KDE/geometry modules, interactive pages, snapshot generator) is
preserved in `sources/` for complete reference.
</findings_index>

<metadata>
## Processed Spikes

- 001-per-half-sample-sizes
- 002-kde-silverman-quality
- 003-split-violin-tile
</metadata>
