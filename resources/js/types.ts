/**
 * Shapes mirroring backend `/api/simulate` and `/api/sync` responses. Kept in
 * sync by hand; if the backend SimResult or Metrics interfaces change, update
 * here too. A shared folder / codegen is deliberately avoided at this size.
 */

export type RebalanceFreq = 'daily' | 'weekly' | 'monthly'
export type PortfolioMode = 'inverse_vol' | 'erc'

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

export interface AllocationRow {
  marketId: string
  label: string
  ticker: string
  basket: string
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
  basket: string
  basketLabel: string
  dates: string[]
  equity: number[]
  totalReturn: number
}

export interface SimResponse {
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

export interface SyncResponse {
  total: number
  results: { ticker: string; rows: number }[]
}

export interface SimParamsPayload {
  volTarget: number
  volWindow: number
  cashYield: number
  rebalanceFreq: RebalanceFreq
  mode: PortfolioMode
  startDate?: string
  baskets: Record<string, boolean>
  subBaskets: Record<string, boolean>
  markets: Record<string, boolean>
}

export interface AppState {
  latestAllocation: AllocationRow[]
  cashWeight: number
  grossExposure: number
  equityDates: string[]
  equityMultiples: number[]
  lastMetrics: Metrics | null
}
