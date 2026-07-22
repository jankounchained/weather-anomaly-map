---
phase: 07-methodology-section-explainers
verified: 2026-07-22T18:50:53Z
status: human_needed
score: 3/3 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Toggle the OS/browser reduced-motion setting (Chrome DevTools Rendering tab -> 'Emulate CSS media feature prefers-reduced-motion: reduce', or macOS System Settings -> Accessibility -> Display -> Reduce Motion), run `npm run dev`, and expand/collapse the 'How This Works' panel."
    expected: "The ▸ chevron snaps instantly (no smooth rotation) when reduce-motion is enabled, and rotates smoothly over ~200ms when motion is enabled. Also confirm the chevron visibly rotates at all when the panel opens/closes."
    why_human: "jsdom cannot emulate the prefers-reduced-motion media feature (07-RESEARCH.md Pitfall 4); this check was deliberately deferred from checkpoint:human-verify to end-of-phase per .planning/config.json's workflow.human_verify_mode=\"end-of-phase\", and is recorded as `pending`/`human_judgment: true` in 07-02-SUMMARY.md's own coverage table (item D4)."
---

# Phase 07: Methodology Section & Percentile Explainers Verification Report

**Phase Goal:** Give users who want to understand or trust the anomaly a plain-language methodology explanation and a percentile framing of the score, without cluttering the at-a-glance view.
**Verified:** 2026-07-22T18:50:53Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User sees a methodology section collapsed by default and can expand it to read how the anomaly is computed (30-year baseline, day-of-year window, z-score, delta) and what the tool is for. | VERIFIED | `src/app/MethodologyPanel.tsx:24` renders `<details className="group">` with no `open` attribute (collapsed by default). Body copy (verbatim, `src/app/MethodologyPanel.tsx:36-60`) covers "What This Shows" and "How It's Computed" (30-year baseline, ±5-day window, mean, delta, z-score, percentile), matching `07-UI-SPEC.md`'s Copywriting Contract word-for-word. `MethodologyPanel.test.tsx` tests 1-2 confirm collapsed-by-default and click-to-reveal; both pass (`npx vitest run` — 3/3 tests in this file). |
| 2 | User can expand and collapse the methodology section using both mouse and keyboard, with disclosure state and focus behaving accessibly (single-level, flat disclosure). | VERIFIED | Native `<details>`/`<summary>` is used with no custom `onClick`/`onKeyDown` handlers overriding default behavior (grep confirms zero matches for `onKeyDown\|onKeyUp\|onKeyPress` in the file) — mouse click and keyboard Enter/Space both route through the browser's identical native toggle mechanism, so the click test (`MethodologyPanel.test.tsx:16-21`, passing) functionally validates both input modalities share one code path. `SUMMARY_CLASSES` includes `focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent` for keyboard focus visibility, and `[&::-webkit-details-marker]:hidden` + a single `<summary>` avoid a double-affordance. Only one `<details>` element exists in the file (`grep -c "<details"` matches only the real tag plus one comment reference, confirmed by line-by-line read) — single-level, flat, no nesting, no third heading level. |
| 3 | User sees a plain-language percentile framing (e.g. "warmer than 98% of years for this date") presented alongside the z-score. | VERIFIED | `src/app/DeltaPanel.tsx:100-102` renders `{percentileLabel(anomaly.percentile)}` between the verdict `<p>` and the z-score chip `<p>`, guarded on `anomaly.percentile !== null`. `computePercentileRank`/`percentileLabel` in `src/anomaly/anomaly.ts:73-89` implement the exact Hazen/midrank math and the exact locked copy strings ("Warmer than N% of years for this date.", "Colder than N% of years for this date.", "Around the middle for this date."). `DeltaPanel.test.tsx`'s ordering test (lines 57-88) asserts verdict-index < percentile-index < z-chip-index using the literal string "Warmer than 91% of years for this date." — passing. |

