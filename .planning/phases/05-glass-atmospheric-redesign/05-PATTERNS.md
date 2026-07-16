# Phase 5: Glass / Atmospheric Redesign - Pattern Map

**Mapped:** 2026-07-16
**Files analyzed:** 11
**Analogs found:** 11 / 11 (all modifications to existing files; no brand-new files beyond additions inside existing modules)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `src/index.css` (add tokens + `@property`) | config (design tokens) | transform (static CSS values) | itself (`src/index.css` `@theme` block, existing tokens) | exact — additive to an established pattern |
| `src/anomaly/anomaly.ts` (+ `anomalyColor`, `isDaytime`) | utility (pure function) | transform | itself — existing `classifyVerdict`/`formatDelta`/`VERDICT_LABEL` in the same file | exact |
| `src/anomaly/anomaly.test.ts` (+ tests) | test | transform | itself — existing `describe` blocks for `classifyVerdict`/`formatDelta` | exact |
| `src/anomaly/types.ts` | model (types) | — | itself — unchanged, no new types needed (return values are primitives: `string`, `boolean`) | exact (no-op) |
| `src/weather/client.ts` (+ `localHourFrom`) | utility (pure function) | transform | itself — existing `localDateFrom` (lines 76-81) | exact — sibling function, identical shape |
| `src/weather/client.test.ts` (+ test) | test | transform | existing `localDateFrom` test block | exact |
| `src/weather/types.ts` (+ `localHour` field) | model | — | itself — existing `localDate: string | null` field on `UseCurrentWeatherResult` | exact |
| `src/weather/useCurrentWeather.ts` (+ populate `localHour`) | hook | request-response | itself — existing `localDate` population in resolved/idle/error branches | exact |
| `src/app/App.tsx` | component (shell/composition root) | request-response (prop composition) | itself — existing `anomaly`/`trendDays` computation + prop-threading to `LocationPanel`/`AnomalyCard` | exact |
| `src/app/LocationPanel.tsx` | component (docked panel shell) | request-response (presentation) | itself — existing `<aside>` shell + `LocationDisplayProps` spread pattern | exact |
| `src/app/AnomalyCard.tsx` | component (hero + state-branch renderer) | request-response (presentation, CRUD-like branch-on-status) | itself — existing 4-branch early-return structure | exact |
| `src/app/TrendDayChart.tsx` | component (recharts SVG renderer) | transform (SVG prop consumption) | itself — existing `var(--color-chart-*)` inline SVG props | exact |
| `src/app/TrendLegend.tsx` | component (recharts legend) | transform | itself — existing `var(--color-chart-*)` SVG props, locked copy | exact |

No genuinely new files are created this phase — every touched file already exists; the "new" surface is added functions/tokens/props inside these files. This mirrors CONTEXT.md's explicit file list and RESEARCH.md's "Recommended Project Structure (delta from current tree)".

## Pattern Assignments

### `src/index.css` (config, static tokens)

**Analog:** itself — existing `@theme` block, `src/index.css` lines 1-54

**Existing token declaration pattern** (lines 3-24):
```css
@theme {
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
  ...
}
```
Comment convention: every token cites the UI-SPEC/decision ID that motivated it (`(D-01)`, `(03-UI-SPEC.md ...)`). Continue this: new tokens (`--color-anomaly-cold/normal/hot`, `--color-atmosphere-night-wash`, `--color-glass-surface`, `--color-glass-border`, `--radius-glass-lg`, `--radius-glass-sm`, `--shadow-glass`) go inside this same `@theme` block, each commented with its UI-SPEC section/D-number, per the UI-SPEC's exact token table.

**Irreducible non-`@theme` CSS precedent** (lines 56-60):
```css
@keyframes location-display-spin {
  to {
    transform: rotate(360deg);
  }
}
```
This shows the established precedent for CSS that cannot live inside `@theme` (keyframes today; `@property` this phase) — write the new `@property --anomaly-color { syntax: '<color>'; inherits: true; initial-value: #57534e; }` rule as a sibling top-level at-rule immediately after the `@theme` block, same placement style as the existing keyframe.

