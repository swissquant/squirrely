import { TRADING_DAYS_PER_YEAR } from '#config/markets'

export interface Metrics {
  cagr: number
  vol: number
  sharpe: number
  maxDrawdown: number
  finalEquity: number
  startDate: string
  endDate: string
  tradingDays: number
  samplesPerYear: number
  calendarYears: number
}

const MS_PER_DAY = 86400_000

export function calendarYearsBetween(startDate: string, endDate: string): number {
  const a = Date.parse(startDate + 'T00:00:00Z')
  const b = Date.parse(endDate + 'T00:00:00Z')
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0
  return (b - a) / MS_PER_DAY / 365.25
}

export function samplesPerYearFromDates(dates: string[]): number {
  if (dates.length < 2) return TRADING_DAYS_PER_YEAR
  const years = calendarYearsBetween(dates[0], dates[dates.length - 1])
  if (years <= 0) return TRADING_DAYS_PER_YEAR
  return (dates.length - 1) / years
}

/**
 * Indices for a stride-based downsample: every Nth index, plus the last one.
 * Matches the prior inline logic at the two call sites (controller + per-asset).
 */
export function downsampleIndices(length: number, maxPoints: number): number[] {
  if (length <= 0) return []
  const everyN = Math.max(1, Math.floor(length / maxPoints))
  const out: number[] = []
  for (let i = 0; i < length; i++) {
    if (i % everyN === 0 || i === length - 1) out.push(i)
  }
  return out
}

export default class MetricsService {
  compute(dates: string[], portfolioReturns: number[], equity: number[]): Metrics {
    const n = portfolioReturns.length
    if (n < 2) {
      return {
        cagr: 0,
        vol: 0,
        sharpe: 0,
        maxDrawdown: 0,
        finalEquity: equity[n - 1] ?? 1,
        startDate: dates[0] ?? '',
        endDate: dates[n - 1] ?? '',
        tradingDays: n,
        samplesPerYear: TRADING_DAYS_PER_YEAR,
        calendarYears: 0,
      }
    }

    const calendarYears = calendarYearsBetween(dates[0], dates[dates.length - 1])
    const samplesPerYear =
      calendarYears > 0 ? (dates.length - 1) / calendarYears : TRADING_DAYS_PER_YEAR

    const mean = portfolioReturns.reduce((s, x) => s + x, 0) / n
    const variance = portfolioReturns.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1)
    const vol = Math.sqrt(variance) * Math.sqrt(samplesPerYear)

    const finalEquity = equity[equity.length - 1]
    const cagr =
      finalEquity > 0 && calendarYears > 0 ? Math.pow(finalEquity, 1 / calendarYears) - 1 : 0
    const sharpe = vol > 0 ? (mean * samplesPerYear) / vol : 0

    let peak = equity[0]
    let maxDD = 0
    for (const e of equity) {
      if (e > peak) peak = e
      const dd = e / peak - 1
      if (dd < maxDD) maxDD = dd
    }

    return {
      cagr,
      vol,
      sharpe,
      maxDrawdown: maxDD,
      finalEquity,
      startDate: dates[0],
      endDate: dates[n - 1],
      tradingDays: n,
      samplesPerYear,
      calendarYears,
    }
  }
}
