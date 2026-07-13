// Docked info panel shell (UI-SPEC "Layout & Interaction Notes").
// Reserved for the location display content added in Plan 02, and the
// anomaly/chart content stacked below it in Phase 2/3. Phase 1 only builds
// the container itself — no location content is rendered yet.
export function LocationPanel() {
  return (
    <aside className="location-panel">
      <div className="location-panel__content" />
    </aside>
  )
}
