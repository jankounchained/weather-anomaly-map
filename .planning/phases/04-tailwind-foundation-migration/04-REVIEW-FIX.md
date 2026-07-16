---
phase: 04-tailwind-foundation-migration
fixed_at: 2026-07-16T13:43:16Z
review_path: .planning/phases/04-tailwind-foundation-migration/04-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 04: Code Review Fix Report

**Fixed at:** 2026-07-16T13:43:16Z
**Source review:** .planning/phases/04-tailwind-foundation-migration/04-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (Critical + Warning; the INFO finding IN-01 was intentionally left untouched per fix scope)
- Fixed: 2
- Skipped: 0

## Fixed Issues

### WR-01: Tailwind Preflight resets form-control `font-family`, changing the info-button's rendered font

**Files modified:** `src/app/AnomalyCard.tsx`
**Commit:** 2896b88
**Applied fix:** Added `[font-family:initial]` to the info-button's className (line 77), pinning it back to the UA default font stack. This neutralizes Tailwind Preflight's `button{font:inherit}` rule, restoring the pre-migration rendering where the "i" glyph used the browser's native UI font rather than inheriting `--font-sans` from the page.

### WR-02: `text-label` utility silently adds a line-height that 4 elements never had before

**Files modified:** `src/app/TrendRow.tsx`, `src/app/TrendDayChart.tsx`, `src/app/TrendLegend.tsx`
**Commit:** bc60b8d
**Applied fix:** Added `leading-[1.5]` to the four affected elements to override the `text-label` utility's bundled `line-height: 1.4` (`--text-label--line-height`), restoring the pre-migration inherited body line-height of 1.5:
- `TrendRow.tsx:38` — "Last 7 Days" heading
- `TrendDayChart.tsx:128-129` — day label (both today/non-today variants)
- `TrendDayChart.tsx:141` — "Not enough data" placeholder
- `TrendLegend.tsx:33` — legend item label

## Skipped Issues

None — both in-scope findings were fixed.

## Verification

- `npm run build` — passed (production build succeeded, no type errors, no bundling errors)
- `npm run test` — passed (8 test files, 90 tests, all green)
- INFO finding IN-01 (hardcoded `line-height: 1.5` in `src/index.css`) was left untouched per the fix scope defined in this task.

---

_Fixed: 2026-07-16T13:43:16Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
