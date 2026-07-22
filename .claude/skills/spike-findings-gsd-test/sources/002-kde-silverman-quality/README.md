---
spike: 002
name: kde-silverman-quality
type: standard
validates: "Given real per-half samples, when a hand-rolled Gaussian KDE with Silverman bandwidth renders each half, then the recent-half (n≈55) curve is a believable/reliable depiction (not lumpy) and a thinning sweep pins the per-half n_min curve-vs-rug threshold"
verdict: VALIDATED
related: [001, 003]
tags: [statistics, kde, bandwidth, silverman, n-min, phase-8]
---

# Spike 002: KDE / Silverman Bandwidth Quality

## What This Validates

**Given** the real per-half samples spike 001 measured (recent n≈55, prior n≈275),
**when** a hand-rolled Gaussian KDE with Silverman's-rule bandwidth renders each half,
**then** (a) the recent half draws a believable, reliable curve at its real n, and (b) a
controlled thinning sweep pins the per-half `n_min` curve-vs-rug floor (PD-04 gate 2) and
confirms the bandwidth choice.

## Research

- **Kernel:** Gaussian, `f(x) = (1/nh) Σ φ((x−xᵢ)/h)`. Standard, smooth, no external dep —
  ports directly to `src/anomaly/kde.ts` (see `kde.mjs`).
- **Bandwidth:** Silverman's rule `h = 0.9 · min(σ, IQR/1.34) · n^(-1/5)`, with robust guards
  (IQR-collapse → σ; all-equal → tiny positive h so density never divides by zero). Chosen over
  a hand-tuned fixed bandwidth because it is parameter-free and self-adapts to each half's n and
  spread — critical given the 55-vs-275 asymmetry from spike 001.
- **Reliability metric:** normalized L1 distance between an n-sample KDE and the full-30yr-pool
  KDE (the best available "truth"), averaged over 200 random subsamples. Measures pure sampling
  noise — the honest "can you trust this curve?" quantity. (A first attempt used mode-counting;
  discarded — it flagged normal shouldered distributions as lumpy even at n=55. See Trail.)

## How to Run

```bash
# Quantitative thinning sweep across 3 climates (Berlin/Singapore/Reykjavík):
node experiment.mjs

# Interactive: thinning slider + bandwidth toggle on live real data — watch
# the recent curve drift from truth as you starve it:
python3 -m http.server 8002    # open http://localhost:8002/
```

## What to Expect

- `experiment.mjs` prints, per n, the average bandwidth and average % error vs the truth curve.
  Expect ~4% at n=275, ~15–17% at n=55, rising smoothly to ~27% at n=20 and 55–65% at n=5.
- The page shows recent (orange) vs prior (grey) vs pool (dashed) density curves with sample
  rugs and mean lines. Dragging the thinning slider below 20 flips the verdict to "degrade to
  rug"; the bandwidth toggle shows Silverman ×1.0 is the sweet spot.

## Investigation Trail

1. **Built portable `kde.mjs`** (mean/std/quantile/IQR/Silverman/kdeAt/kdeCurve) — dependency-free,
   pure, ready to become `kde.ts`.
2. **First metric — mode counting — was wrong.** Counting local maxima flagged ~30–35% of even
   n=55 draws as "multimodal/lumpy," contradicting spike 001's premise. Root cause: real
   day-of-year temperature windows are mildly shouldered/skewed, and a 5%-of-peak ripple
   threshold is over-sensitive. **Discarded it.**
3. **Switched to a reliability metric** (L1 distance from the full-pool truth curve) — principled,
   monotonic, climate-independent. This is the honest question: does an n-sample curve reconstruct
   the distribution it depicts?
4. **Ran the sweep across 3 very different climates** (Berlin σ=3.2, Singapore σ=0.75 tight
   tropical, Reykjavík σ=1.6 maritime). The curve was nearly identical across all three — the
   finding is not location-specific.
5. **Discovered the real failure mode:** `avg_h` *grows* as n shrinks (Silverman ∝ n^(-1/5)), so a
   starved half never goes spiky — it goes **wrong-shaped**. Silverman is self-protecting against
   lumpiness; the risk it can't fix is shape distortion, which the reliability metric captures.

## Results

**VALIDATED — Silverman ×1.0 confirmed; n_min pinned at 20.**

Error vs truth (mean over 200 draws), consistent across all three climates:

| n | avg err vs truth | regime |
|---|---:|---|
| 275 | ~4% | prior half — rock solid |
| **55** | **~15–17%** | **recent half (real n) — reliable but adequate, not generous** |
| 40 | ~18–19% | reliable |
| 30 | ~21–22% | borderline |
| 25 | ~24–26% | borderline |
| **20** | **~26–28%** | **← n_min floor (≈1.7× the recent-half baseline)** |
| 15 | ~30–31% | unreliable |
| 10 | ~35–41% | unreliable |
| 5 | ~56–64% | unreliable |

**Key findings / decisions pinned:**

1. **Bandwidth = textbook Silverman ×1.0.** Parameter-free, robust, no tuning. The page's ×0.7 /
   ×1.5 toggle confirms ×1.0 is the sweet spot — ×0.7 lets sampling noise through, ×1.5 starts
   washing out the recent-vs-prior mean gap that is the whole point.
2. **`n_min = 20`** for the per-half curve-vs-rug threshold (PD-04 gate 2). Rationale: it is the
   point where a half's error reaches ~1.7× the recent half's own real-n baseline — beyond that
   the curve is meaningfully less trustworthy than the real recent half ever is. Confirms the
   roadmap's ~15–20 estimate at its conservative end. Since real halves are 55/275 (spike 001),
   this floor keeps **every** real curve and only degrades genuinely thin synthetic/edge inputs.
3. **The recent half (n=55) is honest but not luxurious (~15% error).** Two build consequences:
   (a) it correctly draws a curve; (b) small recent-vs-prior differences must NOT be over-read —
   this independently supports deferring the explicit climate-shift callout (TREND-04).
4. **The failure mode is shape drift, not spikiness** — reframes the rug fallback's *purpose*.
   The rug isn't there to hide jagged kernels (Silverman prevents those); it's there so a thin
   half doesn't present a confident smooth shape that is 30–60% wrong. This is the honest framing
   for the legend copy (PD-10) and the fallback's reason-for-being.

**Surprise:** the premise going in was "will 55 samples be too noisy/lumpy?" The answer is the
opposite of the fear — Silverman never lets it get lumpy; it over-smooths instead. So the recent
curve is always *smooth*, and the real discipline is not over-trusting a smooth-but-adequate curve.

**Impact on 003:** curve/curve is the default tile (both halves always draw curves on real data);
`n_min=20` gates the rare rug branch; Silverman ×1.0 + shared-peak normalization (PD-06) is the
geometry input. 003 must confirm the recent-vs-prior *shift* still reads once both curves are
mirrored into a violin on a shared vertical axis.
