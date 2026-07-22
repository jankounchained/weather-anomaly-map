# Spike Conventions

Patterns and stack choices established across spike sessions. New spikes follow these unless the
question requires otherwise.

## Stack

- **Interactive pages:** a single standalone `index.html` per spike — vanilla ES modules
  (`<script type="module">`) + inline SVG, no bundler, no framework, no build step. Served with
  `python3 -m http.server 800N`. This gets to a felt, real-data visual fastest and keeps the math
  portable.
- **Quantitative probes:** Node `.mjs` scripts (`probe.mjs`, `experiment.mjs`, `snapshot.mjs`) run
  directly with `node` (Node 22, global `fetch`). Used when the answer is a number or a table, or
  to render a static SVG snapshot for self-verification.
- **Data:** always the **real** Open-Meteo archive API (`archive-api.open-meteo.com/v1/archive`,
  `daily=temperature_2m_mean`, keyless + CORS). No mocked/synthetic weather data — sparsity, when
  needed, is created by *subsampling real data*, never by fabricating it.
- **Portable pure-math modules** (`kde.mjs`, `violin.mjs`) are written dependency-free and pure so
  they port straight to `src/anomaly/*.ts` — mirroring the codebase's hand-rolled, no-stats-
  dependency discipline (`anomaly.ts`, CLAUDE.md "hand-roll, don't add a dependency").

## Structure

- One directory per spike: `NNN-descriptive-name/` containing `index.html`, the `.mjs`
  probe/experiment/geometry modules, a `README.md` with full frontmatter, and any `.svg`/`.png`
  snapshot evidence.
- Shared math (`kde.mjs`) is copied forward into each spike that needs it (self-contained dirs).
- Port assignments match the spike number: 8001 / 8002 / 8003.

## Patterns

- **Real-data-first, then feel it.** Establish the quantitative fact with a Node probe on real
  data, *then* build the interactive page so the user can experience it. Both live in the same dir.
- **Self-verification via SVG snapshot.** For visual spikes, render a static SVG from real data
  with the *same* geometry module the page uses (not a mockup), then `qlmanage -t -s 1600 -o .
  foo.svg` to a PNG and inspect it. The snapshot IS the spike output.
- **Metric honesty.** Prefer a principled, monotonic reliability metric (e.g. L1 distance from a
  full-pool "truth" curve) over ad-hoc heuristics (a mode-count metric was tried and discarded for
  over-sensitivity). Average over many random trials to avoid single-draw luck.
- **Investigation trail documents the pivots** (discarded metrics, surprises, artifacts surfaced),
  not just the final verdict.

## Tools & Libraries

- Node 22 (global `fetch`), `python3 -m http.server`, `qlmanage` (macOS SVG→PNG preview). No npm
  installs in any spike so far — everything is stdlib + the browser.
- Palette echoes the app's chart tokens: muted grey for the prior/older series, warm orange
  (`#f97316`/`#ea580c`) for the recent/actual series.
