import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest'
import { getCurrentWeather, localDateFrom } from './client'

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response
}

describe('getCurrentWeather', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('requests the forecast URL with the exact expected params', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        utc_offset_seconds: 7200,
        timezone: 'Europe/Prague',
        current: { time: '2026-07-14T20:30', temperature_2m: 21.4 },
        current_units: { temperature_2m: '°C' },
      }),
    )

    await getCurrentWeather(50.0755, 14.4378)

    expect(fetch).toHaveBeenCalledTimes(1)
    const [calledUrl] = vi.mocked(fetch).mock.calls[0]!
    const url = new URL(String(calledUrl))
    expect(url.origin + url.pathname).toBe(
      'https://api.open-meteo.com/v1/forecast',
    )
    expect(url.searchParams.get('latitude')).toBe('50.0755')
    expect(url.searchParams.get('longitude')).toBe('14.4378')
    expect(url.searchParams.get('current')).toBe('temperature_2m')
    expect(url.searchParams.get('timezone')).toBe('auto')
  })

  it('resolves the parsed temperature as a number on a 200 response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        utc_offset_seconds: 7200,
        timezone: 'Europe/Prague',
        current: { time: '2026-07-14T20:30', temperature_2m: 21.4 },
        current_units: { temperature_2m: '°C' },
      }),
    )

    const result = await getCurrentWeather(50.0755, 14.4378)

    expect(result.current.temperature_2m).toBe(21.4)
    expect(typeof result.current.temperature_2m).toBe('number')
  })

  it('throws an Error containing the status on a non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, false, 500))

    await expect(getCurrentWeather(50.0755, 14.4378)).rejects.toThrow('500')
  })

  it('throws rather than returning undefined/NaN when current.temperature_2m is missing', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        utc_offset_seconds: 7200,
        timezone: 'Europe/Prague',
        current: { time: '2026-07-14T20:30' },
        current_units: {},
      }),
    )

    await expect(getCurrentWeather(50.0755, 14.4378)).rejects.toThrow()
  })
})

describe('localDateFrom', () => {
  it("splits on 'T', taking the date portion as the pin-local today", () => {
    expect(localDateFrom('2026-07-14T20:30')).toBe('2026-07-14')
  })
})
