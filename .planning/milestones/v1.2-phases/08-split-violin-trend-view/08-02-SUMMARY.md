---
phase: 08-split-violin-trend-view
plan: 02
subsystem: ui
tags: [kde, split-violin, svg-geometry, typescript, vitest, tailwind-v4]

# Dependency graph
requires:
  - phase: 08-split-violin-trend-view
    provides: "08-01: kde.ts (silvermanBandwidth, kdeCurve, halfDrawsCurve, N_MIN=20) and the two-sample TrendDayResult/computeTrendDay (recentSamples/priorSamples/recentMean/priorMean)"
provides:
  - "src/app/trend.ts: buildViolinPaths(recentSamples, priorSamples, opts) - pure split-violin SVG geometry (closed half-paths or rug fallback points) with ONE shared pooled bandwidth, ONE shared max density, equal maxHalfWidth, prior-left/recent-right, per-half clamp-to-sample-range"
  - "src/app/trend.ts: ViolinHalf discriminated union ({kind:'curve',path,mean,n} | {kind:'rug',points,mean,n})"
  - "src/app/trend.ts: computeSharedYDomain extended to flatten both TrendDayResult halves + both per-half means"
  - "src/index.css: --color-chart-prior-fill/-prior-stroke/-recent-fill/-recent-stroke tokens at the UI-SPEC-locked values (PD-12)"
affects: [08-03-violin-render, 08-04-trend-legend]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "buildViolinPaths mirrors trend.ts's existing pure-geometry style (no React imports) and the spike-validated buildViolinDay port (sources/003-split-violin-tile/violin.mjs), adapted to drop the spike's bandwidthMode param entirely - only the shared-pooled-bandwidth path exists in the real build"
    - "Per-half curve grid is clamped to that half's own [min(samples), max(samples)] rather than the full padded y-domain - the halfPath top/bottom anchor points use the half's own range, not the global yMin/yMax, so a tail never touches the tile frame"

key-files:
  created: []
  modified: [src/app/trend.ts, src/app/trend.test.ts, src/index.css]

key-decisions:
  - "Kept computeSharedYDomain's pad at exactly 10% (not the ~8% mentioned in the plan's must_haves prose) per the plan's own <action> instruction ('keep the exact empty-array guard + 10% pad') - the ~8% wording is a looser paraphrase echoing the UI-SPEC's separate buildViolinPaths curve-clamp discussion, not a literal contradiction of the explicit 10% directive"
  - "A truly empty half (n=0) falls back to [yMin, yMax] as its sampleRange input to kdeCurve purely so Math.min/Math.max never run on an empty array - that curve is never rendered, since halfDrawsCurve(0) is always false and the half renders as an empty rug instead"
  - "buildViolinPaths' opts type exported as ViolinPathOptions (not required by the plan's must_haves, but a natural export so Plan 08-03's TrendDayChart.tsx can type its call site without duplicating an inline object shape)"

patterns-established:
  - "Split-violin half geometry: kdeCurve grid domain = that half's own [sampleMin, sampleMax] (clamp), while the SVG y-scale itself still spans the full shared padded [yMin, yMax] domain - two different ranges serving two different purposes (grid density-sampling window vs. pixel-mapping scale)"

requirements-completed: [TREND-01, TREND-02]

