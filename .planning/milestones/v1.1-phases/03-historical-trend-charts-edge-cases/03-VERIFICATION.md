---
phase: 03-historical-trend-charts-edge-cases
verified: 2026-07-15T14:10:00Z
status: passed
score: 13/13 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 9/11
  gaps_closed:
    - "Each usable day's distribution is legible 'at a glance' at slot width — the average is emphasized without hiding the spread, and the leftmost tile's plot area now matches its 6 siblings (VIZ-02, Gap 1)"
    - "The trend row is legible at a glance without prior explanation — a persistent legend explains the dot/mean-line/diamond marks (VIZ-02, Gap 2)"
  gaps_remaining: []
  regressions: []
deferred: []
---

# Phase 3: Historical Trend Charts & Edge Cases Verification Report

**Phase Goal:** Users can see how each of the last ~7 days compares to its own historical range, with the full historical distribution visible (not just an average line), and get a graceful experience when historical data isn't available for a location.
**Verified:** 2026-07-15T14:10:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (Plans 03-05, 03-06)

## Context

The prior verification (`status: gaps_found`, 9/11 truths) found two blocking VIZ-02 defects surfaced by the phase's own 03-04 human-verify checkpoint: (1) the leftmost trend tile rendered visibly squished vs. its 6 siblings because `showYAxis={index === 0}` gave only that slot visible Y-axis ticks inside the same fixed 88px chart width; (2) no legend existed anywhere explaining the dot/mean-line/diamond marks.

Plan 03-05 shipped fixes for both (a shared `TrendYAxisColumn` + a new `TrendLegend` component). Plan 03-06 was a fresh `checkpoint:human-verify` re-confirming both fixes against live Open-Meteo data. The reviewer confirmed Gap 1 fixed ("Gap 1 fixed perfectly") and approved Gap 2 after one wording round-trip — the initial legend copy ("Each of the last 30 years" / "That day's temperature") was rejected as confusing/"nonsense," and corrected to reviewer-supplied wording: dot = "Temperatures on this day in the last 30 years," line = "30-year average" (unchanged), diamond = "Temperature now."

