---
phase: 04-tailwind-foundation-migration
plan: 01
subsystem: ui
tags: [tailwindcss, vite, css, design-tokens]

# Dependency graph
requires: []
provides:
  - Tailwind CSS v4 installed (tailwindcss@4.3.2, @tailwindcss/vite@4.3.2), CSS-first (no config file)
  - "@tailwindcss/vite plugin registered in vite.config.ts"
  - "src/index.css rewritten as the Tailwind entry: @import + @theme token block + spinner keyframe + minimal global base"
  - Preflight active globally
affects: [04-tailwind-foundation-migration plan 02, 04-tailwind-foundation-migration plan 03, 04-tailwind-foundation-migration plan 04]

# Tech tracking
tech-stack:
  added: ["tailwindcss@4.3.2", "@tailwindcss/vite@4.3.2"]
  patterns:
    - "CSS-first Tailwind v4 config via @theme block in src/index.css, no tailwind.config.js"
    - "Design tokens ported 1:1 from old :root block into @theme namespaces (--color-*, --spacing-*, --font-sans, --text-*, --font-weight-*, --animate-*)"

key-files:
  created: []
  modified:
    - package.json
    - package-lock.json
    - vite.config.ts
    - src/index.css

key-decisions:
  - "Tailwind and @tailwindcss/vite pinned to exact 4.3.2 (no caret) per plan requirement; npm's default caret range was stripped after install to match the pin"
  - "Kept tailwindcss/@tailwindcss/vite as regular dependencies (matching npm's default placement) rather than moving to devDependencies, since the plan did not specify a section and no existing convention distinguishes build-only tooling in this package.json"

patterns-established:
  - "@theme token block is the single source of design tokens going forward; component migrations (plans 02, 03) consume these as Tailwind utility classes instead of hand-written CSS"

requirements-completed: [STYLE-01, STYLE-03]

coverage:
  - id: D1
    description: "Tailwind v4 (tailwindcss + @tailwindcss/vite, both 4.3.2) installed and wired via vite.config.ts with no JS config file"
    requirement: "STYLE-01"
    verification:
      - kind: unit
        ref: "automated verify script: package.json version check + grep vite.config.ts for tailwindcss() + absence of tailwind.config.js/ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "src/index.css is the CSS-first Tailwind entry with all design tokens ported into @theme, the four TSX-referenced token names preserved byte-for-byte, and the spinner keyframe exposed as animate-location-spin"
    requirement: "STYLE-01"
    verification:
      - kind: unit
        ref: "automated verify script: grep for @import tailwindcss, @theme, four token names, @keyframes location-display-spin"
        status: pass
      - kind: integration
        ref: "npx tsc -b && npx vite build (production build)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Preflight is active globally from the entry import, ready for the Leaflet interaction check in plan 04"
    requirement: "STYLE-03"
    verification: []
    human_judgment: true
    rationale: "Preflight's actual visual interaction with Leaflet's own CSS (map tiles, controls, markers) can only be confirmed by rendering the map in a browser — deferred to plan 04's checkpoint per the plan's own scoping. This plan only guarantees Preflight is imported/active, not that the Leaflet interaction is visually correct."

# Metrics
duration: 8min
completed: 2026-07-16
status: complete
---

# Phase 4 Plan 1: Tailwind Foundation Migration Summary

**Installed Tailwind CSS v4 (tailwindcss@4.3.2 + @tailwindcss/vite@4.3.2) behind an approved supply-chain checkpoint, wired the Vite plugin, and rewrote src/index.css as the CSS-first Tailwind entry with all design tokens ported into @theme.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-16T12:53:00Z
- **Completed:** 2026-07-16T12:55:39Z
- **Tasks:** 3 (1 human-approval checkpoint + 2 auto tasks)
- **Files modified:** 4 (package.json, package-lock.json, vite.config.ts, src/index.css)

## Accomplishments

