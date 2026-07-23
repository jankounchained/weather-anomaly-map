# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.1 — Tailwind Migration + Glass/Atmospheric Redesign

**Shipped:** 2026-07-21
**Phases:** 2 | **Plans:** 7 | **Sessions:** ~2

### What Was Built
- Full styling-layer migration to Tailwind CSS v4 (CSS-first, no config file; `@theme` tokens; hand-written `index.css`/`App.css` removed) with human-confirmed visual equivalence to v1.0 as a deliberate de-risking step.
- A cohesive glassy/atmospheric design language: anomaly-driven CSS gradient backdrop, translucent glass surfaces across panel/hero/trend, a color-coded anomaly-delta hero (led with Δ), a framed zero-delta case, and a re-themed recharts trend chart.
- A disciplined-glass performance policy enforced by construction: real `backdrop-blur` only on static backdrops, no glass/blur class on the live map region, all motion behind `prefers-reduced-motion`, and no JS/canvas animation loops.

### What Worked
- **Foundation-first phase split.** Doing the mechanical Tailwind migration (Phase 4) with visuals frozen, then the aesthetic redesign (Phase 5) on the stable base, meant any migration regression was caught before design work muddied the diff. Both phases stayed green.
- **Conversational UAT caught the real issues.** The three gaps that mattered (delta misread as current temp, off-center chart, abrupt color transition) were all subjective/visual — exactly what automated tests can't see and a human eyeballing the running app can. UAT found them; a VERIFICATION.md artifact would not have.
- **Root-cause-first quick fixes.** The gap-closing quick task diagnosed each issue to its actual cause (hidden YAxis still reserving 40px; `--anomaly-color` never in any `transition-property`) rather than papering over symptoms, and correctly *declined* a centering tweak that would have clipped tick labels.

### What Was Inefficient
- **Verification path mismatch.** Phase 5 was verified via UAT but produced no `VERIFICATION.md`, so the milestone-readiness tooling reported it as `verification_status: missing` and forced an override closeout. The work was genuinely done; the artifact expectation and the actual (valid) verification path diverged.
- **UAT surfaced polish gaps only after execution "completed."** Two of the three gaps (Δ prefix, chart centering) were cheap, foreseeable clarity issues that a design-contract review or a mid-execution in-app check could have caught before the phase was marked done.

### Patterns Established
- **Registered `@property` custom properties for animatable design tokens.** `@property --anomaly-color` is what makes the color interpolate smoothly — but only once it's actually named in a `transition-property`. Registering a custom property is necessary, not sufficient.
- **Styling-only milestones lean on in-app UAT over artifact verification.** For phases with no behavior change, green tests/build + a human walkthrough of the running app is the stronger evidence.

### Key Lessons
1. For visual/design phases, schedule an in-app UAT (or design-contract check) *before* declaring execution complete — the gaps that matter are subjective and won't show in tests.
2. When a valid verification path (UAT) differs from what the tooling expects (VERIFICATION.md), the readiness gate will flag it — decide the closeout type deliberately and document the override rather than treating it as a failure.
3. Diagnose UI layout bugs to their box-model root cause before restyling; the fix is often one property (e.g. `width={showYAxis ? AXIS_WIDTH : 0}`), and a naive alignment tweak can trade one clipping problem for another.

### Cost Observations
- Model mix: planning on opus, execution on sonnet, plan-checking on haiku (per configured profile).
- Sessions: ~2.
- Notable: the whole gap-closing pass (plan + execute + verify) was a single lightweight quick task rather than a new phase — appropriate sizing for three small styling fixes.

---

## Milestone: v1.2 — UI Layout Redesign & Explanatory Legend

**Shipped:** 2026-07-23
**Phases:** 3 | **Plans:** 10 | **Sessions:** ~2

### What Was Built
- Resolved anomaly view restructured into four headlined, self-explanatory panels (Current conditions + Delta split from the former combined hero, joining Location + History), each with inline micro-copy and a WCAG-accessible InfoTooltip, Delta preserved as the ~1.7× focal point — all on shared `PanelShell`/`PanelHeadline`/`InfoTooltip` primitives reused across phases 7-8.
- A plain-language percentile explainer (hand-rolled Hazen/midrank empirical rank) in the Delta panel, plus an always-visible native `<details>`/`<summary>` "How This Works" methodology disclosure.
- The per-day trend row rebuilt as a split violin: hand-rolled Gaussian KDE + Silverman bandwidth (`kde.ts`), two-sample `computeTrendDay` (recent-5yr vs prior-25yr) off the same archive series, `buildViolinPaths` geometry (one shared pooled bandwidth, shared max density, per-half n≥20 curve-vs-rug gate), preserved diamond + shared Y-axis, and a 5-item legend finalized via the PD-10 reviewer copy round-trip.

