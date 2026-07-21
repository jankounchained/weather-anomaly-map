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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~3 | 3 | Initial MVP; established phase→plan→execute→verify loop |
| v1.1 | ~2 | 2 | Foundation-first split (migrate, then redesign); conversational UAT + quick-task gap closure over formal per-phase VERIFICATION.md |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | ~28 tasks | — | hand-rolled z-score/delta (no stats dep) |
| v1.1 | 99 | — | none (styling-only; Tailwind v4 + plugin only) |

### Top Lessons (Verified Across Milestones)

1. Human/in-app verification catches the issues that matter most in this project — both milestones had their real blocking gaps found by a person looking at the running UI (v1.0: squished leftmost trend tile + missing legend; v1.1: delta-vs-temp ambiguity, off-center chart), never by tests.
2. Isolate risky mechanical work from judgment-heavy work into separate phases — it keeps each diff reviewable and each regression attributable.
