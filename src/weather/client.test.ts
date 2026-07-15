import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest'
import { getCurrentWeather, getHistoricalBaseline, localDateFrom } from './client'

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

  const RECENT_DAILY = {
    time: [
      '2026-07-09',
      '2026-07-10',
      '2026-07-11',
      '2026-07-12',
      '2026-07-13',
      '2026-07-14',
      '2026-07-15',
    ],
    temperature_2m_mean: [20.8, 21.5, 22.1, 23.2, 24.5, 23.0, 22.3],
  }

  it('requests the forecast URL with the exact expected params, including the daily/past_days/forecast_days params', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        utc_offset_seconds: 7200,
        timezone: 'Europe/Prague',
        current: { time: '2026-07-14T20:30', temperature_2m: 21.4 },
        current_units: { temperature_2m: '°C' },
        daily: RECENT_DAILY,
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
    expect(url.searchParams.get('daily')).toBe('temperature_2m_mean')
    expect(url.searchParams.get('past_days')).toBe('6')
    expect(url.searchParams.get('forecast_days')).toBe('1')
    expect(url.searchParams.get('timezone')).toBe('auto')
  })

  it('resolves the parsed temperature as a number on a 200 response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        utc_offset_seconds: 7200,
        timezone: 'Europe/Prague',
        current: { time: '2026-07-14T20:30', temperature_2m: 21.4 },
        current_units: { temperature_2m: '°C' },
        daily: RECENT_DAILY,
      }),
    )

    const result = await getCurrentWeather(50.0755, 14.4378)

    expect(result.current.temperature_2m).toBe(21.4)
    expect(typeof result.current.temperature_2m).toBe('number')
  })

  it('resolves a 7-entry daily.time + 7-entry temperature_2m_mean on a healthy response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        utc_offset_seconds: 7200,
        timezone: 'Europe/Prague',
        current: { time: '2026-07-15T10:15', temperature_2m: 21.5 },
        current_units: { temperature_2m: '°C' },
        daily: RECENT_DAILY,
      }),
    )

    const result = await getCurrentWeather(50.0755, 14.4378)

    expect(result.daily?.time).toEqual(RECENT_DAILY.time)
    expect(result.daily?.temperature_2m_mean).toEqual(
      RECENT_DAILY.temperature_2m_mean,
    )
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
        daily: RECENT_DAILY,
      }),
    )

    await expect(getCurrentWeather(50.0755, 14.4378)).rejects.toThrow()
  })

  it('throws when daily.time and daily.temperature_2m_mean have mismatched lengths (7 vs 6)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        utc_offset_seconds: 7200,
        timezone: 'Europe/Prague',
        current: { time: '2026-07-14T20:30', temperature_2m: 21.4 },
        current_units: { temperature_2m: '°C' },
        daily: {
          time: RECENT_DAILY.time,
          temperature_2m_mean: RECENT_DAILY.temperature_2m_mean.slice(0, 6),
        },
      }),
    )

    await expect(getCurrentWeather(50.0755, 14.4378)).rejects.toThrow()
  })

  it('throws when daily is missing entirely', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        utc_offset_seconds: 7200,
        timezone: 'Europe/Prague',
        current: { time: '2026-07-14T20:30', temperature_2m: 21.4 },
        current_units: { temperature_2m: '°C' },
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

describe('getHistoricalBaseline', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('requests the archive URL with the exact expected params', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        daily: {
          time: ['2020-07-14'],
          temperature_2m_mean: [20.1],
        },
      }),
    )

    await getHistoricalBaseline(50.0755, 14.4378)

    expect(fetch).toHaveBeenCalledTimes(1)
    const [calledUrl] = vi.mocked(fetch).mock.calls[0]!
    const url = new URL(String(calledUrl))
    expect(url.origin + url.pathname).toBe(
      'https://archive-api.open-meteo.com/v1/archive',
    )
    expect(url.searchParams.get('latitude')).toBe('50.0755')
    expect(url.searchParams.get('longitude')).toBe('14.4378')
    expect(url.searchParams.get('daily')).toBe('temperature_2m_mean')
    expect(url.searchParams.get('timezone')).toBe('auto')
  })

  it('spans the last 30 complete past years (end = currentYear-1, start = currentYear-30)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        daily: {
          time: ['2020-07-14'],
          temperature_2m_mean: [20.1],
        },
      }),
    )

    const currentYear = new Date().getUTCFullYear()
    await getHistoricalBaseline(50.0755, 14.4378)

    const [calledUrl] = vi.mocked(fetch).mock.calls[0]!
    const url = new URL(String(calledUrl))
    expect(url.searchParams.get('start_date')).toBe(
      `${currentYear - 30}-01-01`,
    )
    expect(url.searchParams.get('end_date')).toBe(`${currentYear - 1}-12-31`)
  })

  it('throws an Error containing the status on a non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, false, 500))

    await expect(getHistoricalBaseline(50.0755, 14.4378)).rejects.toThrow(
      '500',
    )
  })

  it('throws rather than resolving when the daily series is empty', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        daily: {
          time: [],
          temperature_2m_mean: [],
        },
      }),
    )

    await expect(getHistoricalBaseline(50.0755, 14.4378)).rejects.toThrow()
  })

  it('throws rather than resolving when the daily object is missing entirely', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}))

    await expect(getHistoricalBaseline(50.0755, 14.4378)).rejects.toThrow()
  })
})
