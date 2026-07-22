---
phase: 06-panel-restructure-hierarchy
reviewed: 2026-07-22T11:12:36Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - src/anomaly/anomaly.ts
  - src/anomaly/anomaly.test.ts
  - src/app/App.tsx
  - src/app/CurrentConditionsPanel.tsx
  - src/app/CurrentConditionsPanel.test.tsx
  - src/app/DeltaPanel.tsx
  - src/app/DeltaPanel.test.tsx
  - src/app/InfoTooltip.tsx
  - src/app/InfoTooltip.test.tsx
  - src/app/LocationDisplay.tsx
  - src/app/PanelHeadline.tsx
  - src/app/PanelHeadline.test.tsx
  - src/app/PanelShell.tsx
  - src/app/PanelShell.test.tsx
  - src/app/TrendRow.tsx
  - src/app/TrendRow.test.tsx
findings:
  critical: 1
  warning: 1
  info: 5
  total: 7
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-07-22T11:12:36Z
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

This is a re-review of the panel-restructure-hierarchy split after the prior review's three Warning findings (WR-01/WR-02/WR-03, InfoTooltip's click/focus state machine and DeltaPanel's z-score chip) were "fixed" in commits `17f8999`, `ebd9123`, and `dad3dc8`. WR-03 (z-score `-0.0`) is fixed correctly and verified by inspection. WR-01 and WR-02, however, were fixed **independently of each other**, and the WR-02 fix silently undoes the WR-02 fix's own prerequisite — specifically, it re-flips the `hoverPinnedRef` flag that the WR-01 fix depends on. The net result, confirmed with a reproduction test exercising the real browser event order (`mouseenter` → `focus` → `click`), is that **`InfoTooltip`'s click-to-persist path is broken again**, this time for essentially every real mouse click, every touch tap, and every keyboard Tab+Enter — the exact defect WR-01 was supposed to have fixed. No test in `InfoTooltip.test.tsx` fires the events in the order real browsers do (it only ever calls `fireEvent.click` in isolation), so both the original bug and this regression are invisible to the existing 60-test suite. No hardcoded secrets, `eval`, raw-HTML sinks, or other security issues were found; the hand-rolled anomaly math in `anomaly.ts` remains internally consistent and its tests correctly exercise the documented boundary cases. Several lower-severity code-quality items carried over from the prior review (duplicated loading-spinner markup, duplicated windowing logic, an un-exported duplicated type, a stray `aria-controls` reference, a dead `eslint-disable` comment) remain unaddressed, plus one new item: the WR-03 fix shipped without a regression test.

## Critical Issues

### CR-01: InfoTooltip's click-to-persist path is broken again — the WR-02 fix silently regresses the WR-01 fix

**File:** `src/app/InfoTooltip.tsx:83-85` (`handleMouseEnter`), `:66-75` (`handleTriggerClick`), `:96-105` (`handleFocus`)

**Issue:** The WR-01 fix (commit `17f8999`) made `handleTriggerClick` decide whether to close or "upgrade to persistent" based on `hoverPinnedRef.current`:
```tsx
const handleTriggerClick = () => {
  if (open && !hoverPinnedRef.current) {
    closePopover(false)          // already persistent -> toggle closed
  } else {
    hoverPinnedRef.current = false
    setOpen(true)                // closed, or hover/focus-pinned -> make persistent
  }
}
```
This only works if `hoverPinnedRef.current` is still `true` (from `mouseenter`) by the time `click` fires. But the very next commit, WR-02 (`ebd9123`), changed `handleFocus` to *unconditionally* reset that same flag to `false`:
```tsx
const handleFocus = () => {
  if (suppressFocusOpenRef.current) { suppressFocusOpenRef.current = false; return }
  openPopover(false)   // sets hoverPinnedRef.current = false, unconditionally
}
```
In every real browser, a `<button>` receives a synchronous `focus` event *between* `mousedown` and `click` when clicked (Chrome, Firefox, Edge on all platforms; also the synthetic touch-to-mouse-event sequence most mobile browsers emit for a tap). So the actual sequence for a real mouse click on the trigger — which is always preceded by `mouseenter`, since the cursor must move onto the button first — is now:

