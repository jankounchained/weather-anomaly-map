---
phase: 06-panel-restructure-hierarchy
plan: 01
subsystem: ui
tags: [react, typescript, tailwind, accessibility, wcag]

requires:
  - phase: 05-glass-atmospheric-redesign
    provides: tokenized glass surface classes (bg-glass-surface, border-glass-border, rounded-glass-lg, shadow-glass, backdrop-blur-lg) and the eyebrow-headline style this plan extracts into shared primitives
provides:
  - "isAnomalyReady(currentStatus, baselineStatus) — the single D-09/PD-10 combined-gate predicate"
  - "PanelShell — shared tokenized glass-card wrapper (div/section/aside via `as`)"
  - "PanelHeadline — shared TrendRow-verbatim eyebrow <p>"
  - "InfoTooltip — accessible WCAG 1.4.13 disclosure (button + role=dialog popover)"
affects: [06-02-current-conditions-delta-panels, 06-03-location-trend-migration, 07-methodology-section, 08-split-violin-trend]

tech-stack:
  added: []
  patterns:
    - "Shared UI primitives (PanelShell/PanelHeadline) extracted from duplicated inline class strings, normalized on the tokenized bg-glass-surface form (not AnomalyCard's non-tokenized bg-[rgba(...)] variant)"
    - "PanelShell forwards id/role/aria-label to its root element so a consumer (InfoTooltip's popover) can carry ARIA semantics on the same element as the glass classes, without a wrapper div or restyling"
    - "InfoTooltip disclosure state machine: useState + useRef + useId, hover-pinned vs click-opened tracked via a ref, a suppressFocusOpenRef guard prevents the Escape-then-return-focus call from re-triggering the focus-open handler"

key-files:
  created:
    - src/anomaly/anomaly.ts (isAnomalyReady export added)
    - src/anomaly/anomaly.test.ts (isAnomalyReady describe block added)
    - src/app/PanelShell.tsx
    - src/app/PanelShell.test.tsx
    - src/app/PanelHeadline.tsx
    - src/app/PanelHeadline.test.tsx
    - src/app/InfoTooltip.tsx
    - src/app/InfoTooltip.test.tsx
  modified: []

key-decisions:
  - "PanelShell extended (beyond the plan's Task 2 spec) to forward id/role/aria-label to its root element — required so InfoTooltip's popover can be role=dialog + aria-label + id on the SAME element that carries the glass classes and max-w-[240px], rather than duplicating the shell in a wrapper div (Rule 2 deviation, documented below)."
  - "InfoTooltip.test.tsx adds a local afterEach(cleanup) since this project has no global vitest setupFiles/RTL-cleanup config — without it, DOM accumulates across the file's 5 renders and getByRole('button')/getByRole('dialog') become ambiguous. Scoped to this test file only, no project-wide config change made."

patterns-established:
  - "PanelShell/PanelHeadline are the canonical glass-card + eyebrow primitives — Phases 7/8 and this phase's remaining plans (06-02, 06-03) must import these, not re-derive the class strings."
  - "isAnomalyReady is the ONE canonical form of the combined D-09 loading gate — CurrentConditionsPanel, DeltaPanel, and App.tsx (06-02/06-03) must call it, never re-derive the === 'resolved' comparison inline."

requirements-completed: [LAYOUT-01, LAYOUT-02, EXPLAIN-02]

coverage:
  - id: D1
    description: "isAnomalyReady(currentStatus, baselineStatus) exported from src/anomaly/anomaly.ts, returning true only when both statuses are 'resolved' (PD-10 combined gate)"
    requirement: LAYOUT-01
    verification:
      - kind: unit
        ref: "src/anomaly/anomaly.test.ts#isAnomalyReady"
        status: pass
    human_judgment: false
  - id: D2
    description: "PanelShell renders children in a tokenized glass-card element (div/section/aside via `as`), with an optional className append"
    requirement: LAYOUT-02
    verification:
      - kind: unit
        ref: "src/app/PanelShell.test.tsx#PanelShell"
        status: pass
    human_judgment: false
  - id: D3
    description: "PanelHeadline renders the TrendRow-verbatim eyebrow <p> with the passed headline text"
    requirement: LAYOUT-02
    verification:
      - kind: unit
        ref: "src/app/PanelHeadline.test.tsx#PanelHeadline"
        status: pass
    human_judgment: false
  - id: D4
    description: "InfoTooltip: accessible button+dialog disclosure meeting the WCAG 1.4.13 hoverable/dismissible/persistent contract — real button with aria-expanded/aria-controls, role=dialog popover with aria-label and max-w-[240px], Escape closes and returns focus, static body prose rendered as text with no raw-HTML sink"
    requirement: EXPLAIN-02
    verification:
      - kind: unit
        ref: "src/app/InfoTooltip.test.tsx#InfoTooltip"
        status: pass
      - kind: other
        ref: "grep -c 'dangerouslySetInnerHTML' src/app/InfoTooltip.tsx (returns 0)"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-07-22
status: complete
---

# Phase 6 Plan 1: Shared Panel Primitives Summary

