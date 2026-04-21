import { Chart, registerables } from 'chart.js'
import type { ChartOptions, TooltipItem } from 'chart.js'
import 'chartjs-adapter-date-fns'
import { $ } from './dom.ts'
import { fmtUsd } from './format.ts'
import { parsePortfolioUsd } from './format.ts'
import { appState } from './state.ts'
import type { AssetSeries } from './types.ts'

Chart.register(...registerables)

const LINE_PALETTE = [
  '#5A45FF',
  '#f59e0b',
  '#0891b2',
  '#db2777',
  '#059669',
  '#dc2626',
  '#ca8a04',
  '#7c3aed',
]

const ALLOCATION_PALETTE = [
  '#5A45FF', // indigo
  '#f59e0b', // amber
  '#0891b2', // cyan
  '#db2777', // pink
  '#059669', // emerald
  '#dc2626', // red
  '#ca8a04', // gold
  '#7c3aed', // violet
  '#2563eb', // blue
  '#c026d3', // fuchsia
  '#16a34a', // green
  '#ea580c', // orange
  '#0d9488', // teal
  '#e11d48', // rose
  '#65a30d', // lime
  '#9333ea', // purple
]

let equityChart: Chart | null = null
let drawdownChart: Chart | null = null
let allocationPieChart: Chart | null = null
const perBasketCharts = new Map<string, Chart>()

const CASH_COLOR = '#a8a29e'

const timeAxis = (fontSize?: number) => ({
  type: 'time' as const,
  time: { unit: 'year' as const },
  ticks: {
    maxRotation: 0,
    autoSkip: true,
    ...(fontSize ? { font: { size: fontSize } } : {}),
  },
})

const baseOptions = <T extends 'line'>(): ChartOptions<T> =>
  ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    parsing: false,
  }) as ChartOptions<T>

function ensureEquityChart(): Chart {
  if (equityChart) return equityChart
  const ctx = $<HTMLCanvasElement>('equityChart').getContext('2d')!
  equityChart = new Chart(ctx, {
    type: 'line',
    data: { datasets: [] },
    options: {
      ...baseOptions<'line'>(),
      scales: {
        x: timeAxis(),
        y: {
          type: 'linear',
          title: { display: true, text: 'Portfolio value (USD)' },
          ticks: {
            callback: (v) =>
              '$' + Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 }),
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => new Date(items[0].parsed.x as number).toISOString().slice(0, 10),
            label: (item: TooltipItem<'line'>) => fmtUsd(item.parsed.y),
          },
        },
      },
    },
  })
  return equityChart
}

function ensureDrawdownChart(): Chart {
  if (drawdownChart) return drawdownChart
  const ctx = $<HTMLCanvasElement>('drawdownChart').getContext('2d')!
  drawdownChart = new Chart(ctx, {
    type: 'line',
    data: { datasets: [] },
    options: {
      ...baseOptions<'line'>(),
      scales: {
        x: timeAxis(),
        y: {
          type: 'linear',
          max: 0,
          title: { display: true, text: 'Drawdown' },
          ticks: { callback: (v) => (Number(v) * 100).toFixed(0) + '%' },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => new Date(items[0].parsed.x as number).toISOString().slice(0, 10),
            label: (item: TooltipItem<'line'>) =>
              'DD: ' + ((item.parsed.y ?? 0) * 100).toFixed(2) + '%',
          },
        },
      },
    },
  })
  return drawdownChart
}

export function renderCharts(): void {
  const dates = appState.equityDates
  const equity = appState.equityMultiples
  if (!dates.length) return
  const usd = Math.max(0, parsePortfolioUsd()) || 1

  const eq = ensureEquityChart()
  const eqData = dates.map((d, i) => ({ x: new Date(d).getTime(), y: equity[i] * usd }))
  eq.data.datasets = [
    {
      label: 'Portfolio value',
      data: eqData,
      borderColor: '#5A45FF',
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0,
    },
  ]
  eq.update('none')

  const dd = ensureDrawdownChart()
  let peak = equity[0] ?? 1
  const ddData = dates.map((d, i) => {
    if (equity[i] > peak) peak = equity[i]
    return { x: new Date(d).getTime(), y: equity[i] / peak - 1 }
  })
  dd.data.datasets = [
    {
      label: 'Drawdown',
      data: ddData,
      borderColor: '#dc2626',
      backgroundColor: 'rgba(220, 38, 38, 0.15)',
      borderWidth: 1,
      pointRadius: 0,
      tension: 0,
      fill: 'origin',
    },
  ]
  dd.update('none')
}

function buildBasketCard(bid: string, label: string): { cell: HTMLDivElement; canvasId: string } {
  const canvasId = 'basket-canvas-' + bid
  const cell = document.createElement('div')
  cell.id = 'basket-card-' + bid
  cell.className = 'bg-white rounded-lg border border-stone-200 p-4'

  const header = document.createElement('div')
  header.className = 'flex items-center justify-between mb-2'

  const h3 = document.createElement('h3')
  h3.className = 'font-semibold text-stone-700 text-sm'
  h3.textContent = label

  const hint = document.createElement('p')
  hint.className = 'text-[11px] text-stone-400'
  hint.textContent = 'vol-scaled · click legend to toggle'

  header.append(h3, hint)

  const canvasWrap = document.createElement('div')
  canvasWrap.className = 'relative h-56'
  const canvas = document.createElement('canvas')
  canvas.id = canvasId
  canvasWrap.appendChild(canvas)

  cell.append(header, canvasWrap)
  return { cell, canvasId }
}

