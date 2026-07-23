---
phase: 08
slug: split-violin-trend-view
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-23
---

# Phase 08 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Reconstructed retroactively by `/gsd-validate-phase 08` (State B — no VALIDATION.md
> existed; rebuilt from the four plan SUMMARYs + VERIFICATION.md + the live suite).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 (jsdom + @testing-library/react) |
| **Config file** | `vite.config.ts` (`test:` block, `environment: 'jsdom'`) |
| **Quick run command** | `npx vitest run <file>` |
| **Full suite command** | `npm test` (`vitest run`) |
| **Estimated runtime** | ~3.3 seconds (18 files) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <changed test file>`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~4 seconds (full suite)

---

## Per-Task Verification Map

All phase requirements have automated Vitest coverage. Statuses below reflect an
independent `npm test` run performed during this audit — **196/196 passing (18 files)**,
not the numbers reported in the SUMMARYs.

| Coverage | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|----------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| KDE + Silverman module, guards on degenerate input | 01 | 1 | TREND-01 | T-08-SC | No stats dependency; NaN/Infinity/div-0 guarded | unit | `npx vitest run src/anomaly/kde.test.ts` | ✅ | ✅ green |
| `halfDrawsCurve` N_MIN=20 curve/rug gate, boundary n=19/20 | 01 | 1 | TREND-02 | — | Thin half never draws a misleadingly confident curve | unit | `npx vitest run src/anomaly/kde.test.ts` | ✅ | ✅ green |
| Two-sample `computeTrendDay` off SAME series, no new fetch | 01 | 1 | TREND-01 | — | N/A | unit | `npx vitest run src/anomaly/anomaly.test.ts` | ✅ | ✅ green |
| `buildViolinPaths` ONE shared bandwidth / max density / equal width | 02 | 2 | TREND-01 | — | N/A | unit | `npx vitest run src/app/trend.test.ts` | ✅ | ✅ green |
| Curve/rug boundary + empty-half `mean:null` | 02 | 2 | TREND-02 | — | Sparse half degrades to rug, not a curve | unit | `npx vitest run src/app/trend.test.ts` | ✅ | ✅ green |
| Prior-left / recent-right + per-half clamp-to-sample-range | 02 | 2 | TREND-01 | — | N/A | unit | `npx vitest run src/app/trend.test.ts` | ✅ | ✅ green |
| `computeSharedYDomain` two-sample flatten + 10% pad + empty guard | 02 | 2 | TREND-01 | — | N/A | unit | `npx vitest run src/app/trend.test.ts` | ✅ | ✅ green |
| 4 chart tokens at UI-SPEC-locked values; retained tokens untouched | 02 | 2 | TREND-01 | — | N/A | grep + build | `grep -Eq -- '--color-chart-prior-fill' src/index.css` | ✅ | ✅ green |
| Both-curve render (2 filled `<path>`, no rug dots) | 03 | 3 | TREND-01 | T-03-07 | No `dangerouslySetInnerHTML` sink | unit | `npx vitest run src/app/TrendDayChart.test.tsx` | ✅ | ✅ green |
| One-thin-half → 1 curve + bounded jittered rug (never crosses cx) | 03 | 3 | TREND-02 | — | Rug bounded to its own half | unit | `npx vitest run src/app/TrendDayChart.test.tsx` | ✅ | ✅ green |
| Both-thin → dual rug; unusable day → "Not enough data", no svg | 03 | 3 | TREND-02 | T-08-05 | No NaN/undefined reaches DOM | unit | `npx vitest run src/app/TrendDayChart.test.tsx` | ✅ | ✅ green |
| Two per-half mean ticks + diamond, exact Copywriting tooltips | 03 | 3 | TREND-03 | T-08-05 | No `NaN`/`undefined` in any `<title>` | unit | `npx vitest run src/app/TrendDayChart.test.tsx` | ✅ | ✅ green |
| App/TrendRow flow two-sample shape unchanged; tsc + build green | 03 | 3 | TREND-01 | — | N/A | build + unit | `npm run build` / `npx vitest run src/app/TrendRow.test.tsx` | ✅ | ✅ green |
| 5-item legend, native-SVG swatches on same `--color-chart-*` tokens | 04 | 4 | TREND-03 | T-03-07 | Native SVG only, no raw-HTML sink | unit | `npx vitest run src/app/TrendLegend.test.tsx` | ✅ | ✅ green |
| Dynamic year-range label + static fallback (PD-10 verdict applied) | 04 | 4 | TREND-03 | T-08-07 | Copy finalized via reviewer round-trip, not silently | unit | `npx vitest run src/app/TrendLegend.test.tsx` `src/app/TrendRow.test.tsx` | ✅ | ✅ green |
| **Violin half-path has NO self-crossing "bowtie" anchor ordering** | audit | — | TREND-01 | — | Fixed-once defect (dcd5f66); now permanently guarded | unit | `npx vitest run src/app/trend.test.ts -t "prevents bowtie"` | ✅ | ✅ green |
| **Shared Y-axis renders real numeric tick labels (not empty)** | audit | — | TREND-01 / TREND-03 | — | Fixed-once defect (dcd5f66); now permanently guarded | unit | `npx vitest run src/app/TrendDayChart.test.tsx -t "renders at least 2"` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — Vitest was already installed and
configured (`vite.config.ts`) before Phase 08; no framework install or fixture scaffolding
was needed.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

> The one human-judgment step in this phase — the **PD-10 legend copy reviewer round-trip**
> (TREND-03) — was completed during execution: the verbatim reviewer verdict is recorded in
> `08-04-SUMMARY.md`, and `TrendLegend.test.tsx` asserts the resulting code matches that
> verdict exactly. The wording *decision* was a human call; its *implementation* is
> automated-tested, so it is not an outstanding manual gap.

---

## Audit Trail — Gap Closure 2026-07-23

Two render defects (bowtie half-path anchor shear; empty shared Y-axis) were caught by human
review and fixed in commit `dcd5f66`, but VERIFICATION.md confirmed them only via **throwaway
diagnostic tests that were then deleted** — leaving zero standing regression coverage. The
suite would have stayed green if either defect returned. This audit added two permanent tests
to close that sampling gap.

| Metric | Count |
|--------|-------|
| Gaps found | 2 |
| Resolved (automated tests added) | 2 |
| Escalated | 0 |

Tests added (via `gsd-nyquist-auditor`, no impl files touched):
- `src/app/trend.test.ts` → `prevents bowtie self-crossing by opening at the bottom spine and closing at the top, with no sudden y-jumps` — parses `buildViolinPaths` output and asserts the anti-bowtie anchor invariant.
- `src/app/TrendDayChart.test.tsx` → `renders at least 2 real numeric tick labels for the y-axis, guarding against empty-axis defect` — renders `TrendYAxisColumn` under jsdom and asserts real numeric tick `<text>` values.

Suite before: 194/194 · Suite after: **196/196** (18 files).

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none — existing infra sufficient)
- [x] No watch-mode flags
- [x] Feedback latency < 4s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-23
