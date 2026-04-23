import { $ } from './dom.ts'
import { formatPortfolioUsdInput } from './format.ts'
import { readParams, updateLabels } from './params.ts'
import { appState, loadState, saveState } from './state.ts'
import { applyCascade, cascadeFromBasket, cascadeFromSubBasket } from './cascade.ts'
import { simulate as apiSimulate } from './api.ts'
import { renderCharts, renderPerAsset } from './charts.ts'
import { renderAllocation } from './allocation.ts'
import { renderMetrics } from './metrics.ts'
import { wireTabs } from './tabs.ts'

function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number): (...a: A) => void {
  let t: ReturnType<typeof setTimeout> | undefined
  return (...args: A) => {
    if (t) clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

async function runSimulation(): Promise<void> {
  updateLabels()
  saveState()
  $('loadingOverlay').classList.remove('hidden')
  try {
    const data = await apiSimulate(readParams())
    appState.latestAllocation = data.latestAllocation
    appState.cashWeight = data.cashWeight
    appState.grossExposure = data.grossExposure
    appState.equityDates = data.dates
    appState.equityMultiples = data.equity

    renderCharts()
    renderMetrics(data.metrics)
    renderPerAsset(data.perAsset ?? [])
    renderAllocation()

    $('last-rebalance').textContent = ''
  } catch (e) {
    if (!(e instanceof DOMException && e.name === 'AbortError')) {
      console.error(e)
      $('last-rebalance').textContent =
        'Error: ' + (e instanceof Error ? e.message : String(e))
    }
  } finally {
    $('loadingOverlay').classList.add('hidden')
  }
}

const debouncedSimulate = debounce(runSimulation, 250)

function wireToggles(): void {
  const paramIds = ['volTarget', 'volWindow', 'cashYield', 'rebalanceFreq', 'mode', 'startDate']
  for (const id of paramIds) {
    $(id).addEventListener('input', debouncedSimulate)
  }
  document.querySelectorAll<HTMLInputElement>('.vol-preset').forEach((el) =>
    el.addEventListener('change', () => {
      updateLabels()
      debouncedSimulate()
    })
  )
  document.querySelectorAll<HTMLInputElement>('.basket-toggle').forEach((el) =>
    el.addEventListener('change', () => {
      cascadeFromBasket(el)
      debouncedSimulate()
    })
  )
  document.querySelectorAll<HTMLInputElement>('.subbasket-toggle').forEach((el) =>
    el.addEventListener('change', () => {
      cascadeFromSubBasket(el)
      debouncedSimulate()
    })
  )
  document.querySelectorAll<HTMLInputElement>('.market-toggle').forEach((el) => {
    el.addEventListener('change', debouncedSimulate)
  })
}

function wire(): void {
  wireToggles()

  $<HTMLInputElement>('portfolioUsd').addEventListener('input', () => {
    formatPortfolioUsdInput(true)
    renderAllocation()
    renderCharts()
    renderMetrics()
    saveState()
  })

  wireTabs()
  loadState()
  applyCascade()
  formatPortfolioUsdInput(false)
  updateLabels()
  void runSimulation()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wire)
} else {
  wire()
}
