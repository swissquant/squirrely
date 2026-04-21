import VolService from '#services/vol_service'
import { calendarYearsBetween, downsampleIndices } from '#services/metrics_service'
import type { AlignedReturns } from '#services/returns_service'
import type { SimParams, AssetSeries } from '#services/simulation_service'
import { MARKETS, BASKET_LABELS, TRADING_DAYS_PER_YEAR } from '#config/markets'

const HARD_MAX_LEVERAGE = 10
const PER_ASSET_MAX_POINTS = 300

/**
 * Per-asset equity curves: each market held in isolation, leverage-scaled to
 * the user's vol target using a rolling window. Used by the "per-asset" tab.
 */
export default class PerAssetService {
  constructor(private volSvc: VolService = new VolService()) {}

  build(aligned: AlignedReturns, params: SimParams): AssetSeries[] {
    const { dates, marketIds, returns } = aligned
    const indexOf = new Map(marketIds.map((id, i) => [id, i]))
    const out: AssetSeries[] = []
    const startFilter = params.startDate ?? ''
    const window = params.volWindow

    for (const m of MARKETS) {
      if (params.markets[m.id] === false) continue
      if (params.baskets[m.basket] === false) continue
      if (params.subBaskets[m.subBasket] === false) continue
      const i = indexOf.get(m.id)
      if (i === undefined) continue

      const rWindow: number[] = []
      const dWindow: string[] = []
      const seriesDates: string[] = []
      const seriesEq: number[] = []
      let eq = 1
      let started = false

      for (const [t, date] of dates.entries()) {
        const r = returns[t][i]
        if (r === null) continue
        rWindow.push(r)
        dWindow.push(date)
        if (rWindow.length > window) {
          rWindow.shift()
          dWindow.shift()
        }
        if (rWindow.length < window) continue
        if (date < startFilter) continue

        const winYears = calendarYearsBetween(dWindow[0], dWindow[dWindow.length - 1])
        const samplesPerYear =
          winYears > 0 ? (rWindow.length - 1) / winYears : TRADING_DAYS_PER_YEAR
        const annVol = this.volSvc.annualizedStdevOfSeries(rWindow, samplesPerYear)

        if (!(annVol > 0 && Number.isFinite(annVol))) continue
        const leverage = Math.min(params.volTarget / annVol, HARD_MAX_LEVERAGE)
        const scaledSimple = Math.exp(leverage * r) - 1

        if (!started) {
          started = true
          seriesDates.push(date)
          seriesEq.push(1)
          continue
        }
        eq *= 1 + scaledSimple
        seriesDates.push(date)
        seriesEq.push(eq)
      }

      if (seriesDates.length === 0) continue

      const idxs = downsampleIndices(seriesDates.length, PER_ASSET_MAX_POINTS)
      out.push({
        marketId: m.id,
        label: m.label,
        ticker: m.ticker,
        basket: m.basket,
        basketLabel: BASKET_LABELS[m.basket],
        dates: idxs.map((k) => seriesDates[k]),
        equity: idxs.map((k) => seriesEq[k]),
        totalReturn: seriesEq[seriesEq.length - 1] - 1,
      })
    }

    return out
  }
}
