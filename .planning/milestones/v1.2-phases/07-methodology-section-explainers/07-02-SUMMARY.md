---
phase: 07-methodology-section-explainers
plan: 02
subsystem: ui
tags: [react, typescript, vitest, tailwind, disclosure]

# Dependency graph
requires:
  - phase: 06-panel-restructure-hierarchy
    provides: PanelShell/PanelHeadline primitives, LocationPanel children slot
  - phase: 07-methodology-section-explainers plan 01
    provides: AnomalyForToday.percentile (referenced in this panel's copy, no code dependency)
provides:
  - MethodologyPanel component - always-visible native details/summary disclosure
  - Locked methodology copy mounted as the final LocationPanel child
affects: [08-split-violin-trend]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Native <details>/<summary> disclosure with zero React state, replacing a useState-driven toggle for a flat single-level collapsible section"
    - "Tailwind v4 group-open: chevron rotation, requiring className=\"group\" on the <details> ancestor"

key-files:
  created:
    - src/app/MethodologyPanel.tsx
    - src/app/MethodologyPanel.test.tsx
  modified:
    - src/app/App.tsx

key-decisions:
  - "MethodologyPanel copies PanelHeadline's exact class string directly onto <summary> rather than nesting the <PanelHeadline> component, since <summary> needs additional flex/interaction classes PanelHeadline's <p> doesn't carry (RESEARCH Pitfall 2)"
  - "No expand/collapse height animation - only the chevron's motion-safe:transition-transform rotation is gated behind prefers-reduced-motion, per the locked UI-SPEC simplicity choice"

patterns-established:
  - "Always-visible, prop-less panel convention: MethodologyPanel is the first panel in this codebase mounted with zero props and no hasSelection/status gate"

requirements-completed: [EXPLAIN-03]

coverage:
  - id: D1
    description: "MethodologyPanel renders a collapsed-by-default native <details>/<summary> (no open attribute) with the 'How This Works' summary headline"
    requirement: "EXPLAIN-03"
    verification:
      - kind: unit
        ref: "src/app/MethodologyPanel.test.tsx#renders collapsed by default with the summary headline visible"
        status: pass
    human_judgment: false
  - id: D2
    description: "Clicking/activating the summary reveals both subsection headers ('What This Shows', 'How It's Computed') via jsdom's native <details> toggle"
    requirement: "EXPLAIN-03"
    verification:
      - kind: unit
        ref: "src/app/MethodologyPanel.test.tsx#reveals the body copy when the summary is clicked"
        status: pass
    human_judgment: false
  - id: D3
    description: "MethodologyPanel takes no props and renders unconditionally (PD-11 always-visible)"
    requirement: "EXPLAIN-03"
    verification:
      - kind: unit
        ref: "src/app/MethodologyPanel.test.tsx#renders unconditionally with no props"
        status: pass
    human_judgment: false
  - id: D4
    description: "<details className=\"group\"> is present so the group-open:rotate-90 chevron rotation activates, gated motion-safe:transition-transform for reduced-motion parity"
    requirement: "EXPLAIN-03"
    verification:
      - kind: unit
        ref: "grep -c 'details className=\"group\"' src/app/MethodologyPanel.tsx (returns 1), grep -c 'group-open:rotate-90' (returns 1), grep -c 'motion-safe:transition-transform' (returns 1)"
        status: pass
      - kind: manual
        ref: "OS/browser reduced-motion toggle - chevron snaps instantly under reduce-motion, rotates smoothly otherwise; deferred to end-of-phase human verification per workflow.human_verify_mode=end-of-phase"
        status: pending
    human_judgment: true
  - id: D5
    description: "App.tsx mounts <MethodologyPanel /> as the final, unconditional LocationPanel child after TrendRow"
    requirement: "EXPLAIN-03"
    verification:
      - kind: unit
        ref: "src/app/App.tsx source order check (TrendRow, then MethodologyPanel, then </LocationPanel>) + full vitest suite (153 tests) + tsc --noEmit"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-22
status: complete
---

# Phase 07 Plan 02: Methodology Disclosure Panel Summary

**New stateless MethodologyPanel — a native `<details>`/`<summary>` disclosure inside PanelShell, collapsed by default, mounted unconditionally as the final LocationPanel child so any visitor can read what the tool does and how the anomaly is computed.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-22T18:04:00Z (approx.)
- **Completed:** 2026-07-22T18:08:14Z
- **Tasks:** 2 completed
- **Files modified:** 3

## Accomplishments
- Added `src/app/MethodologyPanel.tsx` — a stateless component composing `PanelShell` + a native `<details className="group">`/`<summary>` disclosure, with `SUMMARY_CLASSES` copying `PanelHeadline`'s exact eyebrow class string plus the interaction/focus classes required on `<summary>` directly.
- Locked, verbatim copy from the UI-SPEC's Copywriting Contract rendered as three sections: "What This Shows", "How It's Computed" (30-year baseline → ±5-day window → mean → delta → z-score → percentile pipeline), and the trailing Open-Meteo/ERA5-reanalysis/sparse-data trust notes — all as ordinary JSX text nodes (PD-08, no raw-HTML sink).
- The chevron glyph (`▸`) rotates via `group-open:rotate-90`, gated `motion-safe:transition-transform motion-safe:duration-200` so reduced-motion users get an instant flip with no smooth animation.
- Added `src/app/MethodologyPanel.test.tsx` with three RTL tests: collapsed-by-default, click-to-reveal (jsdom natively toggles `<details>`, confirmed by RESEARCH, no polyfill needed), and prop-less always-visible rendering.
- Mounted `<MethodologyPanel />` in `src/app/App.tsx` as the last child of `LocationPanel`, immediately after `<TrendRow />` and before the closing tag — no props threaded, no `hasSelection`/`isAnomalyReady` gate, since `LocationPanel`'s `{children}` slot already renders unconditionally in every state (PD-11).

## Task Commits

Each task was committed atomically:

1. **Task 1: Create MethodologyPanel component (PanelShell + native details/summary, locked copy) and its tests** - `68c64e3` (feat)
2. **Task 2: Mount MethodologyPanel as the final LocationPanel child in App.tsx** - `cb5ec49` (feat)

## Files Created/Modified
- `src/app/MethodologyPanel.tsx` - New file: stateless disclosure component, `SUMMARY_CLASSES` module-private const, locked copy
- `src/app/MethodologyPanel.test.tsx` - New file: three RTL tests (collapsed-default, click-to-reveal, prop-less)
- `src/app/App.tsx` - Added `MethodologyPanel` import and `<MethodologyPanel />` mount after `<TrendRow />`

## Decisions Made
- `PanelHeadline`'s exact class string is copied directly onto `<summary>` rather than nesting the `<PanelHeadline>` component — `PanelHeadline` renders a `<p>`, which would be invalid/confusing markup nested inside `<summary>` and would lose the chevron's `justify-between` layout (RESEARCH Pitfall 2).
- No expand/collapse height animation is implemented — this is the locked UI-SPEC simplicity choice; only the chevron rotation needs `prefers-reduced-motion` gating, since a height-animated native `<details>` would require disproportionate JS-measured-height or unreliable CSS tricks.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' code matches the plan's `<action>` blocks verbatim (exact class strings, exact copy text, exact insertion point in App.tsx).

## Known Stubs

None. All copy is static/authored per the plan's scope (REQUIREMENTS.md "Out of Scope: dynamic methodology copy") — there is no data source and no stub/placeholder pattern in this component.

## Threat Flags

None. The plan's own threat model (T-07-02) already covers this surface: all copy renders as ordinary JSX text nodes, no raw-HTML sink, no new trust boundary crossed.

## Issues Encountered

None. `npx vitest run src/app/MethodologyPanel.test.tsx`, the full `npx vitest run` (153 tests across 17 files), and `npx tsc --noEmit -p tsconfig.app.json` all passed cleanly on the first attempt for both tasks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- EXPLAIN-03 is satisfied: a collapsed-by-default, keyboard-and-mouse-operable, single-level methodology disclosure now explains what the tool is for and how the anomaly is computed, plus all three trust/limitation notes, and is always visible regardless of selection/loading/error state.
- Phase 07 (both plans) is now functionally complete: EXPLAIN-04 (percentile framing, plan 01) and EXPLAIN-03 (methodology disclosure, plan 02) are both implemented and unit-tested.
- One manual check remains before full phase closeout: toggling the OS/browser reduced-motion setting to confirm the chevron snaps instantly (rather than rotating smoothly) — deferred to end-of-phase human verification per `.planning/config.json`'s `workflow.human_verify_mode: "end-of-phase"`. This is the only outstanding item; nothing else blocks Phase 8.

---
*Phase: 07-methodology-section-explainers*
*Completed: 2026-07-22*

## Self-Check: PASSED

- FOUND: src/app/MethodologyPanel.tsx
- FOUND: src/app/MethodologyPanel.test.tsx
- FOUND: src/app/App.tsx
- FOUND: .planning/phases/07-methodology-section-explainers/07-02-SUMMARY.md
- FOUND commit: 68c64e3
- FOUND commit: cb5ec49
