# Phase 4: Tailwind Foundation Migration - Research

**Researched:** 2026-07-16
**Domain:** CSS build tooling migration (Tailwind CSS v4 CSS-first), cascade-layer interoperability with a third-party CSS library (Leaflet)
**Confidence:** HIGH (mechanism verified directly against primary sources: Tailwind's actual shipped source files and Leaflet's actual shipped source files, both read directly rather than assumed)

## Summary

This phase replaces two hand-written stylesheets (`src/index.css`, `src/app/App.css`, ~360 lines combined) with Tailwind CSS v4 in CSS-first mode (`@tailwindcss/vite`, `@import "tailwindcss"` + `@theme`, no `tailwind.config.js`), while keeping the rendered UI pixel-for-pixel equivalent to v1.0. The two hard technical questions this research resolves are (1) exactly how Tailwind v4's Preflight reset and Leaflet's stylesheet coexist, and (2) how to port the existing `:root` design tokens into `@theme` without breaking the `var(--color-chart-*)` / `var(--color-muted)` references that `TrendDayChart.tsx` and `TrendLegend.tsx` pass directly into Recharts/SVG props.

**On the Preflight/Leaflet question:** the CONTEXT.md hypothesis is correct, and the actual risk is *smaller* than hypothesized. Verified directly from source (`node_modules/leaflet/dist/leaflet.css` and the live `tailwindlabs/tailwindcss` GitHub repo): `@import "tailwindcss"` expands to `@layer theme, base, components, utilities;` with Preflight entirely inside `layer(base)`. Leaflet's stylesheet is plain, unlayered CSS. Per the CSS Cascade Layers spec, unlayered normal-importance declarations always out-prioritize any named-layer declaration, **regardless of import order** — so mentally "does `leaflet.css` come before or after the Tailwind entry in `main.tsx`" is not the deciding factor; layer membership is. Further, Tailwind v4's Preflight only applies `max-width:100%` to `img` and `video` elements — **not** `svg` (this changed in v4; older mental models of Preflight are wrong here) — and Leaflet's own stylesheet already ships `!important` overrides (`max-width: none !important`) on every `<img>` it renders inside `.leaflet-container` (tiles, marker icons, marker shadows) and on `.leaflet-overlay-pane svg`. `!important` unlayered rules win outright. Net result: **no manual `.leaflet-container` override CSS is required** for the map to render correctly under Preflight. The zoom/attribution controls are `<a role="button">` elements, not `<button>`, so Preflight's button reset does not touch them either. This must still be **verified visually** (dev server + manual check), not merely trusted — see Verification Protocol below — but the plan should not budget time for writing scoped override CSS unless that visual check finds an actual regression.

