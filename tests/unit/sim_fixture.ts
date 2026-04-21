import { MARKETS } from '#config/markets'
import type { AlignedReturns } from '#services/returns_service'
import type { SimParams } from '#services/simulation_service'

/**
 * Deterministic synthetic AlignedReturns for all MARKETS. Uses a mulberry32 PRNG
 * seeded per-market so every market has a stable, distinct return stream. No DB,
 * no network — the snapshot test is hermetic.
 */
export function buildFixture(nDays = 1500): AlignedReturns {
  const dates: string[] = []
  const start = Date.UTC(2015, 0, 2)
  const MS_DAY = 86400_000
  for (let i = 0; i < nDays; i++) {
    const d = new Date(start + i * MS_DAY)
    const dow = d.getUTCDay()
    if (dow === 0 || dow === 6) {
      // skip weekends to mimic trading calendar
      continue
    }
    dates.push(d.toISOString().slice(0, 10))
  }

  const marketIds = MARKETS.map((m) => m.id)
  const returns: (number | null)[][] = dates.map(() => new Array(marketIds.length).fill(0))
  const closes: (number | null)[][] = dates.map(() => new Array(marketIds.length).fill(0))

  MARKETS.forEach((m, i) => {
    const rand = mulberry32(hashSeed(m.id))
    const annDrift = 0.06 + (i % 5) * 0.015
    const annVol = 0.1 + (i % 7) * 0.04
    const dailyDrift = annDrift / 252
    const dailyVol = annVol / Math.sqrt(252)
    let price = 100
    for (let t = 0; t < dates.length; t++) {
      const z = boxMuller(rand)
      const r = dailyDrift - 0.5 * dailyVol * dailyVol + dailyVol * z
      returns[t][i] = r
      price = price * Math.exp(r)
      closes[t][i] = price
    }
  })

  return { dates, marketIds, returns, closes }
}

export function defaultParams(): SimParams {
  return {
    volTarget: 0.1,
    volWindow: 252,
    cashYield: 0,
    rebalanceFreq: 'monthly',
    mode: 'inverse_vol',
    startDate: undefined,
    baskets: {
      crypto: true,
      equity: true,
      bonds: true,
      real_estate: true,
      commodities: true,
    },
    subBaskets: {
      crypto: true,
      equity: true,
      bonds: true,
      real_estate: true,
      precious_metals: true,
      industrial_metals: true,
      energy: true,
    },
    markets: Object.fromEntries(MARKETS.map((m) => [m.id, true])),
  }
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function boxMuller(rand: () => number): number {
  const u = Math.max(1e-12, rand())
  const v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function hashSeed(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h
}