**Extracted `isAnomalyReady` combined-gate predicate plus `PanelShell`/`PanelHeadline`/`InfoTooltip` UI primitives — no existing panel touched, foundation-only for Wave 2/3 of Phase 6 and reused verbatim by Phases 7-8.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-22T11:51:13+02:00
- **Completed:** 2026-07-22T11:56:56+02:00
- **Tasks:** 3 completed
- **Files modified:** 8 (all new except PanelShell.tsx, which was extended one commit after its own creation)

## Accomplishments
- `isAnomalyReady(currentStatus, baselineStatus)` is now the single canonical form of the D-09/PD-10 combined loading gate, exported from `src/anomaly/anomaly.ts` alongside the other pure anomaly helpers.
- `PanelShell` normalizes the three slightly-divergent glass-card class strings (LocationDisplay/TrendRow's tokenized form vs. AnomalyCard's non-tokenized `bg-[rgba(...)]` drift) onto one tokenized primitive, with an `as` prop for `div`/`section`/`aside`.
- `PanelHeadline` extracts TrendRow's exact eyebrow style verbatim, ready for reuse by all four panels (Location, Current Conditions, Delta, History).
- `InfoTooltip` is a from-scratch, fully accessible disclosure (no codebase analog existed) meeting the WCAG 1.4.13 hoverable/dismissible/persistent contract: real `<button>` with `aria-expanded`/`aria-controls`, `role="dialog"` popover with `aria-label`, opens on click and hover/focus, closes on Escape (returning focus)/outside-click/blur, body prose is plain JSX text only.

## Task Commits

Each task was committed atomically (TDD RED → GREEN per task):

1. **Task 1: Extract isAnomalyReady combined-gate predicate** - `81d2b9b` (test, RED) → `d4c5c7a` (feat, GREEN)
2. **Task 2: Build PanelShell and PanelHeadline primitives** - `49fd4e0` (test, RED) → `30b3660` (feat, GREEN)
3. **Task 3: Build the accessible InfoTooltip disclosure** - `cd10b75` (test, RED + PanelShell extension) → `f100a50` (feat, GREEN)

_TDD tasks each had a test (RED) commit followed by an implementation (GREEN) commit; no REFACTOR commits were needed._

## Files Created/Modified
- `src/anomaly/anomaly.ts` - Added `isAnomalyReady` export (import type `WeatherStatus`)
- `src/anomaly/anomaly.test.ts` - Added `describe('isAnomalyReady')` with the 5 PD-10 behavior cases
- `src/app/PanelShell.tsx` - New: tokenized glass-card wrapper (`as` prop, `className` append, `id`/`role`/`aria-label` forwarding)
- `src/app/PanelShell.test.tsx` - New: default-div/as-override/glass-classes/className-append tests
- `src/app/PanelHeadline.tsx` - New: TrendRow-verbatim eyebrow `<p>` primitive
- `src/app/PanelHeadline.test.tsx` - New: renders headline text with eyebrow classes
- `src/app/InfoTooltip.tsx` - New: accessible disclosure (button + role=dialog popover via PanelShell)
- `src/app/InfoTooltip.test.tsx` - New: 5 WCAG 1.4.13 behavior tests, with a local `afterEach(cleanup)`

## Decisions Made
- **PanelShell prop extension (id/role/aria-label):** the plan's Task 2 spec for PanelShell only listed `children`/`as`/`className`. Task 3's InfoTooltip needs its popover to be `role="dialog"` with `aria-label` and an `id` matching `aria-controls` — and per the plan's own acceptance criteria, that dialog element's `className` must ALSO include `max-w-[240px]` (the PanelShell glass classes). That requires all of these on one element, so PanelShell was extended to forward `id`/`role`/`aria-label` to its root rather than wrapping it in an extra non-styled div. No existing PanelShell behavior changed; its own 4 tests still pass unmodified.
- **InfoTooltip focus-loop fix:** the initial implementation had `handleFocus` unconditionally reopen the popover, which meant `closePopover(true)`'s own `triggerRef.current.focus()` call (returning focus after Escape) immediately reopened it via the synchronous focus event. Fixed with a `suppressFocusOpenRef` flag that swallows exactly that one programmatic focus event, verified by the Escape test (`aria-expanded` ends `false`, focus returns to trigger, dialog unmounts).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Extended PanelShell to forward id/role/aria-label**
- **Found during:** Task 3 (InfoTooltip popover)
- **Issue:** Task 2's PanelShell spec had no way for a consumer to attach `role`/`aria-label`/`id` to the shell's root element. Without this, InfoTooltip's popover would need either a second unstyled wrapper div (violating "reuses the shared shell, does not restyle") or PanelShell would need to skip the ARIA attributes the WCAG 1.4.13 contract requires.
- **Fix:** Added optional `id`/`role`/`aria-label` props to `PanelShellProps`, forwarded directly onto the rendered element alongside the existing `className` handling. No change to base classes, defaults, or existing consumers.
- **Files modified:** `src/app/PanelShell.tsx`
- **Verification:** `PanelShell.test.tsx`'s existing 4 tests still pass unmodified (new props are optional/additive); `InfoTooltip.test.tsx`'s dialog tests confirm `id`, `role="dialog"`, `aria-label`, and `max-w-[240px]` all land on the one dialog element.
- **Committed in:** `cd10b75` (Task 3 RED commit, since the test file needs it to compile/run correctly against the intended shape)

