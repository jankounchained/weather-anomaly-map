import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  readLocationFromUrl,
  writeLocationToUrl,
  useSelectedLocation,
  isValidUrlSelection,
} from './useSelectedLocation'
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../lib/coords'

function setUrl(search: string) {
  const url = new URL(window.location.href)
  url.search = search
  window.history.replaceState(null, '', url.toString())
}

describe('readLocationFromUrl', () => {
  beforeEach(() => {
    setUrl('')
  })

  it('reads lat/lng/zoom from valid query params', () => {
    setUrl('?lat=50.1&lng=14.4&zoom=8')
    expect(readLocationFromUrl()).toEqual({ lat: 50.1, lng: 14.4, zoom: 8 })
  })

  it('falls back to the Czech Republic default when there are no params', () => {
    setUrl('')
    expect(readLocationFromUrl()).toEqual({
      lat: DEFAULT_CENTER.lat,
      lng: DEFAULT_CENTER.lng,
      zoom: DEFAULT_ZOOM,
    })
  })

  it('falls back to the default lat on a non-numeric lat value', () => {
    setUrl('?lat=abc&lng=14.4&zoom=8')
    const result = readLocationFromUrl()
    expect(result.lat).toBe(DEFAULT_CENTER.lat)
    expect(Number.isNaN(result.lat)).toBe(false)
  })

  it('falls back to the default lat on an out-of-range lat value', () => {
    setUrl('?lat=120&lng=14.4&zoom=8')
    const result = readLocationFromUrl()
    expect(result.lat).toBe(DEFAULT_CENTER.lat)
  })

  it('falls back to the default lat on trailing-garbage numeric strings (IN-01)', () => {
    setUrl('?lat=50.1garbage&lng=14.4&zoom=8')
    const result = readLocationFromUrl()
    expect(result.lat).toBe(DEFAULT_CENTER.lat)
  })
})

describe('writeLocationToUrl', () => {
  beforeEach(() => {
    setUrl('')
  })

  it('rounds lat/lng to 4 decimals and sets zoom in the URL', () => {
    writeLocationToUrl(50.123456, 14.987654, 8)
    const params = new URLSearchParams(window.location.search)
    expect(params.get('lat')).toBe('50.1235')
    expect(params.get('lng')).toBe('14.9877')
    expect(params.get('zoom')).toBe('8')
  })

  it('does not push a new history entry (uses replaceState)', () => {
    const lengthBefore = window.history.length
    writeLocationToUrl(50.123456, 14.987654, 8)
    expect(window.history.length).toBe(lengthBefore)
  })

  it('round-trips through readLocationFromUrl with rounded values', () => {
    writeLocationToUrl(50.123456, 14.987654, 8)
    expect(readLocationFromUrl()).toEqual({
      lat: 50.1235,
      lng: 14.9877,
      zoom: 8,
    })
  })
})

// Exercises the write-path normalization setLocation applies internally
// (clampLat for latitude, wrapLng for longitude) via renderHook - this is
// the direct hook-level coverage of the clamp/wrap path that was
// previously untested (IN-03, CR-01).
describe('useSelectedLocation', () => {
  beforeEach(() => {
    setUrl('')
  })

  it('wraps an out-of-range longitude (not clamps) when setLocation is called', () => {
    const { result } = renderHook(() => useSelectedLocation())

    act(() => {
      result.current.setLocation(50, 200)
    })

    expect(result.current.lng).toBe(-160)
    expect(result.current.lat).toBe(50)
    const params = new URLSearchParams(window.location.search)
    expect(params.get('lng')).toBe('-160')
  })

  it('clamps an out-of-range latitude when setLocation is called', () => {
    const { result } = renderHook(() => useSelectedLocation())

    act(() => {
      result.current.setLocation(120, 14.4)
    })

    expect(result.current.lat).toBe(90)
    const params = new URLSearchParams(window.location.search)
    expect(params.get('lat')).toBe('90')
  })

  it('rounds in-range values to 4 decimals and round-trips through the URL', () => {
    const { result } = renderHook(() => useSelectedLocation())

    act(() => {
      result.current.setLocation(50.123456, 14.987654)
    })

    expect(result.current.lat).toBe(50.1235)
    expect(result.current.lng).toBe(14.9877)
    const params = new URLSearchParams(window.location.search)
    expect(params.get('lat')).toBe('50.1235')
    expect(params.get('lng')).toBe('14.9877')
  })
})

describe('isValidUrlSelection', () => {
  it('returns true for a valid lat/lng pair', () => {
    expect(isValidUrlSelection('?lat=50.1&lng=14.4')).toBe(true)
  })

  it('returns false for an out-of-range lng alongside a non-numeric lat', () => {
    expect(isValidUrlSelection('?lat=abc&lng=999')).toBe(false)
  })

  it('returns false when lng is missing', () => {
    expect(isValidUrlSelection('?lat=50.1')).toBe(false)
  })

  it('returns false for an empty search string', () => {
    expect(isValidUrlSelection('')).toBe(false)
  })

  it('returns false for an out-of-range lat', () => {
    expect(isValidUrlSelection('?lat=120&lng=14.4')).toBe(false)
  })
})
