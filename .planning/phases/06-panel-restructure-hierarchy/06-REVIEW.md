---
phase: 06-panel-restructure-hierarchy
reviewed: 2026-07-22T10:24:35Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - src/anomaly/anomaly.test.ts
  - src/anomaly/anomaly.ts
  - src/app/App.tsx
  - src/app/CurrentConditionsPanel.test.tsx
  - src/app/CurrentConditionsPanel.tsx
  - src/app/DeltaPanel.test.tsx
  - src/app/DeltaPanel.tsx
  - src/app/InfoTooltip.test.tsx
  - src/app/InfoTooltip.tsx
  - src/app/LocationDisplay.tsx
  - src/app/PanelHeadline.test.tsx
  - src/app/PanelHeadline.tsx
  - src/app/PanelShell.test.tsx
  - src/app/PanelShell.tsx
  - src/app/TrendRow.test.tsx
  - src/app/TrendRow.tsx
findings:
  critical: 1
  warning: 3
  info: 3
  total: 7
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-07-22T10:24:35Z
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

Reviewed the panel-restructure-hierarchy split (AnomalyCard → CurrentConditionsPanel + DeltaPanel + shared PanelShell/PanelHeadline/InfoTooltip primitives) plus the new `isAnomalyReady` gate in `anomaly.ts`. `tsc --noEmit`, `eslint`, and the full Vitest suite for these files all pass cleanly (60/60 tests, 0 tsc errors, 1 eslint warning). No `dangerouslySetInnerHTML`, `eval`, hardcoded secrets, or SQL/command-injection surfaces exist in this file set — all dynamic text renders as JSX text nodes as documented.

The one Critical finding is a confirmed, reproducible logic bug in `InfoTooltip`'s hover/focus state machine: keyboard-focus-opened popovers are incorrectly marked "hover-pinned," which defeats the documented blur-to-close behavior and leaves orphaned open popovers as a keyboard user tabs through the page. I reproduced this with a standalone RTL test (fireEvent.focus + fireEvent.blur) — the dialog remains in the DOM after focus moves to an unrelated element.

The Warning-level findings are a type-drift risk between `anomaly.ts`'s inline return-type literal and `DeltaPanel`'s independently redeclared prop type, a "-0.0" rendering defect in the z-score chip that the code's own delta formatter already guards against, and identical loading-spinner markup copy-pasted three times despite this phase's explicit goal of consolidating shared panel primitives.

## Critical Issues

### CR-01: InfoTooltip keyboard-focus open is treated as hover-pinned, so it never closes on blur

**File:** `src/app/InfoTooltip.tsx:93-99` (interacting with the blur guard at `:101-109`)

**Issue:** `handleFocus` calls `openPopover(true)`, which sets `hoverPinnedRef.current = true` — the exact same flag used to mean "opened by mouse hover, keep-alive while pointer is over trigger/popover." `handleBlur` then early-returns whenever `hoverPinnedRef.current` is true:

```tsx
const handleFocus = () => {
  if (suppressFocusOpenRef.current) {
    suppressFocusOpenRef.current = false
    return
  }
  openPopover(true)   // BUG: marks a keyboard-focus-open as "hover-pinned"
}

const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
  if (hoverPinnedRef.current) return   // now always true after Tab-focus, so this never runs
  if (!containerRef.current?.contains(event.relatedTarget as Node)) {
    closePopover(false)
  }
}
```

Since the mouse never entered the container in a keyboard-only flow, `handleMouseLeave` (the only other path that clears a "hover-pinned" popover) never fires either. The popover is now stuck open until the user clicks somewhere else in the document (the `mousedown` outside-click listener is the only remaining close path) — Escape only works if the trigger still has focus, which it won't once the user has tabbed away. Tabbing through several `InfoTooltip` instances (e.g. one in `CurrentConditionsPanel`, one in `DeltaPanel`) accumulates multiple simultaneously-open, unfocused dialogs.

