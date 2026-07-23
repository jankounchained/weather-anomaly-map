# Phase 6: Panel Restructure & Hierarchy - Pattern Map

**Mapped:** 2026-07-22
**Files analyzed:** 9 (3 new primitives, 2 new panels, 3 modified, 1 retired)
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/app/PanelShell.tsx` (new) | component (layout wrapper) | request-response (presentational, no fetch) | `src/app/LocationDisplay.tsx` / `src/app/TrendRow.tsx` (glass class string) | exact — extracting a literal duplicated string |
| `src/app/PanelHeadline.tsx` (new) | component (typographic primitive) | request-response (presentational) | `src/app/TrendRow.tsx` line 38 (eyebrow `<p>`) | exact |
| `src/app/InfoTooltip.tsx` (new) | component (interactive disclosure) | event-driven (open/close, focus/hover/escape) | `src/app/AnomalyCard.tsx` lines 78-85 ("i" button) — visual only; no existing disclosure/popover component in codebase | role-match (visual only; interaction logic has no analog) |
| `src/app/CurrentConditionsPanel.tsx` (new) | component (state-branching display) | request-response, combined-gate | `src/app/AnomalyCard.tsx` (Empty/Loading/Error/Populated branches + temp number + "i" button) | exact |
| `src/app/DeltaPanel.tsx` (new) | component (state-branching display) | request-response, combined-gate | `src/app/AnomalyCard.tsx` (Empty/Loading/Error/Populated branches + Δ markup + verdict + z-score chip) | exact |
| `src/app/LocationDisplay.tsx` (modified) | component (state-branching display) | request-response | itself (refactor in place — swap glass div/eyebrow for `PanelShell`/`PanelHeadline`) | exact |
| `src/app/TrendRow.tsx` (modified) | component (chart composition) | request-response | itself (refactor in place — swap outer `<section>` + inline eyebrow `<p>` for `PanelShell`/`PanelHeadline`; chart internals untouched) | exact |
| `src/app/App.tsx` (modified) | component (composition root) | request-response, combined-gate orchestration | itself (replace single `<AnomalyCard>` with two-up row of `<CurrentConditionsPanel>` + `<DeltaPanel>`; adopt shared gate predicate) | exact |
| `src/anomaly/anomaly.ts` (modified — add predicate) | utility (pure function) | transform | `computeAnomalyForToday` / existing gate literal duplicated in `App.tsx` (lines 46-51) and `AnomalyCard.tsx` (line 44) | exact — same file already hosts pure anomaly-math helpers (`formatDelta`, `verdictLabel`, `classifyVerdict`) |
| `src/app/AnomalyCard.tsx` (retired) | — | — | n/a — deleted after logic is split into `CurrentConditionsPanel`/`DeltaPanel` | n/a |

## Pattern Assignments

### `src/app/PanelShell.tsx` (component, presentational wrapper)

**Analog:** the duplicated glass-card class string, found in three places with **slightly different variants** — normalize on the canonical tokenized form:

`src/app/LocationDisplay.tsx` (lines 27, 40, 54, 63 — all four branches use the same string):
```tsx
className="flex flex-col gap-sm bg-glass-surface border border-glass-border rounded-glass-lg shadow-glass backdrop-blur-lg px-md py-md"
```

`src/app/TrendRow.tsx` (line 37 — `<section>` element, not `<div>`):
```tsx
<section className="flex flex-col gap-sm bg-glass-surface border border-glass-border rounded-glass-lg shadow-glass backdrop-blur-lg px-md py-md">
```

`src/app/AnomalyCard.tsx` (lines 33, 46-49, 63, 72 — **uses a non-token literal** `bg-[rgba(255,255,255,0.72)]` instead of `bg-glass-surface`; this is drift/inconsistency the primitive should resolve toward the tokenized `bg-glass-surface` used by the other two files, per UI-SPEC "no new tokens" and PD-06 "identical `PanelShell` glass card"):
```tsx
className="flex flex-col gap-sm bg-[rgba(255,255,255,0.72)] border border-glass-border rounded-glass-lg shadow-glass backdrop-blur-lg p-lg"
```

**Design contract:** `PanelShell` accepts an `as` prop for semantic element (`aside`/`section`/`div`) per UI-SPEC Component Inventory, and children. Base classes: `bg-glass-surface border border-glass-border rounded-glass-lg shadow-glass backdrop-blur-lg` + padding (use `px-md py-md` — the `LocationDisplay`/`TrendRow` convention — not AnomalyCard's `p-lg`, since two of three existing consumers already agree on `px-md py-md`).

**Tokens referenced** (`src/index.css` lines 40-44, unchanged, no new tokens):
```css
--color-glass-surface: rgba(255, 255, 255, 0.62);
--color-glass-border: rgba(255, 255, 255, 0.45);
--radius-glass-lg: 16px;
--shadow-glass: 0 8px 30px rgba(15, 8, 30, 0.14);
```

---

### `src/app/PanelHeadline.tsx` (component, typographic primitive)

**Analog:** `src/app/TrendRow.tsx` line 38 (verbatim style source, per UI-SPEC):
```tsx
<p className="m-0 text-label leading-[1.5] font-semibold text-muted uppercase tracking-[0.05em]">
  Last 7 Days
