import { resizeAllocationPie, resizeEquityCharts, resizePerBasketCharts } from './charts.ts'

export function wireTabs(): void {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.tab-btn'))
  const panels = Array.from(document.querySelectorAll<HTMLElement>('.tab-panel'))

  const activate = (name: string) => {
    for (const b of buttons) {
      const on = b.dataset.tab === name
      b.classList.toggle('border-stone-900', on)
      b.classList.toggle('font-medium', on)
      b.classList.toggle('text-stone-900', on)
      b.classList.toggle('border-transparent', !on)
      b.classList.toggle('text-stone-500', !on)
    }
    for (const p of panels) p.classList.toggle('hidden', p.dataset.tab !== name)
    if (name === 'equity') resizeEquityCharts()
    else if (name === 'per-asset') resizePerBasketCharts()
    else if (name === 'allocation') resizeAllocationPie()
  }

  for (const b of buttons) {
    b.addEventListener('click', () => {
      if (b.dataset.tab) activate(b.dataset.tab)
    })
  }
}