**`:root`/base styles precedent** (lines 62-80): global non-token CSS (`color-scheme`, `body` styles) lives below `@theme`/keyframes — the `.panel-backdrop` / `.panel-backdrop.is-night::before` rules from the UI-SPEC's gradient CSS example belong in this same trailing section, as plain CSS classes (not Tailwind utilities), since they need `linear-gradient()`/`color-mix()`/`::before` that arbitrary Tailwind values can't cleanly express.

---

### `src/anomaly/anomaly.ts` (+ `anomalyColor`, `isDaytime`)

**Analog:** itself — `classifyVerdict` (lines 49-55) and `formatDelta` (lines 65-69)

**Pure-function-with-doc-comment pattern** (lines 46-55):
```typescript
/** D-05 tier cutoffs, symmetric around 0: |z| < 0.5 -> typical;
 * 0.5 <= |z| < 1.5 -> slight; |z| >= 1.5 -> much (sign picks
 * warmer/colder). */
export function classifyVerdict(zScore: number): VerdictTier {
  const abs = Math.abs(zScore)
  const sign = zScore >= 0 ? 'warmer' : 'colder'
  if (abs < 0.5) return 'typical'
  if (abs < 1.5) return `slightly-${sign}` as VerdictTier
  return `much-${sign}` as VerdictTier
}
```
`anomalyColor(zScore: number | null): string` and `isDaytime(localHour: number): boolean` should be added as new exported pure functions in this same file, following this exact doc-comment style (cite D-02/D-03), with the RGB-lerp constants (`ANOMALY_COLD`/`ANOMALY_NORMAL`/`ANOMALY_HOT`) and helper functions (`lerpChannel`, `toHex`) as module-private (non-exported) helpers placed just above, mirroring how `windowBounds`/`filterDayOfYearWindow` are private-ish support functions feeding the exported `computeAnomalyForToday`.

**Null-fallback precedent** (line 32, `computeAnomaly`, and line 172 `classifyVerdict(zScore ?? 0)`):
```typescript
const zScore = sd === 0 || baseline.length < 2 ? null : delta / sd
...
const verdictTier = classifyVerdict(zScore ?? 0)
```
`anomalyColor(null)` must resolve to the exact `z=0` anchor color — reuse this identical `?? 0` fallback idiom, do not special-case null separately.

**Verdict-copy table pattern** (lines 38-44) — home for the D-07 zero-delta copy change:
```typescript
export const VERDICT_LABEL: Record<VerdictTier, string> = {
  'much-colder': 'Much colder than usual',
  'slightly-colder': 'Slightly colder than usual',
  typical: 'Typical for today',
  'slightly-warmer': 'Slightly warmer than usual',
  'much-warmer': 'Much warmer than usual',
}
```
Change only the `typical:` value to `'Right on the 30-year average'` — same object shape, no new keys.

---

### `src/anomaly/anomaly.test.ts` (+ tests for `anomalyColor`/`isDaytime`)

**Analog:** itself — `describe('sampleStdDev', ...)` block (existing file, lines 1-30)

**Anchor-point test pattern**:
```typescript
describe('sampleStdDev', () => {
  it('matches a hand-computed sample stddev (n-1), e.g. spreadsheet STDEV.S (ANOM-04)', () => {
    expect(sampleStdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 2)
  })

  it('returns 0 for fewer than 2 samples (guard, Pitfall 2)', () => {
    expect(sampleStdDev([5])).toBe(0)
    expect(sampleStdDev([])).toBe(0)
  })
})
```
Add a new `describe('anomalyColor', ...)` block with `it` cases for the UI-SPEC's exact anchor assertions: `z=-3 → '#1e3a8a'`, `z=0 → '#57534e'`, `z=null → '#57534e'`, `z=+3 → '#9a3412'`, plus midpoint spot-checks at `z=-1.5`/`z=+1.5`. Add a `describe('isDaytime', ...)` block for the `[6,20)` boundary (5→false, 6→true, 19→true, 20→false). Import both new functions in the existing `import { ... } from './anomaly'` block at the top of the file (do not add a second import statement).

---

