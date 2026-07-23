---
phase: 08-split-violin-trend-view
verified: 2026-07-23T13:45:00Z
status: passed
score: 12/12 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 8: Split-Violin Trend View Verification Report

**Phase Goal:** Replace the per-day dot-strip tiles with per-day split violins comparing each day's recent-5-year distribution against its prior-25-year distribution, surfacing climate-shift signal without overstating confidence on thin samples.
**Verified:** 2026-07-23T13:45:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Verification Method

This was not a documentation review of SUMMARY.md claims. For every truth below I read the actual source (`src/anomaly/kde.ts`, `src/anomaly/anomaly.ts`, `src/anomaly/types.ts`, `src/app/trend.ts`, `src/app/TrendDayChart.tsx`, `src/app/TrendLegend.tsx`, `src/app/TrendRow.tsx`, `src/app/App.tsx`), ran the project's real test suite and build independently (not trusting the SUMMARY's reported numbers), and — because this phase's payoff is a rendered SVG chart, and the task briefing flagged two visual render defects already caught once by human review — went a step further than static analysis:

1. Ran `npm test -- --run` fresh (189/189 pass, matches SUMMARY claim) and `npm run build` fresh (succeeds, matches SUMMARY claim).
2. Wrote and ran two throwaway diagnostic tests (created, executed, then deleted — no trace left in the tree/git status) to independently confirm the two render defects fixed in commit `dcd5f66` are actually fixed, not just plausibly-worded in a commit message:
   - Called `buildViolinPaths()` directly and parsed the returned SVG path's point sequence: the bottom anchor is the max-y point, the top anchor is the min-y point, and no consecutive point pair jumps more than half the plot height — i.e. no self-crossing "bowtie" traversal.
   - Rendered `TrendYAxisColumn` under RTL/jsdom and dumped the actual DOM: five `<text>` tick labels render with real interpolated values (10, 14, 18, 22, 25) at the correct pixel positions for the given `yDomain` — the axis is not empty.
3. Traced `App.tsx`'s data flow: `trendDays` is built from `current.recentDaily` (live `useCurrentWeather` fetch) re-windowed against `baseline.daily` (live `useHistoricalBaseline` archive fetch) via `computeTrendDay` — no hardcoded/stub data reaches the chart.
4. Grepped all phase-touched files for debt markers (`TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`) and `dangerouslySetInnerHTML` — none found.
5. Confirmed no leftover references to the retired single-sample `TrendDayResult` shape (`.samples`/`.mean`) anywhere in `src/`.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria — the contract)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User sees, for each of the last ~7 days, a split-violin tile comparing that day's recent-5-year distribution against its prior-25-year distribution, on the shared Y-axis, replacing the dot-strip tiles | ✓ VERIFIED | `buildViolinPaths` (src/app/trend.ts:99) produces prior-left/recent-right closed KDE half-paths from one shared pooled `silvermanBandwidth`; `TrendDayChart.tsx` renders both via `makeViolinShape`; `TrendDayChart.test.tsx` asserts 2 `<path>` fills with prior/recent tokens for a healthy day; `App.tsx`/`TrendRow.tsx` wire real fetched data through with no dot-strip code path remaining (`buildHistoricalPoints`/`historicalDotShape` removed from the render, per 08-03-SUMMARY) |
| 2 | User sees a graceful fallback for any violin half with too few samples — the sparse half degrades to a rug/dot strip (or is omitted) rather than drawing a misleadingly confident curve | ✓ VERIFIED | `halfDrawsCurve(n) = n >= 20` (src/anomaly/kde.ts:89), inclusive-at-20 boundary unit-tested (`kde.test.ts`); `buildViolinPaths` returns `kind:'rug'` below the floor; `TrendDayChart.test.tsx` proves one-thin-half → 1 curve + N rug dots bounded to `[cx, cx+side*36]` (never crossing cx), and both-thin → 0 curves + dual rug |
| 3 | User sees the actual-value marker and the shared Y-axis scale preserved, so tiles stay visually comparable across days | ✓ VERIFIED | `makeActualShape` reused verbatim for the diamond at `x=cx` (TrendDayChart.tsx:226); `TrendYAxisColumn` rendered exactly once in `TrendRow.tsx` (not per-tile); independently re-rendered under jsdom and confirmed real tick `<text>` values (10/14/18/22/25) at correct pixel `y` for a `[10,25]` domain — the "missing shared Y-axis tick column" defect from `dcd5f66` is confirmed fixed, not just claimed |
| 4 | User sees an updated, legible trend legend that correctly explains the new split-violin marks (recent vs prior halves plus any retained mean/actual-value marks), finalized via a reviewer copy round-trip | ✓ VERIFIED | `TrendLegend.tsx` renders 5 native-SVG items (prior half, recent half, mean tick, actual diamond, rug/dots) using the exact `--color-chart-*` tokens the tiles render; `TrendLegend.test.tsx` asserts all 5 final labels + swatch shapes; PD-10 reviewer round-trip verdict recorded verbatim in `08-04-SUMMARY.md` ("APPROVED with 3 revisions" — dynamic year range, "Period average", "This week"), applied to the component and re-tested |

