import { useMemo, useRef } from 'react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import type { Marker as LeafletMarker } from 'leaflet'

// CARTO voyager raster tiles (D-03). Attribution copied verbatim - this is
// a ToS requirement, not a style choice (D-04).
const CARTO_TILE_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

interface ClickHandlerProps {
  onSelect: (lat: number, lng: number) => void
}

/** Catches map clicks and reports the clicked lat/lng (D-06, LOC-01). */
function ClickHandler({ onSelect }: ClickHandlerProps) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

interface DraggablePinProps {
  lat: number
  lng: number
  onSelect: (lat: number, lng: number) => void
}

/** A draggable pin; reports its final position on dragend (D-06, LOC-01). */
function DraggablePin({ lat, lng, onSelect }: DraggablePinProps) {
  const markerRef = useRef<LeafletMarker>(null)
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current
        if (marker) {
          const position = marker.getLatLng()
          onSelect(position.lat, position.lng)
        }
      },
    }),
    [onSelect],
  )

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={[lat, lng]}
      ref={markerRef}
    />
  )
}

export interface MapViewProps {
  lat: number
  lng: number
  zoom: number
  /** Whether a pin should be rendered (no pin on first load - UI-SPEC). */
  hasSelection: boolean
  onSelect: (lat: number, lng: number) => void
}

/**
 * MapContainer's center/zoom are read once at mount only - they are
 * immutable after mount (Pattern 2/Pitfall 1), and D-07 forbids the map
 * from ever auto-recentering anyway, so no useMap()/setView() machinery is
 * used here at all.
 */
export function MapView({ lat, lng, zoom, hasSelection, onSelect }: MapViewProps) {
  return (
    <MapContainer center={[lat, lng]} zoom={zoom}>
      <TileLayer
        url={CARTO_TILE_URL}
        attribution={CARTO_ATTRIBUTION}
        subdomains="abcd"
        maxZoom={20}
      />
      <ClickHandler onSelect={onSelect} />
      {hasSelection && (
        <DraggablePin lat={lat} lng={lng} onSelect={onSelect} />
      )}
    </MapContainer>
  )
}