### `src/weather/client.ts` (+ `localHourFrom`)

**Analog:** itself — `localDateFrom` (lines 76-81)

**Sibling pure-function pattern** (lines 76-81):
```typescript
/** "Today" in the pin's local calendar (Pitfall 5): splits Open-Meteo's
 * "YYYY-MM-DDTHH:mm" current.time (already location-local per
 * timezone=auto) on 'T' and takes the date portion. */
export function localDateFrom(currentTime: string): string {
  return currentTime.split('T')[0]!
}
```
Add `localHourFrom(currentTime: string): number` immediately below/near this function, same doc-comment convention (cite D-03), splitting on `'T'` and taking the hour from the time portion (per RESEARCH.md Pattern 2's exact given implementation).

---

### `src/weather/types.ts` (+ `localHour` field)

**Analog:** itself — existing `localDate: string | null` field, line 45 area (`UseCurrentWeatherResult`)

Add `localHour: number | null` as a sibling field immediately adjacent to `localDate` in the same interface, same nullability convention (null until resolved, per the interface's own doc comment at line 37: "`tempC`/`localDate`/`units`/`recentDaily` are null ...").

---

### `src/weather/useCurrentWeather.ts` (+ populate `localHour`)

**Analog:** itself — existing `localDate` population across all three branches

**Resolved-branch pattern** (line 52):
```typescript
localDate: localDateFrom(response.current.time),
```
**Error-branch pattern** (line 68) and **idle-branch pattern** (line 83, line 102) both set `localDate: null`. Add `localHour: localHourFrom(response.current.time)` next to the resolved-branch `localDate` line, and `localHour: null` next to every `localDate: null` occurrence — one new import (`localHourFrom`) added to the existing `import { getCurrentWeather, localDateFrom } from './client'` line (line 11), not a separate import statement.

---

### `src/app/App.tsx`

**Analog:** itself — existing `anomaly`/`trendDays` computed-value + prop-threading pattern (lines 40-65, 83-99)

**Computed-value-in-render-scope pattern** (lines 40-47):
```typescript
const anomaly =
  current.status === 'resolved' &&
  baseline.status === 'resolved' &&
  baseline.daily &&
  current.localDate != null &&
  current.tempC != null
    ? computeAnomalyForToday(baseline.daily, current.localDate, current.tempC)
    : null
```
Compute `anomalyColorValue = anomalyColor(anomaly?.zScore ?? null)` and `isNight = !isDaytime(current.localHour ?? 12)` the same way — plain `const` in the component body, no `useMemo` (React Compiler handles memoization automatically per `CLAUDE.md`'s stack table; existing code already doesn't hand-roll `useMemo` here).

**Prop-threading-down pattern** (lines 83-99):
```typescript
<LocationPanel
  hasSelection={hasSelection}
  status={status}
  name={name}
  lat={lat}
  lng={lng}
>
  <AnomalyCard
    hasSelection={hasSelection}
    currentStatus={current.status}
    baselineStatus={baseline.status}
    tempC={current.tempC}
    units={current.units}
    anomaly={anomaly}
  />
  <TrendRow days={trendDays} units={current.units} />
</LocationPanel>
```
Add `anomalyColorValue`/`isNight` (or raw `zScore`/`localHour`, per RESEARCH.md's Pattern 3 recommendation to precompute in `App.tsx`) as new props on `<LocationPanel>`; add color prop(s) to `<AnomalyCard>` the same way — new props appended to existing JSX prop lists, same flat style, no restructuring.

---

### `src/app/LocationPanel.tsx`

**Analog:** itself — existing `<aside>` shell (lines 11-20)

**Current shell** (full file, lines 11-20):
```typescript
export function LocationPanel({ children, ...props }: LocationPanelProps) {
  return (
    <aside className="flex-[0_0_760px] w-[760px] h-full bg-secondary flex flex-col py-lg px-md box-border overflow-y-auto">
      <div className="flex flex-col gap-md">
        <LocationDisplay {...props} />
        {children}
      </div>
    </aside>
  )
}
```
Two required changes per RESEARCH.md Pitfall 2 and the UI-SPEC's bridging note:
1. Extend `LocationPanelProps` (line 7, `extends LocationDisplayProps`) with the new color/night props (e.g. `anomalyColorValue: string; isNight: boolean`) — same interface-extension style already used for `children?: ReactNode`.
2. Add `relative` to the `<aside>` className, plus the new `panel-backdrop`/glass classes and the inline `style={{ '--anomaly-color': anomalyColorValue } as React.CSSProperties}` bridge (UI-SPEC "Bridging the computed color into CSS" — this is the ONE explicitly sanctioned inline-style exception, do not introduce others). Conditionally append `is-night` via a template string or simple ternary, consistent with the codebase's existing conditional-className style seen in `AnomalyCard.tsx`'s `labelClassName` ternary (TrendDayChart.tsx lines 127-129).

---

### `src/app/AnomalyCard.tsx`

**Analog:** itself — existing 4-branch early-return structure (full file)

**Branch structure to preserve exactly** (lines 31-93): `!hasSelection` → empty; `currentStatus !== 'resolved' || baselineStatus !== 'resolved'` → combined loading spinner; `tempC === null || anomaly === null` → error; else → resolved hero. Do not add, remove, or reorder branches — only restyle each branch's returned JSX onto the glass card treatment, and only change the resolved branch's hero markup for color-coding (D-06) and the zero-delta framing (already handled by the `VERDICT_LABEL.typical` copy change in `anomaly.ts`, not here).

**Hero text element to color-code** (line 84):
```typescript
<p className="m-0 text-[calc(var(--text-display)*1.7)] font-bold leading-[1.1]">{formatDelta(anomaly.delta)}°C</p>
```
Per UI-SPEC's Code Examples section, this becomes (illustrative, exact classes per UI-SPEC token table):
```tsx
<p style={{ color: 'var(--anomaly-color)' }}
   className="m-0 text-[calc(var(--text-display)*1.7)] font-bold leading-[1.1] motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-out">
  {formatDelta(anomaly.delta)}°C
</p>
```
This is the second (and only other) sanctioned inline-style use this phase, per the UI-SPEC's narrow scoped exception — do not add a `color` prop bridge anywhere else in this component.

**z-score chip — do NOT recolor** (lines 86-90):
```typescript
<p className="mt-xs inline-block w-fit text-label font-label text-muted bg-secondary rounded-full py-[2px] px-sm">
  {anomaly.zScore === null
    ? 'z — (too little variance to compute)'
    : `z ${anomaly.zScore.toFixed(1)}`}
</p>
```
UI-SPEC explicitly locks this pill's `bg-secondary`/`text-muted` styling unchanged (D-06: z-score stays visually subordinate, must not compete with the hero for anomaly-hue attention).

---

### `src/app/TrendDayChart.tsx`

**Analog:** itself — existing `var(--color-chart-*)` inline SVG prop consumption

**Confirmed re-theme-is-token-values-only pattern** (lines 89, 109-111, 170, 179, 222):
```typescript
return <circle cx={cx} cy={cy} r={3} fill="var(--color-chart-historical)" />
...
<polygon points={points} fill="var(--color-chart-actual)" stroke="#ffffff" strokeWidth={1}>
...
<ReferenceLine y={day.mean} stroke="var(--color-chart-mean)" strokeWidth={2} ifOverflow="visible" />
...
tick={{ fill: 'var(--color-muted)', fontSize: 14 }}
```
No line in this file changes — every color reference is already an indirect `var(--token)` lookup. The re-theme (D-08) is satisfied entirely by editing `--color-chart-historical`'s VALUE in `src/index.css` (mean/actual stay unchanged per the UI-SPEC re-theme table). The only permitted finish tweak inside this file (if the UI-SPEC calls for e.g. dot opacity/marker weight adjustments) would be a numeric literal change (e.g. `r={3}` → a slightly different radius, or `strokeWidth`) — not a `var()` name change. The "not enough data" placeholder box (lines 140-147, `bg-dominant border-border-subtle`) is the one spot in this file that DOES need a className change, to glass-card tokens (`--color-glass-surface`/`--color-glass-border`/`--radius-glass-sm`) per the UI-SPEC re-theme table's last row.

---

### `src/app/TrendLegend.tsx`

**Analog:** itself — existing `var(--color-chart-*)` SVG swatches (lines 45-78)

No changes needed to this file at all — confirmed by RESEARCH.md's Recommended Project Structure ("`TrendLegend.tsx` # unchanged (copy locked, colors via tokens)"). The swatches already read `var(--color-chart-historical/mean/actual)`, so the token-value edit in `src/index.css` propagates automatically. Listed here only because CONTEXT.md's "Files this phase will touch" names it — the planner should confirm zero-diff is acceptable rather than force a cosmetic edit.

---

## Shared Patterns

### Pure-function-then-unit-test (D-02, D-03)
**Source:** `src/anomaly/anomaly.ts` (`classifyVerdict`, `formatDelta`) + `src/anomaly/anomaly.test.ts`; `src/weather/client.ts` (`localDateFrom`) + `src/weather/client.test.ts`
**Apply to:** `anomalyColor()`, `isDaytime()` (in `anomaly.ts`/`anomaly.test.ts`), `localHourFrom()` (in `client.ts`/`client.test.ts`)
```typescript
/** <doc comment citing the D-number/UI-SPEC section> */
export function fnName(arg: Type): ReturnType {
  // pure, no DOM/fetch, deterministic
}
```
Every new function in this phase is pure, exported, colocated with its sibling in the same file, and given anchor-point `it()` test cases with exact-equality assertions where the UI-SPEC specifies exact hex/boolean anchors.

### No inline `style={{}}` except two sanctioned bridges
**Source:** established Phase 4 discipline (RESEARCH.md "Established Patterns"), scoped exception granted by UI-SPEC "Bridging the computed color into CSS"
**Apply to:** `LocationPanel.tsx` (the `--anomaly-color` custom-property bridge on the panel root) and `AnomalyCard.tsx` (the hero `<p>`'s `color: var(--anomaly-color)`) — and nowhere else. All other styling stays className/Tailwind-utility/token-driven.

### Token-value-only recharts re-theme
**Source:** `src/index.css` `@theme` block + `TrendDayChart.tsx`/`TrendLegend.tsx` inline `var(--color-chart-*)` consumption (already Phase 4 pattern, reconfirmed by RESEARCH.md)
**Apply to:** Any DESIGN-05 change — edit `--color-chart-historical`'s value in `index.css`; never touch the `var(--color-chart-*)` call sites themselves except the placeholder-box className (glass tokens) and any numeric-only finish tweak (opacity/stroke-width).

### Combined loading-gate / single-render-branch structure
**Source:** `src/app/AnomalyCard.tsx` (4 sequential early returns), mirrored in `TrendDayChart.tsx` (`if (!day.usable)` early return)
**Apply to:** Any restyle of `AnomalyCard.tsx` or `TrendDayChart.tsx` — preserve the exact branch conditions and count; only the JSX/className inside each branch's return changes.

### `@theme`-token-with-cited-decision-ID comment convention
**Source:** `src/index.css` (every existing token has a `/* ... (D-XX) */` or spec-citation comment)
**Apply to:** All new tokens added this phase (`--color-anomaly-*`, `--color-atmosphere-night-wash`, `--color-glass-*`, `--radius-glass-*`, `--shadow-glass`) — cite the UI-SPEC section/D-number per token, matching existing style exactly.

## No Analog Found

None. Every file this phase touches already exists in the codebase with an established pattern to extend (confirmed against CONTEXT.md's "Files this phase will touch" list and RESEARCH.md's "Recommended Project Structure (delta from current tree)" — no phase-5 file is a from-scratch creation).

## Metadata

**Analog search scope:** `src/index.css`, `src/app/*.tsx`, `src/anomaly/*.ts`, `src/weather/*.ts` (entire touched surface — no broader search needed since every target file is also its own best analog, an additive-modification phase)
**Files scanned:** 11 (all read in full; all ≤ 2,000 lines, single Read call each, no re-reads)
**Pattern extraction date:** 2026-07-16