### Supporting Must-Haves (from PLAN frontmatter, underpinning the 4 truths above)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 5 | `computeTrendDay` returns a two-sample result off the SAME `baseline.daily` series (no new fetch) | ✓ VERIFIED | `anomaly.ts:317-371`; two `filterDayOfYearWindow` calls over `recentStart..endYear` / `priorStart..priorEnd`; `anomaly.test.ts` proves `recentMean === mean(recentSamples)` |
| 6 | `TrendDayResult`'s `usable:true` shape is promoted (not kept alongside) — old `samples`/`mean` retired | ✓ VERIFIED | `types.ts:40-52`; grep confirms zero remaining `.samples`/`.mean` references anywhere in `src/` |
| 7 | `buildViolinPaths` uses ONE shared pooled bandwidth for both halves, never per-half | ✓ VERIFIED | `trend.ts:109` — single `silvermanBandwidth([...priorSamples, ...recentSamples])` call feeding both `kdeCurve`s; `trend.test.ts` asserts mirror-image symmetry on identical samples |
| 8 | Both halves normalize to one shared max density and equal `maxHalfWidth` regardless of n | ✓ VERIFIED | `trend.ts:127-131` `sharedMax` computed once; `trend.test.ts` proves equal peak width across 55 vs 275 samples via exact-duplication trick |
| 9 | Prior draws LEFT, recent draws RIGHT | ✓ VERIFIED | `trend.ts:182-183` `side=-1`/`+1`; `TrendDayChart.tsx` PRIOR_TOKENS/RECENT_TOKENS wired accordingly; test asserts placement |
| 10 | Each half's curve grid clamps to its own sample range, not the full padded domain | ✓ VERIFIED | `trend.ts:115-119` `sampleRange()`; `trend.test.ts` "clamps each half curve grid to its own [sampleMin, sampleMax]" |
| 11 | The 4 new chart tokens exist at UI-SPEC-locked values; retained tokens untouched | ✓ VERIFIED | `grep` confirms exact rgba/hex values in `src/index.css`; `--color-chart-mean/-actual/-historical` unchanged |
| 12 | All marks (violin, mean ticks, rug, diamond) share ONE y-scale | ✓ VERIFIED | Explicit `PLOT_MARGIN=5` matches Recharts' own default (confirmed against `node_modules/recharts`); `yFromValue()` single source of truth for precomputed marks; diamond uses the same domain via Recharts' own scale — both provably aligned, not just numerically coincidental |

