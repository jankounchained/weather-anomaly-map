// Persistent, glanceable key for the three TrendDayChart marks (D-01/D-02/
// D-03), closing VIZ-02 Gap 2 (03-05 gap closure): a first-time viewer no
// longer has to hover the actual-value diamond to learn what the pale
// dots, bright line, and orange diamond mean. Swatches are native SVG
// shapes that mirror TrendDayChart's own marks (circle / line / diamond)
// exactly, colored via the same --color-chart-* tokens the charts render -
// the key can never visually drift from the marks it explains. All labels
// are static string literals rendered as ordinary JSX text nodes, and all
// swatches are native SVG - never a raw-HTML sink, never a Recharts
// custom-label HTML injection (T-03-07).
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
      <span className="text-label font-label text-muted">{label}</span>
    </div>
  )
}

export function TrendLegend() {
  return (
    <div
      className="flex flex-row flex-wrap gap-md"
      role="list"
      aria-label="Trend chart legend"
    >
      <TrendLegendItem
        label="Temperatures on this day in the last 30 years"
        swatch={
          <circle
            cx={SWATCH_CENTER}
            cy={SWATCH_CENTER}
            r={3}
            fill="var(--color-chart-historical)"
          />
        }
      />
      <TrendLegendItem
        label="30-year average"
        swatch={
          <rect
            x={1}
            y={SWATCH_CENTER - 1}
            width={SWATCH_SIZE - 2}
            height={2}
            fill="var(--color-chart-mean)"
          />
        }
      />
      <TrendLegendItem
        label="Temperature now"
        swatch={
          <polygon
            points={`${SWATCH_CENTER},1 ${SWATCH_SIZE - 1},${SWATCH_CENTER} ${SWATCH_CENTER},${SWATCH_SIZE - 1} 1,${SWATCH_CENTER}`}
            fill="var(--color-chart-actual)"
            stroke="#ffffff"
            strokeWidth={1}
          />
        }
      />
    </div>
  )
}
