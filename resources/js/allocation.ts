import { $ } from './dom.ts'
import { fmtPct, fmtUsd, parsePortfolioUsd } from './format.ts'
import { appState } from './state.ts'
import type { AllocationRow } from './types.ts'

function buildRow(row: AllocationRow, usd: number): HTMLTableRowElement {
  const sizeUsd = usd * row.weight
  const native = row.latestClose && row.latestClose > 0 ? sizeUsd / row.latestClose : null
  const nativeText =
    native === null ? '—' : native.toFixed(native < 1 ? 4 : 2)

  const tr = document.createElement('tr')
  tr.className = 'border-b border-stone-50'

  const cells: Array<{ cls: string; text: string }> = [
    { cls: 'py-2 text-stone-600', text: row.basketLabel },
    { cls: '', text: row.label },
    { cls: 'text-right tabular-nums', text: fmtPct(row.weight, 1) },
    { cls: 'text-right tabular-nums', text: fmtUsd(sizeUsd) },
    { cls: 'text-right tabular-nums pr-2', text: nativeText },
    { cls: 'text-stone-500', text: row.nativeUnit },
  ]
  for (const { cls, text } of cells) {
    const td = document.createElement('td')
    if (cls) td.className = cls
    td.textContent = text
    tr.appendChild(td)
  }
  return tr
}

export function renderAllocation(): void {
  const usd = Math.max(0, parsePortfolioUsd())
  const totalWeight = appState.latestAllocation.reduce((s, r) => s + r.weight, 0)
  const scale = totalWeight > 1 ? 1 / totalWeight : 1
  const cashWeight = totalWeight > 1 ? 0 : appState.cashWeight

  const tbody = $<HTMLTableSectionElement>('allocBody')
  tbody.replaceChildren(
    ...appState.latestAllocation
      .filter((row) => row.weight !== 0)
      .map((row) => buildRow({ ...row, weight: row.weight * scale }, usd))
  )

  const cashUsd = usd * cashWeight
  $('alloc-cash-weight').textContent = fmtPct(cashWeight, 1)
  $('alloc-cash-usd').textContent = fmtUsd(cashUsd)
  $('alloc-cash-label').textContent = ''
}
