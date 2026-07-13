import { describe, it, expect } from 'vitest'
import {
  round4,
  clampLat,
  clampLng,
  clampZoom,
  formatCoords,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
} from './coords'

describe('round4', () => {
  it('rounds to 4 decimal places', () => {
    expect(round4(49.817499)).toBe(49.8175)
  })
})

describe('clampLat', () => {
  it('clamps values above 90 down into [-90, 90]', () => {
    const result = clampLat(120)
    expect(result).toBeGreaterThanOrEqual(-90)
    expect(result).toBeLessThanOrEqual(90)
  })

  it('clamps values below -90 up into [-90, 90]', () => {
    const result = clampLat(-200)
    expect(result).toBeGreaterThanOrEqual(-90)
    expect(result).toBeLessThanOrEqual(90)
  })

  it('passes through in-range values unchanged', () => {
    expect(clampLat(50)).toBe(50)
  })
})

describe('clampLng', () => {
  it('clamps values above 180 down into [-180, 180]', () => {
    const result = clampLng(200)
    expect(result).toBeGreaterThanOrEqual(-180)
    expect(result).toBeLessThanOrEqual(180)
  })

  it('passes through in-range values unchanged', () => {
    expect(clampLng(14.42)).toBe(14.42)
  })
})

describe('clampZoom', () => {
  it('clamps values into the valid Leaflet zoom range', () => {
    const low = clampZoom(0)
    const high = clampZoom(99)
    expect(low).toBeGreaterThanOrEqual(1)
    expect(low).toBeLessThanOrEqual(20)
    expect(high).toBeGreaterThanOrEqual(1)
    expect(high).toBeLessThanOrEqual(20)
  })

  it('passes through in-range values unchanged', () => {
    expect(clampZoom(7)).toBe(7)
  })
})

describe('DEFAULT_CENTER / DEFAULT_ZOOM', () => {
  it('defaults to the Czech Republic (D-05)', () => {
    expect(DEFAULT_CENTER).toEqual({ lat: 49.8175, lng: 15.473 })
    expect(DEFAULT_ZOOM).toBe(7)
  })
})

describe('formatCoords', () => {
  it('formats lat/lng as a rounded "lat, lng" string', () => {
    expect(formatCoords(49.817499, 15.472999)).toBe('49.8175, 15.473')
  })
})
