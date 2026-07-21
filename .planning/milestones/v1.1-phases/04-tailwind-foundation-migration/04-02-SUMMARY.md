---
phase: 04-tailwind-foundation-migration
plan: 02
subsystem: ui
tags: [tailwindcss, react, css-migration, leaflet]

# Dependency graph
requires:
  - phase: 04-tailwind-foundation-migration (plan 01)
    provides: Tailwind v4 CSS-first install, @theme token vocabulary (colors, spacing, typography, animate-location-spin)
provides:
  - App.tsx, LocationPanel.tsx, LocationDisplay.tsx, AnomalyCard.tsx rewritten to Tailwind utility classNames
  - App.tsx no longer imports the legacy App.css stylesheet
  - Map-region leaflet-container sizing preserved via [&_.leaflet-container]:h-full/w-full arbitrary-variant utility
affects: [04-tailwind-foundation-migration plan 03 (remaining components: TrendRow/TrendDayChart/TrendLegend), 04-tailwind-foundation-migration plan 04 (App.css deletion + final verification)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Descendant-selector-on-3rd-party-DOM handled via Tailwind v4 arbitrary variant ([&_.leaflet-container]:h-full) instead of scoped CSS"
    - "Irreducible calc() expressed as an arbitrary value utility (text-[calc(var(--text-display)*1.7)]) rather than a new @theme token"
    - "Shared spinner (animate-location-spin) reused identically across AnomalyCard and LocationDisplay"

key-files:
  created: []
  modified:
    - src/app/App.tsx
    - src/app/LocationPanel.tsx
    - src/app/LocationDisplay.tsx
    - src/app/AnomalyCard.tsx

key-decisions:
  - "Map-container Leaflet sizing kept as a utility class ([&_.leaflet-container]:h-full/w-full) on the map-region div rather than adding scoped CSS to the entry file, per plan's D-05 discretion"
  - "AnomalyCard delta font-size (calc(var(--font-size-display) * 1.7)) reproduced via Tailwind arbitrary value text-[calc(var(--text-display)*1.7)] rather than a bespoke @theme token, since it's used nowhere else"

patterns-established:
  - "BEM-class -> Tailwind utility 1:1 translation surface (per 04-PATTERNS.md) applied file-by-file, className strings only, no markup/behavior changes"

requirements-completed: [STYLE-01, STYLE-02, STYLE-03]

coverage:
  - id: D1
    description: "App shell, map region, and LocationPanel rewritten to Tailwind utilities; legacy App.css import removed from App.tsx; Leaflet map-container sizing preserved via arbitrary-variant utility"
    requirement: "STYLE-01"
    verification:
      - kind: other
        ref: "grep -Eq 'app-shell|map-region' src/app/App.tsx (must not match) && grep -q 'leaflet-container' src/app/App.tsx && grep -q '.css' absence check"
        status: pass
    human_judgment: true
    rationale: "Grep confirms no legacy BEM classes remain and the map-sizing utility is present, but visual equivalence to v1.0 (no aesthetic regression) requires a human looking at the rendered app — deferred to plan 04's definitive build+visual verification per this plan's own <verification> section."
  - id: D2
    description: "LocationDisplay's four branches (empty/loading/resolved/fallback) rewritten to Tailwind utilities, spinner on shared animate-location-spin utility, ARIA preserved"
    requirement: "STYLE-01"
    verification:
      - kind: other
        ref: "grep -q 'location-display' (absence) && grep -q 'animate-location-spin' && grep -q 'role=\"status\"' src/app/LocationDisplay.tsx"
        status: pass
    human_judgment: true
    rationale: "Grep confirms class/attribute presence but branch-by-branch visual equivalence needs human verification, deferred to plan 04."
  - id: D3
    description: "AnomalyCard's four branches (empty/loading/error/resolved) rewritten to Tailwind utilities including the delta calc() arbitrary value, error-branch text-destructive, info button, and z-score chip; production build compiles"
    requirement: "STYLE-01"
    verification:
      - kind: other
        ref: "npx tsc -b && npx vite build"
        status: pass
    human_judgment: true
    rationale: "Build compiles and grep confirms required utilities are present, but visual equivalence to v1.0 (esp. delta hero sizing) requires human verification, deferred to plan 04."

duration: 6min
completed: 2026-07-16
status: complete
---

# Phase 4 Plan 2: Layout & Hero Surfaces Migration Summary

**App shell, map region, LocationPanel, LocationDisplay (4 branches), and AnomalyCard (4 branches) rewritten from BEM classes to Tailwind v4 utilities, with the Leaflet map-container sizing preserved via an arbitrary-variant descendant selector.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-07-16T12:56:37Z
- **Completed:** 2026-07-16T12:59:38Z
- **Tasks:** 3 completed
- **Files modified:** 4

## Accomplishments
- App.tsx's outer shell and map-region divs now use Tailwind utility classes; the legacy `App.css` import is removed from App.tsx (the file is now fully utility-based)
- The Leaflet map's runtime-generated `.leaflet-container` still gets sized to 100%/100% via `[&_.leaflet-container]:h-full [&_.leaflet-container]:w-full`, an arbitrary-variant utility that replaces the old scoped descendant-selector CSS rule
- LocationPanel's `<aside>` and content div rewritten to utilities, preserving the 760px fixed width, secondary background, 24px/16px padding, and vertical scroll
- LocationDisplay's all four render branches (empty/loading/resolved/fallback) rewritten to utilities; the loading spinner now uses the shared `animate-location-spin` utility from plan 01
- AnomalyCard's all four render branches (empty/loading/error/resolved) rewritten to utilities, including the irreducible delta font-size `calc()` as an arbitrary value (`text-[calc(var(--text-display)*1.7)]`), the error branch's `text-destructive`, the info button (per RESEARCH.md's worked example), and the z-score chip
- Production build (`npx tsc -b && npx vite build`) compiles cleanly with all new Tailwind class strings, including every arbitrary value introduced across the plan

## Task Commits

Each task was committed atomically:

1. **Task 1: App shell + map region + panel to utilities; drop legacy CSS import** - `891fe69` (feat)
2. **Task 2: LocationDisplay to utilities (all four branches, shared spinner)** - `ed5e739` (feat)
3. **Task 3: AnomalyCard to utilities (all four branches; delta + info edge cases)** - `3f279b6` (feat)

**Plan metadata:** (pending final docs commit)

## Files Created/Modified
- `src/app/App.tsx` - Outer shell + map-region className rewrite; removed `./App.css` import
- `src/app/LocationPanel.tsx` - Panel `<aside>` + content div className rewrite
- `src/app/LocationDisplay.tsx` - All four branches rewritten; spinner moved to shared `animate-location-spin`
- `src/app/AnomalyCard.tsx` - All four branches rewritten; delta calc() as arbitrary value; info button per RESEARCH.md pattern

## Decisions Made
- Map-container Leaflet sizing kept as a utility class on the map-region div (`[&_.leaflet-container]:h-full [&_.leaflet-container]:w-full`) rather than scoped CSS in the entry file — per plan's explicit discretion (D-05), consistent with D-01's "full utility classes in JSX" direction.
- AnomalyCard's delta font-size reproduced as a Tailwind arbitrary value (`text-[calc(var(--text-display)*1.7)]`) rather than a dedicated `@theme` token, since this size multiplier is used nowhere else in the app.

## Deviations from Plan

None - plan executed exactly as written. All className translations followed 04-PATTERNS.md's per-file BEM-to-utility mapping and RESEARCH.md's worked example for the info button verbatim; no markup, props, branch logic, or ARIA attributes were altered.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- App.tsx, LocationPanel.tsx, LocationDisplay.tsx, and AnomalyCard.tsx are fully utility-based; `App.css`'s rules for these four components are now dead code (the physical file itself stays on disk until plan 04 per this plan's objective)
- Plan 03 can proceed with the remaining components (TrendRow, TrendDayChart, TrendLegend) using the same BEM-to-utility translation surface in 04-PATTERNS.md
- Plan 04 owns the definitive build + visual verification pass and the final deletion of `App.css` once no element references its classes
- No blockers identified

---
*Phase: 04-tailwind-foundation-migration*
*Completed: 2026-07-16*

## Self-Check: PASSED

All claimed files exist (src/app/App.tsx, src/app/LocationPanel.tsx, src/app/LocationDisplay.tsx, src/app/AnomalyCard.tsx) and all claimed commit hashes (891fe69, ed5e739, 3f279b6) are present in git history.
