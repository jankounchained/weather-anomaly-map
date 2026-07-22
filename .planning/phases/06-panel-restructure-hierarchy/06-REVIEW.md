---
phase: 06-panel-restructure-hierarchy
reviewed: 2026-07-22T00:00:00Z
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
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-07-22T00:00:00Z
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

Reviewed the panel-restructure-hierarchy split (`PanelShell`/`PanelHeadline` primitives, `CurrentConditionsPanel`/`DeltaPanel`/`TrendRow`, the `InfoTooltip` disclosure widget, and the `anomaly.ts` math module they consume). No security issues, hardcoded secrets, `eval`, or raw-HTML sinks were found — all dynamic text is rendered as ordinary JSX children, matching the file-header claims. The hand-rolled anomaly math (`mean`, `sampleStdDev`, `computeAnomaly`, `classifyVerdict`, `windowBounds`, `filterDayOfYearWindow`, `hasUsableSampleCount`) is internally consistent and its test suite correctly exercises the documented boundary cases (zero-variance guard, leap-day folding, year-boundary wraparound, the D-10 sample-count gate).

The most significant findings are in `InfoTooltip.tsx`: its hover/focus/click state machine shares a single `hoverPinnedRef` flag across two behaviorally distinct triggers (mouse hover and keyboard focus). Traced through real DOM event ordering, this breaks two parts of the WCAG 1.4.13 "hoverable, dismissible, persistent" contract the file's own comments claim to implement: (1) clicking the trigger with a mouse can never reach the "persistent open" code path, because `mouseenter` always fires before `click` and has already flipped the toggle; (2) a popover opened via keyboard `Tab` focus never closes on `blur`, because focus-open is marked with the same "hover-pinned" flag that blur uses to skip closing. Neither is caught by `InfoTooltip.test.tsx`, which only fires isolated `click`/`keydown` events and never reproduces the mouseenter-before-click or focus/blur sequences a real user produces. A third confirmed bug is in `DeltaPanel`'s z-score chip, which can render the confusing string `"z -0.0"` for small negative z-scores due to an unguarded `toFixed(1)` call — verified directly (`(-0.04).toFixed(1) === '-0.0'`). Several lower-severity code-quality items (duplicated loading markup, duplicated windowing logic, an un-exported duplicated type, a stray `aria-controls` reference, and a dead `eslint-disable` comment) round out the findings.

## Warnings

### WR-01: InfoTooltip's "click to open persistently" path is unreachable for real mouse users

**File:** `src/app/InfoTooltip.tsx:35-38, 66-72, 80-82`

**Issue:** `handleTriggerClick` toggles based on the current `open` state:
```tsx
const handleTriggerClick = () => {
  if (open) {
    closePopover(false)
  } else {
    openPopover(false)   // "persistent" open, hoverPinnedRef = false
  }
}
```
`handleMouseEnter` unconditionally calls `openPopover(true)` (hover-pinned) whenever the pointer enters the container. In a real browser, `mouseenter` on the trigger always fires *before* the subsequent `click`, because the cursor must physically move onto the button before it can be clicked. So the actual sequence for any real mouse click is:

1. `mouseenter` → `openPopover(true)` → `open=true`, `hoverPinnedRef=true`
2. `click` → `handleTriggerClick` sees `open === true` → calls `closePopover(false)`, immediately closing the tooltip that hover just opened.

The `else` branch of `handleTriggerClick` — the one that is supposed to produce the "click makes it persistent" behavior — can therefore never execute via normal mouse interaction: hovering always opens it first, and the click that follows only closes it again. `InfoTooltip.test.tsx` doesn't catch this because it calls `fireEvent.click(trigger)` directly without first firing `mouseenter`, so it never reproduces real pointer-event ordering. The same root cause means any `mouseenter` that fires while already open (e.g. hovering back over an already-open popover) silently re-marks it "hover-pinned," so a later `mouseleave` can incorrectly close a popover the user explicitly clicked open.

