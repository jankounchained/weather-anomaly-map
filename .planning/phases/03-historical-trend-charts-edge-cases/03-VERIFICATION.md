---
phase: 03-historical-trend-charts-edge-cases
verified: 2026-07-15T10:02:16Z
status: gaps_found
score: 9/11 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "Each usable day's distribution is legible 'at a glance' at 88px width — the average is emphasized without hiding the spread (VIZ-02)"
    status: failed
    reason: "Human reviewer (03-04 checkpoint, the phase's own end-to-end UAT) explicitly did NOT approve. The leftmost tile (index 0) renders visually squished compared to its 6 siblings: showYAxis={index === 0} is passed only to slot 0, and TrendDayChart.tsx's YAxis (hide={!showYAxis}, tick fontSize 14) consumes horizontal space from within the same fixed 88px CHART_WIDTH that the other 6 slots get to use entirely for plotting. Confirmed by source inspection — this is not a hypothesis, it is a reproducible layout defect in shipped code."
    artifacts:
      - path: "src/app/TrendDayChart.tsx"
        issue: "ComposedChart width={CHART_WIDTH} (88, fixed) is shared by all 7 slots; only slot 0 renders visible YAxis ticks (hide={!showYAxis}), which eats into that same fixed width instead of getting extra width to compensate"
      - path: "src/app/TrendRow.tsx"
        issue: "showYAxis={index === 0} assigns the tick-label slot to the leftmost tile without adjusting its width, causing the asymmetry"
    missing:
      - "Give the leftmost chart a wider fixed width (e.g. 88 + axis label width) so its plot area matches the other 6, OR move the shared y-axis labeling outside the small-multiples row into a single axis rendered once to the left of the row"
      - "A fresh human-verify checkpoint re-confirming the leftmost tile now matches its siblings"
  - truth: "The trend row is legible at a glance without prior explanation of what the dots/mean-line/diamond marks represent (VIZ-02's 'legible at a glance' bar)"
    status: failed
    reason: "Human reviewer confirmed no legend exists anywhere in the trend row explaining the pale/translucent dots (30-year distribution), the bright line (historical mean), and the orange diamond (day's actual reading). Confirmed by codebase grep: zero occurrences of 'legend' in src/. The native SVG <title> tooltip on the diamond (confirmed present and working) only surfaces this per-day, on hover — there is no persistent, glanceable key for a first-time viewer."
    artifacts:
      - path: "src/app/TrendRow.tsx"
        issue: "No legend/key element exists in the row's markup"
      - path: "src/app/App.css"
        issue: "No .trend-row legend-related class exists (.trend-row__heading, .trend-row__charts, .trend-day* only)"
    missing:
      - "A legend component/row explaining dot = 30-yr historical value, bright line = historical mean, orange diamond = today's/that day's actual reading"
      - "A fresh human-verify checkpoint confirming the legend resolves the legibility concern"
deferred: []
---

# Phase 3: Historical Trend Charts & Edge Cases Verification Report

**Phase Goal:** Users can see how each of the last ~7 days compares to its own historical range, with the full historical distribution visible (not just an average line), and get a graceful experience when historical data isn't available for a location.
**Verified:** 2026-07-15T10:02:16Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Important Context

This phase's own final plan (03-04-PLAN.md) is a dedicated `checkpoint:human-verify` gate — the phase's built-in end-to-end UAT against live Open-Meteo data. That checkpoint **ran to completion but was explicitly NOT approved** by the real user (see `03-04-SUMMARY.md`). Two concrete issues were reported and are reproduced below with source-level confirmation. `03-04-SUMMARY.md`, `ROADMAP.md` (Phase 3 entry), and `STATE.md` all already record this as an unresolved gap-closure item — this verification corroborates that record from the codebase and formalizes it as `gaps_found` per the phase's own escalation record, not a re-litigation of the human's verdict.

**A data-integrity note for the project's own tracking:** `.planning/REQUIREMENTS.md` currently shows VIZ-01, VIZ-02, and ROBU-01 as `[x]` Complete (checked during Plan 01's and Plan 02's close-out commits, `1a01813` and `8911dcf`, which both predate the Plan 04 human-verify checkpoint that found the issues). This predates and conflicts with `03-04-SUMMARY.md`'s explicit statement: *"Requirements VIZ-01, VIZ-02, and ROBU-01 remain in `### Active` in PROJECT.md and are not marked complete pending the fix + re-verification cycle."* `ROADMAP.md`'s Phase 3 entry already flags this discrepancy inline (line 19: "Not a clean pass... VIZ-01/VIZ-02/ROBU-01 are not yet moved to Validated in PROJECT.md"). REQUIREMENTS.md's checkboxes should be reverted to unchecked/open until the gap-closure plan below lands and a fresh human-verify checkpoint passes — leaving them checked risks a future workflow treating these requirements as done when they are not.

