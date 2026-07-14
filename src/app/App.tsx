import { useState } from 'react'
import './App.css'
import { MapView } from '../map/MapView'
import { useSelectedLocation, isValidUrlSelection } from '../map/useSelectedLocation'
import { useReverseGeocode } from '../geocoding/useReverseGeocode'
import { LocationPanel } from './LocationPanel'

function App() {
  const { lat, lng, zoom, setLocation } = useSelectedLocation()
  // A pin already exists at mount only if the URL carried a per-field-valid
  // lat AND lng (a shared link) - a fresh visit with no params, or a
  // malformed link (e.g. ?lat=abc&lng=999, or a single valid field), shows
  // the Czech Republic default view with no pin (UI-SPEC "No pin exists on
  // initial load"). Reuses the hook's own per-field validation
  // (isValidUrlSelection) so "a pin exists" (here) and "the coordinates are
  // valid" (the hook's read path) can never disagree (WR-01).
  const [hasSelection, setHasSelection] = useState(isValidUrlSelection)
  // No lookup fires before a pin exists - pass null until hasSelection is
  // true, so the default Czech Republic center never triggers a wasted
  // BigDataCloud fetch (UI-SPEC "No pin exists on initial load").
  const { status, name } = useReverseGeocode(
    hasSelection ? lat : null,
    hasSelection ? lng : null,
  )

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
      <LocationPanel
        hasSelection={hasSelection}
        status={status}
        name={name}
        lat={lat}
        lng={lng}
      />
    </div>
  )
}

export default App