- Task 1 (blocking-human supply-chain checkpoint): the orchestrator already presented `tailwindcss@4.3.2` and `@tailwindcss/vite@4.3.2` plus RESEARCH.md's legitimacy audit to the user, who explicitly approved the install. Recorded as approved — no further action needed here.
- Installed `tailwindcss@4.3.2` and `@tailwindcss/vite@4.3.2` at exact pins (no caret) in `package.json`/`package-lock.json`.
- Registered `@tailwindcss/vite`'s `tailwindcss()` plugin in `vite.config.ts` alongside `react()`; left the vitest `test.environment: 'jsdom'` block and defineConfig shape untouched.
- Rewrote `src/index.css` as the single Tailwind entry: `@import "tailwindcss";` followed by an `@theme` block porting every design token (colors, spacing remapped to `--spacing-*`, font family as `--font-sans`, paired text-size/line-height tokens, font weights, and `--animate-location-spin`), the `@keyframes location-display-spin` kept as plain CSS, and a minimal global base (`:root { color-scheme }`, `html/body/#root` sizing, `body` typography/background).
- Confirmed the four TSX-referenced token names survived byte-for-byte: `--color-chart-historical`, `--color-chart-mean`, `--color-chart-actual`, `--color-muted`.
- No `tailwind.config.js`/`tailwind.config.ts`/`postcss.config.js` was created — CSS-first v4 only.
- Verified `npx tsc -b && npx vite build` exits 0, and the full test suite (`npx vitest run`, 90 tests across 8 files) still passes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Package legitimacy checkpoint (supply-chain gate)** - approved by human via orchestrator handshake prior to this agent's execution (no commit — human-gate task, no files touched)
2. **Task 2: Install Tailwind v4 and register the Vite plugin** - `db3c15b` (feat)
3. **Task 3: Rewrite src/index.css as the Tailwind entry (tokens + keyframe)** - `aa081cf` (feat)

**Plan metadata:** (recorded in this commit sequence)

## Files Created/Modified

- `package.json` - Added `tailwindcss@4.3.2` and `@tailwindcss/vite@4.3.2` as exact-pinned dependencies
- `package-lock.json` - Lockfile updated to match exact pins
- `vite.config.ts` - Added `@tailwindcss/vite` import and `tailwindcss()` in the plugins array
- `src/index.css` - Fully rewritten as the Tailwind v4 CSS-first entry (tokens ported into `@theme`, spinner keyframe preserved, minimal global base retained)

## Decisions Made

- Pinned `tailwindcss` and `@tailwindcss/vite` to exact `4.3.2` (stripped npm's default `^` caret) to match the plan's "exact pins — do not float to a newer patch" requirement.
- Kept both packages as regular `dependencies` (npm's default placement when installed without `-D`) rather than moving them to `devDependencies`; the plan did not specify a target section and the existing `package.json` has no established convention separating build-tooling deps from runtime deps.
- Remapped the old `--space-*` custom properties to Tailwind's native `--spacing-*` namespace (same px values) so spacing utilities (`gap-`, `p-`, `m-`, `w-`, `h-`) generate correctly — this was specified explicitly in the plan's Task 3 action.

## Deviations from Plan

None - plan executed exactly as written. Task 1's human-approval checkpoint was already satisfied by the orchestrator before this agent began execution, per explicit instruction in this agent's prompt.

## Issues Encountered

`npm install tailwindcss@4.3.2 @tailwindcss/vite@4.3.2` defaulted to caret-range pins (`^4.3.2`) in `package.json`, which would have failed the plan's exact-pin acceptance criteria. Fixed by editing `package.json` to strip the caret and running `npm install` again to sync `package-lock.json` — resolved before the Task 2 commit, not a deviation requiring rule tracking (routine install-then-verify step, not a bug or missing functionality).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plans 02 and 03 (component-level Tailwind migrations) can now consume the `@theme` tokens and `animate-location-spin` utility established here. Plan 04's Leaflet/Preflight interaction checkpoint can proceed — Preflight is confirmed active globally via the `@import "tailwindcss"` entry, and the production build is green. No blockers.

---
*Phase: 04-tailwind-foundation-migration*
*Completed: 2026-07-16*

## Self-Check: PASSED

All claimed files (package.json, package-lock.json, vite.config.ts, src/index.css) exist on disk. Both task commits (db3c15b, aa081cf) verified present in git log.
