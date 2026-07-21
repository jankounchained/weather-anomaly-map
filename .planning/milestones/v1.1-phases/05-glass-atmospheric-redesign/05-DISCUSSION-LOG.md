# Phase 5: Glass / Atmospheric Redesign - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-16
**Phase:** 5-Glass / Atmospheric Redesign
**Areas discussed:** Backdrop signal, Glass & layout, Anomaly hero, Chart re-theme, Motion

---

## Backdrop signal (DESIGN-02)

### What drives the gradient mood?

| Option | Description | Selected |
|--------|-------------|----------|
| Anomaly-driven | Delta sets the mood: cold→cool, hot→warm, near-normal→neutral | |
| Condition-driven | Literal current weather (sunny/overcast/rain) sets it | |
| Anomaly + time-of-day | Anomaly hue layered with a day/night luminosity shift | ✓ |
| Neutral atmospheric | Single refined gradient, does not change with data | |

**User's choice:** Anomaly + time-of-day

### Discrete tiers vs continuous mapping?

| Option | Description | Selected |
|--------|-------------|----------|
| Discrete verdict tiers | Reuse existing verdictTier buckets → fixed gradient per tier | |
| Continuous by z-score/delta | Interpolate hue smoothly across anomaly magnitude | ✓ |
| You decide | Defer to UI-SPEC, default discrete | |

**User's choice:** Continuous by z-score/delta
**Notes:** Captured that this needs defined anchor colors + a pure, testable mapping function since many intermediate states exist.

### Day/night keyed to which clock?

| Option | Description | Selected |
|--------|-------------|----------|
| Pinned location's local time | Use selected location's local time (already returned by Open-Meteo) | ✓ |
| Viewer's local time | Use the browser's clock | |
| You decide | Defer, default to pinned location | |

**User's choice:** Pinned location's local time
**Notes:** Correct for the "check somewhere before travel" use case; `current.localDate` already available, no new fetch.

---

## Glass & layout (DESIGN-03, PERF-01)

### Where do glass surfaces + backdrop live relative to the live map?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep panel docked; backdrop behind panel | Translucent glass over a static gradient → real backdrop-blur safe | |
| Float glass panel over the map | Frosted card over full-bleed map → faux-frosted only | |
| Hybrid | Docked glass + small frosted accents over map edge | |
| You decide | Defer composition to UI-SPEC, PERF-01 hard constraint | ✓ |

**User's choice:** You decide
**Notes:** Composition deferred to UI-SPEC with PERF-01 as hard constraint. CONTEXT records docked-panel-over-static-backdrop as the recommended low-risk default (real blur safe by construction).

### Glass intensity / overall vibe?

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle & refined | Gentle translucency, understated, legibility-first | ✓ |
| Pronounced & dramatic | Heavier frost, bold depth layering | |
| Subtle base, one hero moment | Restrained glass + one dramatic hero treatment | |
| You decide | Defer intensity, default refined | |

**User's choice:** Subtle & refined

---

## Anomaly hero (DESIGN-04, DESIGN-06)

### How to strengthen the delta as focal point?

| Option | Description | Selected |
|--------|-------------|----------|
| Color-coded delta tied to backdrop | Big delta takes warm/cool color matching the backdrop mood | ✓ |
| Bigger & bolder, but neutral color | Scale/weight only, high-contrast neutral | |
| Color + supporting sign/arrow | Color-coded delta + explicit +/− cue as one cluster | |
| You decide | Defer treatment to UI-SPEC | |

**User's choice:** Color-coded delta tied to backdrop
**Notes:** Preserve delta-as-hero / z-score-secondary hierarchy; legibility over glass is a hard requirement.

### How does the zero-delta case read?

| Option | Description | Selected |
|--------|-------------|----------|
| Worded 'right on average' + framed 0 | e.g. "0.0°C — right on the 30-year average" | ✓ |
| Near-zero band, not just exact 0 | Treat a small window around zero as "right on average" | |
| You decide | Defer exact copy/threshold to UI-SPEC | |

**User's choice:** Worded 'right on average' + framed 0
**Notes:** Anchors on the zero case; intent is "never a bare ambiguous number." Planning may extend the worded framing across the near-normal band if it reads better.

---

## Chart re-theme (DESIGN-05)

### How far to push the re-theme (layout + legend copy locked)?

| Option | Description | Selected |
|--------|-------------|----------|
| Recolor to new palette, same encoding | Swap token values only, encoding unchanged | |
| Recolor + light finish polish | New palette + small finish tweaks (opacity/weight/axis color) | ✓ |
| You decide | Defer degree of polish to UI-SPEC | |

**User's choice:** Recolor + light finish polish
**Notes:** Shared Y-axis column and reviewer-exact legend copy stay untouched; finish changes must keep the legend's descriptions true.

### Keep the actual-value marker's reserved standout hue?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep a reserved standout hue | Diamond keeps a distinct high-visibility color, re-picked for palette | |
| Fold into the new palette family | Rely on shape/position rather than a contrasting hue | |
| You decide | Defer, keep marker clearly distinguishable | ✓ |

**User's choice:** You decide
**Notes:** Constraint: actual-value marker must stay clearly distinguishable from historical dots and mean line. Default = keep a reserved standout hue.

---

## Motion (PERF-02)

### Static, subtle motion, or one-time transition?

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle CSS drift | Slow CSS-only gradient/hue drift | |
| Fully static | No motion; still gradient | |
| One-time entrance transition | Brief fade/ease when backdrop/hero updates on a new pin | ✓ |
| You decide | Defer, default static or one-time | |

**User's choice:** One-time entrance transition
**Notes:** No continuous loop, no JS/canvas; fully disabled under `prefers-reduced-motion` (satisfies success criterion #5).

---

## Claude's Discretion

- **Glass composition (docked vs floating vs hybrid):** deferred to UI-SPEC, PERF-01 as hard constraint. Recommended default: docked translucent panel over a static anomaly-gradient backdrop (real `backdrop-blur` safe by construction); anything over the live map uses faux-frost only.
- **Actual-value marker hue:** deferred; default = keep a reserved standout hue re-picked for the palette, must stay clearly distinguishable.

## Deferred Ideas

None — discussion stayed within phase scope. (Split-violin trend plot and coloring historical dots by decade remain v2/backlog per ROADMAP.md/STATE.md; not part of this re-theme.)
