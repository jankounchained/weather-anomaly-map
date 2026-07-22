---
phase: 06-panel-restructure-hierarchy
plan: 04
subsystem: ui
tags: [react, react-portal, vitest, accessibility, wcag]

# Dependency graph
requires:
  - phase: 06-panel-restructure-hierarchy (06-01/06-03)
    provides: InfoTooltip component, PanelShell id/role/aria-label forwarding, 06-UAT.md gap G-06-11
provides:
  - Pure viewport-edge-aware popover positioning helper (computePopoverPosition)
  - InfoTooltip popover portaled to document.body with fixed, edge-aware coordinates
  - Preserved WCAG 1.4.13 hover/focus/persist/dismiss contract across the portal boundary
affects: [07-methodology-explainers, 08-split-violin-trend]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure positioning math kept framework-free (no DOM/window access) in its own module, unit-tested with Vitest - mirrors the existing anomaly/trend hand-rolled helper convention"
    - "React portal + fixed positioning to escape an ancestor backdrop-filter stacking context and a root overflow-hidden clip, with a dedicated ref added to every 'is this related target inside the widget' containment check"

key-files:
  created:
    - src/app/popoverPosition.ts
    - src/app/popoverPosition.test.ts
  modified:
    - src/app/InfoTooltip.tsx
    - src/app/InfoTooltip.test.tsx

key-decisions:
  - "Popover positioning kept as a pure, DOM-free function (computePopoverPosition) taking trigger rect + popover/viewport dimensions as plain inputs, so it stays trivially unit-testable and reusable"
  - "Containment check (isInsideTriggerOrPopover) uses an `instanceof Node` guard rather than a truthiness check on relatedTarget, since RTL/jsdom's fireEvent relatedTarget values are not reliably safe to pass directly into Node.contains()"

patterns-established:
  - "Portal-plus-fixed-position pattern for any future widget that needs to escape a backdrop-filter/overflow-hidden ancestor (e.g. future methodology-section popovers in Phase 7)"

requirements-completed: [EXPLAIN-02]

coverage:
  - id: D1
    description: "computePopoverPosition pure helper: default below/left-aligned placement, right-edge shift, bottom-edge flip, left/top clamps"
    requirement: "EXPLAIN-02"
    verification:
      - kind: unit
        ref: "src/app/popoverPosition.test.ts#computePopoverPosition (4 cases: normal, right-edge shift, bottom flip, left clamp)"
        status: pass
    human_judgment: false
  - id: D2
    description: "InfoTooltip popover portaled to document.body with position:fixed, computed edge-aware coordinates, and the WCAG 1.4.13 hover/focus/persist/dismiss contract preserved across the portal boundary"
    requirement: "EXPLAIN-02"
    verification:
      - kind: unit
        ref: "src/app/InfoTooltip.test.tsx#G-06-11: portals the open popover onto document.body, escaping the trigger subtree"
        status: pass
      - kind: unit
        ref: "src/app/InfoTooltip.test.tsx#G-06-11: renders the portaled popover with inline position:fixed and defined top/left"
        status: pass
      - kind: unit
        ref: "src/app/InfoTooltip.test.tsx#G-06-11: a mousedown on the popover body itself does not close it"
        status: pass
      - kind: unit
        ref: "src/app/InfoTooltip.test.tsx#G-06-11: a mousedown outside both the trigger and the portaled popover still closes it"
        status: pass
      - kind: unit
        ref: "src/app/InfoTooltip.test.tsx#G-06-11: hover persists across the portal boundary"
        status: pass
      - kind: unit
        ref: "src/app/CurrentConditionsPanel.test.tsx (all, unchanged)"
        status: pass
      - kind: unit
        ref: "src/app/DeltaPanel.test.tsx (all, unchanged)"
        status: pass
    human_judgment: true
    rationale: "Visual re-check of the actual UAT gap (popover painting above panels, staying within the viewport frame on both mouse and keyboard) requires a human looking at the live app per the plan's <verification> section - covered by the downstream /gsd-verify-work re-UAT of test 11 / G-06-11, not by this plan's automated suite alone."

duration: 6min
completed: 2026-07-22
status: complete
---

# Phase 6 Plan 4: InfoTooltip Portal Gap-Closure Summary

