// Persistent, glanceable key for the split-violin TrendDayChart marks
// (TREND-03, PD-10), closing VIZ-02 Gap 2 for the new tile shape: a
// first-time viewer no longer has to hover the marks to learn what each
// half-curve, tick, diamond, and dot-cluster means. Swatches are native SVG
// shapes that mirror TrendDayChart's own marks (violin-half path / mean
// tick line / diamond / rug dots) exactly, colored via the SAME
// --color-chart-* tokens the tiles render - the key can never visually
// drift from the marks it explains. All labels are static string literals
// (or numbers interpolated into a template literal) rendered as ordinary
// JSX text nodes, and all swatches are native SVG - never a raw-HTML sink,
// never a Recharts custom-label HTML injection (T-03-07).
//
// 08-04: rebuilt from the old 3-item (dot / 30-yr line / diamond) key to
// the 5-item split-violin key (prior half, recent half, per-half mean
// tick, actual diamond, rug fallback). Copy is FINAL per the PD-10
// reviewer round-trip (08-04-SUMMARY.md records the verbatim verdict):
// approved with 3 revisions - the prior-half label became a dynamic real
// year range (not a static literal), the mean-tick label became "Period
// average", and the actual-diamond label became "This week". The
// recent-half and rug labels were reviewed and kept unchanged.
import type { ReactNode } from 'react'

const SWATCH_SIZE = 14
const SWATCH_CENTER = SWATCH_SIZE / 2

interface TrendLegendItemProps {
  label: string
  swatch: ReactNode
}

function TrendLegendItem({ label, swatch }: TrendLegendItemProps) {
  return (
    <div className="flex flex-row items-center gap-xs">
      <svg
        className="flex-none w-[14px] h-[14px]"
        width={SWATCH_SIZE}
        height={SWATCH_SIZE}
        viewBox={`0 0 ${SWATCH_SIZE} ${SWATCH_SIZE}`}
        aria-hidden="true"
      >
        {swatch}
      </svg>
      <span className="text-label leading-[1.5] font-label text-muted">{label}</span>
    </div>
  )
}

export interface TrendLegendProps {
  /** The prior-25yr half's actual calendar-year bounds (from any usable
   * `TrendDayResult` in the row - all 7 days share the same endYear, so any
   * one is valid for the whole legend). Reviewer-approved (PD-10): render a
   * real dynamic range ("1997-2021") instead of the old static "Prior 25
   * years" literal. Both props are optional and BOTH must be present to
   * render the dynamic range - if the row has no usable day (TrendRow
   * guards this), the legend falls back to the static label rather than
   * rendering a partial/undefined range. */
  priorStart?: number
  priorEnd?: number
}

export function TrendLegend({ priorStart, priorEnd }: TrendLegendProps = {}) {
  const priorLabel =
    priorStart !== undefined && priorEnd !== undefined
      ? `${priorStart}–${priorEnd}`
      : 'Prior 25 years'

  return (
    <div
      className="flex flex-row flex-wrap gap-md"
      role="list"
      aria-label="Trend chart legend"
    >
      {/* PD-10 FINAL: dynamic real year range (e.g. "1997-2021") when the
          caller supplies priorStart/priorEnd, else the static fallback -
          left-half violin-shape swatch, bulging left off the shared center
          line, mirroring the tile's prior-half curve path. */}
      <TrendLegendItem
        label={priorLabel}
        swatch={
          <path
            d={`M${SWATCH_CENTER},1 Q2,${SWATCH_CENTER} ${SWATCH_CENTER},${SWATCH_SIZE - 1} Z`}
            fill="var(--color-chart-prior-fill)"
            stroke="var(--color-chart-prior-stroke)"
            strokeWidth={1}
          />
        }
      />
      {/* PD-10 FINAL - "Recent 5 years": reviewed and kept unchanged
          (relative wording intentional, not an oversight). Right-half
          violin-shape swatch, bulging right off the shared center line,
          mirroring the tile's recent-half curve path. */}
      <TrendLegendItem
        label="Recent 5 years"
        swatch={
          <path
            d={`M${SWATCH_CENTER},1 Q12,${SWATCH_CENTER} ${SWATCH_CENTER},${SWATCH_SIZE - 1} Z`}
            fill="var(--color-chart-recent-fill)"
            stroke="var(--color-chart-recent-stroke)"
            strokeWidth={1}
          />
        }
      />
      {/* PD-10 FINAL - "Period average" (was "Average for that period").
          One short horizontal tick swatch covers BOTH per-half mean ticks,
          since prior and recent ticks share the same --color-chart-mean
          token (PD-07). */}
      <TrendLegendItem
        label="Period average"
        swatch={
          <line
            x1={2}
            x2={SWATCH_SIZE - 2}
            y1={SWATCH_CENTER}
            y2={SWATCH_CENTER}
            stroke="var(--color-chart-mean)"
            strokeWidth={2}
          />
        }
      />
      {/* PD-10 FINAL - "This week" (was "Temperature now"); swatch kept
          verbatim from today's legend (PD-08: actual-value diamond
          preserved unchanged). */}
      <TrendLegendItem
        label="This week"
        swatch={
          <polygon
            points={`${SWATCH_CENTER},1 ${SWATCH_SIZE - 1},${SWATCH_CENTER} ${SWATCH_CENTER},${SWATCH_SIZE - 1} 1,${SWATCH_CENTER}`}
            fill="var(--color-chart-actual)"
            stroke="#ffffff"
            strokeWidth={1}
          />
        }
      />
      {/* PD-10 FINAL - "Too few years → shown as dots": reviewed and kept
          unchanged. Explains the per-half rug fallback (PD-01/PD-02) before
          a user ever encounters a thin half, using the same historical-dot
          token/shape as the rug marks themselves. */}
      <TrendLegendItem
        label="Too few years → shown as dots"
        swatch={
          <g>
            <circle cx={5} cy={5} r={1.5} fill="var(--color-chart-historical)" />
            <circle cx={10} cy={6} r={1.5} fill="var(--color-chart-historical)" />
            <circle cx={6} cy={10} r={1.5} fill="var(--color-chart-historical)" />
          </g>
        }
      />
    </div>
  )
}