**2. [Rule 1 - Bug] Fixed focus-return loop in InfoTooltip's Escape handler**
- **Found during:** Task 3 (InfoTooltip — writing the GREEN implementation, caught by the Escape test)
- **Issue:** `closePopover(true)` (used by the Escape handler) calls `triggerRef.current?.focus()` to return focus to the trigger per the WCAG 1.4.13 contract. The button's `onFocus` handler unconditionally called `openPopover(true)`, so the programmatic focus call immediately reopened the popover — the Escape test failed with `aria-expanded` staying `"true"`.
- **Fix:** Added a `suppressFocusOpenRef` ref, set to `true` right before the programmatic `.focus()` call and consumed (reset to `false`, skip opening) by the very next `handleFocus` invocation — so real user-initiated focus (tab, click) still opens the popover normally.
- **Files modified:** `src/app/InfoTooltip.tsx`
- **Verification:** `InfoTooltip.test.tsx`'s "closes on Escape and returns focus to the trigger" test passes (`aria-expanded` → `false`, dialog unmounts, `document.activeElement === trigger`).
- **Committed in:** `f100a50` (Task 3 GREEN commit)

**3. [Rule 3 - Blocking] Added local RTL cleanup to InfoTooltip.test.tsx**
- **Found during:** Task 3 (InfoTooltip test run — 4 of 5 tests initially failed with "multiple elements found" errors)
- **Issue:** This project has no global vitest `setupFiles` configured for `@testing-library/react`'s automatic per-test DOM cleanup (confirmed: no `setupFiles` entry in `vite.config.ts`, no other test file needed it because none render overlapping `role="button"`/`role="dialog"` elements across multiple `it` blocks). With 5 `it` blocks each rendering an `InfoTooltip`, unremoved prior renders left multiple buttons/dialogs in `document.body`, so `getByRole('button')` became ambiguous starting with the 2nd test.
- **Fix:** Added `afterEach(cleanup)` (imported from `@testing-library/react`) locally to `InfoTooltip.test.tsx` only — did not modify `vite.config.ts` or add a project-wide `setupFiles`, since that's a larger config decision outside this task's scope (flagged, not applied, per the scope-boundary rule).
- **Files modified:** `src/app/InfoTooltip.test.tsx`
- **Verification:** All 5 `InfoTooltip.test.tsx` tests pass; full suite (`npx vitest run`) still green at 114/114 with no regressions to other files.
- **Committed in:** `f100a50` (Task 3 GREEN commit; the cleanup import was added in the same edit pass as the focus-loop fix, both needed before the suite went green)

---

**Total deviations:** 3 auto-fixed (1 missing-critical prop extension, 1 bug fix, 1 blocking test-infra fix)
**Impact on plan:** All three were necessary for Task 3 (InfoTooltip) to satisfy its own written acceptance criteria and the plan's stated verification gates. No scope creep — PanelShell's extension is additive-only and its own tests are unchanged; the RTL cleanup fix is scoped to one test file, not a project-wide config change.

## Issues Encountered
- The plan's verification step `grep -c 'dangerouslySetInnerHTML' src/app/InfoTooltip.tsx` returns 0 is a literal-string gate — my first draft of InfoTooltip.tsx's file-header comment explicitly named `dangerouslySetInnerHTML` as the pattern being avoided, which the grep counted as a match (`grep -c` counts matching lines, not "used as a sink"). Reworded the comment to describe the same invariant without the literal token ("never a raw-HTML-injecting sink"); grep now returns 0 as required. No functional change — this was purely a doc-comment wording adjustment, not a deviation from the plan's actual code requirements.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `isAnomalyReady`, `PanelShell`, `PanelHeadline`, and `InfoTooltip` are ready for 06-02 (CurrentConditionsPanel + DeltaPanel split) and 06-03 (LocationDisplay/TrendRow migration + App.tsx rewire + AnomalyCard retirement) to import directly.
- No existing panel (`LocationDisplay.tsx`, `TrendRow.tsx`, `AnomalyCard.tsx`, `App.tsx`) was touched in this plan — confirmed via `git diff --stat` against the pre-plan commit, matching the plan's "foundation-only, no downstream file modified yet" success criterion.
- Full suite green (114/114 tests across 11 files) and `npm run build` succeeds after this plan's changes.
- No blockers for 06-02/06-03.

---
*Phase: 06-panel-restructure-hierarchy*
*Completed: 2026-07-22*

## Self-Check: PASSED

All 9 created/modified files verified present on disk; all 7 commit hashes (81d2b9b, d4c5c7a, 49fd4e0, 30b3660, cd10b75, f100a50, 45924e5) verified present in `git log --oneline --all`.