**Score:** 3/3 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/anomaly/anomaly.ts` | exports `computePercentileRank`, `percentileLabel`; `AnomalyForToday` gains `percentile` field | VERIFIED | All three present exactly as specified (lines 73, 84, 272). `computeAnomalyForToday` (line 295) computes `percentile` via `zScore === null ? null : computePercentileRank(todayTemp, samples)`. |
| `src/anomaly/anomaly.test.ts` | covers Hazen ties, 1-99 clamp bounds, null suppression, three `percentileLabel` branches | VERIFIED | `describe('computePercentileRank', ...)` (line 83) and `describe('percentileLabel', ...)` (line 102) cover all specified cases; `computeAnomalyForToday` tests extended with percentile assertions (lines 233-251). |
| `src/app/DeltaPanel.tsx` | renders percentile line between verdict and z-chip in populated branch | VERIFIED | Line 100-102, guarded, matching micro-copy `<p>` class (no chip wrapper). |
| `src/app/DeltaPanel.test.tsx` | asserts percentile ordering and null suppression | VERIFIED | Ordering test lines 57-88; suppression test lines 116-129. |
| `src/app/MethodologyPanel.tsx` | new stateless component, `PanelShell` + native `<details>`/`<summary>`, locked copy | VERIFIED | New file, matches plan's `<action>` spec verbatim: `group` class present, chevron `group-open:rotate-90` + `motion-safe:transition-transform`, native marker suppressed, zero `useState`, zero `dangerouslySetInnerHTML`. |
| `src/app/MethodologyPanel.test.tsx` | asserts collapsed-by-default, click-to-reveal, prop-less always-visible rendering | VERIFIED | 3 tests present and passing. |
| `src/app/App.tsx` | imports and mounts `<MethodologyPanel />` as final `LocationPanel` child, after `<TrendRow />` | VERIFIED | Line 18 import, line 135 mount — after `<TrendRow ... />` (closes line 134) and before `</LocationPanel>` (line 136), no conditional wrapper. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `computeAnomalyForToday` | `DeltaPanel` | `percentile` field folded into the existing `AnomalyForToday` object/prop — no new prop threading | WIRED | Confirmed: `AnomalyForToday` interface extended in place (anomaly.ts:272); `DeltaPanel` imports `percentileLabel` and the extended type, uses `anomaly.percentile` directly from its existing `anomaly` prop. |
| `computePercentileRank` | `computeAnomaly` (via shared samples) | Both invoked with the SAME `samples` variable from `computeWindowSamples`, inside `computeAnomalyForToday` | WIRED | anomaly.ts:293-295 — `computeAnomaly(todayTemp, samples)` and `computePercentileRank(todayTemp, samples)` both consume the same `samples` local, satisfying PD-05 (percentile and z-score can never disagree on which samples they rank against). |
| `<MethodologyPanel />` | `LocationPanel`'s `{children}` slot | Mounted as JSX child, unconditional | WIRED | `LocationPanel.tsx:39` renders `{children}` unconditionally inside the flex column regardless of `hasSelection` (only the `<aside>`'s className/style branch on `hasSelection`, not whether children render) — confirmed by direct read. `App.tsx:135` places `<MethodologyPanel />` with zero props, zero conditional wrapper. |
| `<details className="group">` | chevron `<span className="... group-open:rotate-90">` | Tailwind `group`/`group-open:` activation | WIRED | `group` class present on the `<details>` ancestor (MethodologyPanel.tsx:24), required for `group-open:rotate-90` to activate on the child span (line 29) — confirmed present, not silently missing (RESEARCH Pitfall 3 guarded against). |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full phase-scoped test suite (anomaly.ts, DeltaPanel, MethodologyPanel) | `npx vitest run src/anomaly/anomaly.test.ts src/app/DeltaPanel.test.tsx src/app/MethodologyPanel.test.tsx` | 3 files, 55/55 tests passed | PASS |
| Type-check | `npx tsc -b` | exits 0, no output | PASS |
| Native `<details>` click-toggle behavior | `MethodologyPanel.test.tsx` test 2 (`fireEvent.click` then `getByText`) | passes | PASS |
| Percentile ordering (verdict < percentile < z-chip) | `DeltaPanel.test.tsx` populated-state ordering test | passes | PASS |
| Percentile null-suppression | `DeltaPanel.test.tsx` suppression test | passes | PASS |
| Reduced-motion chevron behavior | — | not run (jsdom cannot emulate `prefers-reduced-motion`) | SKIP → routed to human verification |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| EXPLAIN-03 | 07-02-PLAN.md | User can expand a collapsed-by-default methodology section explaining how the anomaly is computed and what the tool is for | SATISFIED | `MethodologyPanel.tsx` + mount in `App.tsx`, verified above |
| EXPLAIN-04 | 07-01-PLAN.md | User sees a plain-language percentile framing alongside the z-score | SATISFIED | `computePercentileRank`/`percentileLabel` + `DeltaPanel` wiring, verified above |

No orphaned requirements: REQUIREMENTS.md traceability table maps only EXPLAIN-03 and EXPLAIN-04 to Phase 7, and both are claimed in plan frontmatter (`07-01-PLAN.md requirements: [EXPLAIN-04]`, `07-02-PLAN.md requirements: [EXPLAIN-03]`).

### Anti-Patterns Found

None. Scanned all phase-modified files (`src/anomaly/anomaly.ts`, `src/anomaly/anomaly.test.ts`, `src/app/DeltaPanel.tsx`, `src/app/DeltaPanel.test.tsx`, `src/app/MethodologyPanel.tsx`, `src/app/MethodologyPanel.test.tsx`, `src/app/App.tsx`) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`/`dangerouslySetInnerHTML`/empty-implementation patterns — zero matches beyond the code review's own non-blocking notes (below).