This directly contradicts the file's own header comment ("closes on ... blur when not hover-pinned") and the WCAG 1.4.13 dismissible/hoverable contract the component is built to satisfy — a keyboard-only user, who by definition cannot "hover," will see disclosure content persist indefinitely after moving focus away.

Confirmed via reproduction (RTL, not checked in):
```tsx
fireEvent.focus(trigger)
expect(getByRole('dialog')).toBeTruthy()          // opens, as expected
fireEvent.blur(trigger, { relatedTarget: outsideButton })
expect(queryByRole('dialog')).toBeNull()           // FAILS — dialog is still in the DOM
```

**Fix:** Focus-open should mirror click-open (not hover-open) — it should NOT set the hover-pinned flag, so a normal blur closes it:

```tsx
const handleFocus = () => {
  if (suppressFocusOpenRef.current) {
    suppressFocusOpenRef.current = false
    return
  }
  openPopover(false)   // focus-open behaves like click-open: blur closes it normally
}
```

## Warnings

### WR-01: `DeltaPanel`'s anomaly prop type is an independently-redeclared copy of `computeAnomalyForToday`'s inline return type

**File:** `src/app/DeltaPanel.tsx:28`, `src/anomaly/anomaly.ts:214`

**Issue:** `computeAnomalyForToday` in `anomaly.ts` returns an inline object-literal type that is never exported:

```ts
// anomaly.ts:214
): { delta: number; zScore: number | null; verdictTier: VerdictTier } | null {
```

`DeltaPanel.tsx` redeclares the exact same shape by hand instead of importing it:

```ts
// DeltaPanel.tsx:28
anomaly: { delta: number; zScore: number | null; verdictTier: VerdictTier } | null
```

There is no compiler-enforced link between the two. If `computeAnomalyForToday`'s return shape changes (a field renamed/added/removed), `DeltaPanel`'s prop type silently stops matching what `App.tsx` actually passes, and TypeScript will not catch the drift at the `anomaly.ts` end — only wherever `App.tsx` happens to pass the now-mismatched value, which may not surface a useful error.

**Fix:** Export a named type from `anomaly.ts` and use it in both places:

```ts
// anomaly.ts
export interface AnomalyForToday {
  delta: number
  zScore: number | null
  verdictTier: VerdictTier
}
export function computeAnomalyForToday(...): AnomalyForToday | null { ... }

// DeltaPanel.tsx
import type { AnomalyForToday } from '../anomaly/anomaly'
export interface DeltaPanelProps {
  ...
  anomaly: AnomalyForToday | null
}
```

### WR-02: z-score chip can render "-0.0" for small negative z-scores, despite the codebase's own precedent for avoiding exactly this

**File:** `src/app/DeltaPanel.tsx:103-105`

**Issue:**
```tsx
{anomaly.zScore === null
  ? 'z — (too little variance to compute)'
  : `z ${anomaly.zScore.toFixed(1)}`}
```

`Number.prototype.toFixed` produces `"-0.0"` for any value in `(-0.05, 0)`:

```
node -e "console.log((-0.04).toFixed(1))"   // "-0.0"
```

Any z-score in that tiny negative range (which is exactly the "typical" verdict zone that `formatDelta` was already special-cased to avoid rendering ambiguously — see the `formatDelta` doc comment citing D-06/D-07 and the negative-zero handling `rounded === 0 → '0'`) will display as `z -0.0`, a confusing negative-looking value for what the app itself classifies as "right on average." `formatDelta` already solved this exact problem for the delta number; the z-score chip has no equivalent guard.

**Fix:**
```tsx
{anomaly.zScore === null
  ? 'z — (too little variance to compute)'
  : `z ${anomaly.zScore.toFixed(1).replace('-0.0', '0.0')}`}
```

### WR-03: Loading-state spinner markup is duplicated verbatim across three panels

**File:** `src/app/CurrentConditionsPanel.tsx:51-61`, `src/app/DeltaPanel.tsx:55-65`, `src/app/TrendRow.tsx:69-77`

**Issue:** All three panels repeat the identical spinner + `role="status"` wrapper structure:

