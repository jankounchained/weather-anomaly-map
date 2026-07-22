# Spike Wrap-Up Summary

**Date:** 2026-07-23
**Spikes processed:** 3
**Feature areas:** Statistics & KDE · Split-Violin Geometry
**Skill output:** `./.claude/skills/spike-findings-gsd-test/`

## Processed Spikes

| # | Name | Type | Verdict | Feature Area |
|---|------|------|---------|--------------|
| 001 | per-half-sample-sizes | standard | ✓ VALIDATED | Statistics & KDE |
| 002 | kde-silverman-quality | standard | ✓ VALIDATED | Statistics & KDE |
| 003 | split-violin-tile | standard | ✓ VALIDATED | Split-Violin Geometry |

## Key Findings

- **Real per-half sample sizes are fixed at ~55 (recent) / ~275 (prior)** with the app's ±5-day
  window, at 100% coverage for every latitude band — ERA5 has no data deserts. The recent half is
  never realistically sparse, so the per-half rug fallback is a defensive guard, not a common path.
- **KDE bandwidth = textbook Silverman ×1.0**, applied as **one shared pooled bandwidth per day**
  (per-half Silverman biases the recent half ~25% flatter — an n-artifact, not signal).
- **Per-half `n_min` = 20** for the curve-vs-rug gate (error ≈1.7× the recent-half baseline there;
  confirms the roadmap's ~15–20 estimate at its conservative end).
- **The low-n failure mode is shape drift, not lumpiness** — Silverman self-widens, so a thin half
  stays smooth but becomes 30–60% inaccurate. The rug exists to prevent a confident-but-wrong curve.
- **The visualization works end-to-end on real data:** the recent-vs-prior warming shift reads at a
  glance from the mean-tick offset (+0.95°C avg, Berlin), and the rug fallback degrades honestly.
- **One decision handed to the UI-SPEC:** bandwidth mode (recommend shared/pooled); plus minor
  polish (top/bottom pad so tails don't touch the frame; reuse `jitterX`/`historicalDotShape`).
- **Supports keeping TREND-04 deferred** — the recent half (~15% error) shouldn't drive an explicit
  climate-shift callout yet.

## Feasibility

Phase 8 is feasible exactly as specified. The full bottom-up chain (`kde.ts` → `buildViolinPaths`/
`violinShape` → marks → shared Y-axis → legend) is proven; `kde.mjs`/`violin.mjs` are pure and port
directly to `src/anomaly/*.ts`. Recommended next step per PD-13: `/gsd-ui-phase 8`, then
`/gsd-plan-phase 8`.
