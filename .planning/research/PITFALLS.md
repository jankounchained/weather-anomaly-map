# Pitfalls Research

**Domain:** Adding split-violin trend visualization, panel-restructure, and collapsible explainers to an existing shipped Tailwind-v4 glassy anomaly dashboard (v1.2 milestone)
**Researched:** 2026-07-21
**Confidence:** MEDIUM (existing-app constraints are HIGH confidence — sourced directly from `.planning/PROJECT.md`; statistical/accessibility/perf claims are MEDIUM confidence — cross-corroborated web sources, no official Recharts/violin-specific documentation exists because Recharts has no native violin primitive)

## Critical Pitfalls

### Pitfall 1: KDE density implies precision the per-year sample doesn't have

**What goes wrong:**
A split-violin needs a kernel density estimate (KDE) per half. With ~15-20+ observations per group, KDE curves usefully approximate a distribution. Below that, the smoothed curve invents shape — bumps, tails, and "modes" — that reflect smoothing noise, not real climate signal. This app's per-day violin halves are thin by construction: the last-5-years half draws only from 5 years' worth of same-day-window observations, and even the prior-25-years half is still a per-calendar-day slice, not the full 30-year population used for the hero anomaly.

**Why it happens:**
It's tempting to feed whatever data points exist straight into a generic KDE (e.g. a default-bandwidth `d3.contourDensity`-style helper or a hand-rolled Gaussian kernel) without checking the halves are large enough to smooth honestly. Because Recharts has no built-in violin/KDE component, the KDE math is necessarily hand-written for this project, which is exactly the kind of code that ships without a bandwidth-sanity check.