**On the token/theme question:** `@theme` variables are emitted as real CSS custom properties on `:root` in the compiled output, so any token kept under an unchanged name keeps resolving via `var(--token-name)` everywhere, including inline SVG props. Only 4 tokens are actually referenced from TypeScript/TSX (`--color-chart-historical`, `--color-chart-mean`, `--color-chart-actual`, `--color-muted` — confirmed by grep, not just by CONTEXT.md's claim) and all 4 already fit Tailwind's `--color-*` @theme namespace unchanged, so no renaming is forced on the load-bearing tokens. The remaining tokens (`--space-*`, `--font-*`, `--font-size-*`, `--font-weight-*`, `--line-height-*`) are consumed only from CSS that is being deleted, so they are free to be remapped into Tailwind's native namespaces (`--spacing-*`, `--text-*`, `--font-weight-*`) for idiomatic utility generation — this is Claude's discretion, not a hard constraint.

**Primary recommendation:** Wire up `@tailwindcss/vite` (v4.3.2) exactly per the official CSS-first pattern, port `--color-*` tokens into `@theme` unchanged (hard requirement), remap spacing/typography tokens into Tailwind's native namespaces (discretionary, recommended), keep the spinner `@keyframes` in the Tailwind entry file via a custom `--animate-*` token so it's usable as a normal utility class, do the BEM→utility JSX translation component-by-component, delete both old stylesheets, and **run the app in a browser and visually compare the map + panel against v1.0 before calling the phase done** — do not rely on the build/test suite passing as proof of visual equivalence, since neither exercises CSS rendering.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Styling / utility classes (JSX className) | Browser / Client | — | Pure client-rendered SPA (Vite build, no SSR); Tailwind utilities compile to static CSS shipped to the browser. |
| Design tokens (`@theme`) | Browser / Client | — | Tokens compile to `:root` CSS custom properties consumed by both CSS and inline SVG props at render time in the browser. |
| Preflight reset / cascade-layer resolution | Browser / Client | — | Cascade-layer precedence is resolved by the browser's CSS engine at paint time; nothing here touches build-time logic beyond bundling. |
| Leaflet map rendering (tiles, markers, controls) | Browser / Client | — | `react-leaflet`/`leaflet` render directly into the DOM client-side; map behavior is unaffected by anything server-side (there is no server tier in this app). |
| Build pipeline (Tailwind → static CSS) | Build Tooling (Vite) | — | `@tailwindcss/vite` runs as a Vite plugin at build/dev-server time, not at runtime; not a "tier" the browser or an API serves, but worth tracking separately since misconfiguration here is a build-time failure mode (STYLE-04). |

There is no API/backend or CDN tier relevant to this phase — this project is a stateless static SPA (per `CLAUDE.md`/`PROJECT.md`), and Phase 4 touches only the client-side styling layer and the Vite build config.

## Project Constraints (from CLAUDE.md)

- **Stack pins are locked** — do not deviate: React 19.2.7, Vite 8.1.4, TypeScript 5.9.x/6.x (not 7.0), `react-leaflet` 5.0.0 / `leaflet` 1.9.4, Recharts 3.9.2. This phase must not touch these versions.
- **No backend/serverless layer** — Tailwind is a pure build-time CSS tool; adding it does not and must not introduce any server code.
- **No global state manager** — irrelevant to this phase but must not be introduced incidentally while touching component files.
- **Hosting is free-tier static** (Cloudflare Pages) — `vite build` must continue to emit a pure static `dist/`; Tailwind's Vite plugin does not change this.
- **GSD workflow enforcement** — file edits for this phase happen through `/gsd-execute-phase`, not ad hoc.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Migrate to full Tailwind utility classes in JSX — each component's `className` is rewritten to Tailwind utilities. This most literally satisfies STYLE-01 and STYLE-02, and hands Phase 5 a clean utility base rather than a wrapped-BEM stylesheet.
- **D-02:** Both `src/index.css` and `src/app/App.css` are deleted by end of phase; the only remaining CSS is a Tailwind entry file (`@import "tailwindcss"` + `@theme` + any irreducible bits).
- **D-03:** Irreducible CSS is allowed where a utility can't express it — specifically the spinner `@keyframes` (`location-display-spin`, used by both `.location-display__spinner` and `.anomaly-card__spinner`). Keep such bits minimal and in the Tailwind entry file, not a per-component stylesheet.
- **D-04:** Design tokens (the `:root` custom properties: `--space-*`, `--color-*`, `--font-*`, including `--color-chart-historical/mean/actual`, `--color-muted`, `--color-border-subtle`) are ported into Tailwind's `@theme` block. Rationale: `@theme` both generates the corresponding utilities *and* emits the variables to `:root` as real CSS custom properties — so the existing inline `var(--color-chart-*)` / `var(--color-muted)` references in the recharts/SVG components keep resolving untouched (token names must be preserved). Chart re-theming is explicitly out of scope — that's Phase 5 (DESIGN-05).
- **D-05:** Keep Tailwind's Preflight applied globally (the idiomatic normalized baseline Phase 5's redesign will build on) rather than disabling/scoping it away from the map. Exact conflict-resolution mechanism is Claude/researcher discretion. Success criterion #2 fixes the outcome: the map — zoom controls, attribution, tile layer, draggable pin — must render and behave correctly.

### Claude's Discretion

- **Preflight conflict resolution mechanism (D-05):** Resolved by this research — see Summary. No scoped `.leaflet-container` override CSS is needed based on verified source analysis, but the plan must still include a visual verification step, not an assumption.
- **Design token home (declined area):** Captured default = port into `@theme` per D-04.
- **Visual-equivalence verification (declined area):** Captured default = build + existing Vitest suite + Claude self-check against the current rendered UI. No pixel-diff harness and no UI-SPEC (Phase 4 is mechanical; the existing tests assert SVG structure, not pixels, so visual parity rests on careful class translation + self-check).

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope. All aesthetic/glass/atmospheric work, chart re-theming, the zero-delta hero fix, and any token *redesign* belong to Phase 5.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STYLE-01 | App styling is implemented with Tailwind CSS v4 (via `@tailwindcss/vite`, CSS-first, no config file), replacing the hand-written `index.css` / `App.css` | Verified `@tailwindcss/vite` + `@import "tailwindcss"` + `@theme` setup pattern (Standard Stack, Code Examples); confirmed current stable version 4.3.2 via npm registry and official docs. |
| STYLE-02 | The old hand-written CSS is removed once migrated — no component depends on it | BEM→utility translation surface fully catalogued per-component (Architecture Patterns); confirmed no `style={{}}` or `getComputedStyle` usage exists to complicate the pure-className migration. |
| STYLE-03 | The Leaflet map renders correctly alongside Tailwind's Preflight reset — controls, markers, and layout intact | Cascade-layer mechanism verified directly from Tailwind and Leaflet source (Summary, Common Pitfalls); confirmed Leaflet's own `!important` overrides already neutralize the one real Preflight collision that exists in v4 (`img`/`video` `max-width:100%` — not `svg`). |
| STYLE-04 | The production build and the existing test suite pass with Tailwind in place | Confirmed `vitest`/jsdom does not evaluate cascade-layer precedence or paint CSS (tests assert SVG element structure only, per `TrendDayChart.test.tsx`/`TrendLegend.test.tsx`), so no test changes are needed; build command (`tsc -b && vite build`) unaffected by the Vite plugin addition (Environment Availability, Common Pitfalls). |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `tailwindcss` | 4.3.2 `[VERIFIED: npm registry + tailwindcss.com]` | Utility-first CSS engine | Current stable (`latest` dist-tag), CSS-first architecture matches D-01/D-02/roadmap wording exactly. |
| `@tailwindcss/vite` | 4.3.2 `[VERIFIED: npm registry + tailwindcss.com]` | First-party Vite plugin — compiles Tailwind directly inside Vite's pipeline, no PostCSS config needed | Official recommended integration for Vite projects per `tailwindcss.com/docs/installation/using-vite`; avoids the extra `postcss.config.js` + `autoprefixer` + `postcss-import` setup the non-Vite-plugin path requires. |