coverage:
  - id: D1
    description: "buildViolinPaths computes both halves' KDE from ONE shared pooled Silverman bandwidth (never per-half), scales both by ONE shared max density (PD-06), and draws both to the same maxHalfWidth regardless of sample count (PD-05)"
    requirement: "TREND-01"
    verification:
      - kind: unit
        ref: "src/app/trend.test.ts#buildViolinPaths uses ONE shared pooled bandwidth for both halves"
        status: pass
      - kind: unit
        ref: "src/app/trend.test.ts#buildViolinPaths produces mirror-image half-paths about cx when recent and prior samples are identical"
        status: pass
    human_judgment: false
  - id: D2
    description: "A half with n>=20 returns kind:'curve' with a valid SVG path; a half with n<20 returns kind:'rug' with raw points and a nullable mean (n=0 case) - via halfDrawsCurve, TREND-02"
    requirement: "TREND-02"
    verification:
      - kind: unit
        ref: "src/app/trend.test.ts#buildViolinPaths gives a half with n >= 20 kind:\"curve\" ... / gives a half with n = 19 ... kind:\"rug\" / returns mean:null for a truly empty half (n=0)"
        status: pass
    human_judgment: false
  - id: D3
    description: "prior draws LEFT (side -1, x<=cx), recent draws RIGHT (side +1, x>=cx); each half's curve grid is clamped to that half's own sample range, not the full padded domain"
    requirement: "TREND-01"
    verification:
      - kind: unit
        ref: "src/app/trend.test.ts#buildViolinPaths draws prior on the left ... and recent on the right ... / clamps each half curve grid to its own [sampleMin, sampleMax] ..."
        status: pass
    human_judgment: false
  - id: D4
    description: "computeSharedYDomain flattens recentSamples/priorSamples/actual/recentMean/priorMean across usable two-sample days into one ~10%-padded domain, with the empty-array guard preserved"
    requirement: "TREND-01"
    verification:
      - kind: unit
        ref: "src/app/trend.test.ts#computeSharedYDomain pads the min/max across all usable two-sample days by 10% / flattens both halves plus both per-half means / returns a sane fallback range for an all-unusable input / returns a sane fallback for an empty days array"
        status: pass
    human_judgment: false
  - id: D5
    description: "Four new --color-chart-prior-fill/-prior-stroke/-recent-fill/-recent-stroke tokens exist in src/index.css at the UI-SPEC-locked values; existing --color-chart-mean/-actual/-historical tokens untouched"
    requirement: "TREND-01"
    verification:
      - kind: unit
        ref: "grep -Eq -- '--color-chart-prior-fill:\\s*rgba\\(87, 83, 78, 0\\.24\\)' src/index.css && grep -Eq -- '--color-chart-recent-stroke:\\s*#9a3412' src/index.css"
        status: pass
      - kind: other
        ref: "npx vite build - compiled CSS output confirms chart-prior-fill/chart-recent-stroke tokens present"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-23
status: complete
---

# Phase 8 Plan 2: Split-Violin Geometry (buildViolinPaths) + Chart Tokens Summary

**Pure `buildViolinPaths` SVG geometry — one shared pooled Silverman bandwidth, one shared max density, equal-width prior-left/recent-right violin halves clamped to each half's own sample range — plus the four locked recent/prior chart tokens, turning the two-sample `computeTrendDay` output from Plan 1 into renderable split-violin shapes for Plan 3.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-23T10:19Z (approx, first Read call)
- **Completed:** 2026-07-23T10:31:35+02:00
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `buildViolinPaths(recentSamples, priorSamples, opts)`: ports the spike-validated `buildViolinDay` geometry (`sources/003-split-violin-tile/violin.mjs`) into `trend.ts`, dropping the spike's `bandwidthMode` param entirely — the real build only ever computes ONE shared pooled bandwidth (`silvermanBandwidth([...priorSamples, ...recentSamples])`) for both halves, never two per-half bandwidths
- `ViolinHalf` discriminated union exported: `{kind:'curve', path, mean, n}` (n≥20, `halfDrawsCurve`) or `{kind:'rug', points, mean, n}` (n<20, mean null only when n===0)
- `computeSharedYDomain` extended from the retired single-sample `[...samples, actual, mean]` flatten to the two-sample `[...recentSamples, ...priorSamples, actual, recentMean, priorMean]` flatten, keeping the exact 10% pad and empty-array guard
- Four new CSS chart tokens added to `src/index.css`'s `@theme` block at the exact UI-SPEC-locked values, with the three retained-mark tokens (`--color-chart-mean/-actual/-historical`) left untouched

## Task Commits

Each task was committed atomically:

1. **Task 1: buildViolinPaths geometry + ViolinHalf type + extended computeSharedYDomain** - `51168d6` (feat)
2. **Task 2: Add recent/prior violin chart tokens to index.css** - `9ffaf87` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `src/app/trend.ts` - added `buildViolinPaths`, `ViolinHalf`, `ViolinPathOptions`; extended `computeSharedYDomain` for the two-sample shape
- `src/app/trend.test.ts` - rewrote the two outdated `computeSharedYDomain` tests for the new two-sample `TrendDayResult` shape; added 9 new `buildViolinPaths` tests (curve/rug boundary at n=20/19, empty-half mean:null, mirror-image symmetry, shared-bandwidth peak equality across differing n via sample duplication, clamp-to-range, side placement) — 17 tests total, all passing
- `src/index.css` - added `--color-chart-prior-fill`, `--color-chart-prior-stroke`, `--color-chart-recent-fill`, `--color-chart-recent-stroke`

