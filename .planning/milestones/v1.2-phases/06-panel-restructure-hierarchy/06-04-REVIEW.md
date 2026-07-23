---
phase: 06-panel-restructure-hierarchy
reviewed: 2026-07-22T15:05:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/app/popoverPosition.ts
  - src/app/InfoTooltip.tsx
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 06: Code Review Report (Gap-Closure 06-04, G-06-11)

**Reviewed:** 2026-07-22T15:05:00Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed the two files changed by gap-closure plan 06-04: the new pure
`computePopoverPosition` helper (`popoverPosition.ts`) and the `InfoTooltip`
refactor that portals the popover onto `document.body` with
`position: fixed`.

The portal migration itself is sound. All three WCAG 1.4.13 containment
checks (outside-click via native `mousedown` listener, `blur`, and hover via
`mouseleave`) were consistently updated to the shared
`isInsideTriggerOrPopover(node)` helper that checks both `containerRef` and
the new `popoverRef` — I found no spot where the old container-only
`.contains()` check was left behind. Listener lifecycle for both the
outside-click effect and the new `useLayoutEffect` position-recompute effect
is correctly scoped to `[open]` and cleaned up symmetrically on close and
unmount; since all the interaction predicates read from refs (not from
values closed over at effect-creation time), there is no stale-closure risk.
The measure→position pass correctly relies on `useLayoutEffect` firing after
the portaled DOM node commits (a single React commit covers both the
trigger's container and the portal target), so `popoverRef.current` is never
null on the first positioning pass in practice, and `coords` is reset to
`null` on close so a reopen never flashes a stale position. `triggerRef.current?.getBoundingClientRect()` is null-guarded, and `getBoundingClientRect()`'s
own "never returns falsy" semantics are handled correctly by that guard
existing only to catch a detached `triggerRef.current`.

The one substantive defect is in the pure positioning math itself: the
vertical flip/clamp logic in `computePopoverPosition` is asymmetric with the
horizontal logic and can let the popover render off the bottom of the
viewport (or overlapping the trigger) when the popover is tall relative to
the viewport — a real, plausible scenario on short viewports (e.g. mobile
landscape) that is not covered by `popoverPosition.test.ts`. Two minor code
quality items round out the findings.

## Warnings

### WR-01: `computePopoverPosition` has no lower-bound-safe clamp for the flipped-above case — popover can render off the bottom edge (or overlap the trigger) on short viewports

**File:** `src/app/popoverPosition.ts:34-41`
**Issue:**
```ts
let top = triggerRect.bottom + gap
if (top + popoverHeight > viewportHeight - margin) {
  top = triggerRect.top - gap - popoverHeight
}
if (top < margin) top = margin
```
The horizontal branch (lines 43-51) has a matching pair of adjustments that
together keep `left` bounded on *both* sides for the common case: shift left
when it would overflow the right edge, then clamp to `margin` on the left.
The vertical branch only handles one direction after the flip: it clamps
`top` up to `margin` if the flip pushed it negative, but never clamps it back
down if `popoverHeight` is large enough that even the flipped-above position
(or the post-clamp `margin` position) still overflows
`viewportHeight - margin` at the bottom. Concretely, for
`viewportHeight = 100, margin = 8, popoverHeight = 200,
triggerRect = { top: 40, bottom: 50 }, gap = 8`:
- default `top = 58`; `58 + 200 = 258 > 92` → flips: `top = 40 - 8 - 200 = -168`
- clamp: `top = 8` (the `margin`)
- result: popover spans `top: 8` to `bottom: 208`, overflowing a 100px-tall
  viewport by 108px and very likely overlapping the trigger button itself.

This is a real, reachable case (short viewport height, e.g. mobile landscape,
combined with a popover with a few lines of wrapped text) not exercised by
any of the four cases in `popoverPosition.test.ts` (none test
`popoverHeight` close to or exceeding `viewportHeight`).

**Fix:** After the existing top-margin clamp, add a symmetric bottom clamp
(mirroring the horizontal branch's pattern), and prefer the position that
actually fits when neither placement is roomy enough:
```ts
if (top < margin) top = margin
if (top + popoverHeight > viewportHeight - margin) {
  top = Math.max(margin, viewportHeight - margin - popoverHeight)
}
```
This guarantees `top` is bounded to `[margin, viewportHeight - margin - popoverHeight]`
whenever that range is non-empty, exactly mirroring how the horizontal branch
is implicitly bounded by its own shift + clamp pair.

## Info

### IN-01: Magic number `zIndex: 9999` not extracted as a named constant

**File:** `src/app/InfoTooltip.tsx:243`
**Issue:** `POPOVER_GAP` and `POPOVER_MARGIN` are both extracted as named
module-level constants (lines 15-16), but the `zIndex: 9999` used on the
portaled wrapper is an inline literal. The value is well-commented in
context, but for consistency with the rest of the file's constant-extraction
pattern (and to give future readers one place to check/adjust the
above-everything-else guarantee the comment on lines 227-232 describes), it
should be a constant.
**Fix:**
```ts
const POPOVER_Z_INDEX = 9999
// ...
style={{ position: 'fixed', top: coords?.top ?? 0, left: coords?.left ?? 0, opacity: coords ? 1 : 0, zIndex: POPOVER_Z_INDEX }}
```

### IN-02: `relative` class on `containerRef` is now vestigial

**File:** `src/app/InfoTooltip.tsx:208`
**Issue:** `className="relative inline-block"` on the trigger container was
needed pre-06-04 so the popover's `absolute` positioning resolved relative
to this element. Now that the popover is portaled to `document.body` and
positioned via computed `fixed` coordinates, nothing inside this container
is absolutely positioned relative to it, making `relative` dead styling left
over from the pre-portal implementation. Harmless (no visual effect), but
worth removing during a future pass to avoid future readers wondering what
it anchors.
**Fix:** `className="inline-block"` (drop `relative`), pending a visual
smoke-check that no other rule relies on this element establishing a
positioning context.

---

_Reviewed: 2026-07-22T15:05:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