### Supporting

No additional runtime packages are needed. No CSS reset library, no `clsx`/`tailwind-merge` (the JSX migration is static className strings per component, not conditional class composition beyond what the components already branch on with plain template literals — see Code Examples for the existing `labelClassName` ternary pattern in `TrendDayChart.tsx`, which continues to work unchanged as a plain string ternary).

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@tailwindcss/vite` plugin | `tailwindcss` CLI + PostCSS + `autoprefixer` | More config surface (postcss.config.js, manual watch wiring) for zero benefit in a Vite project — the Vite plugin is Tailwind's own recommended path for Vite. Not worth the extra moving parts here. |
| Full utility-class JSX (D-01, locked) | `@apply` inside a handful of component CSS files | Explicitly rejected by D-01/D-02 — the point of this phase is to hand Phase 5 a pure-utility base, not a re-skinned BEM stylesheet. |
| Custom `--animate-*` keyframe for the spinner | Tailwind's built-in `animate-spin` utility (1s linear infinite, `spin` keyframes) | Built-in `animate-spin` is visually near-identical (rotate 360deg linear infinite) but duration differs (1s vs the existing 0.8s) and keyframe name differs. Given "visually equivalent to v1.0" is the literal acceptance bar, prefer preserving the exact 0.8s custom keyframe (D-03 explicitly allows this as irreducible CSS) — but note the built-in exists as a fallback if the planner judges 1s vs 0.8s imperceptible. |

**Installation:**
```bash
npm install tailwindcss @tailwindcss/vite
```

**Version verification:** Confirmed 2026-07-16 via `npm view tailwindcss version` → `4.3.2`, `npm view tailwindcss dist-tags --json` → `{"latest": "4.3.2", ...}` (not a beta/next tag), and `npm view tailwindcss scripts.postinstall` / `npm view @tailwindcss/vite scripts.postinstall` → both empty (no postinstall script, no supply-chain red flag there).

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `tailwindcss` | npm | Published version 4.3.2 dated 2026-06-29 (package itself is years old; only the specific point release is recent) | 95,261,196/wk | `github.com/tailwindlabs/tailwindcss` | SUS (`too-new`) | **Approved — false positive.** The `package-legitimacy check` seam's `too-new` signal fires on the most recent *version's* publish date, not the package's overall age. 95M+ weekly downloads and the canonical `tailwindlabs/tailwindcss` repo make hallucination/slopsquatting implausible; this is the exact package already pinned in `CLAUDE.md`'s stack table. Planner should still add a lightweight `checkpoint:human-verify` before install per protocol, but it should be a rubber-stamp given this evidence. |
| `@tailwindcss/vite` | npm | Same repo, same 4.3.2 release cadence | 38,136,279/wk | `github.com/tailwindlabs/tailwindcss` (monorepo) | SUS (`too-new`) | **Approved — same false-positive reasoning as above.** |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** `tailwindcss`, `@tailwindcss/vite` — both flagged only by the recency heuristic on their latest patch release, not by any genuine legitimacy signal (both have massive adoption, the correct official repo, and no postinstall script). Planner should insert a low-friction `checkpoint:human-verify` before `npm install tailwindcss @tailwindcss/vite` per protocol, but the evidence above should make that check trivial.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Vite build/dev pipeline                                         │
│                                                                    │
│  vite.config.ts                                                   │
│    plugins: [react(), tailwindcss()]  ◄── @tailwindcss/vite       │
│                                             scans className=""     │
│                                             strings across src/**  │
│                                             at build/HMR time      │
└───────────────────────────┬───────────────────────────────────────┘
                             │ compiles
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  src/index.css  (Tailwind entry — replaces old index.css)         │
│                                                                     │
│  @import "tailwindcss";        ──► expands to:                    │
│                                     @layer theme, base, components,│
│                                     utilities;                     │
│                                     @import theme.css layer(theme) │
│                                     @import preflight.css          │
│                                       layer(base)  ◄── the reset   │
│                                     @import utilities.css           │
│                                       layer(utilities)              │
│  @theme { --color-chart-historical: ...; --spacing-md: ...; ... }  │
│    └─► emits vars to :root AND generates matching utility classes  │
│  @keyframes location-display-spin { ... }  (D-03 irreducible bit)  │
└───────────────────────────┬────────────────────────────────────────┘
                             │ imported once, in src/main.tsx
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  src/main.tsx                                                     │
│    import 'leaflet/dist/leaflet.css'   ◄── UNLAYERED plain CSS    │
│    import './index.css'                ◄── Tailwind entry above    │
│    (import order does NOT change cascade-layer precedence —        │
│     unlayered leaflet.css always outranks layer(base) Preflight    │
│     for normal-importance rules, and Leaflet's own !important       │
│     img/svg max-width rules outrank everything regardless)          │
└───────────────────────────┬────────────────────────────────────────┘
                             │ renders
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Browser paint                                                    │
│   .leaflet-container (map)         .location-panel (Tailwind      │
│    - tiles: <img> w/ !important       utility classes)             │
│      max-width:none (Leaflet)       - AnomalyCard, LocationDisplay,│
│    - markers: <img> w/ !important     TrendRow, TrendDayChart,     │
│      max-width:none (Leaflet)         TrendLegend all rewritten    │
│    - zoom/attribution: <a role=      to className="<utilities>"    │
│      button">, untouched by          - inline SVG fill/stroke      │
│      Preflight's button reset          still read var(--color-     │
│                                         chart-*) from :root         │
└─────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

No new directories are needed — this phase is a rewrite-in-place of existing files, not a restructure:

```
src/
├── index.css              # REWRITTEN: @import "tailwindcss"; @theme {...}; @keyframes (D-03)
├── main.tsx                # UNCHANGED except CSS import target (still `./index.css`)
├── app/
│   ├── App.tsx              # className rewritten to utilities; App.css import removed
│   ├── App.css              # DELETED (D-02)
│   ├── AnomalyCard.tsx       # className rewritten to utilities (14 classes)
│   ├── LocationDisplay.tsx   # className rewritten to utilities (10 classes)
│   ├── LocationPanel.tsx     # className rewritten to utilities (2 classes)
│   ├── TrendRow.tsx          # className rewritten to utilities (6 classes)
│   ├── TrendDayChart.tsx     # className rewritten to utilities (5 classes); var(--color-chart-*)/var(--color-muted) props UNCHANGED
│   └── TrendLegend.tsx       # className rewritten to utilities (4 classes); var(--color-chart-*) props UNCHANGED
└── map/
    └── MapView.tsx           # UNCHANGED — no className usage; Leaflet renders its own DOM/CSS
