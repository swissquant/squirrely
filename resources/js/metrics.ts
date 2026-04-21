import { $ } from './dom.ts'
import { fmtNum, fmtPct, fmtUsd, parsePortfolioUsd } from './format.ts'
import { appState } from './state.ts'
import type { Metrics } from './types.ts'

export function renderMetrics(m?: Metrics | null): void {
  if (m) appState.lastMetrics = m
  const lm = appState.lastMetrics
  if (!lm) return
  const usd = Math.max(0, parsePortfolioUsd())

  $('m-cagr').textContent = fmtPct(lm.cagr)
  $('m-cagr-usd').textContent = Number.isFinite(lm.cagr)
    ? `${fmtUsd(lm.cagr * usd)} / year`
    : '—'

  $('m-vol').textContent = fmtPct(lm.vol)
  $('m-vol-usd').textContent = Number.isFinite(lm.vol)
    ? `±${fmtUsd(lm.vol * usd)} / year`
    : '—'

  $('m-sharpe').textContent = fmtNum(lm.sharpe, 2)

  $('m-mdd').textContent = fmtPct(lm.maxDrawdown)
  $('m-mdd-usd').textContent = Number.isFinite(lm.maxDrawdown)
    ? `${fmtUsd(lm.maxDrawdown * usd)} worst loss`
    : '—'
}