## Decisions Made
- Kept `computeSharedYDomain`'s pad at the codebase's existing exact 10% (not the plan must_haves' looser "~8%" wording) — the plan's own `<action>` instruction is explicit: "keep the exact empty-array guard + 10% pad." Matches Plan 08-01's SUMMARY precedent for treating an explicit code-level instruction as authoritative over a looser prose paraphrase elsewhere in the same plan.
- A truly empty half (n=0) falls back to `[yMin, yMax]` as its `sampleRange` input purely to keep `Math.min`/`Math.max` from running on an empty array — that curve is never actually rendered (`halfDrawsCurve(0)` is always false, so the half renders as an empty rug instead), so the fallback domain choice has no visible effect.
- Exported `ViolinPathOptions` (the `opts` parameter shape) as a named type, even though the plan's must_haves only require `ViolinHalf` — a natural, low-risk addition so Plan 08-03's `TrendDayChart.tsx` can type its call site directly instead of duplicating an inline object literal type.
- Proved the "equal maxHalfWidth regardless of n" (PD-05) contract in a test by duplicating one half's exact sample values 5x for the other half (55 → 275 samples, same underlying distribution) rather than drawing two independently-random large samples — KDE density value is invariant to exact-duplication (sum and n both scale by 5x and cancel), giving a clean, non-flaky assertion that both halves reach the identical `maxHalfWidth` peak width despite the 5x n difference.

## Deviations from Plan

None - plan executed exactly as written for this plan's own file scope (`src/app/trend.ts`, `src/app/trend.test.ts`, `src/index.css`). All must-have truths, acceptance-criteria greps, and behavior tests pass.

### Known Consumer Breakage (expected, not a Plan 08-02 defect)

`npm run build` (`tsc -b && vite build`) still fails, but the error set shrank from Plan 08-01's documented 9 errors across 5 files down to 5 errors across exactly 3 files — all in Plan 08-03's stated scope, none in this plan's:

- `src/app/TrendDayChart.tsx` (3 errors — `.samples`/`.mean` references)
- `src/app/TrendDayChart.test.tsx` (1 error)
- `src/app/TrendRow.test.tsx` (1 error)

This plan's own two files (`src/app/trend.ts`, `src/app/trend.test.ts`) that were part of the original 9-error set are now clean — confirmed via `npm test -- src/app/trend.test.ts` (17/17 passing) and by the reduced `tsc -b` error output no longer naming either file. Since `tsc -b` short-circuits before `vite build` runs, this plan's own CSS-token verification (Task 2's `<verify>`) was independently confirmed via a direct `npx vite build` (bypassing the pre-existing, out-of-scope `tsc` blocker), which succeeded and the compiled output CSS contains both `chart-prior-fill:#57534e3d` (`rgba(87,83,78,0.24)` in 8-digit hex) and `chart-recent-stroke:#9a3412`.

`TrendDayChart.tsx`/`TrendDayChart.test.tsx`/`TrendRow.tsx`/`TrendRow.test.tsx` are explicitly listed in Plan 08-03's `files_modified` (per the `08-01-SUMMARY.md` cross-reference and this plan's own context), which will restore a project-wide green `tsc -b`. No action needed from this plan.

No stub tracking needed — no hardcoded empty/placeholder values were introduced.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `buildViolinPaths` + `ViolinHalf` + `ViolinPathOptions` are ready for Plan 08-03's `violinShape()` Recharts custom-shape render to consume directly — call with `{yMin, yMax, plotTop, plotHeight, cx: 44, maxHalfWidth: 36}` per the UI-SPEC's locked geometry constants.
- The four new `--color-chart-prior-fill/-prior-stroke/-recent-fill/-recent-stroke` tokens are ready for Plan 08-03's SVG fill/stroke attributes.
- `computeSharedYDomain`'s extended two-sample flatten is ready to feed both the shared `TrendYAxisColumn` and every tile's `buildViolinPaths` call with the same `[yMin, yMax]`.
- Blocker: project-wide `tsc -b --noEmit` will not be green until Plan 08-03 lands (`TrendDayChart.tsx`/`TrendDayChart.test.tsx`/`TrendRow.test.tsx` still reference the retired single-sample fields) — expected mid-phase state per the phase's bottom-up sequencing, not a regression to chase down.

---
*Phase: 08-split-violin-trend-view*
*Completed: 2026-07-23*

## Self-Check: PASSED

All created/modified files exist on disk (`src/app/trend.ts`, `src/app/trend.test.ts`, `src/index.css`, this SUMMARY.md). Both task commit hashes (`51168d6`, `9ffaf87`) verified present in git log.