**Fix:** Only transition into hover-pinned when actually opening from closed, and make a click while already hover/focus-opened "upgrade" the popover to persistent instead of toggling it closed:
```tsx
const handleMouseEnter = () => {
  if (!open) openPopover(true)
}

const handleTriggerClick = () => {
  if (open && !hoverPinnedRef.current) {
    // already persistent (opened by an explicit click) -> toggle closed
    closePopover(false)
  } else {
    // closed, or currently hover/focus-pinned -> make it persistent
    hoverPinnedRef.current = false
    setOpen(true)
  }
}
```

### WR-02: InfoTooltip popover opened via keyboard focus never closes on blur

**File:** `src/app/InfoTooltip.tsx:93-109`

**Issue:** `handleFocus` opens the popover via `openPopover(true)`, which sets `hoverPinnedRef.current = true` — the same flag `handleBlur` uses to mean "the pointer is still hovering, don't close yet":
```tsx
const handleFocus = () => {
  if (suppressFocusOpenRef.current) { suppressFocusOpenRef.current = false; return }
  openPopover(true)   // marks a keyboard-focus-open as "hover-pinned"
}

const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
  if (hoverPinnedRef.current) return   // now always true right after Tab-focus opened it
  if (!containerRef.current?.contains(event.relatedTarget as Node)) {
    closePopover(false)
  }
}
```
Because `handleFocus` unconditionally sets `hoverPinnedRef.current = true`, `handleBlur`'s guard is always true immediately after a keyboard-focus-triggered open, so the close-on-blur logic never runs. A keyboard user who `Tab`s onto the info button (opening the popover) and then `Tab`s away leaves the popover open indefinitely — the mouse never entered the container in a keyboard-only flow, so `handleMouseLeave` (the only other path that clears "hover-pinned") never fires either, and `Escape` only helps if the trigger still has focus, which it won't once the user has tabbed past it. Tabbing through multiple `InfoTooltip` instances (one in `CurrentConditionsPanel`, one in `DeltaPanel`) can leave several simultaneously-open, unfocused popovers on screen. This directly contradicts the file's own comment ("closes on ... blur when not hover-pinned") and the WCAG 1.4.13 contract it's built to satisfy. Not covered by `InfoTooltip.test.tsx`, which never fires `focus`/`blur` events.

**Fix:** Focus-open should behave like click-open, not hover-open, so a normal blur closes it:
```tsx
const handleFocus = () => {
  if (suppressFocusOpenRef.current) { suppressFocusOpenRef.current = false; return }
  openPopover(false)   // focus-open, like click-open, is closed by a normal blur
}
```

### WR-03: z-score chip can render "z -0.0" for small negative z-scores

**File:** `src/app/DeltaPanel.tsx:103-105`

**Issue:**
```tsx
{anomaly.zScore === null
  ? 'z — (too little variance to compute)'
  : `z ${anomaly.zScore.toFixed(1)}`}
```
`Number.prototype.toFixed` produces `"-0.0"` for any value in `(-0.05, 0)`, confirmed directly: `(-0.04).toFixed(1) === '-0.0'`. Any z-score in that range — which is squarely inside the `classifyVerdict` "typical" zone (`|z| < 0.5`) — renders as `z -0.0`, a confusing negative-looking value for a day the app itself labels "Right on the 30-year average." `formatDelta` in `anomaly.ts` already guards against the analogous case for the delta number (`rounded === 0 → '0'`, no sign), but the z-score chip has no equivalent guard.

**Fix:**
```tsx
: `z ${anomaly.zScore.toFixed(1).replace('-0.0', '0.0')}`}
```

## Info

### IN-01: Loading-state spinner markup duplicated verbatim across three panels

**File:** `src/app/CurrentConditionsPanel.tsx:51-59`, `src/app/DeltaPanel.tsx:55-63`, `src/app/TrendRow.tsx:69-76`

