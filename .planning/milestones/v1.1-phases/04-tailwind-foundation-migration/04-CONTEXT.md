# Phase 4: Tailwind Foundation Migration - Context

**Gathered:** 2026-07-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Move the app's entire styling layer onto Tailwind CSS v4 (`@tailwindcss/vite`, CSS-first, no config file), with the rendered UI **visually equivalent to v1.0**. Both hand-written stylesheets (`src/index.css`, `src/app/App.css`) are deleted and no component depends on them. The Leaflet map (zoom/attribution controls, tile layer, draggable pin) renders correctly under Tailwind's Preflight reset. `vite build` and the existing Vitest suite stay green.

This is a **deliberately mechanical de-risking step** — no design, aesthetic, or behavior changes. The glassy/atmospheric redesign is Phase 5. No UI-SPEC applies here (locked in the v1.1 roadmap: Phase 4's contract *is* "visually equivalent to v1.0").

</domain>

<decisions>
## Implementation Decisions

### Migration approach
- **D-01:** Migrate to **full Tailwind utility classes in JSX** — each component's `className` is rewritten to Tailwind utilities. This most literally satisfies STYLE-01 (styling implemented with Tailwind) and STYLE-02 (no component depends on hand-written CSS), and hands Phase 5 a clean utility base rather than a wrapped-BEM stylesheet.
- **D-02:** Both `src/index.css` and `src/app/App.css` are **deleted** by end of phase; the only remaining CSS is a Tailwind entry file (`@import "tailwindcss"` + `@theme` + any irreducible bits).
- **D-03:** **Irreducible CSS is allowed** where a utility can't express it — specifically the spinner `@keyframes` (`location-display-spin`, used by both `.location-display__spinner` and `.anomaly-card__spinner`). Keep such bits minimal and in the Tailwind entry file, not a per-component stylesheet.
- **D-04:** Design tokens (the `:root` custom properties: `--space-*`, `--color-*`, `--font-*`, including `--color-chart-historical/mean/actual`, `--color-muted`, `--color-border-subtle`) are **ported into Tailwind's `@theme` block**. Rationale: `@theme` both generates the corresponding utilities *and* emits the variables to `:root` as real CSS custom properties — so the existing inline `var(--color-chart-*)` / `var(--color-muted)` references in the recharts/SVG components keep resolving **untouched** (token names must be preserved). Chart re-theming is explicitly **out of scope** — that's Phase 5 (DESIGN-05).

### Preflight ↔ Leaflet
- **D-05:** Keep Tailwind's **Preflight applied globally** (the idiomatic normalized baseline Phase 5's redesign will build on) rather than disabling/scoping it away from the map. Exact conflict-resolution mechanism is Claude/researcher discretion (see below). Success criterion #2 fixes the *outcome*: the map — zoom controls, attribution, tile layer, draggable pin — must render and behave correctly.

### Claude's Discretion
- **Preflight conflict resolution mechanism (D-05):** User delegated ("You decide"). Researcher determines the minimal-conflict path from Tailwind v4's **actual layer behavior** — note that in v4 Preflight lives in a `@layer` and Leaflet's unlayered `leaflet.css` naturally out-prioritizes layered styles, so much of the classic conflict self-resolves. Add only a small set of scoped `.leaflet-container` overrides for what leaks (the usual suspect: Preflight's `img { display:block; max-width:100% }` vs. Leaflet tile/marker icons — re-assert `max-width:none`; plus zoom/attribution control styling if affected). **Verify** the map renders correctly rather than assuming.
- **Design token home (declined area):** Captured default = port into `@theme` per D-04.
- **Visual-equivalence verification (declined area):** Captured default = build + existing Vitest suite + Claude self-check against the current rendered UI. No pixel-diff harness and no UI-SPEC (Phase 4 is mechanical; the existing tests assert SVG structure, not pixels, so visual parity rests on careful class translation + self-check).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase definition & requirements
- `.planning/ROADMAP.md` — Phase 4 goal, success criteria (esp. #2 Preflight-vs-Leaflet), and the v1.1 milestone decision that Phase 4 gets **no UI-SPEC**.
- `.planning/REQUIREMENTS.md` — STYLE-01..STYLE-04 (the four requirements this phase closes) and the "feature/behavior changes of any kind" out-of-scope line.
- `.planning/PROJECT.md` — v1.0 shipped state, stack versions, and the Key Decisions table (context on why tokens/trend styling look the way they do).

### Files this phase rewrites/deletes
- `src/index.css` — `:root` design tokens + small reset; **delete after porting tokens into `@theme`**.
- `src/app/App.css` — 307 lines of BEM component styles consuming those tokens; **delete after utility migration**.
- `src/main.tsx` — imports `leaflet/dist/leaflet.css` then `./index.css`; the Tailwind entry import replaces `./index.css` here (mind CSS import order vs. leaflet.css).
- `src/app/App.tsx` — imports `./App.css`; that import is removed.

### Tokens consumed inline (must survive by name)
- `src/app/TrendDayChart.tsx` — uses `var(--color-chart-historical)`, `var(--color-chart-actual)`, `var(--color-chart-mean)`, `var(--color-muted)` in SVG/recharts props.
- `src/app/TrendLegend.tsx` — uses `var(--color-chart-historical/mean/actual)` in SVG props.

### Tooling
- `package.json` / `vite.config.ts` — Vite 8 + `@vitejs/plugin-react`; add `@tailwindcss/vite`. Build is `tsc -b && vite build`; tests are `vitest run`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Design token set** (`src/index.css` `:root`): a complete, already-consistent scale (spacing/color/typography). Migration = re-home these into `@theme`, not redesign them.
- **BEM class inventory** (`src/app/App.css`): a clean 1:1 map from each `.block__element--modifier` to a utility cluster. `className` counts per file: AnomalyCard 14, LocationDisplay 10, TrendRow 6, TrendDayChart 5, TrendLegend 4, App 2, LocationPanel 2.

### Established Patterns
- **No inline `style={{}}` and no `getComputedStyle`** anywhere — clean separation, so utility migration is a pure className translation with no JS style plumbing to touch.
- **Tests query by SVG element type**, not by class name (`container.querySelector('svg'|'circle'|'rect'|'polygon')` in `TrendLegend.test.tsx` / `TrendDayChart.test.tsx`). Renaming/removing classes will **not** break the suite — but STYLE-04 still requires the whole suite + build stay green.
- **Recharts colors are passed as inline `var(--token)`** SVG props (not classes) — this is why token names must be preserved under `@theme` (D-04).

### Integration Points
- Tailwind entry CSS + `@tailwindcss/vite` plugin wire in at `src/main.tsx` (CSS import) and `vite.config.ts` (plugin). Preflight lands globally from that entry import — hence the Leaflet interaction (D-05).

</code_context>

<specifics>
## Specific Ideas

- "Visually equivalent to v1.0" is the acceptance bar for this phase specifically — not the "noticeably sharper, not pixel-identical" bar, which applies to Phase 5. Translate classes faithfully; resist any "while I'm here" tweaks.
- Preferred Tailwind v4 shape: CSS-first, **no `tailwind.config.js`**, `@import "tailwindcss"` + `@theme { ... }` for tokens (matches the roadmap's `@tailwindcss/vite`, CSS-first, no config file wording).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (All aesthetic/glass/atmospheric work, chart re-theming, the zero-delta hero fix, and any token *redesign* belong to Phase 5.)

</deferred>

---

*Phase: 4-Tailwind Foundation Migration*
*Context gathered: 2026-07-16*