## Goal Achievement

### User Flow Coverage (MVP mode)

Phase user story (from PLAN frontmatter, faithfully reformatted from ROADMAP.md Phase 3 Goal + Success Criteria): *"As a person checking a location's weather, I want to see each of the last 7 days plotted against that day's own 30-year historical distribution — with every year's values visible and the average emphasized — plus a clear message when a day lacks enough history, so that I can tell at a glance how unusual the whole recent week has been, not just today."*

| Step | Expected | Evidence in codebase | Status |
|------|----------|----------------------|--------|
| Pin a location | 7-day row renders below AnomalyCard, today rightmost | `src/app/App.tsx` derives `trendDays` and renders `<TrendRow days={trendDays} units={current.units} />` after `<AnomalyCard>`; `TrendRow.tsx` maps `isToday={index === days.length - 1}` | VERIFIED (structurally + unit-tested) |
| Every year's values visible | ~30 translucent dots per usable day | `TrendDayChart.tsx` renders a `Scatter` of `buildHistoricalPoints(day.samples)` with `historicalDotShape` (translucent circle, `var(--color-chart-historical)`) | VERIFIED (structurally + unit-tested) |
| Average emphasized | Bright mean `ReferenceLine`, not hiding the dot cloud | `ReferenceLine y={day.mean}` with `ifOverflow="visible"`, `var(--color-chart-mean)` rendered alongside (not instead of) the Scatter dots | VERIFIED (structurally + unit-tested) |
| Clear message when history is thin | "Not enough data" placeholder, one path for any unusable cause | `TrendDayChart.tsx` `!day.usable` branch renders bordered placeholder with visible text + `title`/`aria-label` "Not enough history for this day" | VERIFIED (structurally + unit-tested) |
| **"...so that I can tell at a glance..."** (the outcome clause) | Reviewer confirms the row reads as scannable/legible without prior explanation | **Human reviewer (03-04 checkpoint) explicitly did NOT confirm this** — 2 concrete legibility defects reported (squished leftmost tile, no legend) | **FAILED** |

The outcome clause — the actual reason this phase exists ("so that I can tell at a glance") — is the one step a human, not grep, can certify, and the human explicitly withheld approval. Per the core narrowing rule for MVP-mode goal-backward verification, this is decisive: the mechanics are wired and tested, but the phase's stated value is not yet delivered.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | recharts@3.9.2 installed, importable, clean peer resolution, build passes (03-01) | VERIFIED | `npm ls recharts` / `npm run build` both pass; `package.json` `dependencies.recharts` present |
| 2 | `hasUsableSampleCount` is the single shared usable-data gate; `computeAnomalyForToday` retrofitted (D-10) | VERIFIED | `src/anomaly/anomaly.ts` — single `Math.ceil(totalYears / 2)` expression inside `hasUsableSampleCount`, called from both `computeAnomalyForToday` and `computeTrendDay`; `anomaly.test.ts` boundary + regression tests pass |
| 3 | `getCurrentWeather` returns 7 recent daily means in one forecast request (no extra round trip); `useCurrentWeather.recentDaily` exposed | VERIFIED | `src/weather/client.ts` sets `daily`/`past_days`/`forecast_days` params; `client.test.ts` passes (URL params, 7/7 success, mismatched-length throw, missing-daily throw) |
| 4 | `computeTrendDay` returns usable/unusable per-day result on one shared gate (D-11/D-14) | VERIFIED | `anomaly.test.ts` covers null actual, non-finite actual, sparse window, healthy day — all pass |
| 5 | 7-day row renders below AnomalyCard, today rightmost labeled "Today" in accent, other 6 show weekday abbreviations (D-05, D-07, D-08) | VERIFIED | `TrendRow.tsx`/`TrendDayChart.tsx` source inspection + `App.tsx` wiring; `trend.test.ts`/`TrendDayChart.test.tsx` pass |
| 6 | Each usable day shows ~30 translucent dots, bright mean line, distinct orange diamond (D-01/D-02/D-03/D-04) | VERIFIED (mechanically) | Confirmed present in `TrendDayChart.tsx`; smoke-tested (`<svg>` present, no placeholder text) |
| 7 | All 7 charts share one fixed, padded y-scale computed once (D-06) | VERIFIED | `computeSharedYDomain` called once in `TrendRow.tsx`, identical `yDomain` passed to every `TrendDayChart`; `trend.test.ts` pins padding + empty-input guard |
| 8 | A day with insufficient history renders the bordered "Not enough data" placeholder, one path regardless of cause (D-11/D-12/D-14, ROBU-01) | VERIFIED | `TrendDayChart.tsx` `!day.usable` branch; `TrendDayChart.test.tsx` asserts placeholder text + aria-label + no `<svg>` |
| 9 | The whole trend row omits itself (not 7 placeholders) when `recentDaily`/baseline data is unavailable | VERIFIED | `TrendRow.tsx` returns `null` when `days` is `null`/empty; `App.tsx` only passes a populated array when both hooks are `'resolved'` with data |
| 10 | Each usable day's distribution is legible "at a glance" at 88px, average emphasized without hiding the spread (VIZ-02) | ✗ FAILED | Human reviewer found the leftmost tile visually squished vs. its 6 siblings — confirmed root cause in source (see Gaps) |
| 11 | The trend row is legible at a glance without requiring the user to hover to learn what the marks mean (VIZ-02 "legible at a glance") | ✗ FAILED | No legend exists anywhere in the row (`grep -rin legend src/` → 0 hits); human reviewer explicitly flagged this |

