export type BasketId =
  | 'crypto'
  | 'equity'
  | 'bonds'
  | 'real_estate'
  | 'commodities'

export interface MarketDef {
  id: string
  label: string
  ticker: string
  basket: BasketId
  subBasket: string
  nativeUnit: string
}

export interface SubBasketDef {
  id: string
  basket: BasketId
  label: string
}

export const MARKETS: MarketDef[] = [
  { id: 'btc', label: 'BTC (Bitcoin)', ticker: 'BTC-USD', basket: 'crypto', subBasket: 'crypto', nativeUnit: 'BTC' },
  { id: 'eth', label: 'ETH (Ethereum)', ticker: 'ETH-USD', basket: 'crypto', subBasket: 'crypto', nativeUnit: 'ETH' },
  { id: 'hype', label: 'HYPE (Hyperliquid)', ticker: 'HYPE32196-USD', basket: 'crypto', subBasket: 'crypto', nativeUnit: 'HYPE' },

  { id: 'spy', label: 'SPY (S&P 500)', ticker: 'SPY', basket: 'equity', subBasket: 'equity', nativeUnit: 'shares' },
  { id: 'qqq', label: 'QQQ (Nasdaq 100)', ticker: 'QQQ', basket: 'equity', subBasket: 'equity', nativeUnit: 'shares' },
  { id: 'efa', label: 'EFA (Developed ex-US)', ticker: 'EFA', basket: 'equity', subBasket: 'equity', nativeUnit: 'shares' },
  { id: 'eem', label: 'EEM (Emerging Markets)', ticker: 'EEM', basket: 'equity', subBasket: 'equity', nativeUnit: 'shares' },

  { id: 'tlt', label: 'TLT (20y+ Treasuries)', ticker: 'TLT', basket: 'bonds', subBasket: 'bonds', nativeUnit: 'shares' },
  { id: 'ief', label: 'IEF (7-10y Treasuries)', ticker: 'IEF', basket: 'bonds', subBasket: 'bonds', nativeUnit: 'shares' },

  { id: 'vnq', label: 'VNQ (US Real Estate)', ticker: 'VNQ', basket: 'real_estate', subBasket: 'real_estate', nativeUnit: 'shares' },

  { id: 'gld', label: 'GLD (Gold)', ticker: 'GLD', basket: 'commodities', subBasket: 'precious_metals', nativeUnit: 'shares' },
  { id: 'slv', label: 'SLV (Silver)', ticker: 'SLV', basket: 'commodities', subBasket: 'precious_metals', nativeUnit: 'shares' },
  { id: 'pall', label: 'PALL (Palladium)', ticker: 'PALL', basket: 'commodities', subBasket: 'precious_metals', nativeUnit: 'shares' },
  { id: 'cper', label: 'CPER (Copper)', ticker: 'CPER', basket: 'commodities', subBasket: 'industrial_metals', nativeUnit: 'shares' },
  { id: 'uso', label: 'USO (WTI Crude Oil)', ticker: 'USO', basket: 'commodities', subBasket: 'energy', nativeUnit: 'shares' },
]

export const BASKETS: BasketId[] = [
  'crypto',
  'equity',
  'bonds',
  'real_estate',
  'commodities',
]

export const BASKET_LABELS: Record<BasketId, string> = {
  crypto: 'Crypto',
  equity: 'Equity',
  bonds: 'Bonds',
  real_estate: 'Real Estate',
  commodities: 'Commodities',
}

export const SUB_BASKETS: SubBasketDef[] = [
  { id: 'crypto', basket: 'crypto', label: 'Crypto' },
  { id: 'equity', basket: 'equity', label: 'Equity' },
  { id: 'bonds', basket: 'bonds', label: 'Bonds' },
  { id: 'real_estate', basket: 'real_estate', label: 'Real Estate' },
  { id: 'precious_metals', basket: 'commodities', label: 'Precious Metals' },
  { id: 'industrial_metals', basket: 'commodities', label: 'Industrial Metals' },
  { id: 'energy', basket: 'commodities', label: 'Energy' },
]

export const MAX_PER_MARKET_IN_SUB_BASKET = 0.8
export const TRADING_DAYS_PER_YEAR = 252

export const DEFAULT_ENABLED_BASKETS: ReadonlySet<BasketId> = new Set([
  'crypto',
  'equity',
  'commodities',
])

export const DEFAULT_ENABLED_SUB_BASKETS: ReadonlySet<string> = new Set([
  'crypto',
  'equity',
  'precious_metals',
])

export const DEFAULT_ENABLED_MARKETS: ReadonlySet<string> = new Set([
  'btc',
  'spy',
  'gld',
])

export function subBasketsByBasket(basket: BasketId): SubBasketDef[] {
  return SUB_BASKETS.filter((sb) => sb.basket === basket)
}

export function marketsBySubBasket(subBasketId: string): MarketDef[] {
  return MARKETS.filter((m) => m.subBasket === subBasketId)
}

export function isBasketNested(basket: BasketId): boolean {
  return subBasketsByBasket(basket).length > 1
}
