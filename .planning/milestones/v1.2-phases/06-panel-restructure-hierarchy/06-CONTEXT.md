# Phase 6: Panel Restructure & Hierarchy - Context

**Gathered:** 2026-07-22
**Status:** Ready for planning

> **Decision numbering:** Phase-context decisions below are prefixed `PD-` (Phase
> Decision) to avoid colliding with the codebase's own `D-NN` decision ids
> (e.g. the existing `D-09` combined-loading gate referenced in `App.tsx` /
> `AnomalyCard.tsx`).

<domain>
## Phase Boundary

Restructure the resolved anomaly view into four clearly-headlined, self-explanatory
panels and extract three shared UI primitives.

**In scope:**
- Split the combined hero (`AnomalyCard.tsx`) into a **Current Conditions** panel
  (today's temperature) and a **Delta** panel (Δ + verdict + z-score), with the
  Delta remaining the dominant focal point (LAYOUT-01, LAYOUT-03).
- Give all four panels (Location, Current Conditions, Delta, History) a consistent
  headline eyebrow in the style of the existing "Last 7 Days" heading (LAYOUT-02).
- Add always-visible inline micro-copy to each panel (EXPLAIN-01) and an
  accessible, keyboard+mouse InfoTooltip revealing the delta / z-score /
  current-temperature explanations (EXPLAIN-02).
- Establish the shared `PanelShell` / `PanelHeadline` / `InfoTooltip` primitives
  reused verbatim by Phases 7 and 8.

**Out of scope (carried from REQUIREMENTS.md):** dynamic/location-specific tooltip
copy, a color-scale legend, an onboarding/intro screen, mobile-responsive layout
(PLAT-03 deferred — this is a desktop-focused reflow), and anything in the
methodology/percentile (Phase 7) or split-violin (Phase 8) scope.

**Note:** The approved `06-UI-SPEC.md` design contract already locks all copy,
color, typography, spacing, and the InfoTooltip interaction contract. The
decisions below only fill the implementation gaps the UI-SPEC left open.

</domain>

<decisions>
## Implementation Decisions

### Panel Layout & Order
- **PD-01:** Four panels arranged in the 760px docked column as: **Location**
  (full-width, top) → **Current Conditions + Delta** as a two-up row → **History /
  "Last 7 Days"** (full-width, below).
- **PD-02:** The Current Conditions + Delta row is **50/50 equal width**. Focal
  dominance rides on the Δ number's locked size (47.6px) and the anomaly color —
  **not** on panel width.
- **PD-03:** The two cards are **equal height** (CSS align-stretch) so their top
  and bottom edges line up; Current Conditions' extra room falls at the bottom.
- **PD-04:** The row **stays side-by-side in every state** (empty / loading / error
  / resolved) — no reflow between empty and resolved. Each panel shows its own
  UI-SPEC-authored state copy.
- **PD-05:** Content is **top-aligned** in both cards (headline → number →
  micro-copy). Chosen over vertical-centering because centering would leave the
  sparse Current Conditions number floating awkwardly; top-aligning keeps the two
  numbers naturally aligned under equal-height headlines and lets the quieter
  Current Conditions card reinforce Delta's dominance.

### Delta Panel Emphasis
- **PD-06:** **No extra card treatment.** All four panels share the identical
  `PanelShell` glass card (surface, border, radius, shadow, padding). Delta
  dominance comes solely from the number size + anomaly color — no elevated
  shadow, tint, or glow on the Delta card.
- **PD-07:** The existing **verdict label is kept but demoted/reordered.** Delta
  panel internal order: `PanelHeadline "Delta"` → Δ number (47.6px,
  `var(--anomaly-color)`) → micro-copy ("How today compares…") → verdict label →
  z-score chip. The plain-language micro-copy sits directly under the number it
  explains; the verdict becomes a secondary line.

### Refactor Breadth
- **PD-08:** **Full migration** onto the new primitives. Build `PanelShell` /
  `PanelHeadline` / `InfoTooltip`; the two new panels use them; **LocationDisplay**
  adopts `PanelHeadline` + `PanelShell` (it needs the new "Location" eyebrow
  anyway); **TrendRow's** outer glass card + inline eyebrow are swapped for
  `PanelShell` + `PanelHeadline` (its chart internals stay unchanged — Phase 8
  keeps this wrapper). One consistent system entering Phases 7/8.
- **PD-09:** `AnomalyCard.tsx` is **retired** — its Empty/Loading/Error/Populated
  branches, Δ markup, "i" button, verdict label, and z-score chip split into the
  two new panels.

### Component & State Structure
- **PD-10:** **D-09 combined-gate threading — each panel self-gates.** Both the
  Current Conditions and Delta panels receive `currentStatus` + `baselineStatus`
  and each applies the identical combined gate
  (`current resolved && baseline resolved`), preserving the UI-SPEC's
  no-partial-reveal rule (temperature must never appear before the anomaly
  resolves). **Planner mitigation (required):** extract the combined-gate
  condition into ONE shared predicate helper both panels call, so the
  self-contained panels cannot drift and cause a partial reveal.

### Claude's Discretion
- **File/module layout** — user said "you decide." Split into separate component
  files (retiring `AnomalyCard.tsx`); choose between a `src/app/panels/`
  subdirectory and flat `src/app/`. Lean toward matching the existing flat,
  one-component-per-file convention in `src/app/` unless a subdirectory reads
  meaningfully cleaner. Not a product-visible decision.
- **InfoTooltip trigger placement** within each panel and popover
  positioning/portal approach — implementation details inside the UI-SPEC's
  already-locked interaction contract.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design contract (locked — read first)
- `.planning/phases/06-panel-restructure-hierarchy/06-UI-SPEC.md` — **APPROVED**
  design contract. Locks all copy (headlines, micro-copy, tooltip bodies,
  empty/loading/error states), color (60/30/10 split + accent reservations +
  `--anomaly-color`), typography (4 sizes / 2 weights + the Delta 1.7× dominance
  rule), the spacing scale, the three primitive responsibilities, and the full
  `InfoTooltip` WCAG 1.4.13 (hoverable/dismissible/persistent) interaction
  contract. Do not re-derive or contradict it.

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` §Layout (LAYOUT-01/02/03), §Explainers
  (EXPLAIN-01/02) — this phase's requirements + Out-of-Scope list.
- `.planning/ROADMAP.md` §"Phase 6: Panel Restructure & Hierarchy" — goal, success
  criteria, and the research flag (light design spike; establishes the primitives
  reused by Phases 7 & 8).

### Existing code (touch points — see Code Context)
- `src/app/AnomalyCard.tsx` · `src/app/LocationDisplay.tsx` ·
  `src/app/LocationPanel.tsx` · `src/app/TrendRow.tsx` · `src/app/App.tsx` ·
  `src/index.css`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/app/LocationPanel.tsx`** — the docked `<aside>` shell that houses every
  panel; already bridges `--anomaly-color` and the night wash. The new full-width
  panels + two-up row compose inside its existing
  `<div className="flex flex-col gap-md">` children slot.
- **`src/app/AnomalyCard.tsx`** — source of the split. Its sequential
  Empty/Loading/Error/Populated branching, the combined `D-09` gate, the Δ glyph
  markup (`text-[calc(var(--text-display)*1.7)]` + `style={{ color:
  'var(--anomaly-color)' }}`), the `h-5 w-5` "i" data-quality button, `verdictLabel`,
  and the z-score chip all migrate into the two new panels.
- **`src/app/LocationDisplay.tsx`** — becomes a `PanelShell` + `PanelHeadline("Location")`
  consumer; keep its resolved / loading / coordinate-fallback branches.
- **`src/app/TrendRow.tsx`** — its inline eyebrow (line 38:
  `text-label leading-[1.5] font-semibold text-muted uppercase tracking-[0.05em]`)
  is the verbatim style source for `PanelHeadline`; swap its outer glass card +
  eyebrow for the primitives, chart internals unchanged.
- **`src/index.css`** — all glass tokens (`bg-glass-surface`, `glass-border`,
  `rounded-glass-lg`, `shadow-glass`, `backdrop-blur-lg`), spacing scale,
  typography, and `@property --anomaly-color`. **No new tokens this phase.**
- **`src/anomaly/anomaly.ts`** — `formatDelta`, `verdictLabel` reused in the Delta panel.

### Established Patterns
- One-component-per-file, flat in `src/app/`.
- Sequential early-return state branching (Empty → Loading → Error → Populated).
- Combined `D-09` gate: `current.status === 'resolved' && baseline.status === 'resolved'`,
  computed in `App.tsx` (drives `anomaly` + `trendDays`) and re-checked in `AnomalyCard`.
  Both new panels must apply this **same** condition via a shared predicate helper (PD-10).
- All dynamic text rendered as JSX text nodes only — no raw-HTML sink (T-01-02 /
  T-02-07 security invariant); preserve in the split panels.
- Glass cards sit **beside** (never over) the Leaflet map, so `backdrop-blur` is
  allowed on them; never add blur over the map.

### Integration Points
- `App.tsx` currently passes current/baseline status + values into the single
  `AnomalyCard`. After the split it feeds the two new panels (and the two-up row
  wrapper); each panel self-gates via the shared predicate helper.
- `LocationPanel`'s children slot receives: `LocationDisplay` → the
  Current Conditions + Delta row → `TrendRow`.

</code_context>

<specifics>
## Specific Ideas

- **Delta panel internal order (locked here):** Δ number → micro-copy → verdict →
  z-score chip. Micro-copy deliberately adjacent to the number it explains.
- **Two-up row:** 50/50 equal-width, equal-height, always side-by-side (never
  reflows between empty/loading/resolved).
- **Visual system:** no new design tokens, no shadcn, no icon library — extend the
  existing hand-rolled glass/atmospheric system (per UI-SPEC).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. No scope-creep ideas surfaced.

</deferred>

---

*Phase: 6-panel-restructure-hierarchy*
*Context gathered: 2026-07-22*