**Portaled InfoTooltip's popover onto document.body with position:fixed and edge-aware coordinates, fixing the Current Conditions/Delta popover stacking and clipping bug (G-06-11) while preserving the WCAG 1.4.13 hover/focus/persist/dismiss contract.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-22T12:20:40Z
- **Completed:** 2026-07-22T12:26:09Z
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- Added `computePopoverPosition`, a pure, framework-free positioning helper (no DOM/window access) that computes `{ top, left }` in CSS pixels from a trigger rect, popover dimensions, viewport dimensions, and gap/margin — covering default below/left-aligned placement, a right-edge shift (the Delta panel fix), a bottom-edge flip, and top/left clamps. Unit-tested with the four cases specified in the plan (RED confirmed all 4 failing against a stub, then GREEN).
- Refactored `InfoTooltip` to render its open popover via `createPortal(..., document.body)` instead of an in-flow `absolute z-10` child of `PanelShell`. Because `document.body` has no transformed/filtered ancestor, `position: fixed` now resolves against the viewport (escaping App's root `overflow-hidden` clip) and the popover sits outside every `PanelShell` `backdrop-blur-lg` stacking context (escaping the paint-order trap that put the Current Conditions popover behind the Delta panel).
- Position is computed in a `useLayoutEffect` from the trigger's live `getBoundingClientRect()` and the popover's own measured size, recomputed on `resize` and capture-phase `scroll` while open, and reset to `null` on close. While `coords` is `null` the portal renders at `opacity: 0` (not `display:none`/`visibility:hidden`) so the dialog stays in the accessibility tree and no first-paint flash occurs.
- Added a `popoverRef` and a shared `isInsideTriggerOrPopover` containment predicate, wired into all three WCAG 1.4.13 checks (outside-click mousedown, blur, and a new shared mouseleave handler attached to both the trigger container and the portaled popover wrapper), so hover/focus/persist/dismiss behavior is unchanged even though the popover no longer lives inside the trigger's DOM subtree.
- Extended `InfoTooltip.test.tsx` with 5 new tests covering portal placement, fixed positioning, click-inside persistence, outside-click close, and hover-across-the-portal-boundary — all passing alongside every pre-existing InfoTooltip/CurrentConditionsPanel/DeltaPanel test.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add pure viewport-edge-aware popover position helper (RED then GREEN)** — `9ff7629` (feat)
2. **Task 2: Portal the InfoTooltip popover to document.body with fixed edge-aware positioning, preserving the WCAG contract** — `91b9849` (fix)

**Plan metadata:** (this commit, see below)

_Note: Both tasks followed the RED-then-GREEN TDD sequence (tests written first and confirmed failing, then implementation added until green) but were committed as a single commit per task rather than split into separate `test(...)`/`feat(...)` commits — see Deviations below._

## Files Created/Modified

- `src/app/popoverPosition.ts` - Pure `computePopoverPosition` helper and its input/output types
- `src/app/popoverPosition.test.ts` - 4 unit tests for the positioning helper (default, right-edge shift, bottom flip, left clamp)
- `src/app/InfoTooltip.tsx` - Portal refactor: `createPortal` to `document.body`, `useLayoutEffect`-driven fixed coordinates, `popoverRef` + shared containment check across outside-click/blur/hover
- `src/app/InfoTooltip.test.tsx` - 5 new tests for portal placement, fixed positioning, click-inside persistence, outside-click close, and cross-boundary hover persistence

## Decisions Made

- Kept `computePopoverPosition` completely DOM/window-free (caller passes viewport dimensions in) so it's trivially unit-testable and reusable, matching the codebase's existing hand-rolled pure-math-helper convention (anomaly/trend).
- Used `node instanceof Node` as the containment guard instead of a plain truthiness check on `event.relatedTarget` — RTL/jsdom's synthetic `relatedTarget` values are not always safe to pass directly into `Element.contains()`, and a bare `!!node` guard was insufficient (empirically threw `TypeError: parameter 1 is not of type 'Node'` in the cross-boundary hover test before the `instanceof` guard was added).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `Node.contains()` threw on a non-Node `relatedTarget` in the cross-boundary hover test**
- **Found during:** Task 2 (portal refactor) — writing the "hover persists across the portal boundary" test
- **Issue:** The initial containment check (`!!node && (containerRef.current?.contains(node) || ...)`) still triggered `TypeError: Failed to execute 'contains' on 'Node': parameter 1 is not of type 'Node'` under jsdom/RTL when `event.relatedTarget` came through a synthetic `mouseLeave` fired directly on a portaled node with a `relatedTarget: null`/non-Node init value.
- **Fix:** Changed the guard to `if (!(node instanceof Node)) return false` before calling `.contains()`, which is strictly safer than a truthiness check and resolved the failure.
- **Files modified:** `src/app/InfoTooltip.tsx`
- **Verification:** `npx vitest run src/app/InfoTooltip.test.tsx` — all 12 tests pass, including the cross-boundary hover test.
- **Committed in:** `91b9849` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Necessary correctness fix discovered while writing the plan's own specified test; no scope creep — same behavior contract (hover-across-boundary persistence), just a more robust type guard.

### Process note (non-blocking)

Both `tdd="true"` tasks followed the RED→GREEN sequence exactly as specified (tests written first, confirmed failing via `npx vitest run`, then implementation added until green), but each task's test file changes and implementation changes were committed together as a single per-task commit (`9ff7629`, `91b9849`) rather than split into separate `test(...)` and `feat(...)` commits. This plan's frontmatter `type` is `execute` (not `tdd`), so the plan-level TDD gate enforcement (which requires separate RED/GREEN commits) does not apply here; the task-level `tdd="true"` attribute's RED→GREEN methodology was still followed in full.

## Issues Encountered

None beyond the auto-fixed `instanceof Node` guard documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- G-06-11 is closed: both InfoTooltip popovers (Current Conditions and Delta) now render via a `document.body` portal with fixed, edge-aware positioning — they paint above the panels and stay within the viewport frame.
- Full Vitest suite (141 tests across 16 files) and `npm run build` (tsc -b + vite build) both pass.
- Human visual re-check of the actual fix (popover paints above panels, Delta popover stays in-frame, keyboard Tab/Enter/Escape path) is deferred to the downstream `/gsd-verify-work` re-UAT of test 11 / G-06-11, per this plan's `<verification>` section — not yet performed as part of this execution.
- The portal-plus-fixed-position pattern established here is reusable for any future widget (e.g. Phase 7's methodology-section explainers) that needs to escape a `backdrop-filter`/`overflow-hidden` ancestor.

---
*Phase: 06-panel-restructure-hierarchy*
*Completed: 2026-07-22*