export function renderPerAsset(perAsset: AssetSeries[]): void {
  const container = $('perBasketCharts')
  const byBasket = new Map<string, { label: string; series: AssetSeries[] }>()
  for (const a of perAsset) {
    if (!byBasket.has(a.basket)) {
      byBasket.set(a.basket, { label: a.basketLabel, series: [] })
    }
    byBasket.get(a.basket)!.series.push(a)
  }

  for (const [bid, chart] of perBasketCharts) {
    if (!byBasket.has(bid)) {
      chart.destroy()
      perBasketCharts.delete(bid)
      document.getElementById('basket-card-' + bid)?.remove()
    }
  }

  for (const [bid, group] of byBasket) {
    let existingCell = document.getElementById('basket-card-' + bid)
    let canvasId: string

    if (!existingCell) {
      const built = buildBasketCard(bid, group.label)
      container.appendChild(built.cell)
      canvasId = built.canvasId
    } else {
      const h3 = existingCell.querySelector('h3')
      if (h3) h3.textContent = group.label
      canvasId = 'basket-canvas-' + bid
    }

    const datasets = group.series.map((a, i) => ({
      label: `${a.label} (${a.ticker})`,
      data: a.dates.map((d, j) => ({ x: new Date(d).getTime(), y: a.equity[j] })),
      borderColor: LINE_PALETTE[i % LINE_PALETTE.length],
      borderWidth: 1.25,
      pointRadius: 0,
      tension: 0,
      fill: false,
    }))

    let chart = perBasketCharts.get(bid)
    if (!chart) {
      const canvas = document.getElementById(canvasId) as HTMLCanvasElement
      chart = new Chart(canvas.getContext('2d')!, {
        type: 'line',
        data: { datasets },
        options: {
          ...baseOptions<'line'>(),
          scales: {
            x: timeAxis(10),
            y: {
              type: 'logarithmic',
              ticks: { font: { size: 10 } },
            },
          },
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 8, font: { size: 10 } } },
            tooltip: {
              mode: 'nearest',
              intersect: false,
              callbacks: {
                title: (items) => new Date(items[0].parsed.x as number).toISOString().slice(0, 10),
                label: (item: TooltipItem<'line'>) =>
                  `${item.dataset.label}: ${(item.parsed.y ?? 0).toFixed(2)}x`,
              },
            },
          },
        },
      })
      perBasketCharts.set(bid, chart)
    } else {
      chart.data.datasets = datasets
      chart.update('none')
    }
  }
}

export interface AllocationSlice {
  label: string
  weight: number
  usd: number
}

function renderAllocationLegend(
  data: AllocationSlice[],
  colors: string[]
): void {
  const host = document.getElementById('allocationLegend')
  if (!host) return

  host.replaceChildren(
    ...data.map((slice, i) => {
      const row = document.createElement('div')
      row.className = 'flex items-center gap-2 min-w-0'

      const dot = document.createElement('span')
      dot.className = 'w-2.5 h-2.5 rounded-full shrink-0'
      dot.style.backgroundColor = colors[i]

      const label = document.createElement('span')
      label.className = 'flex-1 truncate text-stone-700'
      label.textContent = slice.label

      const pct = document.createElement('span')
      pct.className = 'tabular-nums text-stone-500 shrink-0'
      pct.textContent = (slice.weight * 100).toFixed(1) + '%'

      row.append(dot, label, pct)
      return row
    })
  )
}

export function renderAllocationPie(slices: AllocationSlice[], cashSlice: AllocationSlice): void {
  const canvas = document.getElementById('allocationPie') as HTMLCanvasElement | null
  if (!canvas) return

  const data = [...slices, cashSlice]
  const labels = data.map((s) => s.label)
  const weights = data.map((s) => s.weight)
  const usds = data.map((s) => s.usd)
  const colors = data.map((_, i) =>
    i === data.length - 1 ? CASH_COLOR : ALLOCATION_PALETTE[i % ALLOCATION_PALETTE.length]
  )

  renderAllocationLegend(data, colors)

  if (!allocationPieChart) {
    allocationPieChart = new Chart(canvas.getContext('2d')!, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: weights,
            backgroundColor: colors,
            borderColor: '#ffffff',
            borderWidth: 2,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        cutout: '60%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => {
                const w = (item.parsed as number) ?? 0
                const u = usds[item.dataIndex] ?? 0
                return `${item.label}: ${(w * 100).toFixed(1)}% · ${fmtUsd(u)}`
              },
            },
          },
        },
      },
    })
  } else {
    allocationPieChart.data.labels = labels
    const ds = allocationPieChart.data.datasets[0]
    ds.data = weights
    ds.backgroundColor = colors
    const opts = allocationPieChart.options
    if (opts?.plugins?.tooltip?.callbacks) {
      opts.plugins.tooltip.callbacks.label = (item) => {
        const w = (item.parsed as number) ?? 0
        const u = usds[item.dataIndex] ?? 0
        return `${item.label}: ${(w * 100).toFixed(1)}% · ${fmtUsd(u)}`
      }
    }
    allocationPieChart.update('none')
  }
}

export function resizeEquityCharts(): void {
  equityChart?.resize()
  drawdownChart?.resize()
}

export function resizePerBasketCharts(): void {
  for (const c of perBasketCharts.values()) c.resize()
}

export function resizeAllocationPie(): void {
  allocationPieChart?.resize()
}
