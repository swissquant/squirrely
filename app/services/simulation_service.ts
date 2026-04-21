import ReturnsService, { AlignedReturns } from '#services/returns_service'
import VolService from '#services/vol_service'
import WeightsService from '#services/weights_service'
import MetricsService, { Metrics } from '#services/metrics_service'
import DataService from '#services/data_service'
import PortfolioBuilder from '#services/portfolio_builder'
import PerAssetService from '#services/per_asset_service'
import { buildRebalanceMask, findStartIndex } from '#services/rebalance_service'
import {
  MARKETS,
  BASKETS,
  BASKET_LABELS,
  BasketId,
  SUB_BASKETS,
} from '#config/markets'

export type RebalanceFreq = 'daily' | 'weekly' | 'monthly'
export type PortfolioMode = 'inverse_vol' | 'erc'

export interface SimParams {
  volTarget: number
  volWindow: number
  cashYield: number
  rebalanceFreq: RebalanceFreq
  mode: PortfolioMode
  startDate?: string
  baskets: Record<BasketId, boolean>
  subBaskets: Record<string, boolean>
  markets: Record<string, boolean>
}

export interface AllocationRow {
  marketId: string
  label: string
  ticker: string
  basket: BasketId
  basketLabel: string
  subBasket: string
  subBasketLabel: string
  weight: number
  latestClose: number | null
  nativeUnit: string
}

export interface AssetSeries {
  marketId: string
  label: string
  ticker: string
  basket: BasketId
  basketLabel: string
  dates: string[]
  equity: number[]
  totalReturn: number
}

export interface SimResult {
  dates: string[]
  equity: number[]
  metrics: Metrics
  latestAllocation: AllocationRow[]
  cashWeight: number
  grossExposure: number
  lastRebalanceDate: string | null
  dataAsOfDate: string | null
  perAsset: AssetSeries[]
}

export default class SimulationService {
  private builder: PortfolioBuilder
  private perAssetSvc: PerAssetService

  constructor(
    private returnsSvc: ReturnsService = new ReturnsService(),
    volSvc: VolService = new VolService(),
    weightsSvc: WeightsService = new WeightsService(),
    private metricsSvc: MetricsService = new MetricsService(),
    private dataSvc: DataService = new DataService()
  ) {
    this.builder = new PortfolioBuilder(volSvc, weightsSvc)
    this.perAssetSvc = new PerAssetService(volSvc)
  }

  async run(params: SimParams): Promise<SimResult> {
    const enabled = this.enabledMarketIds(params)
    const aligned = await this.returnsSvc.loadAligned(enabled)
    return this.simulate(aligned, params)
  }

  private enabledMarketIds(params: SimParams): Set<string> {
    const out = new Set<string>()
    for (const m of MARKETS) {
      if (params.baskets[m.basket] === false) continue
      if (params.subBaskets[m.subBasket] === false) continue
      if (params.markets[m.id] === false) continue
      out.add(m.id)
    }
    return out
  }

  simulate(aligned: AlignedReturns, params: SimParams): SimResult {
    const { dates, marketIds, returns } = aligned
    const nDays = dates.length
    const nMarkets = marketIds.length

    const enabledBaskets: BasketId[] = BASKETS.filter((b) => params.baskets[b] !== false)
    const rebalanceMask = buildRebalanceMask(dates, params.rebalanceFreq)

    let currentWeights = new Array(nMarkets).fill(0)
    const portfolioReturns: number[] = []
    const outDates: string[] = []
    const equity: number[] = []
    let currentEquity = 1
    let started = false
    let lastRebalance = -1

    const startIdx = findStartIndex(dates, params.startDate)
    const dailyCashLogRate = Math.log(1 + params.cashYield) / 252

    for (let t = startIdx; t < nDays; t++) {
      if (rebalanceMask[t]) {
        const newWeights = this.builder.computeWeights(aligned, t, enabledBaskets, params)
        if (newWeights) {
          const sum = newWeights.reduce((s, w) => s + w, 0)
          const scale = sum > 1 ? 1 / sum : 1
          currentWeights = scale === 1 ? newWeights : newWeights.map((w) => w * scale)
          lastRebalance = t
          started = true
        }
      }

      if (!started) continue

      let dayReturn = 0
      let ok = true
      let weightSum = 0
      for (let i = 0; i < nMarkets; i++) {
        if (currentWeights[i] === 0) continue
        const r = returns[t][i]
        if (r === null) {
          ok = false
          break
        }
        dayReturn += currentWeights[i] * r
        weightSum += currentWeights[i]
      }
      if (!ok) continue

      const cashFrac = Math.max(0, 1 - weightSum)
      dayReturn += cashFrac * dailyCashLogRate

      const simpleReturn = Math.exp(dayReturn) - 1
      currentEquity *= 1 + simpleReturn
      portfolioReturns.push(simpleReturn)
      outDates.push(dates[t])
      equity.push(currentEquity)
    }

    const metrics = this.metricsSvc.compute(outDates, portfolioReturns, equity)
    const latestAllocation = this.buildAllocation(currentWeights, marketIds)
    const grossExposure = currentWeights.reduce((s, w) => s + Math.abs(w), 0)
    const cashWeight = Math.max(0, 1 - currentWeights.reduce((s, w) => s + w, 0))
    const lastRebalanceDate = lastRebalance >= 0 ? dates[lastRebalance] : null
    const dataAsOfDate = dates.length > 0 ? dates[dates.length - 1] : null
    const perAsset = this.perAssetSvc.build(aligned, params)

    return {
      dates: outDates,
      equity,
      metrics,
      latestAllocation,
      cashWeight,
      grossExposure,
      lastRebalanceDate,
      dataAsOfDate,
      perAsset,
    }
  }

  private buildAllocation(weights: number[], marketIds: string[]): AllocationRow[] {
    const subLabels = new Map(SUB_BASKETS.map((s) => [s.id, s.label]))
    const indexOf = new Map(marketIds.map((id, i) => [id, i]))
    return MARKETS.map((m) => {
      const idx = indexOf.get(m.id)
      const w = idx !== undefined ? weights[idx] : 0
      return {
        marketId: m.id,
        label: m.label,
        ticker: m.ticker,
        basket: m.basket,
        basketLabel: BASKET_LABELS[m.basket],
        subBasket: m.subBasket,
        subBasketLabel: subLabels.get(m.subBasket) ?? m.subBasket,
        weight: w,
        latestClose: null,
        nativeUnit: m.nativeUnit,
      }
    })
  }

  async attachLatestCloses(alloc: AllocationRow[]): Promise<void> {
    const closes = await Promise.all(
      alloc.map((row) => this.dataSvc.loadLatestClose(row.ticker))
    )
    alloc.forEach((row, i) => {
      row.latestClose = closes[i]
    })
  }
}
