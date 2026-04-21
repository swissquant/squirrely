import { $ } from './dom.ts'
import { applyCascade } from './cascade.ts'
import type { AppState } from './types.ts'

const STATE_KEY = 'squirrely:state:v1'

export const appState: AppState = {
  latestAllocation: [],
  cashWeight: 0,
  grossExposure: 0,
  equityDates: [],
  equityMultiples: [],
  lastMetrics: null,
}

interface PersistedState {
  mode: string
  volPreset: string
  volTarget: string
  volWindow: string
  cashYield: string
  rebalanceFreq: string
  startDate: string
  portfolioUsd: string
  baskets: Record<string, boolean>
  subBaskets: Record<string, boolean>
  markets: Record<string, boolean>
}

type Toggle = HTMLInputElement

function scrapeToggles(selector: string, dataKey: string): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  document.querySelectorAll<Toggle>(selector).forEach((el) => {
    const id = el.dataset[dataKey]
    if (id) out[id] = el.checked
  })
  return out
}

export function saveState(): void {
  try {
    const state: PersistedState = {
      mode: $<HTMLSelectElement>('mode').value,
      volPreset: document.querySelector<Toggle>('.vol-preset:checked')?.value ?? '0.05',
      volTarget: $<HTMLInputElement>('volTarget').value,
      volWindow: $<HTMLSelectElement>('volWindow').value,
      cashYield: $<HTMLInputElement>('cashYield').value,
      rebalanceFreq: $<HTMLSelectElement>('rebalanceFreq').value,
      startDate: $<HTMLInputElement>('startDate').value,
      portfolioUsd: $<HTMLInputElement>('portfolioUsd').value,
      baskets: scrapeToggles('.basket-toggle', 'basket'),
      subBaskets: scrapeToggles('.subbasket-toggle', 'subbasket'),
      markets: scrapeToggles('.market-toggle', 'market'),
    }
    localStorage.setItem(STATE_KEY, JSON.stringify(state))
  } catch {}
}

export function loadState(): void {
  let raw: string | null
  let state: Partial<PersistedState> | null = null
  try {
    raw = localStorage.getItem(STATE_KEY)
    if (!raw) return
    state = JSON.parse(raw)
  } catch {
    localStorage.removeItem(STATE_KEY)
    return
  }
  if (!state || typeof state !== 'object') return

  const setIfString = (id: string, v: unknown) => {
    if (typeof v === 'string') ($(id) as HTMLInputElement).value = v
  }
  setIfString('mode', state.mode)
  setIfString('volWindow', state.volWindow)
  setIfString('cashYield', state.cashYield)
  setIfString('rebalanceFreq', state.rebalanceFreq)
  setIfString('startDate', state.startDate)
  setIfString('portfolioUsd', state.portfolioUsd)
  setIfString('volTarget', state.volTarget)

  if (typeof state.volPreset === 'string') {
    const radio = document.querySelector<Toggle>(`.vol-preset[value="${state.volPreset}"]`)
    if (radio) {
      document.querySelectorAll<Toggle>('.vol-preset').forEach((r) => (r.checked = false))
      radio.checked = true
    }
  }

  const apply = (selector: string, dataKey: string, map?: Record<string, boolean>) => {
    if (!map || typeof map !== 'object') return
    document.querySelectorAll<Toggle>(selector).forEach((el) => {
      const key = el.dataset[dataKey]
      if (key && key in map) el.checked = !!map[key]
    })
  }
  apply('.basket-toggle', 'basket', state.baskets)
  apply('.subbasket-toggle', 'subbasket', state.subBaskets)
  apply('.market-toggle', 'market', state.markets)

  applyCascade()
}