```

### Pattern 1: CSS-first Tailwind entry with ported design tokens

**What:** A single `src/index.css` file replaces the old reset + tokens file. It imports Tailwind, declares the design tokens inside `@theme`, and keeps the one irreducible keyframe animation.

**When to use:** This is the only CSS file the project should have after this phase (per D-02).

**Example:**
```css
/* Source: tailwindcss.com/docs/installation/using-vite,
   tailwindcss.com/docs/theme (CITED — official docs) */
@import "tailwindcss";

@theme {
  /* --color-* MUST keep these exact names — TrendDayChart.tsx and
     TrendLegend.tsx reference them via var(--color-chart-*) /
     var(--color-muted) in inline SVG/Recharts props (D-04, locked). */
  --color-chart-historical: rgba(37, 99, 235, 0.22);
  --color-chart-mean: var(--color-accent);
  --color-chart-actual: #ea580c;
  --color-muted: #4b5563;
  --color-border-subtle: #e5e7eb;
  --color-dominant: #ffffff;
  --color-secondary: #f4f5f7;
  --color-accent: #2563eb;
  --color-destructive: #dc2626;

  /* Spacing/typography tokens: NOT referenced from TSX, free to remap
     into Tailwind's native namespaces for idiomatic utility generation
     (discretionary — see Assumptions Log). */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
  --spacing-3xl: 64px;

  --font-sans:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial,
    sans-serif;

  --text-body: 16px;
  --text-body--line-height: 1.5;
  --text-label: 14px;
  --text-label--line-height: 1.4;
  --text-heading: 20px;
  --text-heading--line-height: 1.2;
  --text-display: 28px;
  --text-display--line-height: 1.2;

  --font-weight-body: 400;
  --font-weight-label: 400;
  --font-weight-heading: 600;
  --font-weight-display: 600;

  /* D-03 irreducible bit: the spinner keyframe, exposed as a normal
     utility class (animate-location-spin) so it still fits D-01's
     "full utility classes in JSX" approach rather than a bespoke
     .spinner CSS class. */
  --animate-location-spin: location-display-spin 0.8s linear infinite;
}

@keyframes location-display-spin {
  to {
    transform: rotate(360deg);
  }
}

/* Non-@theme global resets that aren't part of the Preflight-generated
   set and aren't expressible as a utility (html/body/#root full-height
   + color-scheme) stay as plain CSS, same as before. */
:root {
  color-scheme: light;
}