**Score:** 12/12 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/anomaly/kde.ts` | Hand-rolled Gaussian KDE + Silverman module | ✓ VERIFIED | Exports `silvermanBandwidth`, `kdeAt`, `kdeCurve`, `quantile`, `iqr`, `halfDrawsCurve` (N_MIN=20); all guarded against NaN/Infinity |
| `src/anomaly/kde.test.ts` | Coverage of above | ✓ VERIFIED | 18 tests, all behaviors from the plan covered (boundary n=19/20, guards, shape) |
| `src/anomaly/types.ts` | Two-sample `TrendDayResult` | ✓ VERIFIED | `recentSamples`/`priorSamples`/`recentMean`/`priorMean`/`actual`/`priorStart`/`priorEnd` on `usable:true` |
| `src/anomaly/anomaly.ts` | Two-sample `computeTrendDay` | ✓ VERIFIED | Lines 317-371, no new fetch, reuses `hasUsableSampleCount`/`computeWindowSamples` |
| `src/app/trend.ts` | `buildViolinPaths`, `ViolinHalf`, extended `computeSharedYDomain` | ✓ VERIFIED | All present, wired, geometrically validated (see Verification Method §2) |
| `src/app/TrendDayChart.tsx` | Split-violin tile render | ✓ VERIFIED | `makeViolinShape`/`makeMeanTickShape`, `CX`/`MAX_HALF_WIDTH`/`MEAN_TICK_LEN`, diamond + axis preserved |
| `src/app/TrendLegend.tsx` | 5-item reviewer-approved legend | ✓ VERIFIED | Matches PD-10 verbatim verdict exactly (dynamic year range, "Period average", "This week") |
| `src/app/TrendRow.tsx` | Wiring: shared axis once, legend props threaded | ✓ VERIFIED | `TrendYAxisColumn` rendered once; `priorStart`/`priorEnd` derived from first usable day |
| `src/app/App.tsx` | `trendDays` sourced from live fetches | ✓ VERIFIED | Zero-edit file, confirmed real `current.recentDaily`/`baseline.daily` data flow (no stub) |
| `src/index.css` | 4 new chart tokens | ✓ VERIFIED | Exact locked rgba/hex values present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `kde.ts` | `anomaly.ts` | imports `sampleStdDev`, no re-declared `mean`/`stdDev` | ✓ WIRED | `import { sampleStdDev } from './anomaly'` |
| `trend.ts` | `kde.ts` | imports `silvermanBandwidth`/`kdeCurve`/`halfDrawsCurve` | ✓ WIRED | `trend.ts:8` |
| `TrendDayChart.tsx` | `trend.ts` | imports `buildViolinPaths`/`ViolinHalf`/`formatSlotLabel`/`jitterX` | ✓ WIRED | `TrendDayChart.tsx:33-34` |
| `App.tsx` | `TrendRow.tsx` | `trendDays` prop, two-sample shape flows unchanged | ✓ WIRED | `App.tsx:128-133` |
| `TrendRow.tsx` | `TrendLegend.tsx` | `priorStart`/`priorEnd` props | ✓ WIRED | `TrendRow.tsx:121-124` |
| `TrendLegend.tsx` swatches | `src/index.css` tokens | same `--color-chart-*` custom properties as the tiles | ✓ WIRED | grep confirms identical token names in both files |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `TrendRow`/`TrendDayChart` | `trendDays` | `App.tsx` → `computeTrendDay(baseline.daily, dateStr, current.recentDaily.values[i])` | Yes — `baseline.daily` from live `useHistoricalBaseline` (Open-Meteo archive), `current.recentDaily` from live `useCurrentWeather` | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite | `npm test -- --run` | 189/189 pass (18/18 files) | ✓ PASS |
| Production build | `npm run build` | `tsc -b && vite build` succeeds | ✓ PASS |
| Violin path has no bowtie self-crossing | throwaway diagnostic test calling `buildViolinPaths()` directly, parsing path points | bottom anchor = max-y, top anchor = min-y, no jump > half plot height | ✓ PASS |
| Shared Y-axis renders real tick values | throwaway diagnostic test rendering `TrendYAxisColumn` under RTL/jsdom | 5 `<text>` ticks with values 10/14/18/22/25 at correct pixel `y` | ✓ PASS |
| No debt markers in phase-touched files | `grep -inE 'TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER'` | none found (only legitimate prose uses of "placeholder" referring to the intentional "Not enough data" state) | ✓ PASS |
| No raw-HTML sink | `grep -c dangerouslySetInnerHTML` on TrendDayChart/TrendLegend/TrendRow | 0 | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|-----------------|--------------|--------|----------|
| TREND-01 | 08-01, 08-02, 08-03 | Split-violin tile comparing recent-5yr vs prior-25yr on shared Y-axis, replacing dot-strip | ✓ SATISFIED | Truths 1, 5-10, 12 |
| TREND-02 | 08-01, 08-02, 08-03 | Per-half data-sufficiency gate degrades sparse half to rug/omission | ✓ SATISFIED | Truths 2, 5 (halfDrawsCurve, N_MIN=20 boundary tested at 19/20) |
| TREND-03 | 08-03, 08-04 | Updated legend correctly explaining new marks, finalized via reviewer round-trip | ✓ SATISFIED | Truth 4, PD-10 verdict recorded in 08-04-SUMMARY.md |

No orphaned requirements — all three IDs declared in REQUIREMENTS.md for Phase 8 (TREND-01/02/03) are claimed by at least one plan's frontmatter, and each has direct code+test evidence above, not just a plan-frontmatter claim.

### Anti-Patterns Found

None. Grepped every phase-touched file (`kde.ts`, `anomaly.ts`, `types.ts`, `trend.ts`, `TrendDayChart.tsx`, `TrendLegend.tsx`, `TrendRow.tsx`, `App.tsx`) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` and `dangerouslySetInnerHTML` — zero hits beyond legitimate prose (doc-comments referring to the intentional "Not enough data" placeholder UI state, not a code stub).