**How to avoid:**
- Compute and log the effective n for both halves per day-of-year before trusting the curve; if the last-5-years half falls under a fixed floor (e.g. ~15-20 points), do not render a smoothed curve for that half — fall back to a simpler encoding (a dot/rug of the actual observations, or a flat "insufficient sample" band) rather than a fabricated bump.
- Use a fixed, documented bandwidth rule (e.g. Silverman's rule of thumb recomputed per half) rather than an ad hoc constant, and apply the **same bandwidth rule** to both halves of a given split so shape differences reflect data, not inconsistent smoothing.
- Overlay the raw observations (small tick marks or low-opacity dots) on top of the smoothed curve so a sparse half visibly reads as sparse instead of looking as confident as the well-sampled half.

**Warning signs:**
A violin half renders a smooth, symmetric bump for a location/day where the underlying data is 5 or fewer points — visually indistinguishable from a well-sampled half. QA should specifically pull up a low-latitude-data-availability location (or a day near the 5-year boundary) and check the two halves don't look equally confident.

**Phase to address:**
Split-Violin Trend View phase (this is the highest-novelty, highest-risk item in the milestone — flag for a dedicated design/statistics spike before full implementation, since it's genuinely new math, not restyling existing math).

---

### Pitfall 2: Unequal-sample-size violin halves mislead if widths aren't normalized

**What goes wrong:**
The milestone explicitly compares a last-5-years half against a prior-25-years half — a roughly 5x difference in years, and (depending on whether the existing ±5-day day-of-year window is applied per split) on the order of a 5x difference in raw point count too (e.g. ~11 points vs ~55, or ~55 vs ~275 if the full ±5-day window carries into each half — the exact multiplier depends on implementation, but the imbalance is real either way). If both halves are drawn at the same visual width/area, the viewer subconsciously reads them as equally-supported evidence, when the smaller half is statistically much noisier.

**Why it happens:**
Split-violin implementations (matplotlib/seaborn `split=True`, D3 examples) default to equal-width halves for visual symmetry — that default is fine when comparing similarly-sized groups, but silently wrong when one group is a fifth the size of the other, which is exactly this app's case by design (5 years vs 25 years is the entire point of the feature).

**How to avoid:**
- Either scale each half's area/width proportionally to its sample size (so the last-5-years half is visibly narrower — mirroring the reduced evidence), or, if equal widths are kept for legibility at this tile size, add an explicit small-sample indicator (e.g. a muted/dashed outline or reduced opacity on the smaller half) so the imbalance is disclosed rather than hidden.
- Do not let the two choices mix accidentally (e.g. width proportional to n in the code but the design intent assuming equal widths) — decide once, document it in a code comment next to the KDE function, and keep it consistent across all 7 tiles.
- Cross-check against Pitfall 1: a normalized-width but under-sampled half is still statistically weak — width normalization communicates "this half has less data," it does not fix the underlying instability of a very small-n KDE.

**Warning signs:**
The two halves of a violin look like mirror images of comparable visual weight despite representing very different amounts of underlying data — a design review should ask "can I tell which half has 5x less data just by looking at it?"

**Phase to address:**
Split-Violin Trend View phase.

---

### Pitfall 3: The shared `hasUsableSampleCount` gate doesn't cover the *split*, only the total

**What goes wrong:**
The existing gate answers "is there enough historical data at all to show something for this day?" — a single threshold on the combined 30-year population. Splitting that population into a last-5-years half and a prior-25-years half introduces a new failure mode the old gate was never designed for: a location could pass the combined-count gate (e.g. it has 22 years of station data, comfortably over the existing threshold) while one half of the split — say "prior 25 years" — has far fewer usable years than the label implies, or the "last 5 years" half straddles a station-relocation gap and has almost no points. The combined count can look fine while a half is nearly empty.

**Why it happens:**
Reusing a gate that was validated and battle-tested (Phase 3) feels safe, and the milestone context explicitly calls it out as "a shared `hasUsableSampleCount` gate covers this" — but that gate's semantics (total sample count) don't automatically decompose into two sub-gates just because the visualization now has two halves.

**How to avoid:**
- Add a **per-half** minimum-count check (reusing the same threshold constant/logic, just applied twice — once to each half's point count) in addition to the existing combined-total gate. A day/location must pass both: enough total data to be shown at all, AND enough data in *each* half to render that half meaningfully.
- Decide up front what happens when only one half fails (e.g. render the well-sampled half normally and show a muted "not enough recent data" indicator for the failing half, rather than dropping the whole tile) — this is a real, likely scenario (newer weather stations, or locations where 30-year archive coverage only recently became dense) and should be a designed state, not an edge case discovered in UAT.
- Write this as an explicit unit test alongside the existing `hasUsableSampleCount` tests, since it's the kind of gap that looks like "we already handle this" until a real sparse-history location is tested.

**Warning signs:**
A location known to have sparse/patchy history (per Phase 3's "no usable historical data" locations, or ones near that boundary) renders a split-violin tile where one half is visibly built from 1-2 points but no "insufficient data" treatment kicks in.

**Phase to address:**
Split-Violin Trend View phase — this should be the first sub-task (define the per-half gate) before any rendering work starts, since it changes what "renderable" means for the whole feature.

---

### Pitfall 4: Reviewer-locked trend legend copy becomes orphaned by new violin marks

**What goes wrong:**
The current legend explains three marks that are specific to the dot-strip tile design: a translucent 30-year dot strip, a bright mean reference line, and an actual-value diamond marker. A split-violin is a structurally different mark (a smoothed density shape, not dots), so at least some of that locked copy will describe visual elements that no longer exist on screen once violins replace dot-strips — while the constraint says the copy is reviewer-locked and must not change.

**Why it happens:**
"Reviewer-locked" naturally reads as "leave this untouched," which is the safe assumption for copy describing marks that *do* carry over (e.g. if the split-violin overlay still shows a mean reference line and an actual-value marker on top of the density shape) — but it's easy to either (a) silently rewrite the locked copy to fit the new chart, breaking the lock, or (b) leave stale copy describing a dot strip that's no longer drawn, confusing users.

**How to avoid:**
- Before touching the trend row, explicitly enumerate which of the three locked-copy marks (dot strip / mean line / actual-value diamond) survive as an overlay on the new split-violin and which are fully superseded by the violin shape itself. Likely candidates: the mean-reference-line and actual-value-diamond concepts probably still make sense as an overlay on the violin (today's reading vs. each half's mean); the "translucent dot strip" concept is what the violin visually replaces.
- Treat any genuinely new visual element (the split-violin shape itself, the 5-year-vs-25-year split) as **new legend copy that needs its own reviewer round-trip**, additive to (not a rewrite of) the locked text — don't silently expand scope of the lock, and don't silently violate it either. Surface this explicitly to the user/reviewer as a scoped question rather than deciding unilaterally.
- If the whole legend must change shape, that's a deliberate escalation (a "the locked copy no longer applies, here's the proposed replacement" conversation), not something to resolve mid-implementation.

**Warning signs:**
Legend text still reads "dot strip" or similar after dot-strip tiles are gone, or the legend was rewritten without a reviewer pass, silently breaking the lock the milestone explicitly calls out.

**Phase to address:**
Split-Violin Trend View phase — resolve before writing any new legend copy; flag as a phase-specific research/reviewer-consult item, not a standard implementation task.

---

### Pitfall 5: Splitting the hero into 4 equal-weight panels dilutes the delta-as-hero hierarchy

**What goes wrong:**
The entire existing visual hierarchy — anomaly-driven gradient color, the Δ glyph, larger type scale, framed zero-delta case — was built around **one** combined hero panel where the delta had nowhere to compete for attention. Restructuring into four headlined panels (Location / Current conditions / Delta / History) each with its own "Last 7 days"-style headline is, by construction, an equalizing move: headlines create a visual rhythm across panels that (if uniform) tells the eye "these four things are peers," directly undermining the "delta must stay the visual hero" constraint.

**Why it happens:**
Giving every panel a headline for clarity (the stated goal — "self-explanatory at a glance") is good UX practice in isolation, but a naive implementation applies the same card treatment, same headline type scale, and same content-to-chrome ratio to all four panels, because that's the path of least resistance for a grid/flex layout. Nothing in "add headlines" inherently preserves "but one of these four must still dominate."

**How to avoid:**
- Explicitly design an *unequal* grid: give the Delta panel more physical size (larger card, larger number type scale) and keep sole ownership of the anomaly-color gradient and Δ-glyph treatment established in v1.1 — the other three panels should use a visually quieter, uncolored glass treatment.
- Make the Delta panel's headline typographically subordinate to its own value (small/muted headline label, large glowing delta number) — don't let "Delta" as a headline word compete in size with the "Δ6°C" value beneath it.
- Before implementation, do a quick low-fi layout pass (even a throwaway sketch) that answers "if I squint at this layout, does my eye land on the delta number first?" — this is a design-review gate, not just a code review gate.
- Concretely: define a persistent size/emphasis ratio target (e.g. Delta panel headline number ≥ 1.5-2x the type scale of the Current-conditions temperature) as an acceptance criterion, not just a vibe check.

**Warning signs:**
In a build preview, a user's eye is drawn equally (or worse, first) to "Current conditions" or "History" instead of "Delta" — this is exactly the kind of regression that's obvious in a screenshot review but easy to miss when reviewing code/props in isolation.

**Phase to address:**
Panel Restructure & Hierarchy phase — should have an explicit UI-review/UAT checkpoint specifically testing this before moving on, since it's the constraint most likely to silently regress.

---

### Pitfall 6: Four independent glass panels read as disconnected boxes instead of one view

**What goes wrong:**
Splitting one hero into four separately-headlined panels risks losing the sense that they're one cohesive "here's everything about this location and moment" view. If each panel gets its own full glass treatment (border, shadow, independent background blur/tint), the eye sees "a dashboard of widgets" rather than a single narrative — undermining both usability (harder to scan) and the atmospheric design language the v1.1 redesign established.

**Why it happens:**
The most mechanically simple implementation of "split into headlined panels" is a straightforward CSS grid of N independent card components, each reusing the same "glass card" utility class — which is exactly what produces the disconnected-boxes look, because nothing in that approach preserves cross-panel visual relationships (shared backdrop, consistent spacing rhythm, implied reading order).

**How to avoid:**
- Keep the anomaly-driven gradient backdrop (already established, sits *behind* all panels) as the connective visual tissue — panels should read as translucent windows onto one shared atmosphere, not four separately-colored cards.
- Establish a single consistent spacing/alignment grid and border-radius/shadow language across all four panels so they read as a family, and consider grouping Location+History as visually adjacent/secondary while Current+Delta form the primary reading pair (matching the stated "split the current hero into Current conditions and Delta" framing).
- Use panel *order and proximity* to imply a reading narrative (e.g. Location → Delta → Current → History, or whatever matches how a user actually processes "where, how unusual, what's it doing now, and what's normal") rather than a purely mechanical 2x2 grid with no intentional order.
- Avoid giving every panel its own independent glass surface if a shared outer glass container with internal dividers/headline separators can achieve the same clarity with more cohesion — evaluate both before committing to full separation.

**Warning signs:**
Screenshot review shows visual "seams" — four cards each competing for border/shadow attention with no obvious visual path connecting them; a first-time viewer describes the layout as "a grid of stats" rather than "a single readout."

**Phase to address:**
Panel Restructure & Hierarchy phase.

---

### Pitfall 7: Collapsible methodology and inline tooltips built without real keyboard/ARIA support

**What goes wrong:**
Collapsible disclosures and inline info affordances (tooltips/popovers explaining the current temperature, delta, and z-score in place) are exactly the kind of UI element that's easy to make "look right" visually while being unusable via keyboard or screen reader — e.g. a `<div>` with an `onClick` toggling a CSS class (no `aria-expanded`, no keyboard activation), or a tooltip that only appears on `:hover` (invisible to keyboard-only and touch users).

**Why it happens:**
Custom disclosure/tooltip components are quick to hand-roll with a div+onClick+useState, and that quick version visually passes a sighted click-through demo, so the accessibility gap often isn't caught until a dedicated a11y pass — which this milestone doesn't explicitly schedule unless called out.

**How to avoid:**
- Prefer the native `<details>`/`<summary>` element for the collapsible methodology section — it gets keyboard operation, `aria-expanded`-equivalent semantics, and screen-reader announcement for free, and can still be fully restyled with Tailwind. Only reach for a custom ARIA disclosure (`button` + `aria-expanded` + `aria-controls` + a controlled region) if `<details>`'s default styling/animation limitations become a real blocker.
- For inline info affordances (the "self-explanatory in place" micro-copy triggers), implement them as focusable elements (a `<button>`, not a hover-only span) so the info is reachable via Tab and dismissible/toggleable via Enter/Space/Escape — not hover-only, since hover has no keyboard or touch equivalent.
- Every disclosure trigger needs a visible focus indicator (don't let a Tailwind reset strip `:focus-visible` styling) — this is a common and easy-to-miss regression when restyling interactive elements during a broader visual pass.
- Verify with an actual keyboard-only pass (Tab through the whole panel set, operate every disclosure/tooltip with only keyboard) as part of this phase's verification, not just a visual/mouse-driven check.

**Warning signs:**
Tabbing through the page skips over the methodology trigger or info icons entirely, or lands on them but Enter/Space does nothing; VoiceOver/NVDA announces nothing meaningful when a disclosure opens (no "expanded"/"collapsed" state announced).

**Phase to address:**
Methodology & Explainers phase.

---

### Pitfall 8: Collapsing methodology accidentally buries information the app's core value depends on

**What goes wrong:**
The core value promise is "immediately tell how unusual today's temperature is... at a glance." If the collapsible methodology section becomes a dumping ground for anything that feels like "explanation" — including the plain-language interpretation of *this specific reading* (e.g. what makes today's delta unusual) rather than purely the general "how we compute this" methodology — the app regresses on its own core value by hiding the answer behind a click.

**Why it happens:**
"Methodology" and "why is today's reading what it is" can blur together during implementation, especially once a collapsible section exists and it's tempting to move any explanatory text into it to declutter the always-visible view — the milestone's stated design already separates these two (always-visible per-panel micro-copy vs. collapsed-by-default general methodology), but that separation has to be actively maintained, not just assumed.

**How to avoid:**
- Draw an explicit content-ownership line before writing copy: the collapsible methodology owns *general, reading-independent* explanation ("we compare today to a 30-year day-of-year baseline using a z-score and a delta") — it should read identically regardless of what today's number is. Anything that changes based on today's specific reading (is it unusual, by how much, in which direction) belongs in the always-visible per-panel micro-copy, never behind the collapse.
- Default-collapsed is correct for methodology (matches the stated design), but verify no already-shipped "at a glance" content (the plain-language verdict validated in Phase 2) is inadvertently moved into the new collapsible section during the refactor — this is a regression risk specifically because refactoring touches the same layout region that content already lives in.

**Warning signs:**
A first-time user has to expand "Methodology" to answer "is today unusual" — if that happens, always-visible content has been miscategorized as methodology.

**Phase to address:**
Methodology & Explainers phase.

---

### Pitfall 9: New disclosure/tooltip motion, or new chart-entrance motion, quietly bypasses the reduced-motion policy

**What goes wrong:**
The disciplined-glass performance policy requires ALL motion to sit behind `prefers-reduced-motion`, with no JS/canvas animation loops. Two new surfaces are prime candidates to violate this unintentionally: (1) an expand/collapse transition for the methodology disclosure implemented as a JS-measured `scrollHeight` animation (a very common accordion pattern) which typically runs via `requestAnimationFrame` or a JS-driven CSS transition that isn't gated by a media query check in script; and (2) an "entrance" flourish for the new split-violin tiles (e.g. animating the density curve drawing in), which — given 7 tiles rendering simultaneously — is exactly the kind of "just one small polish animation" that can silently reintroduce a JS animation loop the v1.1 policy was written to prevent.

**Why it happens:**
CSS-only solutions for animating to `height: auto` are non-trivial (browsers can't natively transition to an intrinsic auto height), which historically pushes developers toward JS-measured-height or JS-driven approaches — precisely the pattern the existing policy prohibits. Chart libraries (Recharts) also ship default enter animations that are easy to leave switched on without registering that they should be gated.

**How to avoid:**
- Use the CSS `grid-template-rows: 0fr → 1fr` transition trick (an inner wrapper with `overflow: hidden` inside a grid whose row track is animated) for the methodology disclosure — this is a pure-CSS solution requiring no JS measurement or rAF loop, and is straightforward to wrap in `@media (prefers-reduced-motion: no-preference)` with an instant-toggle fallback otherwise.
- Explicitly audit and disable/gate Recharts' built-in animation props (`isAnimationActive`, animation duration/easing on `Area`/`Line`/custom shapes) for the new split-violin tiles, matching how existing trend-tile animation (if any) is already gated — do not accept chart-library animation defaults as "free" just because they didn't require writing new code.
- Any JS that *does* need to check the preference (rare, given the above) must check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` directly rather than assuming a CSS-only media query covers it — CSS media queries don't gate JS-triggered behavior.
- Re-run the existing v1.1 reduced-motion verification pass against the new UI surfaces specifically (methodology disclosure, inline tooltips, violin tile mount/update) rather than assuming it only needs re-checking where code changed structurally.

**Warning signs:**
Toggling the OS-level "reduce motion" setting and reloading still shows an animated expand/collapse or an animated violin-draw-in effect; browser performance profiling shows a rAF loop active while a disclosure is open/closed or while violins first render.

**Phase to address:**
Methodology & Explainers phase (disclosure motion) and Split-Violin Trend View phase (chart-entrance motion) — both should re-run the same reduced-motion verification checklist established in v1.1's Phase 5.

---

### Pitfall 10: Layout reflow silently reintroduces real backdrop-blur near the live map, or breaks Leaflet's size assumptions

**What goes wrong:**
Two distinct risks bundle under "reflow breaks the glass-perf policy": (a) a new/resized panel grid changes which DOM elements sit adjacent to or wrap the Leaflet map container, and if a shared "glass card" utility class (real `backdrop-blur`) gets applied to a panel that now overlaps or sits very close to the live map viewport — or worse, to a shared ancestor wrapping both the map and the panels — the expensive case the v1.1 policy was specifically designed to avoid (blur recompute during map panning) gets silently reintroduced. (b) Leaflet does not automatically detect when its container element is resized by surrounding layout changes — a well-documented react-leaflet gotcha — so restructuring the grid around the map (four panels instead of one hero) risks leaving the map mis-sized or showing gray/missing tiles until `map.invalidateSize()` is explicitly called after the new layout settles.

**Why it happens:**
(a) happens because Tailwind utility classes are easy to reuse across a redesign without re-auditing which DOM elements they now land on — "same glass-card class as before" doesn't guarantee "same relationship to the map" once the grid changes shape. (b) happens because Leaflet's sizing model assumes explicit resize notification; it's a known, frequently-filed react-leaflet issue precisely because container-resize-without-map-resize-event is such an easy thing to trigger via a CSS/layout change and easy to forget because the map "worked before" the reflow.

**How to avoid:**
- Before merging the new layout, explicitly re-verify (not just re-run automated tests, but a visual pass) that no element carrying real `backdrop-blur` sits directly above, adjacent-with-overlap, or as an ancestor of the Leaflet map container — the map region should carry no glass/blur class "by construction," per the existing (already-validated) v1.1 policy, and that invariant needs re-confirming after the DOM tree changes shape, not assumed to still hold.
- Add a `map.invalidateSize()` call (via the `useMap()` hook from react-leaflet, in a `useEffect` keyed to the layout/container-size change, or a `ResizeObserver` on the map's container) triggered whenever the new panel grid causes the map's allotted space to change — this is standard, well-documented practice for any react-leaflet app whose surrounding layout is not static.
- Treat this as a required regression check specifically because it passed before the reflow (map region was untouched) and there's no reason to assume it automatically still holds after — call it out explicitly in phase verification rather than relying on "the map still looked fine in my quick check," since gray-tile bugs are often only visible on non-cached/slow tile loads or window resizes.

**Warning signs:**
The map shows gray/blank tiles until the browser window is manually resized; a performance profile shows blur recompute/paint cost while panning the map after the reflow, where it previously didn't.

**Phase to address:**
Panel Restructure & Hierarchy phase (since this is the phase that changes the DOM/grid structure around the map) — should include an explicit map-sizing and glass-scope regression check in its verification step, not deferred to a later integration pass.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|-----------------|
| Equal-width violin halves without a small-sample indicator | Faster to build, visually simpler | Misleads users comparing 5-year vs 25-year evidence quality (Pitfall 2) | Only as an explicit, documented interim state if width-normalization is deferred to a fast-follow — never as the final shipped behavior |
| Reusing the combined `hasUsableSampleCount` gate without adding a per-half check | Saves a small amount of logic/test work | Silent "confident-looking" violin halves built from near-zero data (Pitfall 3) | Never — this is cheap to add and the risk (misleading a user about data confidence) directly undermines the app's core value |
| Hover-only tooltips for inline explainers | Quickest to implement, looks fine in a mouse-driven demo | Fully inaccessible to keyboard/touch users (Pitfall 7) | Never for the shipped feature — acceptable only as a throwaway prototype, not for anything merged |
| JS `scrollHeight`-measured accordion animation | Well-known pattern, lots of copy-paste examples online | Reintroduces exactly the JS-driven-animation pattern the disciplined-glass policy exists to prevent (Pitfall 9) | Never — the CSS grid-rows trick achieves the same visual result with no policy violation |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|--------------|------------------|-------------------|
| react-leaflet + surrounding layout reflow | Assuming Leaflet auto-detects container resize when panels around it change | Call `map.invalidateSize()` (via `useMap()` in a `useEffect`/`ResizeObserver`) whenever the map's allotted layout space changes |
| Recharts + custom violin shape | Treating Recharts' default per-series animation as harmless because it "comes for free" from the library | Explicitly set `isAnimationActive={false}` (or gate via reduced-motion check) on the new violin shapes/series, matching existing chart-animation policy |
| Tailwind v4 utility reuse across a redesign | Reapplying the same `glass-card`-style utility class to new panels without checking their new DOM position relative to the map | Re-audit every element carrying real `backdrop-blur` after any layout change that alters the DOM tree around the map container |
| `<details>`/`<summary>` + custom Tailwind styling | Assuming native disclosure elements can't be restyled, so reaching for a fully custom ARIA widget by default | Style native `<details>`/`<summary>` with Tailwind first (free keyboard/ARIA semantics); only build a custom disclosure if a specific animation/visual need can't be met natively |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| 7 simultaneous violin KDE computations recomputed on every render (not memoized) | Trend row feels sluggish on pin move, especially on slower devices | Memoize each tile's KDE output (data + bandwidth as dependency) — matches the existing per-tile chart approach used for dot-strip tiles | Noticeable once violin math (even lightweight) runs synchronously on every parent re-render triggered by unrelated state (e.g. panel hover) |
| Backdrop-blur silently reapplied over/near the map after reflow | Map panning stutters where it didn't before v1.2 | Explicit glass-scope audit after any DOM-structure change near the map (Pitfall 10) | Immediately on any device without hardware-accelerated blur compositing; may look fine in dev but degrade on lower-end hardware |
| Chart-library default animations left enabled across 7 new tiles at once | Trend row feels janky or CPU-spikes on initial mount, independent of the reduced-motion policy violation itself | Disable per-series animation explicitly on all new violin series (see Integration Gotchas) | Most visible on initial page load with all 7 tiles mounting simultaneously |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|--------------|-------------------|
| Delta panel visually equal-weight with the other three | User no longer instantly finds "how unusual is today" — the app's stated core value | Deliberately asymmetric panel sizing/color-ownership keeping Delta dominant (Pitfall 5) |
| Violin halves rendered with equal visual confidence despite unequal sample sizes | User over-trusts a thin 5-year sample as much as the 25-year one | Normalize width by n and/or add a small-sample visual cue (Pitfall 2) |
| Methodology collapse absorbs "is today unusual" content along with general methodology | At-a-glance interpretability regresses; user must click to learn what should be immediately visible | Keep reading-specific interpretation always-visible; methodology stays reading-independent (Pitfall 8) |
| Legend text describes marks no longer on screen | User is confused about what the new violin shape means, or distrusts the legend entirely | Explicitly reconcile locked copy against the new marks before shipping (Pitfall 4) |

## "Looks Done But Isn't" Checklist

- [ ] **Split-violin tiles render:** Often missing a per-half sample-size check — verify a known sparse-history location/day shows a visibly different (not equally confident) treatment for its thin half.
- [ ] **Four headlined panels render:** Often missing the intentional size/color asymmetry — verify via a quick screenshot squint-test that the Delta panel is still the first thing the eye lands on.
- [ ] **Methodology collapse/expand works with a mouse:** Often missing full keyboard operability — verify Tab reaches the trigger, Enter/Space toggles it, and a screen reader announces the new state.
- [ ] **Reduced-motion setting respected for the new violin/disclosure animations:** Often verified only by reading the code (assuming a media query exists) rather than actually toggling the OS-level setting and re-checking the rendered behavior.
- [ ] **Map still pans smoothly and shows correct tiles after the reflow:** Often only checked once at initial load — verify by resizing the window / triggering the new layout's responsive breakpoints and confirming no gray-tile flash and no blur-over-map stutter.
- [ ] **Reviewer-locked trend legend still accurate:** Often assumed unchanged because "we didn't edit that file" — verify the copy still matches the marks actually on screen after dot-strips become violins.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|-----------------|------------------|
| Unnormalized violin widths shipped | LOW-MEDIUM | Add a post-hoc width-scaling factor (by sample n) or a small-sample visual cue to existing tiles — CSS/render-prop change, no data-model change needed |
| Delta panel loses hero status | LOW | Adjust type-scale/sizing/color-ownership tokens — this is a CSS/layout-only fix, not a data or logic change |
| Reduced-motion violation shipped (JS-driven disclosure/chart animation) | LOW-MEDIUM | Swap the JS-measured-height accordion for the CSS grid-rows trick; add `isAnimationActive={false}` to chart series; re-run the reduced-motion verification pass |
| Map gray-tile / mis-sized after reflow | LOW | Add the missing `map.invalidateSize()` call in a `useEffect`/`ResizeObserver` keyed to layout changes |
| Per-half sample gate missing (thin violin half looks confident) | MEDIUM | Add the per-half check to the existing gate function plus unit tests; requires re-touching any location/day already shipped with the bug to confirm the fix renders correctly |
| Legend copy orphaned by new marks | MEDIUM | Requires a reviewer round-trip (same process that produced the original locked copy) — not a unilateral fix, budget calendar time for this |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|--------------------|-----------------|
| KDE misleads on tiny per-half samples (P1) | Split-Violin Trend View | Design/statistics spike output reviewed before full implementation; unit tests on bandwidth/fallback logic |
| Unequal-n violin widths not normalized (P2) | Split-Violin Trend View | Visual review comparing a 5-year-vs-25-year tile against a design acceptance criterion for width/confidence disclosure |
| Shared gate doesn't cover per-half sparsity (P3) | Split-Violin Trend View | New unit tests for per-half gate; manual check against a known sparse-history location |
| Locked legend copy orphaned by new marks (P4) | Split-Violin Trend View | Explicit reviewer round-trip sign-off before merge, mirroring the original legend-copy approval process |
| Delta loses hero status in 4-panel split (P5) | Panel Restructure & Hierarchy | Screenshot/UAT checkpoint specifically testing "where does the eye land first" |
| Panels read as disconnected boxes (P6) | Panel Restructure & Hierarchy | Same UAT checkpoint as P5, extended to "does this read as one view or four widgets" |
| Disclosure/tooltip missing keyboard/ARIA support (P7) | Methodology & Explainers | Keyboard-only pass (Tab + Enter/Space + Escape) and screen-reader spot check |
| Methodology collapse buries at-a-glance content (P8) | Methodology & Explainers | Content-ownership review: confirm reading-specific verdict text stays always-visible |
| New motion bypasses reduced-motion policy (P9) | Methodology & Explainers + Split-Violin Trend View | Re-run v1.1's reduced-motion verification checklist against all new UI surfaces |
| Reflow reintroduces blur-near-map or breaks Leaflet sizing (P10) | Panel Restructure & Hierarchy | Explicit glass-scope audit + map-resize regression check as part of phase verification, not deferred |

## Sources

- `.planning/PROJECT.md` (Current Milestone v1.2, Anomaly methodology, Key Decisions, disciplined-glass performance policy) — HIGH confidence, primary source of all existing-app constraints
- Violin plot small-sample and bandwidth pitfalls — cross-corroborated web search (Domo violin-plot guide, matplotlib/seaborn documentation ecosystem) — MEDIUM confidence
- Split-violin unequal-sample-size width normalization — cross-corroborated web search (CRAN `vioplot` split-violin vignette, seaborn split-violin documentation ecosystem, Atlassian/Mode violin-plot guides) — MEDIUM confidence
- WAI-ARIA disclosure/accordion pattern — cross-corroborated web search (W3C WAI-ARIA Authoring Practices, NZ Government Web Accessibility Guide, 216digital accessible-accordion guide) — MEDIUM confidence
- `prefers-reduced-motion` best practices for disclosures/animation — cross-corroborated web search (MDN, CSS-Tricks, multiple accessible-animation guides) — MEDIUM confidence
- Leaflet/react-leaflet container-resize and `invalidateSize()` behavior — cross-corroborated web search (multiple `PaulLeCam/react-leaflet` GitHub issues describing the same gray-tile symptom and fix) — MEDIUM confidence (well-documented, recurring community-reported issue; no single canonical official doc page found in this pass)
- CSS `grid-template-rows` height-auto animation trick for accordions — cross-corroborated web search (Stefan Judis, Keith J. Grant, multiple CSS-trick writeups) — MEDIUM confidence

---
*Pitfalls research for: Weather Anomaly Dashboard v1.2 (UI Layout Redesign & Explanatory Legend)*
*Researched: 2026-07-21*
