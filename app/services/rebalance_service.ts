import { TRADING_DAYS_PER_YEAR } from '#config/markets'
import { calendarYearsBetween } from '#services/metrics_service'
import type { RebalanceFreq } from '#services/simulation_service'

/** Mask marking the first session in each rebalance period (daily / week / month). */
export function buildRebalanceMask(dates: string[], freq: RebalanceFreq): boolean[] {
  const mask = new Array(dates.length).fill(false)
  if (dates.length === 0) return mask
  if (freq === 'daily') return mask.map(() => true)

  let prevKey = ''
  for (const [i, date] of dates.entries()) {
    const d = new Date(date + 'T00:00:00Z')
    const key = freq === 'weekly' ? weekKey(d) : `${d.getUTCFullYear()}-${d.getUTCMonth()}`
    if (key !== prevKey) {
      mask[i] = true
      prevKey = key
    }
  }
  return mask
}

function weekKey(d: Date): string {
  const day = d.getUTCDay()
  const monday = new Date(d)
  const diff = (day + 6) % 7
  monday.setUTCDate(d.getUTCDate() - diff)
  return monday.toISOString().slice(0, 10)
}

/** Effective samples-per-year implied by the calendar span of [startIdx, endExclusive). */
export function windowSamplesPerYear(
  dates: string[],
  startIdx: number,
  endExclusive: number
): number {
  if (startIdx < 0 || endExclusive - startIdx < 2) return TRADING_DAYS_PER_YEAR
  const years = calendarYearsBetween(dates[startIdx], dates[endExclusive - 1])
  return years > 0 ? (endExclusive - startIdx - 1) / years : TRADING_DAYS_PER_YEAR
}

/** Index of the first date ≥ startDate, or 0 when unspecified. */
export function findStartIndex(dates: string[], startDate?: string): number {
  if (!startDate) return 0
  for (const [i, date] of dates.entries()) {
    if (date >= startDate) return i
  }
  return dates.length
}
