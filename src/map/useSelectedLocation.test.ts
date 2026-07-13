import { describe, it, expect, beforeEach } from 'vitest'
import { readLocationFromUrl, writeLocationToUrl } from './useSelectedLocation'
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
