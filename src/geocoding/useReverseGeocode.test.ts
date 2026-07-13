import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest'
import { reverseGeocode } from './useReverseGeocode'

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response
}

describe('reverseGeocode', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('resolves to a joined place-name string on a 200 response with usable fields', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        city: 'Prague',
        locality: 'Prague',
        principalSubdivision: 'Prague',
        countryName: 'Czechia',
      }),
    )

    const result = await reverseGeocode(50.0755, 14.4378)

    expect(result).toBe('Prague, Prague, Czechia')
  })

  it('resolves to null on a generic 500 non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, false, 500))

    const result = await reverseGeocode(50.0755, 14.4378)

    expect(result).toBeNull()
  })

  it('resolves to null on the documented 402 fair-use response (no special-case branch)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, false, 402))

    const result = await reverseGeocode(50.0755, 14.4378)

    expect(result).toBeNull()
  })

  it('resolves to null when the request aborts/times out', async () => {
    vi.mocked(fetch).mockImplementationOnce(() => {
      const err = new Error('The operation was aborted')
      err.name = 'AbortError'
      return Promise.reject(err)
    })

    const result = await reverseGeocode(50.0755, 14.4378)

    expect(result).toBeNull()
  })

  it('resolves to null on a thrown network error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const result = await reverseGeocode(50.0755, 14.4378)

    expect(result).toBeNull()
  })

  it('returns null (not an empty string) when the response has no usable name fields', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}))

    const result = await reverseGeocode(50.0755, 14.4378)

    expect(result).toBeNull()
    expect(result).not.toBe('')
  })

  it('wires the timeout via AbortController + ~3000ms setTimeout and always clears the timer', async () => {
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout')
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ city: 'Prague' }))

    await reverseGeocode(50.0755, 14.4378)

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1)
    const [, delay] = setTimeoutSpy.mock.calls[0]!
    expect(delay).toBeGreaterThanOrEqual(2500)
    expect(delay).toBeLessThanOrEqual(3500)
    // The timer scheduled by reverseGeocode must be cleared - no leaked
    // timer left running after the call resolves.
    const timeoutId = setTimeoutSpy.mock.results[0]?.value
    expect(clearTimeoutSpy).toHaveBeenCalledWith(timeoutId)
  })
})