</p>
```

Primitive should render this exact class string with `children` as the headline text (e.g. "Location", "Current Conditions", "Delta", "Last 7 Days"). Do not restyle (UI-SPEC: "verbatim reuse, do not restyle").

---

### `src/app/InfoTooltip.tsx` (component, interactive disclosure)

**Analog (trigger visual only):** `src/app/AnomalyCard.tsx` lines 78-85:
```tsx
<button
  type="button"
  className="h-5 w-5 shrink-0 rounded-full border border-accent bg-transparent p-0 text-accent text-label font-heading leading-none cursor-help [font-family:initial]"
  aria-label="Data quality info"
  title="Based on modeled climate data for this area (~9-25km resolution)"
>
  i
</button>
```

**No existing disclosure/popover analog in codebase** — this is genuinely new interaction logic (state machine for open/close via click/hover/focus/Escape/click-outside, per UI-SPEC's WCAG 1.4.13 contract). Build from scratch using React `useState` (no state manager per CLAUDE.md stack rules) + native `<button aria-expanded aria-controls>` + a `role="dialog"` popover styled via `PanelShell` at `max-w-[240px]`. Replace the `title` attribute (native browser tooltip, not accessible per contract) with the real popover body text supplied per-panel.

**Popover surface:** reuse `PanelShell`'s glass classes at reduced width, per UI-SPEC: "popover body uses `PanelShell`'s glass surface at a smaller `max-w-[240px]`".

---

### `src/app/CurrentConditionsPanel.tsx` (new — split from AnomalyCard)

**Analog:** `src/app/AnomalyCard.tsx` (full file, 103 lines) — reuse structure, not verbatim JSX (branches, gate, temp number, "i" button migrate; verdict/delta/z-score do NOT — those go to DeltaPanel).

**Sequential branching pattern** (Empty → Loading → Error → Populated), lines 31-69:
```tsx
if (!hasSelection) {
  return ( /* PanelShell wrapping empty-state copy */ )
}

if (currentStatus !== 'resolved' || baselineStatus !== 'resolved') {
  return ( /* PanelShell + spinner + loading copy, role="status" */ )
}

if (tempC === null /* current-conditions-specific null check */) {
  return ( /* PanelShell wrapping error copy, text-destructive */ )
}
```

**Loading spinner markup** (lines 46-53, reused verbatim in both new panels and already shared with `LocationDisplay.tsx` lines 39-49):
```tsx
<div
  className="flex flex-row items-center gap-sm ..."
  role="status"
>
  <span
    className="size-4 shrink-0 rounded-full border-2 border-accent border-t-transparent animate-location-spin"
    aria-hidden="true"
  />
  <p className="m-0 text-body font-body">{loadingCopy}</p>
</div>
```

**Temperature number + "i" button** (lines 72-86 — migrates here, Delta markup does not):
```tsx
<div className="flex flex-row items-center justify-between gap-sm">
  <p className="m-0 text-display font-display">
    {Math.round(tempC)}
    {units}
  </p>
  {/* InfoTooltip replaces the raw <button title=...> here */}