html,
body,
#root {
  height: 100%;
  margin: 0;
}
```

### Pattern 2: `vite.config.ts` plugin wiring

**What:** Add the `@tailwindcss/vite` plugin alongside the existing `@vitejs/plugin-react`.

**When to use:** Once, at the top of the phase's implementation work — this must land before any JSX className rewrite can be visually checked.

**Example:**
```typescript
// Source: tailwindcss.com/docs/installation/using-vite (CITED)
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
  },
})
```

### Pattern 3: BEM → utility translation, one component at a time

**What:** Each `.block__element--modifier` class in the deleted `App.css` maps to a cluster of Tailwind utilities using the `@theme` tokens above. Do this file-by-file so each component can be visually spot-checked in isolation before moving to the next.

**When to use:** For all 7 files with `className` usage. Per-file class counts (grep-verified, confirms CONTEXT.md's numbers): AnomalyCard 14 instances of `className=`, LocationDisplay 10, TrendRow 6, TrendDayChart 5, TrendLegend 4, App 2, LocationPanel 2 — 43 total `className=` occurrences across the 7 files.

**Example — a representative 1:1 translation (AnomalyCard's info button):**
```tsx
// Before (App.css):
// .anomaly-card__info {
//   width: 20px; height: 20px; flex: 0 0 auto;
//   border: 1px solid var(--color-accent); border-radius: 50%;
//   background: transparent; color: var(--color-accent);
//   font-size: var(--font-size-label); font-weight: var(--font-weight-heading);
//   line-height: 1; cursor: help; padding: 0;
// }

// After (Tailwind utilities, using the @theme tokens above):
<button
  type="button"
  className="h-5 w-5 shrink-0 rounded-full border border-accent bg-transparent p-0 text-accent text-label font-heading leading-none cursor-help"
  aria-label="Data quality info"
  title="Based on modeled climate data for this area (~9-25km resolution)"
>
  i
