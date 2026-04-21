import DataService from '#services/data_service'
import { MARKETS } from '#config/markets'
import { currentDataVersion } from '#services/data_version'

export interface AlignedReturns {
  dates: string[]
  marketIds: string[]
  returns: (number | null)[][]
  closes: (number | null)[][]
}

const MAX_CACHE_ENTRIES = 8

// Module-level so repeated /api/simulate calls (each with a fresh ReturnsService
// instance from the controller) share a single cache. Invalidated via the
// monotonic data version bumped on /api/sync.
const cache = new Map<string, AlignedReturns>()
let cachedVersion = -1

export default class ReturnsService {
  constructor(private data: DataService = new DataService()) {}

  async loadAligned(enabledMarketIds?: Set<string>): Promise<AlignedReturns> {
    const version = currentDataVersion()
    if (version !== cachedVersion) {
      cache.clear()
      cachedVersion = version
    }
    const key = enabledMarketIds ? [...enabledMarketIds].sort().join(',') : '*'
    const cached = cache.get(key)
    if (cached) return cached
    const result = await this.computeAligned(enabledMarketIds)
    if (cache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = cache.keys().next().value
      if (oldestKey !== undefined) cache.delete(oldestKey)
    }
    cache.set(key, result)
    return result
  }

  private async computeAligned(enabledMarketIds?: Set<string>): Promise<AlignedReturns> {
    const seriesPerMarket = await Promise.all(
      MARKETS.map((m) => this.data.loadSeries(m.ticker))
    )

    const allDates = new Set<string>()
    const perMarket: Record<string, Map<string, number>> = {}

    MARKETS.forEach((m, i) => {
      const series = seriesPerMarket[i]
      const map = new Map<string, number>()
      const contributesDates = !enabledMarketIds || enabledMarketIds.has(m.id)
      for (const row of series) {
        map.set(row.date, row.close)
        if (contributesDates) allDates.add(row.date)
      }
      perMarket[m.id] = map
    })

    const dates = [...allDates].sort()
    const marketIds = MARKETS.map((m) => m.id)

    const closes: (number | null)[][] = dates.map((d) =>
      marketIds.map((id) => perMarket[id].get(d) ?? null)
    )

    const firstNonNullByMarket = marketIds.map((_, i) => {
      for (let t = 0; t < dates.length; t++) {
        if (closes[t][i] !== null) return t
      }
      return -1
    })

    const returns: (number | null)[][] = []
    for (let t = 0; t < dates.length; t++) {
      returns.push(
        marketIds.map((_, i) => {
          const firstIdx = firstNonNullByMarket[i]
          if (firstIdx < 0 || t <= firstIdx) return null
          const c = closes[t][i]
          let prevIdx = t - 1
          let prev: number | null = null
          while (prevIdx >= firstIdx) {
            const p = closes[prevIdx][i]
            if (p !== null) {
              prev = p
              break
            }
            prevIdx--
          }
          if (prev === null || prev <= 0) return null
          if (c === null) return 0
          return Math.log(c / prev)
        })
      )
    }

    return { dates, marketIds, returns, closes }
  }
}