</div>
```

**Micro-copy (EXPLAIN-01, new this phase):** add a static `<p>` "Today's measured temperature." directly under the number — no existing analog, follows the plain JSX-text-node convention already used throughout (e.g. `AnomalyCard.tsx` line 34-36).

---

### `src/app/DeltaPanel.tsx` (new — split from AnomalyCard)

**Analog:** `src/app/AnomalyCard.tsx` (same file, different slice) — Δ glyph, verdict, z-score chip.

**Δ glyph markup** (lines 87-94, migrates verbatim — dominance rule locked in UI-SPEC):
```tsx
<p
  style={{ color: 'var(--anomaly-color)' }}
  className="m-0 text-[calc(var(--text-display)*1.7)] font-bold leading-[1.1] motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-out"
  aria-label={`Anomaly delta versus 30-year average: ${formatDelta(anomaly.delta)} degrees Celsius`}
>
  <span className="opacity-70">Δ</span>
  {formatDelta(anomaly.delta)}°C
</p>
```

**Verdict + z-score chip** (lines 95-100, migrates — reorder per PD-07: micro-copy sits directly under the Δ number, verdict becomes secondary, chip last):
```tsx
<p className="m-0 text-heading font-heading">{verdictLabel(anomaly.verdictTier)}</p>
<p className="mt-xs inline-block w-fit text-label font-label text-muted bg-secondary rounded-full py-[2px] px-sm">
  {anomaly.zScore === null
    ? 'z — (too little variance to compute)'
    : `z ${anomaly.zScore.toFixed(1)}`}
