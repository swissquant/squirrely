import db from '@adonisjs/lucid/services/db'
import YahooFinance from 'yahoo-finance2'
import { MARKETS } from '#config/markets'
import { bumpDataVersion } from '#services/data_version'

const yahooFinance = new YahooFinance()

interface PriceRow {
  ticker: string
  date: string
  close: number
}

const EARLIEST_START = '1970-01-01'

export default class DataService {
  async syncAll(): Promise<{ ticker: string; rows: number }[]> {
    const results = await Promise.all(
      MARKETS.map(async (m) => ({ ticker: m.ticker, rows: await this.syncTicker(m.ticker) }))
    )
    const total = results.reduce((s, r) => s + r.rows, 0)
    if (total > 0) bumpDataVersion()
    return results
  }

  async syncTicker(ticker: string): Promise<number> {
    const latest = await db
      .from('prices')
      .where('ticker', ticker)
      .orderBy('date', 'desc')
      .first()

    const period1 = latest?.date ? this.dayAfter(latest.date) : EARLIEST_START
    const period2 = new Date()

    if (new Date(period1) >= period2) return 0

    const result = (await yahooFinance.chart(ticker, {
      period1,
      period2,
      interval: '1d',
    })) as {
      quotes?: Array<{
        date: Date | null
        close: number | null
        adjclose?: number | null
      }>
    }

    const quotes = result.quotes ?? []
    const rows: PriceRow[] = []
    for (const q of quotes) {
      if (!q.date) continue
      const tr = q.adjclose ?? q.close
      if (tr === null || tr === undefined) continue
      rows.push({
        ticker,
        date: this.toDateString(q.date),
        close: tr,
      })
    }

    if (rows.length === 0) return 0

    const chunkSize = 500
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize)
      const placeholders = chunk.map(() => '(?, ?, ?)').join(', ')
      const bindings: (string | number)[] = []
      for (const r of chunk) {
        bindings.push(r.ticker, r.date, r.close)
      }
      await db.rawQuery(
        `INSERT OR IGNORE INTO prices (ticker, date, close) VALUES ${placeholders}`,
        bindings
      )
    }
    return rows.length
  }

  async loadSeries(ticker: string): Promise<{ date: string; close: number }[]> {
    return db
      .from('prices')
      .where('ticker', ticker)
      .orderBy('date', 'asc')
      .select('date', 'close')
  }

  async loadLatestClose(ticker: string): Promise<number | null> {
    const row = await db
      .from('prices')
      .where('ticker', ticker)
      .orderBy('date', 'desc')
      .first()
    return row?.close ?? null
  }

  private dayAfter(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + 1)
    return this.toDateString(d)
  }

  private toDateString(d: Date): string {
    return d.toISOString().slice(0, 10)
  }
}
