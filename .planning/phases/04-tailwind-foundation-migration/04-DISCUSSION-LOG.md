# Phase 4: Tailwind Foundation Migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-16
**Phase:** 4-Tailwind Foundation Migration
**Areas discussed:** Migration approach, Preflight ↔ Leaflet

---

## Area selection

Four gray areas were presented (multiSelect): Migration approach, Design token home, Preflight ↔ Leaflet, Visual-equivalence check.

**User selected:** Migration approach, Preflight ↔ Leaflet.
**Declined (captured as defaults in CONTEXT.md):** Design token home → port into `@theme`; Visual-equivalence check → build + tests + Claude self-check.

---

## Migration approach

| Option | Description | Selected |
|--------|-------------|----------|
| Utility classes in JSX | Rewrite each component's className to Tailwind utilities. Most literally satisfies STYLE-01/STYLE-02, clean base for Phase 5, tests are class-name-safe; irreducible bits (spinner @keyframes) stay as tiny CSS. | ✓ |
| Keep BEM, back with @apply | Keep existing class names in JSX, define them via Tailwind @layer/@apply/@theme. Lowest churn, tightest visual-equivalence guarantee, but leaves a ~300-line CSS file (arguably still hand-written). | |
| Hybrid | Utilities for simple layout/spacing/color, keep component classes for the fiddly parts (shared trend-row Y-axis math, spinner). Pragmatic but muddier "old CSS gone?" story. | |

**User's choice:** Utility classes in JSX.
**Notes:** Follow-up (more/next) → chose "Next area"; migration approach considered settled. Design-token consequence (port tokens into `@theme` so recharts inline `var()` refs survive) was locked as a captured default, since the user did not select "Design token home" as a discussion area.

---

## Preflight ↔ Leaflet

| Option | Description | Selected |
|--------|-------------|----------|
| Global + targeted overrides | Keep Preflight app-wide (idiomatic baseline for Phase 5), add scoped `.leaflet-container` overrides for what leaks. | |
| Turn Preflight off for the map | Exclude the map subtree from Preflight / drop Preflight (index.css already ships a reset). Fewest conflicts, but loses the normalized baseline. | |
| You decide | Researcher determines the minimal-conflict path from Tailwind v4's layer behavior and verifies the map renders correctly. Outcome fixed by success criterion #2. | ✓ |

**User's choice:** You decide.
**Notes:** Delegated the mechanism to Claude/researcher. CONTEXT.md records the policy default (keep Preflight global) plus the v4 layer-behavior nuance (unlayered leaflet.css out-prioritizes layered Preflight) and the concrete leak to watch (`img { max-width:100% }` vs. Leaflet icons). Outcome — map fully functional — is fixed, not delegated.

---

## Claude's Discretion

- **Preflight conflict-resolution mechanism** — user said "You decide." Keep Preflight global; researcher resolves leaks with minimal scoped overrides and verifies the map.
- **Design token home** (declined area) — port `:root` tokens into `@theme`.
- **Visual-equivalence verification** (declined area) — build + Vitest + Claude self-check; no pixel-diff harness, no UI-SPEC.

## Deferred Ideas

None — discussion stayed within phase scope. All aesthetic/glass work, chart re-theming, zero-delta hero fix, and token redesign belong to Phase 5.