**Non-blocking code-review findings (pre-existing, from `07-REVIEW.md`, `status: issues_found`, 0 critical):**
- **WR-01** (warning): The percentile copy says "X% of years for this date," but the underlying sample set is the ±5-day day-of-year window across all years (~330 daily values), not one value per year — a product/copy accuracy note, not an implementation defect. Notably, this exact "% of years" phrasing is what ROADMAP.md's own success-criterion example text uses ("warmer than 98% of years for this date"), and the implementation follows the UI-SPEC's locked Copywriting Contract verbatim per its own prohibition ("MUST NOT... use... EXACT copy strings"). Not a phase-blocking gap; flagged for a future product/copy pass.
- **WR-02** (warning): `computePercentileRank` is an exported pure function that trusts an unenforced caller invariant (only call it when `zScore !== null`) rather than self-guarding like its sibling functions. Currently honored by its one caller; a maintainability/defense-in-depth note, not a current functional bug.
- **IN-01/IN-02** (info): stale doc comments and a redundant test assertion. Cosmetic.

None of these affect the three ROADMAP success criteria.

## Human Verification Required

### 1. Reduced-motion chevron behavior

**Test:** Toggle the OS/browser reduced-motion setting (Chrome DevTools Rendering tab → "Emulate CSS media feature prefers-reduced-motion: reduce", or macOS System Settings → Accessibility → Display → Reduce Motion), run `npm run dev`, and expand/collapse the "How This Works" panel.
**Expected:** The ▸ chevron snaps instantly (no smooth rotation) under reduce-motion, and rotates smoothly (~200ms) with motion enabled. The chevron visibly rotates at all (confirms `className="group"` is functionally active, not just present in source).
**Why human:** jsdom cannot emulate the `prefers-reduced-motion` CSS media feature (07-RESEARCH.md Pitfall 4). This check was deliberately deferred by the planner from `checkpoint:human-verify` to end-of-phase per `.planning/config.json`'s `workflow.human_verify_mode: "end-of-phase"`, and is recorded as `pending`/`human_judgment: true` in `07-02-SUMMARY.md`'s coverage table (item D4). This is the sole outstanding item for this phase.

## Gaps Summary

No gaps found. All three ROADMAP success criteria are observably true in the codebase: the methodology section exists, is collapsed by default, composes the locked copy explaining the 30-year baseline/day-of-year window/z-score/delta/percentile pipeline and what the tool is for; it is operable by mouse and native-keyboard semantics with accessible focus and a strictly single-level flat disclosure; and the percentile framing renders as plain-language copy between the verdict and z-score chip, correctly suppressed on degenerate variance and sharing the exact same sample window as the z-score. All 55 phase-scoped unit/RTL tests pass, `tsc -b` is clean, and no debt markers or stub patterns were found in any phase-modified file. The single open item is the planner-deferred reduced-motion manual check, which is a genuine jsdom limitation (not a code gap) and routes to end-of-phase human verification per project config.

---

_Verified: 2026-07-22T18:50:53Z_
_Verifier: Claude (gsd-verifier)_
