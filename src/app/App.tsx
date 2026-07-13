import { useState } from 'react'
import './App.css'
import { MapView } from '../map/MapView'
import { useSelectedLocation } from '../map/useSelectedLocation'
import { LocationPanel } from './LocationPanel'

/**
 * A pin already exists at mount only if the URL explicitly carried both
 * lat and lng (a shared link) - a fresh visit with no params shows the
 * Czech Republic default view with no pin (UI-SPEC "No pin exists on
 * initial load"). Deliberately independent of useSelectedLocation's
 * per-field fallback so a malformed single param doesn't spuriously place
 * a pin at the default center.
 */
function hasUrlSelection(): boolean {
  const params = new URLSearchParams(window.location.search)
  return params.has('lat') && params.has('lng')
}

function App() {
  const { lat, lng, zoom, setLocation } = useSelectedLocation()
  const [hasSelection, setHasSelection] = useState(hasUrlSelection)

  const handleSelect = (nextLat: number, nextLng: number) => {
    setLocation(nextLat, nextLng)
    setHasSelection(true)
  }

  return (
    <div className="app-shell">
      <div className="map-region">
        <MapView
          lat={lat}
          lng={lng}
          zoom={zoom}
          hasSelection={hasSelection}
          onSelect={handleSelect}
        />
      </div>
      <LocationPanel />
    </div>
  )
}

export default App
