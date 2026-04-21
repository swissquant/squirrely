import { $ } from './dom.ts'
import type { SimParamsPayload, RebalanceFreq, PortfolioMode } from './types.ts'

type Toggle = HTMLInputElement

function readToggles(selector: string, dataKey: string): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  document.querySelectorAll<Toggle>(selector).forEach((el) => {
    const id = el.dataset[dataKey]
    if (id) out[id] = el.checked
  })
  return out
}

export function readAllToggles(): Pick<SimParamsPayload, 'baskets' | 'subBaskets' | 'markets'> {
  return {
    baskets: readToggles('.basket-toggle', 'basket'),
    subBaskets: readToggles('.subbasket-toggle', 'subbasket'),
    markets: readToggles('.market-toggle', 'market'),
  }
}

export function selectedVolTarget(): number {
  const preset = document.querySelector<Toggle>('.vol-preset:checked')
  if (!preset) return 0.1
  if (preset.value === 'custom') return Number($<HTMLInputElement>('volTarget').value) / 100
  return Number(preset.value)
}

export function readParams(): SimParamsPayload {
  return {
    volTarget: selectedVolTarget(),
    volWindow: Number($<HTMLSelectElement>('volWindow').value),
    cashYield: Math.max(0, Number($<HTMLInputElement>('cashYield').value) || 0) / 100,
    rebalanceFreq: $<HTMLSelectElement>('rebalanceFreq').value as RebalanceFreq,
    mode: $<HTMLSelectElement>('mode').value as PortfolioMode,
    startDate: $<HTMLInputElement>('startDate').value || undefined,
    ...readAllToggles(),
  }
}

export function updateLabels(): void {
  const preset = document.querySelector<Toggle>('.vol-preset:checked')
  const custom = !!preset && preset.value === 'custom'
  const volTargetEl = $<HTMLInputElement>('volTarget')
  volTargetEl.classList.toggle('hidden', !custom)
  $('volTargetLabel').textContent = custom ? '(' + volTargetEl.value + '% vol)' : ''
  $('cashYieldLabel').textContent = '% / yr'
}