### What Worked
- **Bottom-up phase-8 sequencing.** Building `kde.ts` math → `buildViolinPaths` geometry → `violinShape` render → legend, each layer with its own tests, kept every seam independently verifiable; the mid-phase red typecheck (retired single-sample shape) was an expected, documented consequence, not a regression chase.
- **Primitives-first in Phase 6.** Extracting `isAnomalyReady` + the three shared UI primitives foundation-only (Wave 1, touching no existing panel) meant Phases 7 and 8 reused them verbatim with zero rework.
- **The dedicated spike de-risked the hardest phase.** The pre-phase-8 statistics/design spike pinned Silverman bandwidth, the n_min≈20 threshold, equal-width normalization, and the rug fallback before implementation — the plan just executed the settled decisions.
- **Reviewer copy round-trip (PD-10) as a blocking checkpoint.** Legend wording went through an explicit human verdict recorded verbatim, the same process that fixed the Phase 3 legend — chart copy is exactly where at-a-glance clarity lives.

### What Was Inefficient
- **Two once-caught render defects had no standing regression test.** The bowtie path-anchor and empty Y-axis bugs (fixed in `dcd5f66`) were verified only by throwaway tests that were deleted, so the suite would have stayed green if either regressed. `/gsd-validate-phase 08` later added the two permanent tests — but only because Nyquist validation was turned on retroactively at milestone-audit time.
- **Nyquist coverage uneven across the milestone.** Phase 8 got validated; Phases 6 & 7 predate the toggle and still lack VALIDATION.md, so the milestone closed with partial Nyquist coverage.
- **Visual spot-checks deferred, not done.** Three jsdom-invisible checks (popover stacking, focal-point perception, reduced-motion chevron) were carried as deferred debt because no browser was available this session — the same class of visual gap that has mattered every prior milestone.

### Patterns Established
- **Per-half data-sufficiency gate distinct from the whole-tile gate.** `halfDrawsCurve(n) = n >= 20` is structurally separate from `hasUsableSampleCount`, each the single source of its own threshold.
- **One shared pooled bandwidth + one shared max density per split violin.** Never per-half — so a taller/narrower peak genuinely means more concentration, and both halves stay comparable.
- **Explicit chart margin constant shared between precomputed marks and Recharts-scale marks.** `PLOT_MARGIN` declared verbatim so `yFromValue()` pixel positions provably (not coincidentally) share the diamond's Recharts-driven scale.
- **Retroactive Nyquist validation (State B).** `/gsd-validate-phase` can reconstruct a VALIDATION.md from SUMMARYs + VERIFICATION + the live suite and fill standing-regression gaps after the fact.

### Key Lessons
1. When a defect is caught and fixed by a human, add the standing regression test in the same pass — a fix verified only by a throwaway test leaves the suite blind to the regression. Turn Nyquist validation on before, not after, the phases that need it.
2. A dedicated spike ahead of the highest-risk phase pays for itself: phase-8 planning had no open statistical unknowns because the spike had already settled them.
3. Foundation-only first waves (primitives, gate predicates) with no edits to existing files make later phases cheap and keep diffs attributable.

### Cost Observations
- Model mix: planning on opus, execution on sonnet, auditor/checker subagents on haiku (per configured profile).
- Sessions: ~2.
- Notable: milestone audit spawned haiku integration + Nyquist auditor subagents; the retroactive `/gsd-validate-phase 08` added 2 regression tests (194→196) without touching implementation.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~3 | 3 | Initial MVP; established phase→plan→execute→verify loop |
| v1.1 | ~2 | 2 | Foundation-first split (migrate, then redesign); conversational UAT + quick-task gap closure over formal per-phase VERIFICATION.md |
| v1.2 | ~2 | 3 | Primitives-first foundation wave; dedicated spike ahead of the highest-risk phase; Nyquist validation enabled mid-milestone and applied retroactively |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | ~28 tasks | — | hand-rolled z-score/delta (no stats dep) |
| v1.1 | 99 | — | none (styling-only; Tailwind v4 + plugin only) |
| v1.2 | 196 | Nyquist: phase 8 compliant, 6 & 7 unvalidated | hand-rolled Gaussian KDE + Silverman + empirical percentile (no stats dep) |

### Top Lessons (Verified Across Milestones)

1. Human/in-app verification catches the issues that matter most in this project — every milestone had its real blocking gaps found by a person looking at the running UI (v1.0: squished leftmost trend tile + missing legend; v1.1: delta-vs-temp ambiguity, off-center chart; v1.2: the two render defects a human reviewer caught before checkpoint), never by tests alone.
2. Isolate risky mechanical work from judgment-heavy work into separate phases (and foundation-only first waves) — it keeps each diff reviewable and each regression attributable.
3. A fix is not done until its regression test is standing; verify-once-then-delete leaves the suite blind. Enable coverage gates (Nyquist) before the phases that need them, not retroactively.