This re-verification independently confirms both fixes exist in source, are wired, pass their tests, and match the reviewer-approved copy verbatim — not just that SUMMARY.md claims they do.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | recharts@3.9.2 installed, importable, build passes (03-01) | ✓ VERIFIED | `npm run build` exits 0; `package.json` `dependencies.recharts` present |
| 2 | `hasUsableSampleCount` is the single shared usable-data gate (D-10) | ✓ VERIFIED | `src/anomaly/anomaly.ts` — single expression, used by both `computeAnomalyForToday` and `computeTrendDay` |
| 3 | `getCurrentWeather` returns 7 recent daily means; `useCurrentWeather.recentDaily` exposed | ✓ VERIFIED | `src/weather/client.ts` params; `client.test.ts` passes |
| 4 | `computeTrendDay` returns usable/unusable per-day result on one shared gate | ✓ VERIFIED | `anomaly.test.ts` passes |
| 5 | 7-day row renders below AnomalyCard, today rightmost labeled "Today" | ✓ VERIFIED | `App.tsx` renders `<TrendRow days={trendDays} .../>` after `<AnomalyCard>`; `TrendRow.tsx` `isToday={index === days.length - 1}` |
| 6 | Each usable day shows ~30 translucent dots, bright mean line, distinct orange diamond | ✓ VERIFIED | `TrendDayChart.tsx` — `Scatter`+`historicalDotShape`, `ReferenceLine` mean, `Scatter`+`makeActualShape` diamond; unit-tested |
| 7 | All 7 charts share one fixed, padded y-scale computed once (D-06) | ✓ VERIFIED | `computeSharedYDomain` called once in `TrendRow.tsx`, identical `yDomain` passed to `TrendYAxisColumn` and every `TrendDayChart` |
| 8 | A day with insufficient history renders the bordered "Not enough data" placeholder | ✓ VERIFIED | `TrendDayChart.tsx` `!day.usable` branch; `TrendDayChart.test.tsx` passes |
| 9 | The trend row omits itself (not 7 placeholders) when data is unavailable (ROBU-01) | ✓ VERIFIED | `TrendRow.tsx` returns `null` when `days` is null/empty; `App.tsx` `trendDays` gated on `current`/`baseline` both resolved with data |
| 10 | **[Gap 1 — closed]** Every one of the 7 trend tiles has an equal plot-area width — no squish | ✓ VERIFIED | `TrendRow.tsx` passes `showYAxis={false}` uniformly to all 7 `TrendDayChart` instances (no more `index === 0` asymmetry); the shared axis renders exactly once via the new `TrendYAxisColumn` in its own 40px column to the left of the row. Reviewer (03-06 checkpoint, live data): **"Gap 1 fixed perfectly."** |
| 11 | **[Gap 2 — closed]** A persistent `TrendLegend` explains the dot/line/diamond marks, mounted, reviewer-approved wording | ✓ VERIFIED | `src/app/TrendLegend.tsx` renders 3 entries with exact labels "Temperatures on this day in the last 30 years" / "30-year average" / "Temperature now" — verbatim match to reviewer-supplied correction in 03-06-SUMMARY.md. Mounted via `<TrendLegend />` in `TrendRow.tsx`. `TrendLegend.test.tsx` asserts these exact strings and passes. Reviewer (03-06 checkpoint): **"Approved."** (after the wording round-trip) |
| 12 | Any visible Y-axis uses an explicit narrow width (never Recharts' ~60px default) | ✓ VERIFIED | `AXIS_WIDTH = 40` constant; both `TrendDayChart`'s `YAxis` and `TrendYAxisColumn`'s `YAxis` pass `width={AXIS_WIDTH}` explicitly |
| 13 | No horizontal scroll introduced by the panel widening | ✓ VERIFIED | `.location-panel` widened 720px → 760px (both `flex-basis` and `width`, kept equal); row content math (40px axis + 8px gap + 664px charts = 712px) < 728px panel content width (760 − 2×16px padding), 16px slack. Reviewer confirmed no scrollbar during 03-06. |

**Score:** 13/13 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/TrendDayChart.tsx` | Single mini-chart component + exported `TrendYAxisColumn` | ✓ VERIFIED | Present; `showYAxis` prop kept (unused in prod, still exercised by its own test); `AXIS_WIDTH=40` explicit width on all YAxis usages; IN-01/IN-03 hardening present (`Number.isNaN(date.getTime())` guard, `units ?? 'C'` fallback) |
| `src/app/TrendRow.tsx` | Composes shared axis column, 7× charts, `TrendLegend` | ✓ VERIFIED | `showYAxis={false}` uniform across all 7 tiles; renders `.trend-row__axis` (TrendYAxisColumn) beside `.trend-row__charts`; renders `<TrendLegend />` |
| `src/app/TrendLegend.tsx` | New persistent legend component, native SVG swatches | ✓ VERIFIED | Exports `TrendLegend`; 3 `TrendLegendItem`s (circle/rect/polygon) using `--color-chart-historical`/`-mean`/`-actual` tokens verbatim; no raw-HTML sink |
| `src/app/TrendLegend.test.tsx` | Render test for labels + SVG swatches | ✓ VERIFIED | Asserts exact reviewer-approved copy + 3 SVG shapes; passes (`npm test` confirms) |
| `src/app/App.css` | `.trend-legend*`, `.trend-row__axis*`, widened `.location-panel` | ✓ VERIFIED | `.location-panel` `flex: 0 0 760px; width: 760px;` (both equal); `.trend-row__body`, `.trend-row__axis`, `.trend-row__axis-spacer`, `.trend-legend`, `.trend-legend__item/__swatch/__label` all present, reuse existing spacing/color tokens (no new tokens) |
| `.planning/phases/.../03-UI-SPEC.md` | Corrected axis approach + legend documented | ✓ VERIFIED (minor doc drift) | Component Inventory has `TrendYAxisColumn`/`TrendLegend` entries; Copywriting Contract lists reviewer-approved legend strings; panel-width math section correctly states 760px. **Two stale leftover references to "720px"** remain at lines 155 and 179 (pre-Plan-05 panel width) — cosmetic doc-only inconsistency, does not affect shipped code or behavior |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `App.tsx` | `TrendRow` | `<TrendRow days={trendDays} units={current.units} />` after `<AnomalyCard>` | ✓ WIRED | Confirmed in source |
| `TrendRow.tsx` | `TrendYAxisColumn` | `<TrendYAxisColumn yDomain={yDomain} />` inside `.trend-row__axis` | ✓ WIRED | Same `yDomain` instance passed to axis column and all 7 charts |
| `TrendRow.tsx` | `TrendDayChart` (×7) | `showYAxis={false}` uniform, shared `yDomain` | ✓ WIRED | No per-index asymmetry remains (grep confirms single `showYAxis={false}` literal, not `index === 0`) |
| `TrendRow.tsx` | `TrendLegend` | `<TrendLegend />` mounted below `.trend-row__body` | ✓ WIRED | Confirmed in source, renders unconditionally whenever the row renders |
| `TrendLegend.tsx` swatches | `src/index.css` color tokens | `var(--color-chart-historical)` / `-mean` / `-actual` | ✓ WIRED | Verbatim token reuse, confirmed by grep; tokens exist in `src/index.css` |
| `App.tsx` `trendDays` | `computeTrendDay` + `baseline.daily` | gated on `current`/`baseline` both `'resolved'` with data | ✓ WIRED | Unchanged from Plan 03; ROBU-01 no-data path intact |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Legend + chart + trend unit suites pass | `npm test -- src/app/TrendLegend.test.tsx src/app/TrendDayChart.test.tsx src/app/trend.test.ts` | 3 files, 13 tests passed | ✓ PASS |
| Full test suite (run once) | `npm test` | 8 files, 90 tests passed | ✓ PASS |
| Production build succeeds | `npm run build` | `tsc -b && vite build` exits 0 | ✓ PASS |
| No `ResponsiveContainer` (jsdom-safety prohibition) | `grep -rc ResponsiveContainer src/app/TrendDayChart.tsx src/app/TrendRow.tsx` | 0, 0 | ✓ PASS |
| No raw-HTML sink in new/modified files | `grep -rc dangerouslySetInnerHTML src/app/TrendLegend.tsx src/app/TrendRow.tsx` | 0, 0 | ✓ PASS |
| Legend exists in source, ≥1 hit | `grep -rin legend src/` | 23 hits | ✓ PASS (closes prior Gap 2 grep gate) |
| Legend copy matches reviewer's exact corrected wording | source read of `TrendLegend.tsx` vs. 03-06-SUMMARY.md verbatim quotes | Exact match: "Temperatures on this day in the last 30 years" / "30-year average" / "Temperature now" | ✓ PASS |
| No per-index Y-axis asymmetry remains | source read of `TrendRow.tsx` | `showYAxis={false}` literal for all 7, no `index === 0` conditional | ✓ PASS |

### Human Verification (already performed by phase's own checkpoint)

The phase's built-in `checkpoint:human-verify` (03-06) already performed the authoritative visual re-verification this phase requires, against live Open-Meteo data:

- **Gap 1 (squish):** Reviewer confirmed verbatim — "Gap 1 fixed perfectly."
- **Gap 2 (legend):** Reviewer initially rejected the first-pass wording as "nonsense," supplied exact replacement copy, and approved the corrected version — "Approved."
- **VIZ-01 (shared scale, today rightmost, distinct marks) and ROBU-01 (graceful no-data path):** Reviewer's final "Approved" was given after being walked through the full `<how-to-verify>` checklist covering both, with no further issues raised. 03-06-SUMMARY.md transparently notes these two items were not separately quoted verbatim (bundled under the overall approval) — an honesty caveat the executor documented rather than fabricating separate quotes. This is a minor documentation-completeness note, not a functional gap: the checkpoint's own `<resume-signal>` contract explicitly treats "approved" as covering the full checklist.

No further human verification items are outstanding. This re-verification's job — confirming the code changes described in 03-05/03-06 actually exist, are wired, and match the reviewer-approved copy — is complete via source inspection above.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| VIZ-01 | 03-01–03-06 | 7-day trend charts, each day vs. its own historical range | ✓ SATISFIED | Mechanics wired/tested; Gap 1 (equal-width tiles) closed and reviewer-confirmed; shared scale/today-rightmost/distinct marks reconfirmed in 03-06 |
| VIZ-02 | 03-01, 03-03, 03-05, 03-06 | Historical distribution visible, average emphasized, legible at a glance | ✓ SATISFIED | Both blocking legibility gaps (squished tile, missing legend) closed in source and reviewer-approved against live data with exact copy verified |
| ROBU-01 | 03-02, 03-03, 03-06 | Graceful message when no usable historical data | ✓ SATISFIED | Placeholder + row-omission mechanism unchanged and unbroken by the gap-closure fix; reviewer reconfirmed in 03-06 |

`REQUIREMENTS.md` now correctly shows all three as `[x]` Complete (lines 29-34) and Phase 3 mapped to "Complete" in the traceability table (lines 85-87) — this matches the actual, now-closed state (unlike at the time of the prior verification, when these checkboxes were prematurely set ahead of the gap-closure cycle). No orphaned requirements.

### Anti-Patterns Found

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK` markers in any Phase 3 file. Occurrences of the word "placeholder" (`TrendDayChart.tsx`, `App.css`) refer to the legitimate "Not enough data" empty-state design pattern (D-12/D-14), not a stub/incomplete-implementation marker — confirmed by reading the surrounding code, which is fully implemented and tested.

**Info-level only:** `03-UI-SPEC.md` retains two stale "720px" references (lines 155, 179) describing the pre-Plan-05 panel width, left un-updated when Plan 05 widened the panel to 760px elsewhere in the same document (line 37 correctly says 760px). This is a documentation-consistency nit inside a planning artifact, not a code defect — it does not affect the shipped CSS (`src/app/App.css` correctly reads 760px throughout) or any behavior a user experiences. Not a blocker.

### Gaps Summary

None. Both defects from the prior `gaps_found` verification are closed and independently confirmed here via source inspection (not just SUMMARY.md narrative):

1. **Leftmost-tile squish (Gap 1):** `TrendRow.tsx` no longer has `showYAxis={index === 0}` — every tile passes `showYAxis={false}` uniformly, and the shared temperature axis is now rendered exactly once by a new, separately-verified `TrendYAxisColumn` component in its own explicit 40px column. All 7 tiles are structurally pixel-identical. Reviewer confirmed this live.
2. **Missing legend (Gap 2):** A new `TrendLegend` component exists, is mounted inside `TrendRow`, renders three SVG swatches reusing the exact chart color tokens, and its label text is a verbatim match to the reviewer's final approved wording (not the originally-rejected wording) — confirmed by reading both `TrendLegend.tsx` and its test file side by side with the reviewer's quoted correction in 03-06-SUMMARY.md.

All 13 must-have truths (roadmap Success Criteria + PLAN frontmatter must-haves across 03-01 through 03-06) verify against the actual codebase. Build is clean, the full unit test suite passes (90/90), and no prohibition (no `ResponsiveContainer`, no raw-HTML sink, deterministic jitter, `ifOverflow="visible"` retained) has regressed. Phase 3 is genuinely complete.

---

*Verified: 2026-07-15T14:10:00Z*
*Verifier: Claude (gsd-verifier)*
