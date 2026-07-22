// Shared loading-state spinner primitive (IN-01) - extracts the identical
// role="status" spinner block that was duplicated verbatim across
// LocationDisplay.tsx, CurrentConditionsPanel.tsx, DeltaPanel.tsx, and
// TrendRow.tsx, differing only in the message text. PanelShell/PanelHeadline
// were extracted specifically to avoid this kind of drift for the
// glass-card shell and eyebrow heading; this closes the same gap for the
// loading spinner.
export interface PanelLoadingStateProps {
  /** The loading message shown next to the spinner, e.g. "Looking up place name…". */
  label: string
}

export function PanelLoadingState({ label }: PanelLoadingStateProps) {
  return (
    <div className="flex flex-row items-center gap-sm" role="status">
      <span
        className="size-4 shrink-0 rounded-full border-2 border-accent border-t-transparent animate-location-spin"
        aria-hidden="true"
      />
      <p className="m-0 text-body font-body">{label}</p>
    </div>
  )
}
