# Phase 6: Panel Restructure & Hierarchy - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-22
**Phase:** 06-panel-restructure-hierarchy
**Areas discussed:** Panel layout & order, Delta panel emphasis, Refactor breadth, Component & state structure

---

## Panel layout & order

### Overall arrangement
| Option | Description | Selected |
|--------|-------------|----------|
| All stacked vertically | Location → Current Conditions → Delta → History, each full-width | |
| Current + Delta side-by-side | Location full-width top, CC+Delta two-up row, History full-width below | ✓ |

**User's choice:** Current + Delta side-by-side.

### Width split
| Option | Description | Selected |
|--------|-------------|----------|
| Delta wider (~60/40) | Delta gets larger share, panel-level dominance | |
| Equal 50/50 | Dominance via number size + color, not width | ✓ |
| Delta much wider (~70/30) | Strong emphasis, risks cramping Current Conditions | |

**User's choice:** Equal 50/50.

### Row height
| Option | Description | Selected |
|--------|-------------|----------|
| Equal height (stretch) | Both cards match taller one; aligned top/bottom edges | ✓ |
| Natural height (top-aligned) | Content-sized; ragged bottom edges | |

**User's choice:** Equal height (stretch).

### Empty/loading row behavior
| Option | Description | Selected |
|--------|-------------|----------|
| Keep side-by-side | Stable layout across all states, no reflow | ✓ |
| Stack when empty | Single column when empty, split when resolved | |

**User's choice:** Keep side-by-side.

### Content alignment
| Option | Description | Selected |
|--------|-------------|----------|
| Top-aligned | Headline → number → micro-copy anchored top | ✓ |
| Align numbers on a shared band | Numbers on one horizontal line | |
| Still want centered | Vertically center each card's content | |

**User's choice:** Top-aligned.
**Notes:** User initially leaned toward centered but was concerned the content imbalance
between the sparse Current Conditions card and the fuller Delta card would look strange.
Clarified that centering is precisely what *causes* the awkward floating-number effect, and
top-aligning both avoids it while keeping the numbers naturally aligned under equal-height
headlines. User agreed and chose top-aligned.

---

## Delta panel emphasis

### Card-level treatment
| Option | Description | Selected |
|--------|-------------|----------|
| No extra card treatment | All four panels identical PanelShell; dominance via number only | ✓ |
| Subtle card lift | Stronger shadow / anomaly-tinted border/glow on Delta card | |

**User's choice:** No extra card treatment.

### Verdict label fate
| Option | Description | Selected |
|--------|-------------|----------|
| Keep it as-is | Preserve verdict at current position/size | |
| Keep, but demote below micro-copy | Reorder: Δ → micro-copy → verdict → z-score chip | ✓ |
| Drop the verdict label | Remove it as redundant | |

**User's choice:** Keep, but demote below micro-copy.

---

## Refactor breadth

| Option | Description | Selected |
|--------|-------------|----------|
| Location adopts, TrendRow untouched | Primitives for new panels + LocationDisplay; leave TrendRow | |
| Migrate everything now | All four panels on the shared primitives; TrendRow wrapper swapped | ✓ |
| Absolute minimum | Primitives only for the two new panels; inline eyebrow on LocationDisplay | |

**User's choice:** Migrate everything now.
**Notes:** User pushed back on "why refactor at all" given the app is nearly feature-complete.
Clarified that the primitives are built regardless (the two new panels + the required
InfoTooltip need them, and Phases 7/8 explicitly depend on them), so the only real choice is
how far to touch the two already-working components. After that framing, user chose full
migration for one consistent system.

---

## Component & state structure

### File organization
| Option | Description | Selected |
|--------|-------------|----------|
| Split files + panels/ dir | New subdirectory for panels + primitives | |
| Split files, flat in app/ | Separate files directly in src/app/ | |
| You decide | Claude picks based on conventions | ✓ |

**User's choice:** You decide (→ Claude's Discretion).

### D-09 combined-gate threading
| Option | Description | Selected |
|--------|-------------|----------|
| Single gate in App.tsx | App computes one "both resolved" state; panels presentational | |
| Each panel gates itself | Both panels receive statuses and re-check the combined condition | ✓ |
| You decide | Claude picks during planning | |

**User's choice:** Each panel gates itself.
**Notes:** Claude flagged that since both panels check the identical combined condition
(shared props) they flip together — no partial-reveal risk in practice, only drift risk if a
future edit changes one and not the other. Agreed mitigation recorded in CONTEXT.md (PD-10):
extract the combined-gate check into one shared predicate helper both panels call.

---

## Claude's Discretion

- **File/module layout** — separate component files (retiring AnomalyCard.tsx); choice
  between a `src/app/panels/` subdirectory and flat `src/app/`. Lean toward matching the
  existing flat one-component-per-file convention.
- **InfoTooltip trigger placement** within each panel + popover positioning/portal approach —
  implementation details inside the UI-SPEC's locked interaction contract.

## Deferred Ideas

None — discussion stayed within phase scope.
