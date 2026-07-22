# Spike Manifest

## Idea

**Phase 8 — Split-Violin Trend View.** Replace the per-day dot-strip tiles with per-day
*split violins*: each of the last ~7 days becomes one tile comparing that calendar day's
recent-5-year temperature distribution (right half) against its prior-25-year distribution
(left half), on a shared Y-axis. The goal is to surface climate-shift signal — has the recent
distribution moved relative to the older baseline? — without overstating confidence on thin
samples. This is the milestone's highest-risk phase (hand-rolled Gaussian KDE + a Recharts
custom-shape rewrite + a data-shape change to `computeTrendDay`), flagged for a dedicated
statistics/design spike before implementation (PD-13).

## Requirements

Design decisions carried in from `08-CONTEXT.md` (PD-01…13) that the spike must respect or
empirically validate — non-negotiable for the real build:

- **Equal-width halves** (PD-05): both halves draw to the same max width; the reader compares
  shape/position, not sample counts. Sample-count honesty is carried by the curve→rug fallback,
  not by width.
- **Shared density peak per day** (PD-06): both halves of a given day normalize to one shared
  max density, so a taller/narrower peak genuinely means more concentrated.
- **Curve→rug sparse-half fallback** (PD-01/02): a thin half degrades to a rug/dot-strip, never
  a misleadingly smooth curve. Both thin → dual rug. The bordered "Not enough data" placeholder
  stays reserved for true zero-sample days only (PD-03).
- **Two distinct gates** (PD-04): (1) existing whole-tile `hasUsableSampleCount` desert check;
  (2) NEW per-half `n_min` curve-vs-rug threshold in its own named helper.
- **Prior-25yr LEFT, recent-5yr RIGHT** (PD-11); a new recent/prior chart-token pair (PD-12).
- **Retained marks** (PD-07/08/09): two per-half mean ticks (the gap = the shift signal), the
  actual-value diamond, the shared padded Y-axis column (`TrendYAxisColumn`, D-06).
- **Legend re-derived via reviewer copy round-trip** (PD-10) — settled in UI-SPEC, not the spike.
- **No new fetch** — the same single `baseline.daily` series is re-windowed client-side.

**Open numbers the spike pins:** KDE bandwidth choice (Silverman vs tuned) and the per-half
`n_min` curve-vs-rug threshold (roadmap estimate ~15–20).

## Spikes

| # | Name | Type | Validates | Verdict | Tags |
|---|------|------|-----------|---------|------|
| 001 | per-half-sample-sizes | standard | Actual recent/prior per-half sample counts on real Open-Meteo data across latitudes; is the recent half ever sparse? | ✓ VALIDATED | statistics, sampling, gate |
| 002 | kde-silverman-quality | standard | Does a hand-rolled Gaussian KDE + Silverman bandwidth render a believable (non-lumpy) curve at the recent half's real n? Pin n_min via thinning. | ✓ VALIDATED | statistics, kde, bandwidth |
| 003 | split-violin-tile | standard | Composed split-violin tile row on real data: does the recent-vs-prior shift read legibly, with marks + fallback on a shared Y-axis? | ○ PENDING | viz, svg, geometry, ux |

## Key Findings (running)

- **001:** Every real location (equatorial → high Arctic → open ocean → Antarctica) returns
  exactly **55 recent / 275 prior** samples at **100% coverage**. ERA5 has no data deserts. ⇒ the
  recent half is never realistically sparse; the rug fallback is a defensive guard, not a common
  path. The real design constraint is the **55-vs-275 bandwidth asymmetry**, not sparsity.
- **002:** Bandwidth = **textbook Silverman ×1.0** (parameter-free, robust). **n_min = 20** pinned
  (curve error ≈1.7× the recent-half baseline there; confirms roadmap's ~15–20). Recent half
  (n=55) curve is reliable-but-adequate (~15% error vs truth) → don't over-read small shifts
  (supports deferring TREND-04). Failure mode under thinning is **shape drift, not spikiness**
  (Silverman self-protects against lumps) → the rug fallback exists to avoid a confident
  smooth-but-wrong curve, which is the honest framing for the legend.

## Requirements (emerged from spiking)

- **KDE bandwidth = Silverman ×1.0**, hand-rolled Gaussian kernel, no stats dependency (matches
  `anomaly.ts` discipline). [002]
- **Per-half `n_min` = 20** for the curve-vs-rug gate (PD-04 gate 2), in its own named helper. [002]
- **Curve is the default render path**; rug is a rare guard (real halves are always 55/275). [001]