**Score:** 9/11 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/trend.ts` | Pure helpers: jitterX, buildHistoricalPoints, computeSharedYDomain, formatSlotLabel | ✓ VERIFIED | Present, exported, unit-tested (`trend.test.ts`, 9 tests pass) |
| `src/app/TrendDayChart.tsx` | Single mini-chart component (populated / placeholder) | ✓ VERIFIED (with defect) | Present, wired, tested — but the leftmost-slot width defect (Gap 1) lives here |
| `src/app/TrendRow.tsx` | Composes 7x TrendDayChart, shared domain, gating | ✓ VERIFIED (missing legend) | Present, wired, tested — no legend surface (Gap 2) |
| `src/app/App.tsx` | Derives `trendDays`, renders `<TrendRow>` below `<AnomalyCard>` | ✓ VERIFIED | Confirmed via source read; `npm run build`/`npm test` pass |
| `src/app/App.css` | `.trend-row*`/`.trend-day*` styles, 720px panel width | ✓ VERIFIED | 720px present twice (flex basis + width); all 7 trend classes present |
| `src/index.css` | 5 chart/muted/border color tokens | ✓ VERIFIED | `--color-chart-historical`, `--color-chart-mean`, `--color-chart-actual`, `--color-muted`, `--color-border-subtle` all present |
| `src/anomaly/anomaly.ts` | `hasUsableSampleCount`, `computeTrendDay` | ✓ VERIFIED | Present, single-source threshold confirmed via grep |
| `src/weather/client.ts` / `useCurrentWeather.ts` | Extended `getCurrentWeather` + `recentDaily` | ✓ VERIFIED | Present, wired, tested |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `App.tsx` | `TrendRow` | `<TrendRow days={trendDays} units={current.units} />` after `<AnomalyCard>` | ✓ WIRED | Confirmed in source |
| `App.tsx` `trendDays` | `computeTrendDay` + `baseline.daily` (single fetch reuse) | `current.recentDaily.time.map(...) => computeTrendDay(baseline.daily!, ...)` | ✓ WIRED | No new fetch; `grep -c 'fetch('` on TrendRow.tsx = 0 |
| `TrendRow.tsx` | `TrendDayChart` | `yDomain`/`units`/`isToday`/`showYAxis` props, one `computeSharedYDomain` call | ✓ WIRED | Confirmed single call site, correct index math |
| `TrendDayChart.tsx` | recharts (`ComposedChart`/`Scatter`/`ReferenceLine`) | direct import, explicit width/height, no `ResponsiveContainer` | ✓ WIRED | `grep -c ResponsiveContainer` = 0; `ifOverflow="visible"` count = 2 |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Trend/chart/anomaly/client unit suites pass | `npm test -- src/app/trend.test.ts src/app/TrendDayChart.test.tsx src/anomaly/anomaly.test.ts src/weather/client.test.ts` | 4 files, 50 tests passed | ✓ PASS |
| Production build succeeds with recharts + trend row wired | `npm run build` | `tsc -b && vite build` exits 0 | ✓ PASS |
| No `ResponsiveContainer` (jsdom-safety prohibition) | `grep -c ResponsiveContainer src/app/TrendDayChart.tsx` | 0 | ✓ PASS |
| Mean line never silently discards (Pitfall 2 prohibition) | `grep -c 'ifOverflow="visible"' src/app/TrendDayChart.tsx` | 2 | ✓ PASS |
| No `Math.random()` (deterministic jitter prohibition) | `grep -c 'Math.random(' src/app/trend.ts src/app/TrendDayChart.tsx` | 0, 0 | ✓ PASS |
| No raw-HTML sink (XSS prohibition) | `grep -c dangerouslySetInnerHTML src/app/TrendDayChart.tsx src/app/TrendRow.tsx` | 0, 0 | ✓ PASS |
| Legend exists anywhere in `src/` | `grep -rin legend src/` | 0 hits | ✗ FAIL (confirms Gap 2) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| VIZ-01 | 03-01, 03-02, 03-03, 03-04 | 7-day trend charts, each day vs. its own historical range | ⚠️ BLOCKED (mechanically SATISFIED, legibility gap open) | Mechanics fully wired/tested; human-verify checkpoint withheld approval due to legibility defects |
| VIZ-02 | 03-01, 03-03, 03-04 | Historical distribution visible, average emphasized without hiding spread | ✗ BLOCKED | Dots+mean+diamond all render correctly, but "legible at a glance" bar is explicitly unmet per human reviewer (squished tile + no legend) |
| ROBU-01 | 03-02, 03-03, 03-04 | Graceful message when no usable historical data | ✓ SATISFIED | Placeholder mechanism fully implemented, unit-tested, and not reported as broken by the human reviewer; the reviewer's issues were about VIZ-02 legibility, not ROBU-01 |

No orphaned requirements — VIZ-01, VIZ-02, ROBU-01 are the complete Phase 3 requirement set per REQUIREMENTS.md's traceability table, and all three appear in at least one plan's `requirements` frontmatter field.

**REQUIREMENTS.md discrepancy:** REQUIREMENTS.md's checkboxes for VIZ-01/VIZ-02/ROBU-01 currently read `[x]` Complete, but this predates the Plan 04 human-verify checkpoint that found the issues (see "Important Context" above). This should be corrected to reflect the actual open status.

### Anti-Patterns Found

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in any Phase 3 file (`src/app/TrendDayChart.tsx`, `TrendRow.tsx`, `trend.ts`, `App.tsx`, `App.css`, `index.css`, `src/anomaly/anomaly.ts`, `src/weather/client.ts`, `src/weather/useCurrentWeather.ts`). No debt markers, no blockers of that kind.

The two blockers in this phase are not code-smell anti-patterns — they are a confirmed visual layout defect (asymmetric plot width) and a missing UI affordance (no legend), both reported by the phase's own human-verify checkpoint and corroborated by source inspection above.

### Human Verification Required

None outstanding beyond what's already captured as gaps below — the phase's own Plan 04 checkpoint already performed the human verification this phase requires, and it did not pass. No further speculative human-check items are needed; the two concrete issues are actionable defects, not open questions.

### Gaps Summary

The phase's data layer, statistics gate, chart mechanics, shared-scale composition, and graceful-degradation paths are all real, wired, and unit-tested (9/11 truths verified; all 50 relevant unit tests pass; build is clean; every prohibition from the PLAN frontmatter holds under grep). ROBU-01 is fully satisfied.

However, the phase's own end-to-end human-verify checkpoint (03-04) — which is the authoritative test for "is this legible at a glance", the exact bar VIZ-02 sets — explicitly did NOT pass. Two concrete, source-confirmed defects block the phase from being genuinely done:

1. **Leftmost trend-chart tile is visually squished** relative to its 6 siblings. Root cause confirmed in `src/app/TrendDayChart.tsx`/`TrendRow.tsx`: `showYAxis={index === 0}` gives only the first chart visible Y-axis tick labels, and those labels eat into the same fixed 88px `CHART_WIDTH` the other 6 charts get to use entirely for plotting — shrinking slot 0's actual dot-cloud/mean-line/diamond plotting area relative to its siblings.
2. **No legend** exists anywhere in the trend row to explain what the translucent dots, bright mean line, and orange diamond represent. The per-diamond hover tooltip (`<title>`) exists and works, but there is no persistent, glanceable key for a first-time viewer — undercutting VIZ-02's "legible at a glance" requirement.

Per the phase's own SUMMARY.md (03-04) and ROADMAP.md's Phase 3 entry, both issues are already correctly identified as blocking gap-closure work (not backlog). A third item — coloring historical dots by decade — was explicitly raised by the human reviewer but explicitly deferred to a future phase (non-blocking, already routed to backlog per 03-04-SUMMARY.md); it is not included as a gap here.

This phase is **not ready to close**. A gap-closure plan addressing both defects, followed by a fresh human-verify checkpoint, is required before Phase 3 can be marked Validated.

---

*Verified: 2026-07-15T10:02:16Z*
*Verifier: Claude (gsd-verifier)*
