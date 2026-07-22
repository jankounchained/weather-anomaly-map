---
phase: 06-panel-restructure-hierarchy
fixed_at: 2026-07-22T11:02:39Z
review_path: .planning/phases/06-panel-restructure-hierarchy/06-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 06: Code Review Fix Report

**Fixed at:** 2026-07-22T11:02:39Z
**Source review:** .planning/phases/06-panel-restructure-hierarchy/06-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (fix_scope: critical_warning — 0 Critical, 3 Warning; Info findings out of scope)
- Fixed: 3
- Skipped: 0

## Fixed Issues

### WR-01: InfoTooltip's "click to open persistently" path is unreachable for real mouse users

**Files modified:** `src/app/InfoTooltip.tsx`
**Commit:** 17f8999
**Applied fix:** Rewrote `handleTriggerClick` so a click while already open only closes the popover when it is NOT hover/focus-pinned (`open && !hoverPinnedRef.current`); otherwise the click "upgrades" the popover to persistent by clearing `hoverPinnedRef` and setting `open` true. Also guarded `handleMouseEnter` with `if (!open) openPopover(true)` so a `mouseenter` on an already-open popover no longer silently re-marks it hover-pinned (which previously let a later `mouseleave` incorrectly close a popover the user had explicitly clicked open). Verified against real pointer-event ordering (`mouseenter` before `click`): first click now correctly upgrades to persistent, a second click closes it, matching the fix suggested in REVIEW.md. Confirmed via `tsc --noEmit` (no new errors) and the existing `InfoTooltip.test.tsx` suite (5/5 passing).

### WR-02: InfoTooltip popover opened via keyboard focus never closes on blur

**Files modified:** `src/app/InfoTooltip.tsx`
**Commit:** ebd9123
**Applied fix:** Changed `handleFocus` to call `openPopover(false)` instead of `openPopover(true)`, so a keyboard-focus-triggered open is treated like a click-open (not hover-pinned) rather than sharing `hoverPinnedRef` with the hover path. `handleBlur`'s existing `if (hoverPinnedRef.current) return` guard no longer short-circuits after a Tab-focus open, so blur correctly closes the popover when focus leaves the trigger+popover container. Applied exactly as suggested in REVIEW.md. Confirmed via `tsc --noEmit` (no new errors) and `InfoTooltip.test.tsx` (5/5 passing, re-verified after both InfoTooltip fixes were combined).

### WR-03: z-score chip can render "z -0.0" for small negative z-scores

**Files modified:** `src/app/DeltaPanel.tsx`
**Commit:** dad3dc8
**Applied fix:** Appended `.replace('-0.0', '0.0')` to the `toFixed(1)` call in the z-score chip's template string, matching `formatDelta`'s existing sign-guard convention for the delta number. Applied exactly as suggested in REVIEW.md. Confirmed via `tsc --noEmit` (no new errors) and `DeltaPanel.test.tsx` (6/6 passing).

## Skipped Issues

None — all in-scope findings were fixed.

---

_Fixed: 2026-07-22T11:02:39Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