1. `mouseenter` → `hoverPinnedRef.current = true`, `open = true` (hover-opened)
2. `focus` (fired by the click itself) → `handleFocus` runs, unconditionally sets `hoverPinnedRef.current = false`
3. `click` → `handleTriggerClick` sees `open === true` and `hoverPinnedRef.current === false` → takes the `if` branch → `closePopover(false)`

The popover flashes open (from hover) and then immediately closes (from the click's own handler), instead of becoming persistent. The identical failure mode applies to Tab-focus + Enter/Space (keyboard-only, no mouse at all) and to touch taps. This is the exact defect WR-01's title describes ("click-to-persist path unreachable for mouse users") — it has been silently reintroduced by the very next commit meant to fix a different, related bug, and neither `tsc --noEmit` nor the existing `InfoTooltip.test.tsx` suite (which never combines `mouseenter`/`focus` with `click` in one test) caught it.

Confirmed with a reproduction test (not part of the shipped suite):
```tsx
fireEvent.mouseEnter(trigger)   // hover-opens; hoverPinnedRef = true
expect(queryByRole('dialog')).not.toBeNull()

fireEvent.focus(trigger)        // real click fires focus first
fireEvent.click(trigger)        // real click event, correct order

expect(queryByRole('dialog')).not.toBeNull()   // FAILS — dialog is null; popover closed
```
This test fails against the current code (`AssertionError: expected null not to be null`).

**Fix:** `handleFocus` must not clear `hoverPinnedRef` when the popover is already hover-pinned — that focus event is a side effect of an imminent click, not a genuine keyboard-Tab visit:
```tsx
const handleFocus = () => {
  if (suppressFocusOpenRef.current) {
    suppressFocusOpenRef.current = false
    return
  }
  // A real click always fires `mouseenter` (setting hoverPinnedRef = true)
  // before this `focus` event. If we're already hover-pinned, this focus
  // is a side effect of the imminent click, not a genuine keyboard-Tab
  // visit — leave hoverPinnedRef alone so handleTriggerClick still sees
  // it as true and upgrades to persistent instead of toggling closed.
  if (hoverPinnedRef.current) return
  openPopover(false)
}
```
This preserves the WR-02 behavior for genuine keyboard-only Tab-focus (where `hoverPinnedRef.current` is still `false` when `handleFocus` runs, since no `mouseenter` ever fired) while restoring the WR-01 behavior for real mouse clicks and touch taps. Add a regression test to `InfoTooltip.test.tsx` that fires `mouseEnter` → `focus` → `click` in that order and asserts the dialog is still open — the current suite would not have caught this regression, and won't catch the next one either without it.

## Warnings

### WR-01: InfoTooltip.test.tsx never reproduces real pointer/focus/click event ordering

**File:** `src/app/InfoTooltip.test.tsx` (all tests)

**Issue:** Every test in this file exercises `handleTriggerClick`, `handleFocus`, or `handleTriggerKeyDown` in isolation via a single `fireEvent.click(...)` / `fireEvent.keyDown(...)` call. None of them combine `mouseenter` + `focus` + `click` in the order a real browser fires them for an actual mouse click or touch tap. This is precisely why CR-01 (this review) and the original WR-01 (prior review) both shipped undetected — the state machine's correctness depends entirely on the interaction *between* these three handlers and their shared `hoverPinnedRef`/`suppressFocusOpenRef` refs, and that interaction has no test coverage at all. A future change to any of the three handlers has the same blind spot.

**Fix:** Add at least one test that fires `mouseEnter` then `focus` then `click` on the trigger (mirroring real click event order) and asserts the popover ends up open/persistent, and one that fires `focus` then `click` with no preceding `mouseEnter` (pure keyboard Tab+Enter) and asserts the same. See the CR-01 reproduction snippet above as a starting point.

## Info

### IN-01: Loading-state spinner markup duplicated verbatim across four panels

**File:** `src/app/LocationDisplay.tsx:44-52`, `src/app/CurrentConditionsPanel.tsx:51-59`, `src/app/DeltaPanel.tsx:55-63`, `src/app/TrendRow.tsx:69-76`

**Issue:** All four panels repeat the identical `role="status"` spinner block, differing only in the message text:
```tsx
<div className="flex flex-row items-center gap-sm" role="status">
  <span
    className="size-4 shrink-0 rounded-full border-2 border-accent border-t-transparent animate-location-spin"
    aria-hidden="true"
  />
  <p className="m-0 text-body font-body">{message}</p>
</div>
```
`PanelShell`/`PanelHeadline` were extracted specifically to avoid this kind of drift for the glass-card shell and eyebrow heading; the loading-spinner block was left un-factored across all four panels that now use those primitives (carried over unaddressed from the prior review, which only caught 3 of the 4 occurrences).

**Fix:** Extract a small `PanelLoadingState({ label })` component and use it from all four panels.

### IN-02: Year-range/windowed-sample computation duplicated between computeAnomalyForToday and computeTrendDay

**File:** `src/anomaly/anomaly.ts:209-239` and `:251-292`

**Issue:** Both functions repeat the identical block that parses `targetMonth`/`targetDay` from a date string, derives `years`/`startYear`/`endYear` from `daily.time`, and calls `filterDayOfYearWindow` with the same arguments. `hasUsableSampleCount` already got the "ONE shared definition" treatment (D-10); the windowing setup that feeds it did not (carried over unaddressed from the prior review).

**Fix:** Extract a shared helper, e.g. `computeWindowSamples(daily, dateStr, halfWidthDays): { samples: number[]; totalYears: number } | null`, and have both functions call through it.

### IN-03: DeltaPanel's anomaly prop type is an independently-redeclared copy instead of an imported/exported type

**File:** `src/app/DeltaPanel.tsx:28`, `src/anomaly/anomaly.ts:214`

**Issue:** `computeAnomalyForToday` returns an inline, unexported object-literal type (`anomaly.ts:214`); `DeltaPanel.tsx:28` hand-redeclares the identical shape rather than importing it. There is no compiler-enforced link between the two — if `computeAnomalyForToday`'s return shape changes, `DeltaPanel`'s prop type won't automatically follow (carried over unaddressed from the prior review).

**Fix:** Export a named type from `anomaly.ts` (e.g. `AnomalyForToday`) and import it in `DeltaPanel.tsx` instead of redeclaring it.

### IN-04: aria-controls references a not-yet-mounted element; stale eslint-disable directive

**File:** `src/app/InfoTooltip.tsx:130` (vs. conditional mount at `:137-140`), `:63`

**Issue:** The trigger button always carries `aria-controls={popoverId}`, but the element with that id only exists in the DOM while `open` is `true` — before first open, `aria-controls` points at a non-existent id (minor, common disclosure-widget pattern, most AT tolerates it). Separately, `npx eslint src/app/InfoTooltip.tsx` still reports the same dead suppression comment as the prior review:
```
63:5  warning  Unused eslint-disable directive (no problems were reported from 'react-hooks/exhaustive-deps')
```
Both carried over unaddressed from the prior review.

**Fix:** Low priority for `aria-controls` (only add it once `open` is true, if strict conformance is desired). Remove the stray `// eslint-disable-next-line` comment on line 63.

### IN-05: WR-03's z-score `-0.0` fix shipped without a regression test

**File:** `src/app/DeltaPanel.tsx:105`, `src/app/DeltaPanel.test.tsx`

**Issue:** Commit `dad3dc8` correctly appended `.replace('-0.0', '0.0')` to the z-score chip's `toFixed(1)` call, fixing the confusing `"z -0.0"` output for small negative z-scores (e.g. `-0.04`). `DeltaPanel.test.tsx` still has no test asserting this — the only zero/negative-adjacent case covered is `zScore: null` (the "too little variance" branch), which is a different code path entirely. A future refactor of this line could silently reintroduce the bug with no test to catch it.

**Fix:** Add a test rendering `DeltaPanel` with `anomaly={{ delta: 0, zScore: -0.04, verdictTier: 'typical' }}` (or similar) and asserting the chip renders `z 0.0`, not `z -0.0`.

---

_Reviewed: 2026-07-22T11:12:36Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