```tsx
<div className="flex flex-row items-center gap-sm" role="status">
  <span
    className="size-4 shrink-0 rounded-full border-2 border-accent border-t-transparent animate-location-spin"
    aria-hidden="true"
  />
  <p className="m-0 text-body font-body">{loadingCopy}</p>
</div>
```

This phase's stated purpose (per the file header comments) is exactly to pull duplicated markup like this into shared primitives (`PanelShell`, `PanelHeadline` already did this for the glass-card shell and eyebrow heading, replacing copy-pasted class strings across `LocationDisplay`/`TrendRow`/the old `AnomalyCard`). The loading-spinner block was left un-factored, so any future visual change to the loading indicator (spinner size, color, copy pattern) now has to be made in three places, with three independent tests each individually asserting the same `role="status"` shape — a real risk of the three panels drifting apart, which is precisely the failure mode `isAnomalyReady` was introduced elsewhere in this phase to prevent.

**Fix:** Extract a small `PanelLoadingState` (or similar) component:
```tsx
function PanelLoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-row items-center gap-sm" role="status">
      <span
        className="size-4 shrink-0 rounded-full border-2 border-accent border-t-transparent animate-location-spin"
        aria-hidden="true"
      />
      <p className="m-0 text-body font-body">{label}</p>
    </div>
  )
}
```
and use `<PanelLoadingState label="Calculating today's conditions…" />` etc. in each panel.

## Info

### IN-01: Unused `eslint-disable-next-line` directive

**File:** `src/app/InfoTooltip.tsx:63`

**Issue:** `npx eslint src/app/InfoTooltip.tsx` reports:
```
63:5  warning  Unused eslint-disable directive (no problems were reported from 'react-hooks/exhaustive-deps')
```
The `useEffect`'s only "missing" dependency would be `closePopover`, but since `closePopover` only closes over stable `useState`/`useRef` values, `react-hooks/exhaustive-deps` doesn't flag it — the suppression comment is dead weight.

**Fix:** Remove the `// eslint-disable-next-line react-hooks/exhaustive-deps` comment on line 63.

### IN-02: `formatDelta(anomaly.delta)` is computed twice in the same render

**File:** `src/app/DeltaPanel.tsx:86,89`

**Issue:** The formatted delta string is computed independently for the `aria-label` and the visible text:
```tsx
aria-label={`Anomaly delta versus 30-year average: ${formatDelta(anomaly.delta)} degrees Celsius`}
...
{formatDelta(anomaly.delta)}°C
```
Harmless today since `formatDelta` is pure and cheap, but a future edit to one call site without the other (e.g. adding a unit suffix) can silently make the visible text and the accessible name disagree.

**Fix:** Compute once and reuse:
```tsx
const formattedDelta = formatDelta(anomaly.delta)
// ...
aria-label={`Anomaly delta versus 30-year average: ${formattedDelta} degrees Celsius`}
// ...
{formattedDelta}°C
```

### IN-03: `aria-controls` references an element id that doesn't exist in the DOM until the popover opens

**File:** `src/app/InfoTooltip.tsx:124` (vs. the conditionally-rendered `id={popoverId}` at line 134)

**Issue:** The trigger button always carries `aria-controls={popoverId}`, but the element with that `id` only renders when `open` is true:
```tsx
<button ... aria-controls={popoverId} ...>i</button>
{open && (
  <div className="absolute z-10 mt-xs">
    <PanelShell id={popoverId} ...>{children}</PanelShell>
  </div>
)}
```
Before the first open, `aria-controls` points at a non-existent id, which strictly violates the ARIA spec's expectation that `aria-controls` reference a real, present element. This is a very common pattern for disclosure widgets and most assistive tech tolerates it, but it's worth noting as a minor spec deviation.

**Fix:** Low priority; if strict conformance is desired, only render `aria-controls` when `open` is true, or always render the popover container (hidden) so the id always resolves.

---

_Reviewed: 2026-07-22T10:24:35Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
