---
phase: 04-tailwind-foundation-migration
reviewed: 2026-07-16T13:26:38Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/app/AnomalyCard.tsx
  - src/app/App.tsx
  - src/app/LocationDisplay.tsx
  - src/app/LocationPanel.tsx
  - src/app/TrendDayChart.tsx
  - src/app/TrendLegend.tsx
  - src/app/TrendRow.tsx
  - src/index.css
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-07-16T13:26:38Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Reviewed the Tailwind v4 foundation migration across all seven components and `src/index.css`. Verified each file's diff against its pre-migration commit and confirmed every changed file is a pure `className`-string rewrite with zero JSX structure, prop, or logic changes (checked via `git diff <commit>^ <commit>` per file). Ran an actual production build (`npm run build`) and inspected the compiled `dist/assets/*.css` to verify utility-to-declaration mappings directly rather than trusting the class names alone.

Confirmed:
- All four required color tokens (`--color-chart-historical`, `--color-chart-mean`, `--color-chart-actual`, `--color-muted`) and `--animate-location-spin` are present in `@theme` with byte-identical values to the pre-migration `:root` block, and every inline SVG/Recharts `var(--color-*)` reference resolves to a real token (no typos, no dangling refs).
- No leftover BEM classNames, no dangling `var(--space-*|--font-size-*|--line-height-*)` references (the old token names), and no leftover `.css` imports anywhere in `src/app/`.
- Every arbitrary-value utility (`flex-[0_0_760px]`, `text-[calc(var(--text-display)*1.7)]`, `leading-[1.1]`, `py-[2px]`, `rounded-[8px]`, `w-[760px]`, `w-[88px]`, `h-[120px]`, `w-[14px]`/`h-[14px]`, the `[&_.leaflet-container]:*` descendant variant) compiles to exactly the declaration the deleted BEM rule had, confirmed against the actual compiled CSS output.
- Spacing (`--spacing-xs..3xl`), color role, and typography (`--text-*`/`--font-weight-*`) tokens all generate the expected utilities with no namespace collisions against Tailwind's built-in numeric spacing/breakpoint/font-size scales.

However, two components of the migration introduce small but real, provable deviations from the stated "visual equivalence, no aesthetic changes" bar — both stem from switching to Tailwind's token/utility system rather than from a mistranslated class, so they're easy to miss in a line-by-line className diff.

## Warnings

### WR-01: Tailwind Preflight resets form-control `font-family`, changing the info-button's rendered font

**File:** `src/index.css:1`, consumed by `src/app/AnomalyCard.tsx:75-82`
**Issue:** The pre-migration `src/index.css` had no CSS reset for form controls — `<button>` elements historically do not inherit the page's `font-family` (a long-standing UA-stylesheet quirk), so the "i" info-quality button in `AnomalyCard` rendered in the browser's native UI font, never the site's `--font-family-base`/`--font-sans` stack.

`@import "tailwindcss";` (line 1) pulls in Tailwind v4's Preflight base layer by default. Preflight includes:
```css
button,input,select,optgroup,textarea{font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;background-color:#0000;border-radius:0}
```
(confirmed present in the built `dist/assets/*.css`). This makes the `<button>` in `AnomalyCard.tsx:75-82` inherit `font-family` from its ancestors for the first time — a font change on visible text that the pre-migration stylesheet never applied. Every other Preflight-touched property on that button (`background-color`, `border-radius`, padding/margin) is already neutralized by the button's own explicit Tailwind utilities (`bg-transparent`, `rounded-full`, `p-0`), but `font-family` was never explicitly set (before or after), so this one property silently changed behavior as a side effect of adopting `@import "tailwindcss"` wholesale rather than a deliberate stylistic choice.
**Fix:** Either accept the (likely near-imperceptible, since `--font-sans` is itself a system-font stack) drift explicitly as an intentional side effect of adopting Preflight, or pin the button's font back to the UA default to preserve strict equivalence:
```tsx
<button
  type="button"
  className="h-5 w-5 shrink-0 rounded-full border border-accent bg-transparent p-0 text-accent text-label font-heading leading-none cursor-help [font-family:initial]"
  ...
```
At minimum, document in the phase notes that Preflight was knowingly adopted and what it resets, since this affects every future `<button>`/`<input>` added to the app, not just this one.

### WR-02: `text-label` utility silently adds a line-height that 4 elements never had before

**File:** `src/app/TrendRow.tsx:38`, `src/app/TrendDayChart.tsx:128-129,141`, `src/app/TrendLegend.tsx:33`
**Issue:** `src/index.css` pairs each `--text-*` size token with a `--text-*--line-height` companion (`--text-label--line-height: 1.4`), which means Tailwind v4's `text-label` utility now sets **both** `font-size` and `line-height` in one declaration (confirmed: `.text-label{font-size:var(--text-label);line-height:var(--tw-leading,var(--text-label--line-height))}` in the compiled CSS).

Four pre-migration BEM rules used `font-size: var(--font-size-label)` **without** ever setting `line-height`, deliberately (or incidentally) inheriting the page's `body { line-height: 1.5 }` instead of the label scale's `1.4`:
- `.trend-row__heading` (no `line-height`) → now `TrendRow.tsx:38` uses `text-label`, forcing `line-height: 1.4`
- `.trend-day__label` / `.trend-day__label--today` (no `line-height`) → now `TrendDayChart.tsx:128-129` uses `text-label`
- `.trend-day__placeholder` (no `line-height`) → now `TrendDayChart.tsx:141` uses `text-label`
- `.trend-legend__label` (no `line-height`) → now `TrendLegend.tsx:33` uses `text-label`

None of the new classNames add a `leading-*` override to restore the previous `1.5`. The visual delta is small (14px × 1.5 = 21px vs. 14px × 1.4 = 19.6px line box, ~1.4px), but it is a real, systematic, provable change introduced purely by the migration to token-paired utilities, in a phase whose explicit bar is zero aesthetic change. (Contrast with `.location-display__label`, `.anomaly-card__zscore`, which already explicitly set `line-height: var(--line-height-label)` pre-migration — those are correctly unaffected.)
**Fix:** Add `leading-[1.5]` (or a `leading-normal`/custom `--leading-*` token matching body) to the four affected className strings to restore the pre-migration inherited value, e.g.:
```tsx
<p className="m-0 text-label leading-[1.5] font-semibold text-muted uppercase tracking-[0.05em]">
```

## Info

### IN-01: Body `line-height` hardcoded as a literal, duplicating the new `--text-body--line-height` token

**File:** `src/index.css:77`
**Issue:** The migration renamed `line-height: var(--line-height-body)` to a hardcoded `line-height: 1.5`, even though the new `@theme` block already defines `--text-body--line-height: 1.5` (line 39) for exactly this value. The values currently agree, so there's no behavioral bug today, but it's now possible to change one without the other drifting silently (e.g. a future edit to `--text-body--line-height` for the `text-body` utility would no longer update the page's base line-height).
**Fix:**
```css
body {
  font-family: var(--font-sans);
  font-size: var(--text-body);
  font-weight: var(--font-weight-body);
  line-height: var(--text-body--line-height);
  color: #08060d;
  background: var(--color-dominant);
}
```

---

_Reviewed: 2026-07-16T13:26:38Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
