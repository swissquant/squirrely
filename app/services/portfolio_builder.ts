import VolService from '#services/vol_service'
import WeightsService from '#services/weights_service'
import { windowSamplesPerYear } from '#services/rebalance_service'
import type { AlignedReturns } from '#services/returns_service'
import type { SimParams, PortfolioMode } from '#services/simulation_service'
import {
  MARKETS,
  BasketId,
  subBasketsByBasket,
  MAX_PER_MARKET_IN_SUB_BASKET,
} from '#config/markets'

const HARD_MAX_LEVERAGE = 10

interface SubBasketSnapshot {
  subBasketId: string
  marketIdxs: number[]
  intraWeights: number[]
  series: number[]
}

interface BasketSnapshot {
  basket: BasketId
  marketWeights: number[]
  series: number[]
}

/**
 * Nested portfolio construction: markets → sub-baskets → baskets, then overall
 * leverage scaling to hit the vol target. Returns null if no valid weights
 * can be computed at time `t` (e.g. insufficient history or zero-vol series).
 */
export default class PortfolioBuilder {
  constructor(
    private volSvc: VolService = new VolService(),
    private weightsSvc: WeightsService = new WeightsService()
  ) {}

  computeWeights(
    aligned: AlignedReturns,
    t: number,
    enabledBaskets: BasketId[],
    params: SimParams
  ): number[] | null {
    const { dates, marketIds, returns } = aligned
    const nMarkets = marketIds.length
    const indexOf = new Map(marketIds.map((id, i) => [id, i]))
    const window = params.volWindow
    const mode = params.mode
    const winSpy = windowSamplesPerYear(dates, t - window, t)

    const basketSnaps: BasketSnapshot[] = []

    for (const basket of enabledBaskets) {
      const subBasketSnaps: SubBasketSnapshot[] = []

      for (const sb of subBasketsByBasket(basket)) {
        if (params.subBaskets[sb.id] === false) continue

        const marketIdxs: number[] = []
        const marketSeries: number[][] = []
        for (const m of MARKETS) {
          if (m.subBasket !== sb.id) continue
          if (params.markets[m.id] === false) continue
          const idx = indexOf.get(m.id)
          if (idx === undefined) continue

          const series: number[] = []
          let dropped = false
          for (let s = t - window; s < t; s++) {
            if (s < 0) {
              dropped = true
              break
            }
            const r = returns[s][idx]
            if (r === null) {
              dropped = true
              break
            }
            series.push(r)
          }
          if (dropped || series.length < 2) continue

          const mean = series.reduce((a, b) => a + b, 0) / series.length
          const variance = series.reduce((a, x) => a + (x - mean) ** 2, 0) / (series.length - 1)
          if (!(variance > 0 && Number.isFinite(variance))) continue

          marketIdxs.push(idx)
          marketSeries.push(series)
        }
        if (marketIdxs.length === 0) continue

        const intraWeights = this.allocate(mode, marketSeries, MAX_PER_MARKET_IN_SUB_BASKET, winSpy)
        const series = combineSeries(marketSeries, intraWeights, window)

        subBasketSnaps.push({ subBasketId: sb.id, marketIdxs, intraWeights, series })
      }

      if (subBasketSnaps.length === 0) continue

      const acrossSubWeights = this.allocate(
        mode,
        subBasketSnaps.map((s) => s.series),
        1,
        winSpy
      )

      const marketWeights = new Array(nMarkets).fill(0)
      for (const [si, snap] of subBasketSnaps.entries()) {
        const sw = acrossSubWeights[si]
        for (let k = 0; k < snap.marketIdxs.length; k++) {
          marketWeights[snap.marketIdxs[k]] += sw * snap.intraWeights[k]
        }
      }

      const basketSeries = combineSeries(
        subBasketSnaps.map((s) => s.series),
        acrossSubWeights,
        window
      )

      basketSnaps.push({ basket, marketWeights, series: basketSeries })
    }

    if (basketSnaps.length === 0) return null

    const acrossBasketWeights = this.allocate(
      mode,
      basketSnaps.map((b) => b.series),
      1,
      winSpy
    )

    const combinedMarketWeights = new Array(nMarkets).fill(0)
    for (const [v, snap] of basketSnaps.entries()) {
      const bw = acrossBasketWeights[v]
      for (let i = 0; i < nMarkets; i++) {
        combinedMarketWeights[i] += bw * snap.marketWeights[i]
      }
    }

    const portReturnSeries = combineSeries(
      basketSnaps.map((b) => b.series),
      acrossBasketWeights,
      window
    )
    const portVol =
      portReturnSeries.length >= 2
        ? this.volSvc.annualizedStdevOfSeries(portReturnSeries, winSpy)
        : 0

    const leverage = this.weightsSvc.volTargetLeverage(portVol, params.volTarget, HARD_MAX_LEVERAGE)
    if (leverage <= 0) return null

    const out = new Array(nMarkets).fill(0)
    for (let i = 0; i < nMarkets; i++) out[i] = combinedMarketWeights[i] * leverage
    return out
  }

  private allocate(
    mode: PortfolioMode,
    seriesList: number[][],
    cap: number,
    samplesPerYear: number
  ): number[] {
    const n = seriesList.length
    if (n === 0) return []
    if (n === 1) return [1]
    if (mode === 'erc') {
      const cov = this.volSvc.covarianceMatrix(seriesList, samplesPerYear)
      return this.weightsSvc.ercWeights(cov, cap)
    }
    const vols = seriesList.map((s) => this.volSvc.annualizedStdevOfSeries(s, samplesPerYear))
    return this.weightsSvc.inverseVolWeights(vols, cap)
  }
}

function combineSeries(seriesList: number[][], weights: number[], len: number): number[] {
  const out = new Array<number>(len)
  for (let s = 0; s < len; s++) {
    let r = 0
    for (let k = 0; k < weights.length; k++) {
      r += weights[k] * seriesList[k][s]
    }
    out[s] = r
  }
  return out
}