### Decision Coverage (PD-* citations)

Per the task briefing, PD-01 through PD-12 decision IDs (this phase's local decision namespace, chosen to avoid colliding with the codebase's own `D-NN` IDs) were confirmed by the plan-checker as cited across all 4 plans, with the phase's own gap analysis reporting 3/3 requirements covered. This verification independently corroborates that coverage at the code level: every PD-* cited in a plan's must-haves (PD-01/02 rug fallback, PD-04 dual-gate distinction, PD-05 equal-width, PD-06 shared max density, PD-07 mean-tick pair, PD-08 diamond preserved, PD-09 shared axis, PD-10 reviewer round-trip, PD-11 prior-left/recent-right, PD-12 chart tokens) has a corresponding, verified code artifact above — none is a dangling citation with no implementation.

### Known Fixed Defects (verified fixed, not just claimed)

Two render defects were found during the human reviewer checkpoint and fixed in commit `dcd5f66`:

1. **Bowtie path-anchor shear** — `buildViolinPaths`'s half-path anchor ordering previously opened at top-center instead of bottom-center, producing a self-crossing path. Fixed by swapping the M/close anchors to match the ascending edge traversal (`trend.ts:145-154`, code comment documents the exact failure mode). **Independently re-verified** via a throwaway geometry-parsing test (see Verification Method §2) — the fix holds.
2. **Missing shared Y-axis tick column** — `TrendYAxisColumn`'s `Scatter` had `data={[]}`, giving Recharts no data point to establish a y-scale from, so it emitted zero ticks. Fixed by supplying a single dummy datum matching the tiles' own pattern (`TrendDayChart.tsx:467-471`). **Independently re-verified** via a throwaway RTL/jsdom render — real tick values now appear in the DOM.

Neither defect required a gap-closure plan; both were caught and fixed within the same phase before the human checkpoint concluded.

## Human Verification Required

None. The one item this phase would ordinarily route to a human (final visual polish/legend wording) was already resolved as an explicit blocking checkpoint during phase execution — the PD-10 reviewer round-trip verdict is recorded verbatim in `08-04-SUMMARY.md` and its wording is present verbatim in the shipped `TrendLegend.tsx`. The two visual render defects flagged by the task briefing were independently re-verified programmatically (geometry parsing + DOM tick inspection) rather than taken on the commit message's word alone.

## Gaps Summary

No gaps. All 4 ROADMAP success criteria are observably true in the codebase, backed by passing tests I ran myself (not the SUMMARY's reported numbers), a clean production build, and two independent diagnostic checks that specifically targeted the two defects called out in the task briefing. All 3 requirement IDs (TREND-01/02/03) are satisfied with code-level evidence, not just plan-frontmatter claims. No debt markers, no raw-HTML sinks, no leftover references to the retired single-sample data shape.

---

*Verified: 2026-07-23T13:45:00Z*
*Verifier: Claude (gsd-verifier)*
