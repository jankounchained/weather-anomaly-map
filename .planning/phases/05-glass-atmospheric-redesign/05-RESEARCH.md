# Phase 5: Glass / Atmospheric Redesign - Research

**Researched:** 2026-07-16
**Domain:** CSS-only glassmorphism/atmospheric UI on Tailwind v4, disciplined-glass performance, pure color-mapping functions, recharts token re-theme
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** The gradient backdrop is anomaly-driven hue + a day/night atmosphere layer. Anomaly magnitude sets the temperature of the color (cool for cold-anomaly, warm for hot-anomaly, neutral near normal); a separate day/night luminosity layer adds atmosphere.
- **D-02:** The anomaly→color mapping is continuous by z-score/delta (smooth interpolation across the magnitude), NOT discrete verdict-tier buckets. Needs a defined set of anchor colors and a pure, testable mapping function (magnitude → color), mirroring the existing `anomaly.ts` pure-function-then-unit-test pattern.
- **D-03:** The day/night atmosphere layer keys off the pinned location's LOCAL time, not the viewer's browser clock. Open-Meteo already returns the pin's local date/time; confirm the local-time signal is available from existing hook data.
- **D-04:** Glass intensity is "subtle & refined" — gentle translucency, soft depth, light borders/shadows; premium and understated. The anomaly hero number and the trend chart must stay unmistakably legible over any glass.
- **D-05:** The exact composition (docked translucent panel over a static backdrop vs. frosted panel floating over the live map vs. hybrid) is handed to the UI-SPEC, with PERF-01 as the hard constraint. **Resolved by UI-SPEC:** docked panel over a static backdrop (see below — real blur is safe everywhere in this phase's composition).
- **D-06:** The delta hero is color-coded to the backdrop palette (hot = warm, cold = cool). Legibility/contrast over glass is a hard requirement. Delta stays the hero, z-score stays a secondary badge (Phase 2 decision, not disturbed).
- **D-07:** The zero-delta case reads as "right on the 30-year average" with a framed 0 — never a bare, ambiguous "0". Founder chose exact/true-zero framing; planning may extend the same worded framing across the near-normal band.
- **D-08:** Re-theme is recolor to the new palette + light finish polish — swap `--color-chart-*` token VALUES + small finish tweaks. Phase-3 layout (`TrendYAxisColumn`, `TrendLegend` copy) is locked — colors/finish only.
- **D-09:** The actual-value marker's reserved standout hue is handed to the UI-SPEC, constrained to stay clearly distinguishable from historical dots and the mean line. **Resolved by UI-SPEC:** unchanged, stays `#ea580c`.
- **D-10:** Motion is a one-time entrance transition (brief fade/ease on new pin) — NOT a continuous loop. No JS/canvas animation loop at any point. Transition fully disabled under `prefers-reduced-motion`.

### Claude's Discretion
- **Composition / where glass lives (D-05):** Resolved by UI-SPEC — docked `LocationPanel` becomes the static anomaly-gradient backdrop container; the live map region is untouched (no gradient/glass/blur ever sits over `.leaflet-container`). This satisfies PERF-01 by construction.
- **Actual-value marker hue (D-09):** Resolved by UI-SPEC — kept unchanged (`#ea580c`), already fixed and distinguishable.
- **Static-vs-subtle backdrop life:** Resolved to a one-time entrance transition (D-10) — no continuous drift.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. Backlog items (split-violin trend plot, coloring historical dots by decade) remain v2/backlog, NOT part of this re-theme.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DESIGN-01 | Cohesive glassy/atmospheric visual design, noticeable uplift over v1.0 | Architecture Patterns (glass card composition), Code Examples |
| DESIGN-02 | Condition/anomaly-driven CSS gradient backdrop sets the mood | `anomalyColor()` pure function contract, gradient composition pattern, `@property` registration for smooth transitions |
| DESIGN-03 | Translucent depth surfaces (anomaly card, location panel, trend area) with refined typography/spacing | Glass token system (`--color-glass-surface/border`, `--radius-glass-*`, `--shadow-glass`), Tailwind `backdrop-blur-lg` verification |
| DESIGN-04 | Strengthened anomaly hero hierarchy | Hero elevation pattern (higher-opacity glass surface + color-coded 700-weight text), contrast verification approach |
| DESIGN-05 | Recharts trend re-themed to match new palette | Token-value-only re-theme confirmation (inline `var(--color-chart-*)` SVG props), finish-tweak guidance |
| DESIGN-06 | Zero-delta hero case reads clearly, never bare "0" | `VERDICT_LABEL.typical` copy change + `formatDelta` whole-number rounding interaction, test strategy |
| PERF-01 | Real `backdrop-blur` only on static backdrops; map pan/zoom stays smooth | backdrop-filter performance findings, Safari webkit-prefix landmine, structural-guarantee analysis of the chosen composition |
| PERF-02 | All motion gated behind `prefers-reduced-motion`; no JS/canvas animation loops | Tailwind `motion-safe:` variant behavior, `@property`-driven CSS-only transition pattern, reduced-motion verification checklist |
</phase_requirements>

## Summary

This phase has an unusually complete UI-SPEC (`05-UI-SPEC.md`) that already pins the exact algorithm, token values, and CSS composition down to code-level detail — including the `anomalyColor()` piecewise-lerp contract with exact unit-test anchor hex values, the full glass token table, the `@property`-registered gradient CSS, and the copy change for the zero-delta fix. This research therefore focuses on **verifying the UI-SPEC's technical claims against current browser/framework behavior** and surfacing **implementation gaps the UI-SPEC didn't fully spell out** (prop-threading, `relative` positioning, Safari landmines), rather than re-deciding design questions that are already locked.

The central risk (PERF-01) is largely **resolved by the composition choice itself**: because the UI-SPEC puts all three glass cards inside the docked `LocationPanel` — which sits beside, never over, the live Leaflet map — real `backdrop-blur` is safe everywhere in this phase's scope, and the "faux-frosted over the live map" technique researched here is a documented fallback for a *future* phase, not something this phase needs to build. The two genuine technical risks worth flagging to the planner are (1) `@property` registration is required for the entrance transition to actually interpolate color smoothly rather than snap, and its confirmed cross-browser baseline (July 2024) means no fallback path is needed; and (2) the exact-RGB-lerp color algorithm in the UI-SPEC must be implemented literally, not "improved" to OKLCH, because the UI-SPEC's unit-test anchors are exact hex equalities computed from that specific RGB algorithm.

**Primary recommendation:** Implement the UI-SPEC's `anomalyColor()`/`isDaytime()` functions verbatim in `src/anomaly/` with the exact RGB lerp algorithm and anchor colors given (do not substitute OKLCH), register `--anomaly-color` via `@property` in `src/index.css`, thread a new `zScore`/`localHour` prop pair from `App.tsx` down to `LocationPanel` (currently missing), and rely on Tailwind's `backdrop-blur-lg` + `motion-safe:` utilities directly rather than hand-writing media queries.

## Architectural Responsibility Map

This project is a pure static SPA with no backend/API/SSR tier (confirmed: `CLAUDE.md` "Backend: None required — pure static SPA"). All capabilities in this phase collapse into a single tier.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Anomaly→color mapping (`anomalyColor()`) | Browser/Client (pure logic module) | — | Pure function, no DOM/CSSOM dependency; lives in `src/anomaly/` alongside `computeAnomaly`, consumed by the render layer |
| Day/night detection (`isDaytime()`) | Browser/Client (pure logic module) | — | Pure function of `localHour`; no fetch, no DOM |
| Gradient backdrop rendering | Browser/Client (CSS) | — | `@theme` tokens + `@property`-registered custom property + CSS `linear-gradient()`; no JS render loop |
| Glass surface styling | Browser/Client (CSS/Tailwind utilities) | — | Token-driven `backdrop-blur-lg` + translucent background/border/shadow utilities |
| Entrance transition | Browser/Client (CSS) | — | `motion-safe:transition-colors`, triggered implicitly by React re-render with a new custom-property value — never JS-timed |
| Recharts re-theme | Browser/Client (SVG inline `var()` props) | — | Token VALUES only; consumers (`TrendDayChart.tsx`, `TrendLegend.tsx`) already read `var(--color-chart-*)`, established Phase 4 |

**Note for the planner:** Because there is no separate "frontend server" or "API" tier, do not create tasks assuming a build-time vs. runtime split beyond React's own render cycle — every capability above executes in the browser at render/paint time.

## Standard Stack

No new runtime dependencies are required or recommended for this phase (confirmed against `CLAUDE.md`'s "hand-roll, don't add a dependency" stance and the phase's own "no new deps unless justified" instruction). This phase is CSS tokens + two small pure TS functions + prop plumbing.

### Core (existing, unchanged versions)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tailwindcss | 4.3.2 (pinned, no caret) | `@theme` tokens, utility classes, `backdrop-blur-*`, `motion-safe:` variant | Already locked in Phase 4; CSS-first, no config file |
| @tailwindcss/vite | 4.3.2 | Vite build integration | Already locked in Phase 4 |
| recharts | ^3.9.2 | Trend chart SVG rendering | Already locked; re-theme is token-value-only, no version change |

### Supporting
None — no new packages. This phase adds CSS (`@theme` tokens, `@property` rule, gradient CSS) and two pure TypeScript functions (`anomalyColor`, `isDaytime`/`localHourFrom`).

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled RGB-lerp `anomalyColor()` (UI-SPEC-locked) | OKLCH/LCH interpolation via `color-mix()` or a small color library | OKLCH avoids the "muddy gray/brown midpoint" problem of naive single-segment RGB lerp between hue-opposite colors — **but the UI-SPEC's algorithm is a two-segment piecewise lerp through an explicit "normal" anchor**, which already avoids that exact problem, and its unit tests assert **exact hex equality** at anchor points computed from the RGB algorithm. Switching to OKLCH would produce different hex outputs and break those locked test assertions. **Do not substitute.** |
| Inline `style={{ '--anomaly-color': ... }}` bridge (UI-SPEC-locked, one narrow exception) | A `@theme` token per verdict tier + conditional className | Would reintroduce discrete-bucket coloring (D-02 explicitly rejects this — continuous mapping needs a per-render dynamic value, which only an inline CSS-custom-property bridge or a `<style>` tag can express) |

**Installation:** None — no `npm install` needed this phase.

**Version verification:** No new packages to verify. `tailwindcss@4.3.2` and `recharts@3.9.2` are already installed (confirmed via `package.json` read) and unchanged by this phase.

## Package Legitimacy Audit

**Not applicable — this phase installs zero new packages.** All work is CSS tokens (`src/index.css` `@theme` block) plus two new pure TypeScript functions added to existing, already-audited modules (`src/anomaly/`, `src/weather/client.ts`). No `npm install` step exists in this phase's plan.

**Packages removed due to [SLOP] verdict:** none (N/A)
**Packages flagged as suspicious [SUS]:** none (N/A)

## Architecture Patterns

### System Architecture Diagram

```
Pin drop (existing, unchanged)
        │
        ▼
useCurrentWeather(lat,lng) ──► current.localDate, current.tempC
        │                       └─► NEW: current.localHour (parsed from
        │                            existing current.time, zero new fetch)
        ▼
App.tsx computes:
  anomaly = computeAnomalyForToday(...)  (existing, unchanged)
        │
        ├─► anomaly.zScore ────────────┐
        │                              ▼
        │                    anomalyColor(zScore) ──► "#rrggbb"
        │                              │
        └─► current.localHour ─────────┤
                                        ▼
                              isDaytime(localHour) ──► boolean
                                        │
              NEW PROPS (must be threaded, not yet on LocationPanelProps)
                                        ▼
                        <LocationPanel
                           anomalyColor={...}     (or raw zScore, panel computes)
                           isNight={!isDaytime}
                        >
                                        │
                    inline style bridge: --anomaly-color custom property
                    on LocationPanel's root (registered via @property)
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
          .panel-backdrop        AnomalyCard root      TrendRow root
          (gradient + optional   (glass card, opacity   (glass card,
           .is-night ::before)    0.72, hero text        opacity 0.62,
                                  color: var(--anomaly-   contains
                                  color))                 TrendDayChart
                                                           tiles + shared
                                                           TrendYAxisColumn
                                                           + TrendLegend)
                    │
        motion-safe:transition-colors (CSS only, one-shot on re-render,
        no requestAnimationFrame / no JS timer anywhere)
```

### Recommended Project Structure (delta from current tree)
```
src/
├── index.css                 # @theme: + glass tokens, + anomaly-palette
│                              #   anchors, + @property --anomaly-color rule
├── anomaly/
│   ├── anomaly.ts             # + anomalyColor(zScore), + isDaytime(hour)
│   ├── anomaly.test.ts        # + unit tests for both, anchor-point assertions
│   └── types.ts                # unchanged
├── weather/
│   ├── client.ts               # + localHourFrom(currentTime): number
│   ├── client.test.ts          # + test for localHourFrom
│   ├── types.ts                # + localHour: number|null on UseCurrentWeatherResult
│   └── useCurrentWeather.ts    # populate localHour identically to localDate
└── app/
    ├── App.tsx                 # computes anomalyColor+isDaytime, passes down
    ├── LocationPanel.tsx       # NEW props (anomalyColor/isNight), inline
    │                            #   --anomaly-color bridge, .panel-backdrop
    │                            #   wrapper needs `relative` for ::before
    ├── AnomalyCard.tsx          # hero text: color: var(--anomaly-color),
    │                            #   glass card wrapper, zero-delta copy
    │                            #   unaffected (comes from anomaly.ts)
    ├── TrendDayChart.tsx        # only var(--color-chart-*) VALUES change
    └── TrendLegend.tsx          # unchanged (copy locked, colors via tokens)
```

### Pattern 1: Continuous anomaly→color pure function (D-02)
**What:** A pure function mirroring the `anomaly.ts` pure-function-then-unit-test pattern: `anomalyColor(zScore: number | null): string`.
**When to use:** Any place the anomaly-hue needs to render — backdrop gradient base, hero delta text color. Both consume the SAME function output (one shared color source, per CONTEXT.md's "Integration Points" note) — never compute color independently in two places.
**Example (from UI-SPEC, verbatim algorithm — implement exactly, do not modify the color-space):**
```typescript
// src/anomaly/anomaly.ts (new additions, same file as computeAnomaly)
const ANOMALY_COLD = { r: 30, g: 58, b: 138 }   // #1e3a8a, z <= -3
const ANOMALY_NORMAL = { r: 87, g: 83, b: 78 }  // #57534e, z = 0
const ANOMALY_HOT = { r: 154, g: 52, b: 18 }    // #9a3412, z >= +3

function lerpChannel(c1: number, c2: number, t: number): number {
  return Math.round(c1 + (c2 - c1) * t)
}

function toHex(rgb: { r: number; g: number; b: number }): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, n))
  const hex = (n: number) => clamp(n).toString(16).padStart(2, '0')
  return `#${hex(rgb.r)}${hex(rgb.g)}${hex(rgb.b)}`
}

/** Continuous z-score -> anomaly-palette color (D-02). Null treated as
 * z=0, same fallback precedent as classifyVerdict's `zScore ?? 0`. */
export function anomalyColor(zScore: number | null): string {
  const z = Math.max(-3, Math.min(3, zScore ?? 0))
  if (z <= 0) {
    const t = (z + 3) / 3
    return toHex({
      r: lerpChannel(ANOMALY_COLD.r, ANOMALY_NORMAL.r, t),
      g: lerpChannel(ANOMALY_COLD.g, ANOMALY_NORMAL.g, t),
      b: lerpChannel(ANOMALY_COLD.b, ANOMALY_NORMAL.b, t),
    })
  }
  const t = z / 3
  return toHex({
    r: lerpChannel(ANOMALY_NORMAL.r, ANOMALY_HOT.r, t),
    g: lerpChannel(ANOMALY_NORMAL.g, ANOMALY_HOT.g, t),
    b: lerpChannel(ANOMALY_NORMAL.b, ANOMALY_HOT.b, t),
  })
}
```
**Why two segments, not one lerp:** a single COLD→HOT lerp would pass through a muddy gray/brown midpoint (COLD and HOT are near-opposite hues) and would NOT land exactly on the NORMAL anchor at z=0 — the UI-SPEC's unit tests assert exact equality (`z=0 → #57534e`), which only a two-segment piecewise lerp through that anchor guarantees.

### Pattern 2: Day/night as an independent axis (D-03)
**What:** `isDaytime(localHour: number): boolean => localHour >= 6 && localHour < 20`, applied as a CSS overlay wash, never touching the hero text color.
**When to use:** Only for the backdrop gradient's `.is-night` overlay class. The hero delta text always shows the pure `anomalyColor()` value regardless of time of day (legibility consistency, per UI-SPEC).
**Required plumbing gap (not explicit in UI-SPEC's file list, found during this research):** `useCurrentWeather`'s `localDate` is date-only — `localDateFrom` in `client.ts` splits `current.time` on `"T"` and discards the hour. Add a sibling pure function:
```typescript
// src/weather/client.ts
/** Location-local hour-of-day (0-23) from Open-Meteo's "YYYY-MM-DDTHH:mm"
 * current.time (already pin-local via timezone=auto). Sibling to
 * localDateFrom - same string, different slice (D-03). */
export function localHourFrom(currentTime: string): number {
  const timePart = currentTime.split('T')[1] ?? '00:00'
  return Number(timePart.slice(0, 2))
}
```
Then add `localHour: number | null` to `UseCurrentWeatherResult` and populate it identically to `localDate` in `useCurrentWeather.ts` (same resolved-object/idle/loading branches). Zero new network calls.

### Pattern 3: Missing prop-threading from App.tsx to LocationPanel (found during this research, not spelled out in UI-SPEC)
**What:** `LocationPanel`'s current props (`LocationPanelProps extends LocationDisplayProps`) are `hasSelection`, `status`, `name`, `lat`, `lng`, `children` — **there is no `zScore`/`localHour`/color prop today.** The anomaly (`anomaly.zScore`) and `current.localHour` both live in `App.tsx`'s render scope, not in `LocationPanel`.
**When to use:** This phase MUST extend `LocationPanelProps` with something like `zScore: number | null` and `localHour: number | null` (or pre-computed `anomalyColorValue: string` and `isNight: boolean` — computing in `App.tsx` keeps `LocationPanel` a pure presentation component, consistent with existing conventions where `App.tsx` does all anomaly computation and children only render).
**Recommendation:** Compute `anomalyColor(anomaly?.zScore ?? null)` and `isDaytime(current.localHour ?? 12)` in `App.tsx` (default to daytime/noon when `localHour` is unavailable, e.g. before data resolves — avoids a false "night" flash), pass both down as simple props, and have `LocationPanel` apply the inline `style={{ '--anomaly-color': ... }}` bridge and the `is-night` conditional class on its root.

### Pattern 4: `@property`-registered custom property for smooth gradient transitions (PERF-02)
**What:** Without `@property` registration, an un-typed CSS custom property is treated as an opaque string by the animation engine — a transition on a gradient that reads `var(--anomaly-color)` will NOT interpolate; it snaps at the halfway point of the transition duration instead of fading.
**When to use:** Register `--anomaly-color` once in `src/index.css`, outside `@theme` (theme tokens are static;`@property` is a distinct at-rule):
```css
/* Source: MDN CSS Properties and Values API guide, web.dev @property Baseline */
@property --anomaly-color {
  syntax: '<color>';
  inherits: true;
  initial-value: #57534e;
}
```
**Browser support (verified):** `@property` reached Baseline (all major engines) as of July 2024 — Chrome/Edge 85+, Safari 16.4+, Firefox 128+. No fallback path is needed by 2026; every evergreen browser interprets this correctly. [CITED: web.dev "@property: Next-gen CSS variables now with universal browser support"]

### Anti-Patterns to Avoid
- **Building the faux-frosted-over-live-map technique this phase:** The UI-SPEC's chosen composition (docked panel beside the map) means real `backdrop-blur` is safe everywhere in THIS phase's scope. Do not build a `::before` pre-blurred-background fallback or any "no real blur" faux technique — it solves a problem this phase's composition doesn't have, and would be wasted, hard-to-verify effort. Only revisit if a future phase floats glass over the live map.
- **Switching the color algorithm to OKLCH "for smoother gradients":** The UI-SPEC's unit-test contract asserts exact hex equality at anchor points (`z=-3 → #1e3a8a` etc.) computed from the specific RGB two-segment lerp. OKLCH would change these outputs and break the locked test contract — implement the RGB algorithm exactly as specified.
- **Animating an unregistered custom property and expecting a smooth fade:** Skipping the `@property` rule silently degrades the "one-time entrance transition" (PERF-02/D-10) to an instant snap with no error — verify visually, don't assume the transition works just because `motion-safe:transition-colors` is present.
- **Relying on `-webkit-backdrop-filter` + a CSS custom property for the blur AMOUNT:** Older Safari's prefixed implementation does not reliably resolve `var()`-driven filter values. Keep the blur amount a plain Tailwind utility (`backdrop-blur-lg`) rather than an arbitrary `backdrop-blur-(--my-var)` value — Tailwind already emits both `-webkit-backdrop-filter` and `backdrop-filter` with the literal `16px` value for any static utility class.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| `prefers-reduced-motion` gating | A custom `@media (prefers-reduced-motion: reduce)` block per component | Tailwind's `motion-safe:` variant | Already wraps the media query correctly; verified to emit nothing under reduced-motion (no fallback JS path to accidentally bypass it) |
| Vendor-prefixed `backdrop-filter` | Manual `-webkit-backdrop-filter` duplication | Tailwind's `backdrop-blur-*` utilities | Tailwind v4 already emits both properties for every `backdrop-*` utility via its Lightning-CSS-based build (not dependent on autoprefixer) |
| Color interpolation math | A general-purpose color library (chroma-js, culori) | The 6-line hand-rolled `anomalyColor()` per CLAUDE.md's "hand-roll, don't add a dependency" | Exactly the kind of small, deterministic, unit-testable pure function the project already established with `anomaly.ts`; a library is unjustified bundle weight for one function |

**Key insight:** This entire phase is deliberately dependency-free — every requirement (DESIGN-01..06, PERF-01/02) is satisfiable with existing Tailwind v4 utilities, two new pure functions, and CSS-native features (`@property`, `color-mix()`) that are already Baseline-supported. Reaching for any new package here would contradict both `CLAUDE.md` and the phase's own "styling and visual design only" framing.

## Common Pitfalls

### Pitfall 1: Un-registered `--anomaly-color` silently breaks the entrance transition
**What goes wrong:** The gradient/hero-text color snaps instantly instead of fading on a new pin, even though `motion-safe:transition-colors` is present in the className.
**Why it happens:** CSS cannot interpolate an unregistered custom property (it's an opaque string to the animation engine) — this fails silently, with no console warning.
**How to avoid:** Add the `@property --anomaly-color { syntax: '<color>'; inherits: true; initial-value: #57534e; }` rule in `src/index.css` before relying on the transition.
**Warning signs:** Visual QA of a pin-to-pin transition shows an instant color jump instead of a ~300ms fade.

### Pitfall 2: `LocationPanel` needs `position: relative` for the night-wash `::before` overlay
**What goes wrong:** `.panel-backdrop.is-night::before { position: absolute; inset: 0; ... }` renders relative to the nearest positioned ancestor — if `LocationPanel`'s root (currently a plain `<aside>` with no `relative`) isn't positioned, the overlay escapes to the nearest positioned ancestor up the tree (or the viewport), covering the wrong area or nothing visible.
**Why it happens:** `<aside className="flex-[0_0_760px] ...">` today has no `relative`/`absolute`/`fixed` positioning declared.
**How to avoid:** Add `relative` to the panel-backdrop root's className alongside the new glass/gradient classes.
**Warning signs:** Night wash either doesn't appear or covers the whole viewport/map region instead of just the panel.

### Pitfall 3: Zero-delta copy change interacts with `formatDelta`'s existing rounding
**What goes wrong:** Founder's illustrative example was `"0.0°C — right on the 30-year average"` (with a decimal), but `formatDelta` deliberately rounds to whole numbers with no decimal (`Pitfall 4` in the existing codebase — anti-false-precision policy). Implementing the founder's example literally would require adding decimal display, silently reopening a previously-closed precision decision.
**Why it happens:** The founder's illustrative wording and the existing `formatDelta` contract are in tension; CONTEXT.md explicitly notes this and resolves it (UI-SPEC section "Copywriting Contract" confirms: keep whole-number `"0"`, do not add decimals).
**How to avoid:** Only change `VERDICT_LABEL.typical` (`"Typical for today"` → `"Right on the 30-year average"`); do NOT touch `formatDelta`'s rounding behavior. Rendered result: `"0°C"` immediately followed by `"Right on the 30-year average"`.
**Warning signs:** A diff that touches `formatDelta`'s rounding logic when only the verdict label needed to change is a sign of scope creep on this pitfall.

### Pitfall 4: Contrast regression on the AnomalyCard's error state
**What goes wrong:** `text-destructive` (`#dc2626`) previously sat on flat `bg-secondary` (`#f4f5f7`); after this phase it sits on the "neutral-anchor" glass surface (`rgba(255,255,255,0.72)` over an `anomalyColor(null)` gradient background, i.e. `#57534e`-tinted). The effective background color changed — the old contrast ratio calculation no longer applies.
**Why it happens:** Glass surfaces are translucent, so their effective rendered color depends on what's behind them (the gradient), not just the surface's own alpha value.
**How to avoid:** UI-SPEC already flags this as a 🧪 backstop item — verify contrast visually (or with a contrast-checker tool) against the actual composited color, not the flat `bg-secondary` value from before.
**Warning signs:** Skipping the UI Considerations table's 🧪 backstop items during implementation.

### Pitfall 5: `localHour` default before data resolves
**What goes wrong:** Before `current.localHour` resolves (idle/loading state), a naive `isDaytime(current.localHour)` call with `null`/`undefined` coerced to `0` would incorrectly read as night (`0 >= 6` is false) during every loading state, causing a flash of night-wash on every pin drop regardless of actual time of day.
**Why it happens:** `localHour` is `null` until the current-weather fetch resolves (same idle/loading/resolved lifecycle as `localDate`).
**How to avoid:** Default to daytime (e.g. treat `null` as noon, `12`) while loading, matching the "neutral, waiting" mood already established for `anomalyColor(null)` in the no-pin/loading gradient state — don't let a data-loading artifact imply "it's night" before the real local hour is known.
**Warning signs:** Every pin drop briefly shows a dark overlay before the real gradient/wash resolves.

## Code Examples

### Gradient backdrop composition (from UI-SPEC, verified CSS features)
```css
/* Source: 05-UI-SPEC.md Layout & Composition, verified against
   color-mix() Baseline 2023 (Chrome 111/Firefox 113/Safari 16.2) and
   @property Baseline July 2024 */
@property --anomaly-color {
  syntax: '<color>';
  inherits: true;
  initial-value: #57534e;
}

.panel-backdrop {
  position: relative; /* required for the .is-night ::before overlay */
  background: linear-gradient(155deg,
    color-mix(in srgb, var(--anomaly-color) 80%, white 20%) 0%,
    var(--anomaly-color) 55%,
    color-mix(in srgb, var(--anomaly-color) 75%, black 25%) 100%);
}

.panel-backdrop.is-night::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--color-atmosphere-night-wash);
  pointer-events: none;
}
```

### Motion-safe entrance transition (Tailwind utilities, no custom media query)
```tsx
// panel-backdrop element and hero delta text element both get:
className="... motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-out"
```
Under `prefers-reduced-motion: reduce`, Tailwind emits none of the `transition-*` properties for `motion-safe:`-prefixed utilities — the element snaps instantly to the new `--anomaly-color` value, satisfying success criterion #5 (no motion, no animation loop) without any additional code. [CITED: Tailwind CSS docs, "Prefers reduced motion" pseudo-class variants]

### Glass card token application (Tailwind v4 arbitrary + theme utilities)
```tsx
// Example: AnomalyCard hero wrapper (higher opacity than sibling cards)
<div className="relative rounded-[16px] border border-glass-border bg-[rgba(255,255,255,0.72)] backdrop-blur-lg shadow-glass p-lg">
  <p style={{ color: 'var(--anomaly-color)' }}
     className="m-0 text-[calc(var(--text-display)*1.7)] font-bold leading-[1.1] motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-out">
    {formatDelta(anomaly.delta)}°C
  </p>
  ...
```
Note: `border-glass-border`/`shadow-glass` assume corresponding `@theme` tokens (`--color-glass-border`, `--shadow-glass`) are added per the UI-SPEC's token table — Tailwind auto-generates the utility class name from the token name (`--color-glass-border` → `border-glass-border`, `--shadow-glass` → `shadow-glass`).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `-webkit-backdrop-filter` only (Safari) | Unprefixed `backdrop-filter` fully supported | Safari 18.5, June 2026 | Still declare both — Tailwind v4 already does this automatically for every `backdrop-*` utility, no action needed |
| Un-interpolable custom properties (string-only) | `@property`-registered typed custom properties, natively animatable | Baseline since July 2024 (Firefox 128 was the last holdout) | Enables the smooth one-time entrance transition (D-10) without any JS animation code |
| Manual RGB-only gradients (banding-prone) | `color-mix()` in modern color spaces | Baseline since 2023 | Used here only for deriving lighter/darker gradient stops from one dynamic base color — the UI-SPEC intentionally keeps the anchor-point interpolation itself in plain RGB (see Pitfall/Anti-Pattern above), so this is a narrow, cosmetic use, not the core color-math engine |

**Deprecated/outdated:**
- Pre-blurred `::before` background-image faux-glass hack: superseded by `backdrop-filter` everywhere it's safe to use it (which, per this phase's composition, is everywhere in scope) — not needed this phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Defaulting `isDaytime` to `true` (noon) while `localHour` is null/loading is the correct UX choice to avoid a night-wash flash | Pitfall 5 | Low — cosmetic only; if wrong, worst case is a brief incorrect day/night wash during the loading state, self-corrects once data resolves. This is a researcher recommendation filling a genuine UI-SPEC gap, not a verified external fact — flag for a quick confirm during planning/discuss if there's any doubt. |
| A2 | `App.tsx` should compute `anomalyColor()`/`isDaytime()` and pass primitives down, rather than `LocationPanel` computing them itself from raw `zScore`/`localHour` props | Pattern 3 | Low — either approach works; this follows the codebase's existing convention (App.tsx does all anomaly computation, children only render) more closely, but a planner could reasonably choose the alternative without correctness risk. |

**All other claims in this research are `[CITED]` (official docs/MDN/web.dev/Tailwind docs referenced via search) or `[VERIFIED]` (read directly from the project's own source files) — no other claims require user confirmation before execution.**

## Open Questions

1. **Exact `--color-atmosphere-night-wash` rendering approach: `::before` overlay vs. second `background-image` layer**
   - What we know: UI-SPEC offers both as equivalent options ("e.g. a second `background-image` layer or `::before` overlay").
   - What's unclear: Which is simpler given `.panel-backdrop`'s existing `bg-secondary`/token-driven background approach.
   - Recommendation: Use the `::before` overlay (shown in Code Examples above) — it composes cleanly with the `linear-gradient()` background already on the same element without needing multi-layer `background-image` syntax, and it's the pattern the UI-SPEC's own CSS snippet demonstrates.

## Environment Availability

Skipped — this phase has no external dependencies beyond the already-installed npm packages (`tailwindcss@4.3.2`, `recharts@3.9.2`) confirmed present in `package.json`, and no new tools/services/CLIs are introduced. All new CSS features used (`@property`, `color-mix()`) are browser-native, requiring no build tooling beyond what Vite/Tailwind v4 already provides.

## Security Domain

`security_enforcement` is enabled (`.planning/config.json` `security_enforcement: true`, ASVS level 1). This phase is presentation-only — no new inputs, no new data flows, no new dependencies.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | No auth in this app (confirmed, PROJECT.md: no accounts) |
| V3 Session Management | No | Stateless SPA, no sessions |
| V4 Access Control | No | No access-control surface |
| V5 Input Validation | No new surface | No new user input this phase — `anomalyColor`/`isDaytime` consume only already-validated numeric values (`zScore`, `localHour`) computed from existing, already-defensively-parsed API responses (`client.ts`'s existing V5 guards, confirmed unchanged) |
| V6 Cryptography | No | Not applicable, no secrets/crypto in this app |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Raw-HTML injection via dynamic copy (verdict label, tooltip text) | Tampering/Info Disclosure | Already established discipline (confirmed via code read): all dynamic text renders as ordinary JSX text nodes, never `dangerouslySetInnerHTML` — the zero-delta copy change (DESIGN-06) and any new color-string values must continue this pattern. `anomalyColor()`'s output is a computed hex string consumed only via `style={{ color: ... }}` / a CSS custom property — never interpolated into a template that could be interpreted as markup. |
| CSS-injection via unsanitized dynamic values | Tampering | `anomalyColor()`'s output is fully computed (not user-controlled — derived from a numeric `zScore` that itself derives from Open-Meteo API data, clamped to `[-3,3]` before use) and always produces a well-formed `#rrggbb` string via the `toHex`/`clamp` helpers — no free-form string ever reaches a `style` attribute. |

## Sources

### Primary (HIGH confidence)
- `.planning/phases/05-glass-atmospheric-redesign/05-UI-SPEC.md` — the authoritative pixel-level design contract for this phase (read directly)
- `.planning/phases/05-glass-atmospheric-redesign/05-CONTEXT.md` — locked decisions D-01..D-10 (read directly)
- Project source files read directly: `src/index.css`, `src/app/App.tsx`, `src/app/LocationPanel.tsx`, `src/app/AnomalyCard.tsx`, `src/app/TrendDayChart.tsx`, `src/app/TrendLegend.tsx`, `src/anomaly/anomaly.ts`, `src/anomaly/types.ts`, `src/weather/useCurrentWeather.ts`, `src/weather/types.ts`, `src/weather/client.ts`, `package.json`

### Secondary (MEDIUM confidence — WebSearch cross-referencing official/authoritative sources)
- web.dev, "@property: Next-gen CSS variables now with universal browser support" — `@property` Baseline support timeline (Chrome 85+, Safari 16.4+, Firefox 128+/July 2024)
- MDN, "Registering custom properties in CSS" / "Using the CSS properties and values API" — `@property` interpolation semantics
- caniuse.com (`color-mix`, `css-backdrop-filter`) — browser support tables
- Tailwind CSS official docs (`tailwindcss.com/docs/backdrop-filter-blur`, `.../animation`) — `backdrop-blur-*` scale, `motion-safe:`/`motion-reduce:` variant behavior
- GitHub `tailwindlabs/tailwindcss` PR #13997 ("Always generate -webkit-backdrop-filter property") — confirms Tailwind v4 auto-emits the Safari-prefixed property
- MDN browser-compat-data issue #25914 / testmuai.com — Safari `-webkit-backdrop-filter` + CSS-variable limitation, Safari 18.5 unprefixed support date
- toolbox365.net "Why CSS gradients look grayish: banding, dirty mid-tones, and OKLCH" — RGB-lerp midpoint desaturation problem, used to validate (not override) the UI-SPEC's two-segment-through-anchor lerp design

### Tertiary (LOW confidence)
None flagged for validation — all WebSearch findings above corroborate against official/authoritative domains (web.dev, MDN, caniuse, tailwindcss.com, github.com/tailwindlabs) and are used only to verify implementation-technique claims, not to introduce new unverified design decisions.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, all versions confirmed from `package.json`
- Architecture: HIGH — UI-SPEC + CONTEXT.md are authoritative and were read directly; gaps found (prop-threading, `relative` positioning) are logic-verified against the actual current source, not speculative
- Pitfalls: HIGH — each pitfall traces to either a direct code read (e.g. missing `LocationPanelProps` fields, missing `relative`) or a corroborated browser-support fact (e.g. `@property` interpolation requirement)

**Research date:** 2026-07-16
**Valid until:** 2026-08-15 (30 days — CSS feature support tables and Tailwind v4 utility behavior are stable; re-verify if Tailwind is upgraded past 4.3.2 before this phase executes)