</p>
```

**New internal order per PD-07 (implementation note for planner):**
`PanelHeadline "Delta"` → Δ number → micro-copy ("How today compares…") → verdict label → z-score chip.

**Imports needed** (from `src/anomaly/anomaly.ts`, already used in `AnomalyCard.tsx` line 9):
```tsx
import { formatDelta, verdictLabel } from '../anomaly/anomaly'
import type { VerdictTier } from '../anomaly/types'
```

---

### `src/anomaly/anomaly.ts` (add shared combined-gate predicate — PD-10 mitigation)

**Current duplicated gate literal** (appears twice, must be unified into ONE exported predicate):

`src/app/App.tsx` lines 46-47 (used for `anomaly` computation):
```tsx
current.status === 'resolved' &&
baseline.status === 'resolved' &&
```

`src/app/AnomalyCard.tsx` line 44 (re-checked inside the card):
```tsx
if (currentStatus !== 'resolved' || baselineStatus !== 'resolved') {
```

**Required new export** (planner should add alongside existing pure helpers like `classifyVerdict`, line 51, and `hasUsableSampleCount`, line 180 — same file, same style):
```ts
export function isAnomalyReady(
  currentStatus: WeatherStatus,
  baselineStatus: WeatherStatus,
): boolean {
  return currentStatus === 'resolved' && baselineStatus === 'resolved'
}
```
Both `CurrentConditionsPanel` and `DeltaPanel` must import and call this exact function for their loading-gate branch — never re-derive the `=== 'resolved'` comparison inline. `App.tsx`'s `anomaly`/`trendDays` computation (lines 45-70) should also switch to calling this helper instead of its inline literal, so there is exactly one place the gate condition lives.

---

### `src/app/LocationDisplay.tsx` (modified — adopt PanelShell + PanelHeadline)

**Analog:** itself, refactored in place. Each of its 4 branches (lines 26-66) currently opens with the duplicated glass div — replace with `<PanelShell>` and add `<PanelHeadline>Location</PanelHeadline>` as the first child before the existing `h2`/`p` content. Preserve the resolved / loading / coordinate-fallback / empty branches unchanged otherwise (per CONTEXT.md: "keep its resolved / loading / coordinate-fallback branches").

---

### `src/app/TrendRow.tsx` (modified — adopt PanelShell + PanelHeadline)

**Analog:** itself, refactored in place. Replace the outer `<section className="flex flex-col gap-sm bg-glass-surface ...">` (line 37) with `<PanelShell as="section">`, and replace the inline eyebrow `<p>` (line 38) with `<PanelHeadline>Last 7 Days</PanelHeadline>`. Chart internals (`TrendYAxisColumn`, `TrendDayChart`, `TrendLegend`, lines 41-59) stay completely unchanged — Phase 8 depends on this wrapper remaining stable.

---

### `src/app/App.tsx` (modified — two-up row + shared gate)

**Analog:** itself, refactored in place.

**Current single-card composition** (lines 104-112, to be replaced):
```tsx
<AnomalyCard
  hasSelection={hasSelection}
  currentStatus={current.status}
  baselineStatus={baseline.status}
  tempC={current.tempC}
  units={current.units}
  anomaly={anomaly}
/>
<TrendRow days={trendDays} units={current.units} />
```

**New composition (planner should implement):** a wrapping `<div>` (50/50 equal-width, equal-height flex row per PD-01/PD-02/PD-03) containing `<CurrentConditionsPanel>` and `<DeltaPanel>`, each receiving `hasSelection`, `currentStatus={current.status}`, `baselineStatus={baseline.status}`, plus their own specific data slice (`tempC`/`units` vs `anomaly`) — both call the shared `isAnomalyReady()` predicate internally for their loading gate, per PD-10.

**Import changes:** replace `import { AnomalyCard } from './AnomalyCard'` with `import { CurrentConditionsPanel } from './CurrentConditionsPanel'` and `import { DeltaPanel } from './DeltaPanel'`.

---

## Shared Patterns

### Glass card wrapper (PanelShell)
**Source:** `src/app/LocationDisplay.tsx` (canonical, tokenized) — NOT `src/app/AnomalyCard.tsx`'s `bg-[rgba(255,255,255,0.72)]` variant (non-tokenized drift)
**Apply to:** `PanelShell`, and all four panels that adopt it (Location, Current Conditions, Delta, History/TrendRow)
```tsx
className="flex flex-col gap-sm bg-glass-surface border border-glass-border rounded-glass-lg shadow-glass backdrop-blur-lg px-md py-md"
```

### Loading spinner
**Source:** `src/app/LocationDisplay.tsx` lines 39-49 / `src/app/AnomalyCard.tsx` lines 46-53 (identical in both — already a de facto shared pattern)
**Apply to:** `CurrentConditionsPanel`, `DeltaPanel` (each with its own tailored loading copy per UI-SPEC)
```tsx
<span
  className="size-4 shrink-0 rounded-full border-2 border-accent border-t-transparent animate-location-spin"
  aria-hidden="true"
/>
```

### Combined D-09/PD-10 gate predicate
**Source:** duplicated literal in `src/app/App.tsx` lines 46-47 and `src/app/AnomalyCard.tsx` line 44 — must be unified
**Apply to:** `CurrentConditionsPanel`, `DeltaPanel`, and `App.tsx`'s `anomaly`/`trendDays` computation
```ts
export function isAnomalyReady(
  currentStatus: WeatherStatus,
  baselineStatus: WeatherStatus,
): boolean {
  return currentStatus === 'resolved' && baselineStatus === 'resolved'
}
```
This is the **required planner mitigation** called out in PD-10 — do not let the two panels each write their own `=== 'resolved'` comparison.

### No-raw-HTML-sink invariant (T-01-02 / T-02-07)
**Source:** comment headers in both `AnomalyCard.tsx` (lines 6-8) and `LocationDisplay.tsx` (lines 3-5)
**Apply to:** all new/modified panels — all dynamic text (temperature, delta, verdict, z-score, place name) renders as plain JSX text nodes only, never via `dangerouslySetInnerHTML` or similar.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/app/InfoTooltip.tsx` interaction logic (open/close state machine, focus trap, Escape/click-outside handling) | component | event-driven | No existing disclosure/popover/dialog component exists anywhere in the codebase — only a `title`-attribute browser tooltip (AnomalyCard.tsx line 82) and a `role="status"` (non-interactive) spinner pattern. Build using UI-SPEC's fully-specified WCAG 1.4.13 interaction contract as the source of truth instead of a codebase analog. |

## Metadata

**Analog search scope:** `src/app/` (all 5 existing components), `src/anomaly/anomaly.ts`, `src/index.css` (glass tokens)
**Files scanned:** `AnomalyCard.tsx`, `LocationDisplay.tsx`, `TrendRow.tsx`, `App.tsx`, `LocationPanel.tsx`, `anomaly.ts`, `index.css`
**Pattern extraction date:** 2026-07-22