</button>
```

### Anti-Patterns to Avoid

- **Writing scoped `.leaflet-container` override CSS speculatively:** Based on the verified cascade-layer mechanism (Summary), no override is needed for the map to render correctly. Adding one anyway is unnecessary irreducible-CSS surface that D-02/D-03 want minimized. Only add an override if the manual visual check (Verification Protocol) actually finds a regression, and if so, scope it as narrowly as the specific broken selector, not a blanket rule.
- **Using `@apply` to shortcut the JSX migration:** Explicitly rejected by D-01 — defeats the purpose of leaving Phase 5 a clean utility base.
- **Renaming `--color-chart-*` / `--color-muted`:** These 4 tokens are read at runtime via `var(--token-name)` from TSX (verified by grep, not assumption) — renaming any of them silently breaks chart rendering with no compile-time error, since they're plain strings passed to SVG `fill`/`stroke`/`tick.fill` props.
- **Treating a green `vite build` + green `vitest run` as proof of visual equivalence:** Neither exercises CSS cascade resolution or paint. The existing test suite asserts SVG element structure (`container.querySelector('svg'|'circle'|'rect'|'polygon')`), not classNames or computed styles — it will stay green even if the whole page were visually broken.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Preflight-Leaflet CSS conflict resolution | A custom cascade-layer workaround, an `!important`-laden override stylesheet, or disabling Preflight | Nothing — the conflict is already resolved by (a) Tailwind v4's native cascade layers and (b) Leaflet's own shipped `!important` rules. Only add a targeted 1-2 line override if the manual visual check finds a specific broken selector. | Both mechanisms are already correct by design; building a workaround for a problem that verified source inspection shows doesn't exist wastes effort and adds irreducible CSS the phase is trying to minimize (D-02/D-03). |
| Design-token porting | Manually re-deriving color/spacing values, or introducing a token-transformation build step | Direct 1:1 copy of `:root` values into `@theme`, keeping `--color-*` names unchanged and (optionally) renaming `--space-*`/`--font-*` to Tailwind's native namespaces | `@theme` already does exactly what's needed (utility generation + `:root` emission) — no additional tooling required. |
| Spinner animation | A JS-driven rotation loop or a Framer Motion/animation library | The existing CSS `@keyframes` kept verbatim, exposed via a `--animate-*` @theme token (D-03) | This is a 3-line irreducible CSS block; anything more complex is scope creep the phase explicitly forbids ("deliberately mechanical de-risking step"). |

**Key insight:** The single biggest risk this phase was scoped to de-risk (Preflight vs. Leaflet) turns out, on direct source verification, to require essentially zero new code — the actual work in this phase is almost entirely the mechanical BEM→utility JSX translation across 7 files, not novel CSS engineering.

## Common Pitfalls

### Pitfall 1: Assuming Preflight breaks Leaflet without checking the actual current-version rule set
**What goes wrong:** Older blog posts and even some GitHub discussion threads about "Tailwind breaks Leaflet" describe Tailwind v3-era Preflight (or generic "img/svg get max-width:100%" folk knowledge) and lead to defensive CSS that isn't needed in v4 for this app's actual DOM shape (TileLayer + Marker, no VideoOverlay).
**Why it happens:** v4's Preflight is subtly narrower than v3's mental model — `max-width:100%` applies only to `img`/`video`, not `svg`, and Leaflet's own stylesheet already ships defensive `!important` rules that predate Tailwind entirely (the leaflet.css comment literally says "reset svg max-width declaration shipped in Joomla! 3.x" — this is a decade-old defensive pattern, not something written for Tailwind).
**How to avoid:** Trust the verified mechanism in this document, but still perform the manual visual check below rather than skipping verification entirely.
**Warning signs:** Map tiles rendering at native/huge size, marker icon stretched to fill its container, zoom control buttons losing their box/border chrome — none of these are expected given the verified mechanism, so if seen, they indicate something *other* than the classic Preflight-img conflict (check for accidental Preflight-affecting selectors on `.leaflet-control` links/buttons introduced by the JSX rewrite of *sibling* app components, or a build-order/plugin-registration mistake).

### Pitfall 2: `L.VideoOverlay`-style width collapse (not applicable here, but worth knowing)
**What goes wrong:** In other Tailwind+Leaflet projects, `<video>` elements inside `.leaflet-container` collapse to 0 width because Preflight's `img, video { max-width: 100%; height: auto; }` resolves against a parent with no explicit width.
**Why it happens:** Unlike `<img>` tiles/markers, Leaflet's `VideoOverlay` does not ship its own defensive `max-width:none !important` rule.
**How to avoid:** N/A for this phase — `MapView.tsx` uses only `TileLayer` and `Marker`, no `VideoOverlay`. Documented here only so a future phase adding video overlays knows to add `.leaflet-container video { max-width: initial; }` if that feature is ever built.
**Warning signs:** N/A this phase.

### Pitfall 3: Token rename silently breaking chart colors with no build error
**What goes wrong:** `var(--color-chart-historical)` etc. are plain strings passed as SVG `fill`/`stroke` props — TypeScript cannot catch a typo'd or renamed CSS custom property here. A rename during the `@theme` port (e.g. "cleaning up" the name to `--chart-historical` to shorten it) compiles fine, builds fine, tests pass (tests only check for the presence of a `<circle>`/`<rect>`/`<polygon>` element, not its fill color), and only shows up as an invisible/transparent chart mark in the browser.
**Why it happens:** No compile-time or test-time coupling between the CSS token name and its string usage in TSX.
**How to avoid:** Treat `--color-chart-historical`, `--color-chart-mean`, `--color-chart-actual`, `--color-muted` as a fixed, non-negotiable name list (verified via grep in this research) — copy them into `@theme` byte-for-byte on the name, and grep the codebase for `var(--color-` after the migration to confirm every reference still resolves to a name that exists in `@theme`.
**Warning signs:** Trend chart dots/line/diamond render as invisible or black (SVG default fill) instead of their intended colors.

### Pitfall 4: jsdom/Vitest silently masking a real visual regression
**What goes wrong:** Because the Vitest suite only queries for SVG element *types* (`querySelector('svg')`, `'circle'`, etc.), not classNames or computed styles, a JSX migration that drops a functionally-important utility class (e.g. accidentally omitting `flex` on `.location-display--loading`, breaking its row layout) will not fail any existing test.
**Why it happens:** The test suite was intentionally written to be resilient to className churn (per CONTEXT.md's "Established Patterns" note) — a feature for refactor-safety, but it means STYLE-04 ("tests pass") is not sufficient evidence for "visually equivalent to v1.0."
**How to avoid:** After the JSX rewrite, run `npm run dev`, load the app, drop a pin, and manually compare each of the 4 AnomalyCard states (empty/loading/error/resolved), all 3 LocationDisplay states, and the TrendRow/TrendLegend layout against the pre-migration screenshots or a `git stash`'d v1.0 checkout.
**Warning signs:** N/A until manually checked — this is precisely the gap manual verification exists to close.

### Pitfall 5: `tsc -b` incremental build cache masking a stale error
**What goes wrong:** Not Tailwind-specific, but worth flagging since STYLE-04 requires `vite build` (`tsc -b && vite build`) to pass: TypeScript's `--build` mode caches `.tsbuildinfo` and can report success on a stale cache if files were touched without their mtimes updating in some CI/sandbox environments.
**Why it happens:** Standard `tsc -b` incremental-build behavior, unrelated to this phase's changes.
**How to avoid:** If `npm run build` reports success suspiciously fast after a large rewrite, do a clean build (`rm -rf` any `tsconfig.tsbuildinfo` / `node_modules/.tmp` build cache, or run `tsc -b --force`) before trusting the result as final verification.
**Warning signs:** Build passes in under 1 second despite dozens of files changed.

## Code Examples

### Tailwind v4 Preflight source (verified, current `main` branch — the exact rules relevant to this phase)
```css
/* Source: raw.githubusercontent.com/tailwindlabs/tailwindcss/main/packages/tailwindcss/preflight.css
   [VERIFIED: github.com/tailwindlabs/tailwindcss source] */
*,
::after,
::before,
::backdrop,
::file-selector-button {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  border: 0 solid;
}

img,
svg,
video,
canvas,
audio,
iframe,
embed,
object {
  display: block;
  vertical-align: middle;
}

/* NOTE: max-width:100% applies to img and video ONLY — svg is excluded
   in v4. This is the key fact that de-risks the Recharts SVG charts. */
img,
video {
  max-width: 100%;
  height: auto;
}

button,
input,
select,
optgroup,
textarea,
::file-selector-button {
  font: inherit;
  color: inherit;
  border-radius: 0;
  background-color: transparent;
  opacity: 1;
}

a {
  color: inherit;
  text-decoration: inherit;
}
```

### Cascade-layer expansion (verified, current `main` branch)
```css
/* Source: raw.githubusercontent.com/tailwindlabs/tailwindcss/main/packages/tailwindcss/index.css
   [VERIFIED: github.com/tailwindlabs/tailwindcss source] */
@layer theme, base, components, utilities;

@import './theme.css' layer(theme);
@import './preflight.css' layer(base);
@import './utilities.css' layer(utilities);
```

### Leaflet's own defensive image-sizing rules (verified, installed version)
```css
/* Source: node_modules/leaflet/dist/leaflet.css (installed leaflet@1.9.4)
   [VERIFIED: local node_modules — installed package source] */
/* .leaflet-container svg: reset svg max-width declaration shipped in Joomla! (joomla.org) 3.x */
/* .leaflet-container img: map is broken in FF if you have max-width: 100% on tiles */
.leaflet-container .leaflet-overlay-pane svg {
  max-width: none !important;
  max-height: none !important;
}
.leaflet-container .leaflet-marker-pane img,
.leaflet-container .leaflet-shadow-pane img,
.leaflet-container .leaflet-tile-pane img,
.leaflet-container img.leaflet-image-layer,
.leaflet-container .leaflet-tile {
  max-width: none !important;
  max-height: none !important;
  width: auto;
  padding: 0;
}
```
This confirms Leaflet's tile/marker/shadow `<img>` elements (created via `document.createElement('img')` in `leaflet-src.js`, verified by direct source read) and overlay-pane `<svg>` elements are already immune to Preflight's `img, video { max-width: 100% }` rule, independent of anything this phase does.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Tailwind v3 `@layer utilities`/`@layer components` (Tailwind-hijacked at-rule, JS `tailwind.config.js`) | Tailwind v4 native CSS cascade layers + CSS-first `@theme`/`@import "tailwindcss"`, no config file | Tailwind v4 GA (2025) | Directly relevant here — the whole reason the Preflight/Leaflet interaction resolves cleanly is v4's move to *native* browser cascade layers rather than Tailwind's own v3-era layer emulation. Any research or Stack Overflow answer referencing `tailwind.config.js`, `@tailwind base;`/`@tailwind components;`/`@tailwind utilities;`, or `corePlugins: { preflight: false }` is v3-era and does not apply to this setup. |
| Preflight applying `max-width:100%` to `img, svg, video` together | Preflight applying `max-width:100%` to `img, video` only; `svg` gets only `display:block`/`vertical-align:middle` | Somewhere in the v4 series (confirmed against current `main` source, exact version boundary not pinned by this research) | Directly de-risks the Recharts SVG charts in this app — no `max-w-none` override is needed for chart SVGs. |

**Deprecated/outdated:**
- `tailwind.config.js` — not used at all in this setup (CSS-first is the only path CONTEXT.md/CLAUDE.md authorize).
- `@tailwind base; @tailwind components; @tailwind utilities;` directive syntax — replaced by the single `@import "tailwindcss";` in v4.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | Renaming `--space-*` → `--spacing-*`, `--font-family-base` → `--font-sans`, `--font-size-*` → `--text-*`, `--font-weight-*` stays `--font-weight-*` is safe because these tokens are not referenced from TSX (only grep-verified negative: no `var(--space-` / `var(--font-` hits found in `src/**/*.tsx`/`*.ts`) | Architecture Patterns (Pattern 1) | Low — even if a hidden reference were missed, the rename is discretionary (planner could choose to keep the original names verbatim under `@theme` instead, at the cost of not auto-generating matching Tailwind utilities); this does not affect the locked `--color-*` tokens. |
| A2 | Preserving the spinner's exact 0.8s duration (vs. adopting Tailwind's built-in `animate-spin` at 1s) is the correct reading of "visually equivalent to v1.0" | Standard Stack (Alternatives Considered) | Low — a 0.8s vs 1s spin rate difference is unlikely to be perceptible or fail a manual visual check; either choice satisfies D-03. Flagging only because it's a judgment call not explicitly locked by CONTEXT.md. |
| A3 | No other component in this codebase renders a `<video>`, `<canvas>`, or non-Leaflet `<img>`/`<svg>` whose sizing could be affected by Preflight in a way not covered by the map-focused analysis above | Common Pitfalls (Pitfall 2) | Low — confirmed by direct file read of all 7 `src/app/*.tsx` files and `MapView.tsx`; no `<img>`/`<video>` tags exist outside Leaflet's own internally-rendered DOM. |

**If this table is empty:** N/A — see entries above; all are low-risk discretionary/confirmatory notes, not load-bearing unknowns.

## Open Questions

1. **Exact Tailwind v4 patch-version boundary where `svg` was excluded from the `max-width:100%` Preflight rule**
   - What we know: the currently-installable `tailwindcss@4.3.2` (confirmed current stable) has this exclusion, verified directly from the `main` branch source.
   - What's unclear: whether this was true from v4.0.0 GA or introduced in a later 4.x patch — irrelevant to this phase since the project will install `^4.3.2` fresh, but worth knowing if someone later reads an older v4.0-era blog post that describes different Preflight behavior.
   - Recommendation: no action needed for this phase; not worth spending further research budget on since the installed version's actual behavior is what was verified.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite 8 dev/build | Not directly probed in this session (no shell Node available for `node --version` check beyond npm registry queries succeeding) | Requires `^20.19.0 \|\| >=22.12.0` per `vite@8.1.4` `engines` field (confirmed via `npm view vite@8.1.4 engines`) | If the execution environment's Node is older, `vite build` will fail fast with an engine-mismatch warning/error — not a Tailwind-specific concern, pre-existing constraint from the v1.0 stack. |
| npm registry access | Installing `tailwindcss`, `@tailwindcss/vite` | ✓ (used throughout this research session) | — | — |

**Missing dependencies with no fallback:** none identified.
**Missing dependencies with fallback:** none — Node version was not directly re-verified in this session but is a pre-existing v1.0 constraint, not new to this phase.

## Security Domain

`security_enforcement` is enabled in `.planning/config.json` (ASVS level 1), but this phase makes no changes to authentication, session handling, input validation, cryptography, or any network-facing surface — it is a pure CSS/build-tooling migration with no new user input paths. The one supply-chain-adjacent concern (adding two new npm packages) is covered above under Package Legitimacy Audit rather than ASVS categories.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|-------------------|
| V2 Authentication | No | App has no accounts/auth (per `CLAUDE.md` constraints) — unaffected by this phase. |
| V3 Session Management | No | No sessions exist in this stateless SPA. |
| V4 Access Control | No | No access-control surface exists or is touched. |
| V5 Input Validation | No | This phase touches no user-input handling code — `TrendDayChart.tsx`'s existing defensive guards (malformed `dateStr`, null `units`) are untouched (className-only rewrite). |
| V6 Cryptography | No | Not applicable to a styling migration. |

### Known Threat Patterns for {stack}

None applicable — no new attack surface is introduced. The only supply-chain consideration (verifying `tailwindcss`/`@tailwindcss/vite` are not slopsquatted packages) is handled by the Package Legitimacy Audit above.

## Sources

### Primary (HIGH confidence)
- `node_modules/leaflet/dist/leaflet.css` — local installed package source, direct read, confirming Leaflet's own `!important` image-sizing overrides.
- `node_modules/leaflet/dist/leaflet-src.js` — local installed package source, direct read, confirming marker icons and tiles are rendered as `<img>` elements (`document.createElement('img')`) and zoom controls are `<a role="button">`, not `<button>`.
- `npm view tailwindcss version` / `npm view tailwindcss dist-tags --json` / `npm view @tailwindcss/vite version` / `npm view tailwindcss scripts.postinstall` / `npm view @tailwindcss/vite scripts.postinstall` — npm registry, direct queries, current version + no postinstall script confirmed.

### Secondary (MEDIUM confidence)
- [raw.githubusercontent.com/tailwindlabs/tailwindcss/main/packages/tailwindcss/preflight.css](https://raw.githubusercontent.com/tailwindlabs/tailwindcss/main/packages/tailwindcss/preflight.css) — direct fetch of the canonical package's current source file (full contents captured, not summarized).
- [raw.githubusercontent.com/tailwindlabs/tailwindcss/main/packages/tailwindcss/index.css](https://raw.githubusercontent.com/tailwindlabs/tailwindcss/main/packages/tailwindcss/index.css) — direct fetch confirming the `@layer theme, base, components, utilities;` expansion.
- [tailwindcss.com/docs/installation/using-vite](https://tailwindcss.com/docs/installation/using-vite) — official docs, CSS-first Vite setup steps.
- [tailwindcss.com/docs/theme](https://tailwindcss.com/docs/theme) — official docs, `@theme` namespace mapping and `:root` variable emission.
- [tailwindcss.com/docs/upgrade-guide](https://tailwindcss.com/docs/upgrade-guide) — official docs, confirms v4 uses native (not Tailwind-hijacked) cascade layers.

### Tertiary (LOW confidence, cross-checked against primary sources above)
- [github.com/tailwindlabs/tailwindcss discussion #17917](https://github.com/tailwindlabs/tailwindcss/discussions/17917) — "Tailwind breaks VideoOverlay in Leaflet"; community discussion, used only to document a pitfall that does not apply to this app (no `VideoOverlay` usage), cross-checked against the actual Preflight source (confirmed `max-width:100%` targets `img, video`, matching the discussion's root-cause explanation).
- General web search results on Tailwind v3-era Preflight behavior — superseded by direct v4 source verification above; included in State of the Art only to flag the v3→v4 mental-model gap.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions confirmed via npm registry, setup pattern confirmed via official docs.
- Architecture / Preflight-Leaflet mechanism: HIGH — verified by direct read of both libraries' actual shipped source, not inferred from secondary discussion.
- Pitfalls: MEDIUM — the map-specific pitfalls are HIGH confidence (source-verified); the general jsdom/tsc-cache pitfalls are standard tooling knowledge, MEDIUM.

**Research date:** 2026-07-16
**Valid until:** 2026-08-15 (30 days — Tailwind v4 ships frequent patch releases; re-verify the installed version's Preflight rule set if planning is delayed past this window, since the `img`/`svg`/`video` rule split is the one fact this whole phase's risk assessment hinges on).
