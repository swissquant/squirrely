import { $ } from './dom.ts'

export function fmtPct(x: number | null | undefined, digits = 2): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return '—'
  return (x * 100).toFixed(digits) + '%'
}

export function fmtNum(x: number | null | undefined, digits = 2): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return '—'
  return x.toFixed(digits)
}

export function fmtUsd(x: number | null | undefined): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return '—'
  const sign = x < 0 ? '-' : ''
  const abs = Math.abs(x)
  return sign + '$' + abs.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

export function parsePortfolioUsd(): number {
  const el = $<HTMLInputElement>('portfolioUsd')
  const raw = el.value.replace(/[^0-9]/g, '')
  return raw === '' ? 0 : parseInt(raw, 10)
}

export function formatPortfolioUsdInput(preserveCaret = true): void {
  const el = $<HTMLInputElement>('portfolioUsd')
  const raw = el.value.replace(/[^0-9]/g, '')
  if (raw === '') {
    el.value = ''
    return
  }
  const formatted = parseInt(raw, 10).toLocaleString('en-US')
  if (formatted === el.value) return
  const caretFromEnd = preserveCaret
    ? el.value.length - (el.selectionEnd ?? el.value.length)
    : 0
  el.value = formatted
  if (preserveCaret) {
    const newPos = Math.max(0, formatted.length - caretFromEnd)
    try {
      el.setSelectionRange(newPos, newPos)
    } catch {}
  }
}