**Issue:** All three panels repeat the identical `role="status"` spinner block, differing only in the message text:
```tsx
<div className="flex flex-row items-center gap-sm" role="status">
  <span
    className="size-4 shrink-0 rounded-full border-2 border-accent border-t-transparent animate-location-spin"
    aria-hidden="true"
  />
  <p className="m-0 text-body font-body">{message}</p>
</div>
```
This phase's stated purpose is exactly to pull duplicated per-panel markup into shared primitives (`PanelShell`/`PanelHeadline` already did this for the glass-card shell and eyebrow heading). The loading-spinner block was left un-factored, so a future visual change (spinner size, color, `role` semantics) has to be made — and kept in sync — in three places.

**Fix:** Extract a small `PanelLoadingState({ label })` component and use it from all three panels.

### IN-02: Year-range and windowed-sample computation duplicated between `computeAnomalyForToday` and `computeTrendDay`

**File:** `src/anomaly/anomaly.ts:209-239` and `src/anomaly/anomaly.ts:251-292`

**Issue:** Both functions repeat the identical block that parses `targetMonth`/`targetDay` from a date string, derives `years`/`startYear`/`endYear` from `daily.time`, and calls `filterDayOfYearWindow` with the same arguments. The file's own comments emphasize D-10's "ONE shared definition" principle for the sample-count threshold (`hasUsableSampleCount`), but the surrounding windowing setup that feeds it is still duplicated, so a future change to date-parsing or year-range derivation must be made in two places to stay in sync.

**Fix:** Extract a shared helper, e.g. `computeWindowSamples(daily, dateStr, halfWidthDays): { samples: number[]; totalYears: number } | null`, and have both functions call through it.

### IN-03: `DeltaPanel`'s anomaly prop type is an independently-redeclared copy instead of an imported/exported type

**File:** `src/app/DeltaPanel.tsx:28`, `src/anomaly/anomaly.ts:214`

**Issue:** `computeAnomalyForToday` returns an inline, unexported object-literal type:
```ts
// anomaly.ts:214
): { delta: number; zScore: number | null; verdictTier: VerdictTier } | null {
```
`DeltaPanel.tsx` hand-redeclares the identical shape rather than importing it:
```ts
// DeltaPanel.tsx:28
anomaly: { delta: number; zScore: number | null; verdictTier: VerdictTier } | null
```
There's no compiler-enforced link between the two today they happen to match, but if `computeAnomalyForToday`'s return shape changes, `DeltaPanel`'s prop type won't automatically follow, and the mismatch will only surface wherever `App.tsx` happens to pass the now-different value.

**Fix:** Export a named type from `anomaly.ts` (e.g. `AnomalyForToday`) and import it in `DeltaPanel.tsx` instead of redeclaring it.

### IN-04: `aria-controls` references an element id that doesn't exist in the DOM until the popover first opens; stray `eslint-disable` comment

**File:** `src/app/InfoTooltip.tsx:63, 124` (vs. the conditionally-rendered `id={popoverId}` at `:134`)

**Issue:** The trigger button always carries `aria-controls={popoverId}`, but the element with that id only renders when `open` is true:
```tsx
<button ... aria-controls={popoverId} ...>i</button>
{open && (
  <div className="absolute z-10 mt-xs">
    <PanelShell id={popoverId} ...>{children}</PanelShell>
  </div>
)}
```
Before the first open, `aria-controls` points at a non-existent id — a minor deviation from the ARIA spec's expectation that `aria-controls` reference a present element (most assistive tech tolerates this common disclosure-widget pattern). Separately, `npx eslint src/app/InfoTooltip.tsx` reports a dead suppression comment:
```
63:5  warning  Unused eslint-disable directive (no problems were reported from 'react-hooks/exhaustive-deps')
```
The `useEffect`'s only "missing" dependency would be `closePopover`, but since `closePopover` only closes over stable `useState`/`useRef` values, the rule doesn't actually fire here — the `// eslint-disable-next-line` on line 63 is unnecessary.

**Fix:** Low priority for the `aria-controls` item (only render it once `open` is true, or always mount the popover container hidden, if strict conformance is desired). Remove the stray `eslint-disable-next-line` comment on line 63.

---

_Reviewed: 2026-07-22T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
