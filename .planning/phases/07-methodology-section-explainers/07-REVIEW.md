---
phase: 07-methodology-section-explainers
reviewed: 2026-07-22T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - src/anomaly/anomaly.ts
  - src/anomaly/anomaly.test.ts
  - src/app/DeltaPanel.tsx
  - src/app/DeltaPanel.test.tsx
  - src/app/MethodologyPanel.tsx
  - src/app/MethodologyPanel.test.tsx
  - src/app/App.tsx
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-07-22T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Reviewed the percentile-rank feature (`computePercentileRank`/`percentileLabel` in `src/anomaly/anomaly.ts`, wired into `DeltaPanel.tsx`) and the new always-visible `MethodologyPanel.tsx`, plus their test suites and the `App.tsx` mount point. The math itself (Hazen/midrank tie handling, 1-99 clamp, shared-window reuse with `computeAnomaly`) is correct and matches its own unit tests, including the documented boundary cases. No security issues, no dangerous sinks, no debug artifacts, no `==`/`any` sloppiness were found.

The most substantive issue is a semantic mismatch between what the percentile actually measures and what the shipped copy claims it measures: the percentile is computed over the same ~330-value multi-day-per-year baseline window used for the z-score (11 days × ~30 years, per this phase's own `07-RESEARCH.md` PD-01), but both the percentile sentence and the Methodology panel's own explanatory copy describe it as ranking "among years" / "% of years." This traces back to the approved `07-UI-SPEC.md` Copywriting Contract (the implementer had no discretion over this wording), but it is still a user-facing accuracy defect worth flagging given this app's stated core value is that "the anomaly score must be accurate and easy to interpret at a glance." I've filed it as a warning rather than a blocker since the underlying computation is internally consistent (same window as the z-score, faithfully implementing PD-01) and the wording was spec-locked, not an implementation deviation — but it should be revisited at the product/copy level.

A second, lower-severity concern is that `computePercentileRank` is an exported pure function whose correctness depends entirely on an un-enforced caller invariant ("Callers MUST only invoke this when the caller's own zScore is non-null") — every other guard in this file (`sampleStdDev`, `computeAnomaly`, `hasUsableSampleCount`) is self-contained, but this one isn't, which is inconsistent with the file's own established defensive style.

## Warnings

### WR-01: Percentile copy claims a "% of years" ranking that the computation does not perform

**File:** `src/anomaly/anomaly.ts:86-88`, `src/app/MethodologyPanel.tsx:50-51`

**Issue:** `percentileLabel` renders sentences like `"Warmer than 91% of years for this date."` and the Methodology panel explains "The percentile shows where today ranks among those historical years for this date." Both claim the ranking is against distinct **years**. But `computePercentileRank` ranks `today` against `samples`, which is the same day-of-year **window** used for the z-score — per `filterDayOfYearWindow`/`computeWindowSamples`, that window is every non-null day within `±5` days of the target date across every year in the archive (11 days × ~30 years ≈ 330 values), not one value per year. This phase's own `07-RESEARCH.md` (PD-01) explicitly says the percentile is "the share of the baseline day-of-year window samples (~330 values ...)" — so the design research itself acknowledges the sample basis is ~330 daily readings, not 30 yearly ones, yet the shipped copy still says "years."

This matters because the samples within a single year's ±5-day window are highly autocorrelated (adjacent days in the same year are not independent draws), so "warmer than 91% of years" implies a much stronger, more independent statistical claim than what's actually being measured. For an app whose core value proposition is that "the anomaly score must be accurate and easy to interpret at a glance" (CLAUDE.md), overstating the independence/granularity of the underlying sample set is a real accuracy-of-communication defect, not just a style nit.

**Fix:** Reword the percentile sentence and Methodology copy to describe the actual sample basis, e.g.:
```ts
// anomaly.ts
if (percentile > 55) return `Warmer than ${percentile}% of similar days (± 5 days, same date, past 30 years).`
if (percentile < 45) return `Colder than ${100 - percentile}% of similar days (± 5 days, same date, past 30 years).`
```
and update the Methodology panel's "How It's Computed" paragraph to say "...ranks among those nearby-day readings across the past 30 years" instead of "those historical years." (This is ultimately a copy/product decision — flagging so it can be revisited rather than silently shipped as-is.)

### WR-02: `computePercentileRank` relies on an unenforced caller invariant, unlike every other guard in this file

**File:** `src/anomaly/anomaly.ts:73-78`

**Issue:** The function's own doc comment states: "Callers MUST only invoke this when the caller's own zScore is non-null ... a zero-variance/all-tied sample set makes 'below + ties/2' degenerate to a meaningless 50." This is correctly honored by the one current caller (`computeAnomalyForToday`), but the function is exported and nothing inside it enforces the invariant — a future caller (or a refactor of `computeAnomalyForToday`) that calls `computePercentileRank` without first checking `zScore !== null` will silently get a plausible-looking but meaningless integer (typically ~50) instead of an error, `null`, or any other signal that the input was degenerate. Every other guard in this file is self-contained: `sampleStdDev` returns `0` for `<2` samples itself, `computeAnomaly` derives `zScore: null` itself, `hasUsableSampleCount` is a standalone predicate. This function is the one exception that pushes the safety check entirely into caller discipline + a comment.

**Fix:** Either have the function return `null` for a zero-variance sample set directly (making it self-guarding like its siblings), or keep the current design but add a lightweight runtime guard for defense-in-depth:
```ts
export function computePercentileRank(today: number, samples: number[]): number | null {
  if (samples.length < 2 || sampleStdDev(samples) === 0) return null
  const below = samples.filter((s) => s < today).length
  const ties = samples.filter((s) => s === today).length
  const raw = ((below + ties / 2) / samples.length) * 100
  return Math.max(1, Math.min(99, Math.round(raw)))
}
```
(would require updating the one call site and its return-type handling). At minimum, document this as a known/accepted risk if the "one shared definition, no duplicated guard" design (per the file's own anti-pattern note in `07-RESEARCH.md`) is intentionally preferred over self-guarding.

## Info

### IN-01: `AnomalyForToday`/`computeAnomalyForToday` docstrings not updated for the new `percentile` field

**File:** `src/anomaly/anomaly.ts:264-297`

**Issue:** The `AnomalyForToday` interface doc comment ("Return shape of computeAnomalyForToday (IN-03) ...") and the `computeAnomalyForToday` function doc comment were both written before this phase's `percentile` field was added, and neither was updated to mention it or its null-when-degenerate-variance semantics (which are otherwise well-documented on `computePercentileRank`/`percentileLabel` themselves). A reader skimming just the interface/function doc comments (as the file's own convention encourages) won't learn that `percentile` exists or when it's null.

**Fix:** Add a line to both doc comments, e.g. on the interface: `/** ... percentile: empirical rank (1-99) against the same window, null iff zScore is null (PD-04). */` and a matching sentence in `computeAnomalyForToday`'s comment.

### IN-02: Redundant test provides no additional coverage in `MethodologyPanel.test.tsx`

**File:** `src/app/MethodologyPanel.test.tsx:23-28`

**Issue:** The third test, "renders unconditionally with no props (PD-11: always visible, no gating)," makes the exact same assertion (`expect(getByText('How This Works')).toBeTruthy()`) as the first test, "renders collapsed by default with the summary headline visible." The comment claims it "confirms it mounts without a hasSelection/status gate," but since `MethodologyPanel` takes no props at all (there's no gate to accidentally trigger), this test cannot actually distinguish gated from ungated behavior — it's a duplicate of test 1 with different framing, not a real regression check for PD-11.

**Fix:** Either remove the duplicate test, or make it meaningfully different — e.g., render `MethodologyPanel` alongside a sibling panel in a `hasSelection={false}`/error-state context and assert the headline is still present in that surrounding state, which would actually exercise the "no gating" claim.

---

_Reviewed: 2026-07-22T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
