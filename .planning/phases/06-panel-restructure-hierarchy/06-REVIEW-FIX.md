---
phase: 06-panel-restructure-hierarchy
fixed_at: 2026-07-22T13:31:00Z
review_path: .planning/phases/06-panel-restructure-hierarchy/06-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 06: Code Review Fix Report

**Fixed at:** 2026-07-22T13:31:00Z
**Source review:** .planning/phases/06-panel-restructure-hierarchy/06-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (fix_scope: all — 1 Critical, 1 Warning, 5 Info)
- Fixed: 7
- Skipped: 0

## Fixed Issues

### CR-01: InfoTooltip's click-to-persist path is broken again — the WR-02 fix silently regresses the WR-01 fix

**Files modified:** `src/app/InfoTooltip.tsx`, `src/app/InfoTooltip.test.tsx`
**Commit:** `4c3570d`
**Applied fix:** Applied the review's suggested `handleFocus` guard (don't clear `hoverPinnedRef` when already hover-pinned, since that focus event is a side effect of an imminent click). While verifying with a reproduction test, discovered the literal suggested fix does not fully restore persist-on-click for **pure keyboard** Tab+Enter (no mouse involved): since `hoverPinnedRef` is `false` for a genuine keyboard focus-open, the existing `handleTriggerClick` condition (`open && !hoverPinnedRef.current`) still took the toggle-closed branch on the following `click`, reproducing the exact same flash-open-then-close bug for keyboard users that the finding's own Issue text called out ("the identical failure mode applies to Tab-focus + Enter/Space"). Extended the fix with a dedicated `persistedRef` that distinguishes "currently a hover/focus preview, not yet persisted" from "already explicitly click-persisted" — `handleTriggerClick` now toggles closed only when `persistedRef.current` is true, and upgrades to persistent (`persistPopover()`) otherwise, for both a real mouse click and pure keyboard Tab+Enter. Verified with a reproduction test mirroring the review's exact repro (`mouseEnter` → `focus` → `click`, dialog stays open) and confirmed all 5 pre-existing `InfoTooltip.test.tsx` tests still pass.

### WR-01: InfoTooltip.test.tsx never reproduces real pointer/focus/click event ordering

**Files modified:** `src/app/InfoTooltip.test.tsx`
**Commit:** `4c3570d` (fixed together with CR-01 — the test additions are the same interconnected change: they exist specifically to verify CR-01's state-machine fix, and CR-01's own Fix section explicitly requested the `mouseEnter`→`focus`→`click` test)
**Applied fix:** Added two regression tests: (1) fires `mouseEnter` → `focus` → `click` in real-browser order and asserts the popover ends up open/persistent (the CR-01 repro), and (2) fires `focus` → `click` with no preceding `mouseEnter` (pure keyboard Tab+Enter) and asserts the same. Test (2) is what caught the gap in the review's literal suggested code fix — it failed against the code as first patched, then passed once `persistedRef` was added.

### IN-01: Loading-state spinner markup duplicated verbatim across four panels

**Files modified:** `src/app/PanelLoadingState.tsx` (new), `src/app/PanelLoadingState.test.tsx` (new), `src/app/LocationDisplay.tsx`, `src/app/CurrentConditionsPanel.tsx`, `src/app/DeltaPanel.tsx`, `src/app/TrendRow.tsx`
**Commit:** `ff56af2`
**Applied fix:** Extracted the identical `role="status"` spinner block (spinner span + message `<p>`) into a new `PanelLoadingState({ label })` component, matching the existing `PanelShell`/`PanelHeadline` primitive pattern already established in this directory. Replaced all four verbatim occurrences named in the finding with `<PanelLoadingState label="..." />`, preserving each panel's exact original message text. Added a small test file for the new component, consistent with every other primitive in `src/app/`.

### IN-02: Year-range/windowed-sample computation duplicated between computeAnomalyForToday and computeTrendDay

**Files modified:** `src/anomaly/anomaly.ts`
**Commit:** `1fdaca7`
**Applied fix:** Extracted `computeWindowSamples(daily, dateStr, halfWidthDays)` as the one shared definition of the target-month/day parsing, years/startYear/endYear derivation, and `filterDayOfYearWindow` call — mirroring the "ONE shared definition" treatment `hasUsableSampleCount` already received (D-10). Both `computeAnomalyForToday` and `computeTrendDay` now call through it instead of repeating the block inline.

### IN-03: DeltaPanel's anomaly prop type is an independently-redeclared copy instead of an imported/exported type

**Files modified:** `src/anomaly/anomaly.ts`, `src/app/DeltaPanel.tsx`
**Commit:** `b2af8e7`
**Applied fix:** Exported a named `AnomalyForToday` interface from `anomaly.ts` matching `computeAnomalyForToday`'s actual return shape, and changed `computeAnomalyForToday`'s return type annotation to use it. Updated `DeltaPanel.tsx` to import and use `AnomalyForToday` for its `anomaly` prop instead of hand-redeclaring the shape; removed the now-unused `VerdictTier` import from `DeltaPanel.tsx` since it was only needed for the inline redeclaration.

### IN-04: aria-controls references a not-yet-mounted element; stale eslint-disable directive

**Files modified:** `src/app/InfoTooltip.tsx`
**Commit:** `c7e9b9d`
**Applied fix:** Removed the stray `// eslint-disable-next-line react-hooks/exhaustive-deps` comment, which `npx eslint` confirmed was reported as an unused directive; now resolved (`npx eslint src/app/InfoTooltip.tsx` is clean). The `aria-controls` sub-item (only add it once `open` is true) was **intentionally left unchanged**: the finding itself marks it "low priority... if strict conformance is desired," and the existing test `InfoTooltip.test.tsx` (`renders a real <button>... with aria-expanded=false and aria-controls set before opening`) explicitly asserts `aria-controls` is truthy *before* the popover opens. Changing this would require rewriting that test's documented contract too — a larger, more consequential change than the low-priority cosmetic a11y nuance the finding describes. Left for a deliberate follow-up decision rather than an unreviewed side effect of this fix pass.

### IN-05: WR-03's z-score `-0.0` fix shipped without a regression test

**Files modified:** `src/app/DeltaPanel.test.tsx`
**Commit:** `af44b05`
**Applied fix:** Added a test rendering `DeltaPanel` with `anomaly={{ delta: 0, zScore: -0.04, verdictTier: 'typical' }}` and asserting the chip renders exactly `z 0.0`, guarding the WR-03 fix (`.replace('-0.0', '0.0')`) against future regression.

## Skipped Issues

None — all 7 in-scope findings were fixed. (See IN-04 above for the one sub-item — `aria-controls` timing — intentionally left unchanged within an otherwise-fixed finding, with rationale documented there.)

## Verification Summary

After all fixes: `npx vitest run` — 132/132 tests passing across 15 files (up from 130 pre-fix; 2 new regression tests added for CR-01/WR-01, plus 1 for IN-05 and 1 for the new PanelLoadingState component, net +2 test files). `npx tsc --noEmit -p .` — zero errors. `npx eslint .` — zero errors, zero warnings (including the InfoTooltip stray directive resolved by IN-04).

---

_Fixed: 2026-07-22T13:31:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
