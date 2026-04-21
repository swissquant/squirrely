export default class VolService {
  annualizedStdev(
    returns: (number | null)[],
    window: number,
    endExclusive: number,
    samplesPerYear: number
  ): number | null {
    const start = endExclusive - window
    if (start < 0) return null
    const sample: number[] = []
    for (let i = start; i < endExclusive; i++) {
      const r = returns[i]
      if (r === null || !Number.isFinite(r)) return null
      sample.push(r)
    }
    if (sample.length < window) return null
    const mean = sample.reduce((s, x) => s + x, 0) / sample.length
    const variance = sample.reduce((s, x) => s + (x - mean) ** 2, 0) / (sample.length - 1)
    return Math.sqrt(variance) * Math.sqrt(samplesPerYear)
  }

  annualizedStdevOfSeries(series: number[], samplesPerYear: number): number {
    if (series.length < 2) return 0
    const mean = series.reduce((s, x) => s + x, 0) / series.length
    const variance = series.reduce((s, x) => s + (x - mean) ** 2, 0) / (series.length - 1)
    return Math.sqrt(variance) * Math.sqrt(samplesPerYear)
  }

  /** Annualized sample covariance matrix from aligned return series. */
  covarianceMatrix(seriesList: number[][], samplesPerYear: number): number[][] {
    const n = seriesList.length
    if (n === 0) return []
    const len = seriesList[0].length
    const means = seriesList.map((s) => s.reduce((a, b) => a + b, 0) / s.length)
    const cov: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))
    if (len < 2) return cov
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        let s = 0
        for (let t = 0; t < len; t++) {
          s += (seriesList[i][t] - means[i]) * (seriesList[j][t] - means[j])
        }
        const c = (s / (len - 1)) * samplesPerYear
        cov[i][j] = c
        cov[j][i] = c
      }
    }
    return cov
  }
}
