# Phase 4: Tailwind Foundation Migration - Pattern Map

**Mapped:** 2026-07-16
**Files analyzed:** 9 (1 tooling config, 1 CSS entry rewrite, 1 import-order file, 6 component className rewrites; App.css/index.css deleted, not "analyzed" as targets)
**Analogs found:** 9 / 9 (all analogs are the files' own CURRENT pre-migration state — this is a rewrite-in-place phase, not new-file-from-template)

This phase has an unusual pattern-mapping shape: there is no "closest analog elsewhere in the codebase" to search for, because every target file's own current version IS the analog — the planner needs a precise BEM-class -> Tailwind-utility 1:1 translation table per file, not a different file's pattern to imitate. This document provides that translation surface directly.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|---------------|
| `vite.config.ts` | config | request-response (build plugin pipeline) | current `vite.config.ts` (add plugin) | exact — official Tailwind Vite doc pattern |
| `src/index.css` | config/style-entry | transform (CSS build-time) | current `src/index.css` (token source) | exact — direct token port |
| `src/main.tsx` | entry/bootstrap | event-driven (app mount) | current `src/main.tsx` | exact — one-line import target swap |
| `src/app/App.tsx` | component | request-response (render tree root) | current `src/app/App.tsx` + `src/app/App.css` (`.app-shell`, `.map-region`) | exact |
| `src/app/AnomalyCard.tsx` | component | request-response (conditional render by status) | current `src/app/AnomalyCard.tsx` + `App.css` (`.anomaly-card*`, `.location-display__spinner` keyframe) | exact |
| `src/app/LocationDisplay.tsx` | component | request-response | current `src/app/LocationDisplay.tsx` + `App.css` (`.location-display*`) | exact |
| `src/app/LocationPanel.tsx` | component | request-response | current `src/app/LocationPanel.tsx` + `App.css` (`.location-panel*`) | exact |
| `src/app/TrendRow.tsx` | component | request-response | current `src/app/TrendRow.tsx` + `App.css` (`.trend-row*`) | exact |
| `src/app/TrendDayChart.tsx` | component (SVG/Recharts) | transform (data -> chart) | current `src/app/TrendDayChart.tsx` + `App.css` (`.trend-day*`) | exact — `var(--color-*)` inline props untouched |
| `src/app/TrendLegend.tsx` | component (SVG) | transform | current `src/app/TrendLegend.tsx` + `App.css` (`.trend-legend*`) | exact — `var(--color-*)` inline props untouched |
| `src/app/App.css` | stylesheet | n/a | — | **DELETE** (D-02), no replacement file, rules migrate into utilities/`@theme` |

No "No Analog Found" files — every target is a rewrite of an existing file with a fully known current state.

## Shared Patterns

### A. Tooling wiring — `vite.config.ts`

**Source:** current `/Users/janko/Repositories/gsd-test/vite.config.ts` (11 lines, full file)
```typescript
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
  },
})
```
**Change:** add `import tailwindcss from '@tailwindcss/vite'` and insert `tailwindcss()` into the `plugins` array alongside `react()`. Nothing else in this file changes (test config, comment, defineConfig shape all stay).

**Apply to:** the single tooling-config plan/action item.

---

### B. Design-token port — `src/index.css` full current `:root` block (verbatim, this is the source of truth for `@theme`)

**Source:** `/Users/janko/Repositories/gsd-test/src/index.css` lines 1-76 (full file, already read completely — no re-read needed)

```css
:root {
  /* Spacing scale (UI-SPEC) */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;

  /* Color roles (UI-SPEC) */
  --color-dominant: #ffffff;
  --color-secondary: #f4f5f7;
  --color-accent: #2563eb;
  --color-destructive: #dc2626;

  /* Trend chart tokens (03-UI-SPEC.md Chart Visual Encoding) */
  --color-chart-historical: rgba(37, 99, 235, 0.22);
  --color-chart-mean: var(--color-accent);
  --color-chart-actual: #ea580c;
  --color-muted: #4b5563;
  --color-border-subtle: #e5e7eb;

  /* Typography (UI-SPEC) */
  --font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    Helvetica, Arial, sans-serif;

  --font-size-body: 16px;
  --font-weight-body: 400;
  --line-height-body: 1.5;

  --font-size-label: 14px;
  --font-weight-label: 400;
  --line-height-label: 1.4;

  --font-size-heading: 20px;
  --font-weight-heading: 600;
  --line-height-heading: 1.2;

  --font-size-display: 28px;
  --font-weight-display: 600;
  --line-height-display: 1.2;

  color-scheme: light;
}

*, *::before, *::after { box-sizing: border-box; }  /* now covered by Preflight — safe to drop */

html, body, #root { height: 100%; margin: 0; }  /* keep verbatim — not covered by Preflight */

body {
  font-family: var(--font-family-base);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-body);
  line-height: var(--line-height-body);
  color: #08060d;
  background: var(--color-dominant);
}
```

**HARD REQUIREMENT (D-04 / grep-verified in RESEARCH.md):** these 4 token *names* must survive byte-for-byte under `@theme` because `TrendDayChart.tsx` and `TrendLegend.tsx` reference them as literal strings in inline SVG props — renaming silently breaks chart colors with no compile error:
- `--color-chart-historical`
- `--color-chart-mean`
- `--color-chart-actual`
- `--color-muted`

The remaining tokens (`--space-*`, `--font-family-base`, `--font-size-*`, `--font-weight-*`, `--line-height-*`, `--color-dominant`, `--color-secondary`, `--color-accent`, `--color-destructive`, `--color-border-subtle`) are **not** referenced from any `.tsx`/`.ts` file (only from the CSS being deleted) — free to remap into Tailwind's native `@theme` namespaces (`--spacing-*`, `--text-*`, `--font-weight-*`) or kept as-is; RESEARCH.md's Pattern 1 example shows the recommended remap.

**`body` selector styling** (`color: #08060d`, `background: var(--color-dominant)`, font shorthand) has no single utility equivalent applied globally without a component wrapper — RESEARCH.md's Pattern 1 example keeps `html, body, #root { height: 100%; margin: 0; }` and `:root { color-scheme: light; }` as plain CSS in the new entry file (not expressible as a utility), but drops the explicit `body` font/color block since Tailwind's own base layer + `@theme` font/color vars typically get applied via the root `<div className="...">` in `App.tsx` instead — planner's call, either approach satisfies D-02.

**Apply to:** `src/index.css` rewrite (the one genuinely new file: `@import "tailwindcss"; @theme {...}; @keyframes location-display-spin {...}`).

---

### C. Spinner keyframe — irreducible CSS (D-03)

**Source:** `App.css` lines 84-88 (verbatim, reused by both `.location-display__spinner` line 81 and `.anomaly-card__spinner` line 122)
```css
@keyframes location-display-spin {
  to {
    transform: rotate(360deg);
  }
}
```
Both spinner usages share: `width: 16px; height: 16px; flex: 0 0 auto; border: 2px solid var(--color-accent); border-top-color: transparent; border-radius: 50%; animation: location-display-spin 0.8s linear infinite;`

**Apply to:** kept in the Tailwind entry file, exposed as a `--animate-*` `@theme` token (see RESEARCH.md Pattern 1: `--animate-location-spin: location-display-spin 0.8s linear infinite;`) so both `AnomalyCard.tsx`'s spinner span and `LocationDisplay.tsx`'s spinner span can use `className="... animate-location-spin ..."` instead of a bespoke `.spinner` class — consistent with D-01's "full utility classes in JSX."

---

### D. Import-order file — `src/main.tsx`

**Source:** `/Users/janko/Repositories/gsd-test/src/main.tsx` lines 1-9 (already fully read)
```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './app/App.tsx'
```
**Change:** none of the import *order* needs to change (RESEARCH.md confirms cascade-layer precedence is layer-membership-based, not import-order-based) — only the *content* of `./index.css` changes (it becomes the Tailwind entry). Leave line 7-8 exactly as-is.

**Apply to:** `src/main.tsx` — zero-diff or near-zero-diff file; do not "fix" the import order, it's already correct.

## Pattern Assignments (BEM -> Utility translation surface, per component)

### `src/app/App.tsx` (2 `className=` sites)

**Current classes + full CSS rules to translate (`App.css` lines 1-19):**
```css
.app-shell {
  display: flex; flex-direction: row; width: 100vw; height: 100vh; overflow: hidden;
}
.map-region {
  flex: 1 1 auto; min-width: 0; height: 100%; background: var(--color-dominant);
}
.map-region .leaflet-container { width: 100%; height: 100%; }
```
**JSX sites** (`App.tsx` lines 74-75):
```tsx
<div className="app-shell">
  <div className="map-region">
```
Note: `.map-region .leaflet-container` is a **descendant selector targeting Leaflet's own generated DOM** — this cannot be replaced by a utility class on `map-region` alone; it must remain scoped CSS (a tiny irreducible rule in the Tailwind entry, `.map-region .leaflet-container { width: 100%; height: 100%; }`) OR be handled via an `[&_.leaflet-container]:w-full [&_.leaflet-container]:h-full` arbitrary-variant utility on the `map-region` div (Tailwind v4 supports this natively) — planner's discretion, flag as its own micro-decision.

---

### `src/app/AnomalyCard.tsx` (14 `className=` sites across 4 branches)

**Full CSS block to translate** (`App.css` lines 90-185):
```css
.anomaly-card { display: flex; flex-direction: column; gap: var(--space-sm); }
.anomaly-card__body { margin: 0; font-size: var(--font-size-body); font-weight: var(--font-weight-body); line-height: var(--line-height-body); }
.anomaly-card__temp { margin: 0; font-size: var(--font-size-display); font-weight: var(--font-weight-display); line-height: var(--line-height-display); }
.anomaly-card--loading { flex-direction: row; align-items: center; }
.anomaly-card__spinner { width: 16px; height: 16px; flex: 0 0 auto; border: 2px solid var(--color-accent); border-top-color: transparent; border-radius: 50%; animation: location-display-spin 0.8s linear infinite; }
.anomaly-card--error .anomaly-card__body { color: var(--color-destructive); }
.anomaly-card--resolved { gap: var(--space-xs); }
.anomaly-card__header { display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: var(--space-sm); }
.anomaly-card__info { width: 20px; height: 20px; flex: 0 0 auto; border: 1px solid var(--color-accent); border-radius: 50%; background: transparent; color: var(--color-accent); font-size: var(--font-size-label); font-weight: var(--font-weight-heading); line-height: 1; cursor: help; padding: 0; }
.anomaly-card__delta { margin: 0; font-size: calc(var(--font-size-display) * 1.7); font-weight: 700; line-height: 1.1; }
.anomaly-card__verdict { margin: 0; font-size: var(--font-size-heading); font-weight: var(--font-weight-heading); line-height: var(--line-height-heading); }
.anomaly-card__zscore { margin: var(--space-xs) 0 0; display: inline-block; width: fit-content; font-size: var(--font-size-label); font-weight: var(--font-weight-label); line-height: var(--line-height-label); color: #4b5563; background: var(--color-secondary); border-radius: 999px; padding: 2px var(--space-sm); }
```
Note: `.anomaly-card__delta`'s `calc(var(--font-size-display) * 1.7)` has no direct Tailwind utility — needs an arbitrary-value utility, e.g. `text-[calc(var(--text-display)*1.7)]`, or a dedicated `@theme` token (planner discretion).

**JSX sites** (`AnomalyCard.tsx`, all 4 branches, lines 33/34/46/47/48/57/58/66/67/68/74/81/82/83):
```tsx
// Empty branch
<div className="anomaly-card anomaly-card--empty">
  <p className="anomaly-card__body">...</p>
// Loading branch
<div className="anomaly-card anomaly-card--loading" role="status">
  <span className="anomaly-card__spinner" aria-hidden="true" />
  <p className="anomaly-card__body">...</p>
// Error branch
<div className="anomaly-card anomaly-card--error">
  <p className="anomaly-card__body">...</p>
// Resolved branch
<div className="anomaly-card anomaly-card--resolved">
  <div className="anomaly-card__header">
    <p className="anomaly-card__temp">...</p>
    <button className="anomaly-card__info" ...>i</button>
  <p className="anomaly-card__delta">...</p>
  <p className="anomaly-card__verdict">...</p>
  <p className="anomaly-card__zscore">...</p>
```
**RESEARCH.md's worked example** for `.anomaly-card__info` (lines 298-317 of RESEARCH.md) is the canonical translation reference:
```tsx
<button
  type="button"
  className="h-5 w-5 shrink-0 rounded-full border border-accent bg-transparent p-0 text-accent text-label font-heading leading-none cursor-help"
  aria-label="Data quality info"
  title="Based on modeled climate data for this area (~9-25km resolution)"
>
  i
</button>
```
Use this pattern (flex/spacing/color/typography utilities driven by the same `@theme` tokens) for every other class in this file.

---

### `src/app/LocationDisplay.tsx` (10 `className=` sites across 4 branches)

**Full CSS block** (`App.css` lines 42-82):
```css
.location-display { display: flex; flex-direction: column; gap: var(--space-sm); }
.location-display__heading { margin: 0; font-size: var(--font-size-heading); font-weight: var(--font-weight-heading); line-height: var(--line-height-heading); }
.location-display__body { margin: 0; font-size: var(--font-size-body); font-weight: var(--font-weight-body); line-height: var(--line-height-body); }
.location-display__label { margin: 0; font-size: var(--font-size-label); font-weight: var(--font-weight-label); line-height: var(--line-height-label); }
.location-display--loading { flex-direction: row; align-items: center; }
.location-display__spinner { width: 16px; height: 16px; flex: 0 0 auto; border: 2px solid var(--color-accent); border-top-color: transparent; border-radius: 50%; animation: location-display-spin 0.8s linear infinite; }
```
**JSX sites** (`LocationDisplay.tsx` lines 27/28/29/40/41/43/44/51/52/60/61):
```tsx
// Empty
<div className="location-display location-display--empty">
  <h2 className="location-display__heading">...</h2>
  <p className="location-display__body">...</p>
// Loading
<div className="location-display location-display--loading" role="status">
  <span className="location-display__spinner" aria-hidden="true" />
  <p className="location-display__body">...</p>
// Resolved
<div className="location-display location-display--resolved">
  <h2 className="location-display__heading">{name}</h2>
// Fallback
<div className="location-display location-display--fallback">
  <p className="location-display__label">...</p>
```
`.location-display__spinner` is identical to `.anomaly-card__spinner` — both should use the same shared `animate-location-spin` utility from pattern C above (a genuine cross-component shared pattern, D-03).

---

### `src/app/LocationPanel.tsx` (2 `className=` sites)

**Full CSS block** (`App.css` lines 21-40):
```css
.location-panel {
  flex: 0 0 760px; width: 760px; height: 100%; background: var(--color-secondary);
  display: flex; flex-direction: column; padding: var(--space-lg) var(--space-md);
  box-sizing: border-box; overflow-y: auto;
}
.location-panel__content { display: flex; flex-direction: column; gap: var(--space-md); }
```
**JSX sites** (`LocationPanel.tsx` lines 13-14):
```tsx
<aside className="location-panel">
  <div className="location-panel__content">
```

---

### `src/app/TrendRow.tsx` (6 `className=` sites)

**Full CSS block** (`App.css` lines 189-238):
```css
.trend-row { display: flex; flex-direction: column; gap: var(--space-sm); }
.trend-row__heading { margin: 0; font-size: var(--font-size-label); font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.trend-row__body { display: flex; flex-direction: row; align-items: flex-start; gap: var(--space-sm); }
.trend-row__axis { display: flex; flex-direction: column; flex: 0 0 auto; gap: var(--space-xs); }
.trend-row__axis-spacer { display: block; height: 16px; }
.trend-row__charts { display: flex; flex-direction: row; align-items: flex-start; gap: var(--space-sm); }
```
**JSX sites** (`TrendRow.tsx` lines 37-44):
```tsx
<section className="trend-row">
  <p className="trend-row__heading">Last 7 Days</p>
  <div className="trend-row__body">
    <div className="trend-row__axis">
      <span className="trend-row__axis-spacer" aria-hidden="true" />
      ...
    <div className="trend-row__charts">
```

---

### `src/app/TrendDayChart.tsx` (5 `className=` sites — className only; `var(--color-*)` SVG props UNTOUCHED)

**Full CSS block** (`App.css` lines 269-307):
```css
.trend-day { display: flex; flex-direction: column; width: 88px; gap: var(--space-xs); }
.trend-day__label { margin: 0; height: 16px; font-size: var(--font-size-label); font-weight: 400; color: var(--color-muted); text-align: center; }
.trend-day__label--today { font-weight: 600; color: var(--color-accent); }
.trend-day__placeholder { width: 88px; height: 120px; display: flex; align-items: center; justify-content: center; text-align: center; padding: var(--space-xs); background: var(--color-dominant); border: 1px solid var(--color-border-subtle); border-radius: 8px; color: var(--color-muted); font-size: var(--font-size-label); box-sizing: border-box; }
```
**JSX sites** (`TrendDayChart.tsx` lines 127-129 dynamic ternary, 138-146):
```tsx
const labelClassName = isToday
  ? 'trend-day__label trend-day__label--today'
  : 'trend-day__label'
...
<div className="trend-day">
  <p className={labelClassName}>{label}</p>
  <div className="trend-day__placeholder" ...>Not enough data</div>
```
**DO NOT TOUCH** (RESEARCH.md-confirmed, Pitfall 3): lines 89, 109, 170, 179, 222 inline SVG props —
```tsx
fill="var(--color-chart-historical)"   // line 89
fill="var(--color-chart-actual)"        // line 109
tick={{ fill: 'var(--color-muted)', fontSize: 14 }}  // lines 170, 222
stroke="var(--color-chart-mean)"        // line 179
```
These must resolve unchanged after the `@theme` port — verify by grep `var(--color-` post-migration.

---

### `src/app/TrendLegend.tsx` (4 `className=` sites — className only; `var(--color-*)` SVG props UNTOUCHED)

**Full CSS block** (`App.css` lines 243-267):
```css
.trend-legend { display: flex; flex-direction: row; flex-wrap: wrap; gap: var(--space-md); }
.trend-legend__item { display: flex; flex-direction: row; align-items: center; gap: var(--space-xs); }
.trend-legend__swatch { flex: 0 0 auto; width: 14px; height: 14px; }
.trend-legend__label { font-size: var(--font-size-label); font-weight: var(--font-weight-label); color: var(--color-muted); }
```
**JSX sites** (`TrendLegend.tsx` lines 23-33, 40):
```tsx
<div className="trend-legend__item">
  <svg className="trend-legend__swatch" ...>{swatch}</svg>
  <span className="trend-legend__label">{label}</span>
...
<div className="trend-legend" role="list" aria-label="Trend chart legend">
```
**DO NOT TOUCH** (lines 48, 60, 69 — inline SVG `fill`/`stroke` props): `fill="var(--color-chart-historical)"`, `fill="var(--color-chart-mean)"`, `fill="var(--color-chart-actual)"`.

## No Analog Found

None. Every target file is a rewrite of its own current state; App.css/index.css are the source-of-truth "analogs" and are captured in full above.

## Metadata

**Files scanned:** `vite.config.ts`, `src/index.css`, `src/app/App.css`, `src/main.tsx`, `src/app/App.tsx`, `src/app/AnomalyCard.tsx`, `src/app/LocationDisplay.tsx`, `src/app/LocationPanel.tsx`, `src/app/TrendRow.tsx`, `src/app/TrendDayChart.tsx`, `src/app/TrendLegend.tsx` — all read in full (no file exceeded 2,000 lines; single-pass reads, no re-reads).
**Pattern extraction date:** 2026-07-16
